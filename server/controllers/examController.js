import { Exam, Question, User, Notification, Response } from '../models/index.js';
import { sendExamNotification } from '../utils/email.js';
import AppError, { asyncHandler, sendSuccess } from '../utils/helpers.js';

const recalculateTotalMarks = async (examId) => {
  const questions = await Question.find({ exam: examId });
  const total = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  await Exam.findByIdAndUpdate(examId, { totalMarks: total });
  return total;
};

export const getExams = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.user.role === 'teacher') {
    filter.createdBy = req.user._id;
  } else if (req.user.role === 'student') {
    filter.status = { $in: ['published', 'active'] };
    filter.$or = [
      { assignedStudents: req.user._id },
      { assignedStudents: { $size: 0 } },
    ];
  }

  if (req.query.status) filter.status = req.query.status;
  if (req.query.course) filter.course = req.query.course;
  if (req.query.search) filter.title = new RegExp(req.query.search, 'i');

  const exams = await Exam.find(filter)
    .populate('course', 'title code')
    .populate('createdBy', 'firstName lastName')
    .populate('questions')
    .sort('-createdAt');

  sendSuccess(res, { exams });
});

export const getExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.id)
    .populate('course', 'title code')
    .populate('createdBy', 'firstName lastName email')
    .populate('questions')
    .populate('assignedStudents', 'firstName lastName email');

  if (!exam) throw new AppError('Exam not found', 404);

  if (req.user.role === 'teacher' && !exam.createdBy.equals(req.user._id)) {
    throw new AppError('Not authorized', 403);
  }

  // Strip correct answers for students taking exam (unless results shown)
  if (req.user.role === 'student') {
    const examObj = exam.toObject();
    examObj.questions = (examObj.questions || []).map((q) => {
      const { correctAnswers, explanation, referenceAnswer, rubric, ...safe } = q;
      safe.options = (safe.options || []).map(({ isCorrect, ...opt }) => opt);
      return safe;
    });
    return sendSuccess(res, { exam: examObj });
  }

  sendSuccess(res, { exam });
});

export const createExam = asyncHandler(async (req, res) => {
  const exam = await Exam.create({
    ...req.body,
    createdBy: req.user._id,
  });

  sendSuccess(res, { exam }, 'Exam created', 201);
});

export const updateExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.id);
  if (!exam) throw new AppError('Exam not found', 404);

  if (req.user.role === 'teacher' && !exam.createdBy.equals(req.user._id)) {
    throw new AppError('Not authorized', 403);
  }

  Object.assign(exam, req.body);
  await exam.save();
  sendSuccess(res, { exam }, 'Exam updated');
});

export const publishExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.id).populate('questions');
  if (!exam) throw new AppError('Exam not found', 404);
  if (req.user.role === 'teacher' && !exam.createdBy.equals(req.user._id)) {
    throw new AppError('Not authorized', 403);
  }
  if (!exam.questions?.length) throw new AppError('Add questions before publishing', 400);

  exam.status = 'published';
  await exam.save();

  const students =
    exam.assignedStudents?.length > 0
      ? await User.find({ _id: { $in: exam.assignedStudents } })
      : await User.find({ role: 'student', isActive: true });

  await Promise.all(
    students.map(async (student) => {
      await Notification.create({
        recipient: student._id,
        title: 'New Exam Available',
        message: `"${exam.title}" is now available.`,
        type: 'exam',
        link: `/student/exams/${exam._id}`,
      });
      await sendExamNotification(student, exam);
    })
  );

  sendSuccess(res, { exam }, 'Exam published');
});

export const deleteExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.id);
  if (!exam) throw new AppError('Exam not found', 404);

  if (req.user.role === 'teacher' && !exam.createdBy.equals(req.user._id)) {
    throw new AppError('Not authorized', 403);
  }

  await Question.deleteMany({ exam: exam._id });
  await exam.deleteOne();
  sendSuccess(res, null, 'Exam deleted');
});

export const duplicateExam = asyncHandler(async (req, res) => {
  const original = await Exam.findById(req.params.id).populate('questions');
  if (!original) throw new AppError('Exam not found', 404);
  if (req.user.role === 'teacher' && !original.createdBy.equals(req.user._id)) {
    throw new AppError('Not authorized', 403);
  }

  const examData = original.toObject();
  delete examData._id;
  delete examData.createdAt;
  delete examData.updatedAt;
  examData.title = `${examData.title} (Copy)`;
  examData.status = 'draft';
  examData.createdBy = req.user._id;
  examData.questions = [];

  const exam = await Exam.create(examData);

  const newQuestions = await Promise.all(
    (original.questions || []).map(async (q) => {
      const qData = q.toObject();
      delete qData._id;
      qData.exam = exam._id;
      qData.createdBy = req.user._id;
      return Question.create(qData);
    })
  );

  exam.questions = newQuestions.map((q) => q._id);
  await recalculateTotalMarks(exam._id);
  await exam.save();

  sendSuccess(res, { exam }, 'Exam duplicated', 201);
});

export { recalculateTotalMarks };
