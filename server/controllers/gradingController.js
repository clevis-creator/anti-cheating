import {
  Response,
  Result,
  AIGrade,
  Question,
  Exam,
  Notification,
} from '../models/index.js';
import { calculateLetterGrade } from '../services/grading.js';
import { gradeEssayWithAI } from '../services/aiGrading.js';
import { generateCertificate } from '../services/certificate.js';
import { assertTeacherExamAccess, studentVisibleExamFilter } from '../utils/examAccess.js';
import AppError, { asyncHandler, sendSuccess } from '../utils/helpers.js';

export const manualGrade = asyncHandler(async (req, res) => {
  const { answerId, marksAwarded, feedback } = req.body;
  const numericMarks = Number(marksAwarded);
  const response = await Response.findById(req.params.id).populate('exam');
  if (!response) throw new AppError('Response not found', 404);
  if (req.user.role === 'teacher' && !response.exam.createdBy.equals(req.user._id)) {
    throw new AppError('Not authorized', 403);
  }

  const answer = response.answers.id(answerId);
  if (!answer) throw new AppError('Answer not found', 404);

  const question = await Question.findById(answer.question);
  if (!Number.isFinite(numericMarks) || numericMarks < 0 || numericMarks > (question?.marks || 0)) {
    throw new AppError(`Marks cannot exceed ${question.marks}`, 400);
  }

  answer.marksAwarded = numericMarks;
  answer.feedback = feedback || '';
  answer.manuallyGraded = true;
  answer.isCorrect = marksAwarded >= (question.marks || 0) * 0.5;

  // Recalculate totals
  const obtainedMarks = response.answers.reduce((s, a) => s + (a.marksAwarded || 0), 0);
  const totalMarks = response.totalMarks || response.exam.totalMarks;
  const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 1000) / 10 : 0;

  response.obtainedMarks = obtainedMarks;
  response.score = obtainedMarks;
  response.percentage = percentage;
  response.passed = obtainedMarks >= (response.exam.passingMarks || 0);
  await response.save();

  await Result.findOneAndUpdate(
    { response: response._id },
    {
      obtainedMarks,
      percentage,
      grade: calculateLetterGrade(percentage),
      passed: response.passed,
    }
  );

  sendSuccess(res, { response }, 'Answer graded');
});

export const overrideAIGrade = asyncHandler(async (req, res) => {
  const { score, feedback } = req.body;
  const numericScore = Number(score);
  const aiGrade = await AIGrade.findById(req.params.id);
  if (!aiGrade) throw new AppError('AI grade not found', 404);
  const response = await Response.findById(aiGrade.response).populate('exam');
  if (!response) throw new AppError('Response not found', 404);
  if (req.user.role === 'teacher' && !response.exam.createdBy.equals(req.user._id)) {
    throw new AppError('Not authorized', 403);
  }
  if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > aiGrade.maxMarks) {
    throw new AppError(`Score must be between 0 and ${aiGrade.maxMarks}`, 400);
  }

  aiGrade.overridden = true;
  aiGrade.overrideScore = numericScore;
  aiGrade.overrideFeedback = feedback;
  aiGrade.overriddenBy = req.user._id;
  await aiGrade.save();

  const answer = response.answers.find((a) => a.question.equals(aiGrade.question));
  if (answer) {
    answer.marksAwarded = numericScore;
    answer.feedback = feedback || aiGrade.feedback;
    answer.manuallyGraded = true;
  }

  const obtainedMarks = response.answers.reduce((s, a) => s + (a.marksAwarded || 0), 0);
  const totalMarks = response.totalMarks;
  const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 1000) / 10 : 0;

  response.obtainedMarks = obtainedMarks;
  response.score = obtainedMarks;
  response.percentage = percentage;
  response.passed = obtainedMarks >= (response.exam.passingMarks || 0);
  await response.save();

  await Result.findOneAndUpdate(
    { response: response._id },
    {
      obtainedMarks,
      percentage,
      grade: calculateLetterGrade(percentage),
      passed: response.passed,
    }
  );

  sendSuccess(res, { aiGrade, response }, 'AI grade overridden');
});

export const regradeWithAI = asyncHandler(async (req, res) => {
  const response = await Response.findById(req.params.id).populate('exam');
  if (!response) throw new AppError('Response not found', 404);
  if (req.user.role === 'teacher' && !response.exam.createdBy.equals(req.user._id)) {
    throw new AppError('Not authorized', 403);
  }

  const answer = response.answers.id(req.body.answerId);
  if (!answer) throw new AppError('Answer not found', 404);

  const question = await Question.findById(answer.question);
  if (question.type !== 'essay') throw new AppError('Only essays support AI grading', 400);

  const aiResult = await gradeEssayWithAI({
    studentAnswer: String(answer.answer),
    referenceAnswer: question.referenceAnswer,
    rubric: question.rubric,
    maxMarks: question.marks,
  });

  answer.marksAwarded = aiResult.score;
  answer.aiGraded = true;
  answer.feedback = aiResult.feedback;

  const aiGrade = await AIGrade.findOneAndUpdate(
    { response: response._id, question: question._id },
    {
      response: response._id,
      question: question._id,
      student: response.student,
      exam: response.exam,
      studentAnswer: String(answer.answer),
      referenceAnswer: question.referenceAnswer,
      rubric: question.rubric,
      maxMarks: question.marks,
      score: aiResult.score,
      feedback: aiResult.feedback,
      reasoning: aiResult.reasoning,
      suggestions: aiResult.suggestions,
      provider: aiResult.provider,
      rawResponse: aiResult.rawResponse,
      overridden: false,
    },
    { upsert: true, new: true }
  );

  const obtainedMarks = response.answers.reduce((s, a) => s + (a.marksAwarded || 0), 0);
  const totalMarks = response.totalMarks || response.exam.totalMarks;
  const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 1000) / 10 : 0;
  response.obtainedMarks = obtainedMarks;
  response.score = obtainedMarks;
  response.percentage = percentage;
  response.passed = obtainedMarks >= (response.exam.passingMarks || 0);
  await response.save();

  await Result.findOneAndUpdate(
    { response: response._id },
    {
      obtainedMarks,
      percentage,
      grade: calculateLetterGrade(percentage),
      passed: response.passed,
    }
  );

  sendSuccess(res, { aiGrade, answer }, 'AI regrade complete');
});

export const publishResults = asyncHandler(async (req, res) => {
  const examId = req.params.examId;
  const exam = await Exam.findById(examId);
  if (!exam) throw new AppError('Exam not found', 404);
  if (req.user.role === 'teacher' && !exam.createdBy.equals(req.user._id)) {
    throw new AppError('Not authorized', 403);
  }

  // Guard: do not silently publish during in-progress manual grading.
  const confirmIncomplete = req.body?.confirmIncomplete === true;
  const gradedResponses = await Response.find({
    exam: examId,
    status: { $in: ['submitted', 'graded'] },
  });
  const pendingManual = gradedResponses.filter((r) =>
    r.answers.some((a) => a.answer != null && !a.autoGraded && !a.manuallyGraded)
  );

  if (pendingManual.length > 0 && !confirmIncomplete) {
    throw new AppError(
      `${pendingManual.length} submission(s) still require manual grading. Publish anyway by passing confirmIncomplete=true.`,
      400
    );
  }

  await Result.updateMany(
    { exam: examId },
    { published: true, publishedAt: new Date() }
  );
  await Response.updateMany(
    { exam: examId, status: { $in: ['submitted', 'graded'] } },
    { status: 'published' }
  );

  const results = await Result.find({ exam: examId }).populate(
    'student',
    'firstName lastName institution'
  );

  await Promise.all(
    results.map(async (r) => {
      if (r.passed && !r.certificateUrl) {
        try {
          const url = await generateCertificate({
            studentName: `${r.student.firstName} ${r.student.lastName}`,
            examTitle: exam.title,
            percentage: r.percentage,
            grade: r.grade,
            date: new Date().toLocaleDateString(),
            institution: r.student.institution || 'ExamAI Academy',
          });
          r.certificateUrl = url;
          await r.save();
        } catch (err) {
          console.error('Certificate generation failed:', err.message);
        }
      }

      await Notification.create({
        recipient: r.student._id || r.student,
        title: 'Results Published',
        message: `Results for "${exam.title}" are now available.`,
        type: 'grade',
        link: `/student/results/${r._id}`,
      });
    })
  );

  sendSuccess(res, { count: results.length }, 'Results published');
});

/** Download / regenerate certificate for a published passed result */
export const getCertificate = asyncHandler(async (req, res) => {
  const result = await Result.findById(req.params.id)
    .populate('student', 'firstName lastName institution')
    .populate('exam', 'title');

  if (!result) throw new AppError('Result not found', 404);
  if (!result.published || !result.passed) {
    throw new AppError('Certificate only available for published passing results', 400);
  }

  const isOwner = result.student._id.equals(req.user._id);
  if (!isOwner && !['admin', 'teacher'].includes(req.user.role)) {
    throw new AppError('Not authorized', 403);
  }
  if (req.user.role === 'teacher') {
    assertTeacherExamAccess(req.user, result.exam);
  }

  if (!result.certificateUrl) {
    result.certificateUrl = await generateCertificate({
      studentName: `${result.student.firstName} ${result.student.lastName}`,
      examTitle: result.exam.title,
      percentage: result.percentage,
      grade: result.grade,
      date: new Date(result.publishedAt || result.createdAt).toLocaleDateString(),
      institution: result.student.institution || 'ExamAI Academy',
    });
    await result.save();
  }

  sendSuccess(res, { certificateUrl: result.certificateUrl, result });
});

export const getResults = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'student') {
    filter.student = req.user._id;
    filter.published = true;
  } else if (req.query.exam) {
    const exam = await Exam.findById(req.query.exam);
    if (!exam) throw new AppError('Exam not found', 404);
    if (req.user.role === 'teacher') assertTeacherExamAccess(req.user, exam);
    filter.exam = req.query.exam;
  } else if (req.user.role === 'teacher') {
    const exams = await Exam.find({ createdBy: req.user._id }).select('_id');
    filter.exam = { $in: exams.map((e) => e._id) };
  }

  const results = await Result.find(filter)
    .populate('exam', 'title totalMarks passingMarks')
    .populate('student', 'firstName lastName email studentId')
    .sort('-createdAt');

  sendSuccess(res, { results });
});

export const getResult = asyncHandler(async (req, res) => {
  const result = await Result.findById(req.params.id)
    .populate('exam')
    .populate('student', 'firstName lastName email')
    .populate({
      path: 'response',
      populate: { path: 'answers.question' },
    });

  if (!result) throw new AppError('Result not found', 404);

  if (req.user.role === 'student') {
    if (!result.student._id.equals(req.user._id) || !result.published) {
      throw new AppError('Not authorized', 403);
    }
  } else if (req.user.role === 'teacher') {
    assertTeacherExamAccess(req.user, result.exam);
  }

  const aiGrades = await AIGrade.find({ response: result.response?._id });
  if (req.user.role === 'student' && !result.exam.settings?.showCorrectAnswers) {
    result.response.answers.forEach((answer) => {
      const question = answer.question;
      if (!question) return;
      delete question.correctAnswers;
      delete question.explanation;
      delete question.referenceAnswer;
      delete question.rubric;
      question.options = (question.options || []).map(({ isCorrect, ...option }) => option);
    });
  }
  sendSuccess(res, { result, aiGrades });
});

export const getTeacherStats = asyncHandler(async (req, res) => {
  const exams = await Exam.find({ createdBy: req.user._id });
  const examIds = exams.map((e) => e._id);

  const [totalExams, totalResponses, pending, results] = await Promise.all([
    Exam.countDocuments({ createdBy: req.user._id }),
    Response.countDocuments({ exam: { $in: examIds }, status: { $ne: 'not_started' } }),
    Response.countDocuments({ exam: { $in: examIds }, status: 'submitted' }),
    Result.find({ exam: { $in: examIds } }),
  ]);

  const avgScore =
    results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length)
      : 0;

  sendSuccess(res, {
    stats: {
      totalExams,
      totalResponses,
      pendingGrading: pending,
      avgScore,
      publishedExams: exams.filter((e) => e.status === 'published').length,
      draftExams: exams.filter((e) => e.status === 'draft').length,
    },
    recentExams: exams.slice(0, 5),
  });
});

export const getStudentStats = asyncHandler(async (req, res) => {
  const [availableExams, responses, results] = await Promise.all([
    Exam.countDocuments(studentVisibleExamFilter(req.user._id)),
    Response.find({ student: req.user._id }),
    Result.find({ student: req.user._id, published: true }),
  ]);

  const avgScore =
    results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length)
      : 0;

  sendSuccess(res, {
    stats: {
      availableExams,
      completedExams: responses.filter((r) =>
        ['submitted', 'graded', 'published'].includes(r.status)
      ).length,
      inProgress: responses.filter((r) => r.status === 'in_progress').length,
      avgScore,
      certificates: results.filter((r) => r.passed).length,
    },
    recentResults: results.slice(0, 5),
  });
});
