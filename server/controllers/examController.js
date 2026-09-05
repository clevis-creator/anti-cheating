import { Exam, Question, User, Notification, Response, Course } from '../models/index.js';
import { sendExamNotification } from '../utils/email.js';
import {
  assertStudentCanViewExam,
  assertTeacherExamAccess,
  studentVisibleExamFilter,
} from '../utils/examAccess.js';
import {
  assertAssignableStudents,
  assertCourseTeacherAccess,
} from '../utils/teacherAccess.js';
import AppError, { asyncHandler, sendSuccess, escapeRegex } from '../utils/helpers.js';
import { sanitizeExamForStudent } from '../utils/examSanitize.js';

async function validateExamWritePayload(user, body = {}) {
  if (body.course) {
    const course = await Course.findById(body.course);
    if (!course) throw new AppError('Course not found', 404);
    if (user.role === 'teacher') await assertCourseTeacherAccess(user, course);
  }

  if (body.assignedStudents?.length) {
    await assertAssignableStudents(user, body.assignedStudents);
  }
}

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
    Object.assign(filter, studentVisibleExamFilter(req.user._id));
  }

  if (req.query.status) filter.status = req.query.status;
  if (req.query.course) filter.course = req.query.course;
  if (req.query.search) filter.title = new RegExp(escapeRegex(req.query.search), 'i');

  let query = Exam.find(filter)
    .populate('course', 'title code')
    .populate('createdBy', 'firstName lastName')
    .populate('questions')
    .sort('-createdAt');

  if (['teacher', 'admin'].includes(req.user.role)) {
    query = query.populate('assignedStudents', 'firstName lastName email');
  }

  const exams = await query;

  if (req.user.role === 'student') {
    return sendSuccess(res, { exams: exams.map(sanitizeExamForStudent) });
  }

  sendSuccess(res, { exams });
});

export const getExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.id)
    .populate('course', 'title code')
    .populate('createdBy', 'firstName lastName email')
    .populate('questions')
    .populate('assignedStudents', 'firstName lastName email');

  if (!exam) throw new AppError('Exam not found', 404);

  if (req.user.role === 'teacher') {
    assertTeacherExamAccess(req.user, exam);
  }

  if (req.user.role === 'student') {
    assertStudentCanViewExam(exam, req.user._id);
  }

  // Strip correct answers for students taking exam (unless results shown)
  if (req.user.role === 'student') {
    return sendSuccess(res, { exam: sanitizeExamForStudent(exam) });
  }

  sendSuccess(res, { exam });
});

export const createExam = asyncHandler(async (req, res) => {
  await validateExamWritePayload(req.user, req.body);

  const exam = await Exam.create({
    ...req.body,
    createdBy: req.user._id,
  });

  sendSuccess(res, { exam }, 'Exam created', 201);
});

export const updateExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.id);
  if (!exam) throw new AppError('Exam not found', 404);

  assertTeacherExamAccess(req.user, exam);

  await validateExamWritePayload(req.user, req.body);
  Object.assign(exam, req.body);
  await exam.save();
  sendSuccess(res, { exam }, 'Exam updated');
});

export const getExamAssignments = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.id).populate(
    'assignedStudents',
    'firstName lastName email studentId'
  );
  if (!exam) throw new AppError('Exam not found', 404);
  assertTeacherExamAccess(req.user, exam);

  const assigned = exam.assignedStudents || [];
  const responses = await Response.find({ exam: exam._id }).populate(
    'student',
    'firstName lastName email studentId'
  );

  const responseByStudent = new Map(
    responses.map((response) => [response.student._id.toString(), response])
  );

  const assignments = assigned.map((student) => {
    const response = responseByStudent.get(student._id.toString());
    return {
      student,
      status: response?.status || 'not_started',
      startedAt: response?.startedAt || null,
      submittedAt: response?.submittedAt || null,
      warnings: response?.warnings || 0,
      responseId: response?._id || null,
      attemptNumber: response?.attemptNumber || 0,
    };
  });

  sendSuccess(res, {
    examId: exam._id,
    openToAll: assigned.length === 0,
    assignments,
    totalAssigned: assigned.length,
    inProgress: assignments.filter((item) => item.status === 'in_progress').length,
    submitted: assignments.filter((item) =>
      ['submitted', 'graded', 'published'].includes(item.status)
    ).length,
  });
});

export const publishExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.id).populate('questions');
  if (!exam) throw new AppError('Exam not found', 404);
  assertTeacherExamAccess(req.user, exam);
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

  assertTeacherExamAccess(req.user, exam);

  await Question.deleteMany({ exam: exam._id });
  await exam.deleteOne();
  sendSuccess(res, null, 'Exam deleted');
});

export const duplicateExam = asyncHandler(async (req, res) => {
  const original = await Exam.findById(req.params.id).populate('questions');
  if (!original) throw new AppError('Exam not found', 404);
  assertTeacherExamAccess(req.user, original);

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
