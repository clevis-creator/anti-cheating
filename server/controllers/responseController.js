import {
  Exam,
  Question,
  Response,
  Result,
  AIGrade,
  Notification,
  ActivityLog,
} from '../models/index.js';
import { autoGradeAnswer, calculateLetterGrade } from '../services/grading.js';
import { gradeEssayWithAI } from '../services/aiGrading.js';
import { processMedia } from '../services/proctoringWorker.js';
import {
  assertStudentExamAccess,
  assertAccessCode,
} from '../utils/examAccess.js';
import { assertSEBIfRequired, isSEBRequest } from '../middleware/sebVerify.js';
import {
  buildSessionFingerprint,
  generateSessionToken,
} from '../middleware/examSession.js';
import config from '../config/index.js';
import { getRemainingSeconds, isExamExpired } from '../utils/examTiming.js';
import path from 'path';
import { fileURLToPath } from 'url';
import AppError, { asyncHandler, sendSuccess } from '../utils/helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', 'uploads');

const VALID_WARNING_TYPES = new Set([
  'tab_switch',
  'focus_loss',
  'copy_paste',
  'right_click',
  'shortcut',
  'devtools',
  'fullscreen_exit',
]);

const WARNING_GROUPS = {
  tab_switch: 'focus',
  focus_loss: 'focus',
};

function warningGroup(type) {
  return WARNING_GROUPS[type] || type;
}

function shouldSkipWarning(response, type) {
  if (!response.lastWarningAt) return false;
  const elapsed = Date.now() - new Date(response.lastWarningAt).getTime();
  if (elapsed >= config.warningCooldownMs) return false;
  return warningGroup(type) === warningGroup(response.lastWarningType || '');
}

export const startExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.examId).populate('questions');
  if (!exam) throw new AppError('Exam not found', 404);
  if (!['published', 'active'].includes(exam.status)) {
    throw new AppError('Exam is not available', 400);
  }

  const now = new Date();
  if (exam.startTime && now < exam.startTime) throw new AppError('Exam has not started yet', 400);
  if (exam.endTime && now > exam.endTime) throw new AppError('Exam has ended', 400);

  assertStudentExamAccess(exam, req.user._id);
  assertAccessCode(exam, req.body.accessCode);
  assertSEBIfRequired(exam, req);

  const attemptCount = await Response.countDocuments({
    exam: exam._id,
    student: req.user._id,
    status: { $in: ['submitted', 'graded', 'published'] },
  });

  if (attemptCount >= (exam.settings?.maxAttempts || 1)) {
    throw new AppError('Maximum attempts reached', 400);
  }

  let response = await Response.findOne({
    exam: exam._id,
    student: req.user._id,
    status: 'in_progress',
  }).select('+sessionToken');

  if (!response) {
    const sessionToken = generateSessionToken();
    response = await Response.create({
      exam: exam._id,
      student: req.user._id,
      status: 'in_progress',
      attemptNumber: attemptCount + 1,
      startedAt: now,
      timeRemaining: exam.duration * 60,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      deviceInfo: req.body.deviceInfo || {},
      sessionToken,
      sessionFingerprint: buildSessionFingerprint(req),
      sebVerified: isSEBRequest(req),
      answers: exam.questions.map((q) => ({
        question: q._id,
        answer: null,
        flagged: false,
      })),
      activityLog: [{ action: 'exam_started', details: 'Student started the exam' }],
    });
  } else if (!response.sessionToken) {
    response.sessionToken = generateSessionToken();
    response.sessionFingerprint = buildSessionFingerprint(req);
    await response.save();
  }

  if (isExamExpired(response, exam)) {
    await submitExamInternal(response);
    throw new AppError('Exam time has expired', 409);
  }

  const responseObj = response.toObject();
  responseObj.sessionToken = response.sessionToken;
  responseObj.timeRemaining = getRemainingSeconds(response, exam);
  delete responseObj.sessionFingerprint;

  // Return exam without answers for students
  const examObj = exam.toObject();
  let questions = examObj.questions || [];
  if (exam.settings?.shuffleQuestions) {
    questions = [...questions].sort(() => Math.random() - 0.5);
  }
  examObj.questions = questions.map((q) => {
    const { correctAnswers, explanation, referenceAnswer, rubric, ...safe } = q;
    let options = (safe.options || []).map(({ isCorrect, ...opt }) => opt);
    if (exam.settings?.shuffleOptions || q.randomizeOptions) {
      options = [...options].sort(() => Math.random() - 0.5);
    }
    return { ...safe, options };
  });

  sendSuccess(res, { response: responseObj, exam: examObj }, 'Exam started');
});

export const saveProgress = asyncHandler(async (req, res) => {
  const response = req.examResponse;
  if (!response) throw new AppError('Active exam session not found', 404);

  const { answers, currentQuestionIndex, timeRemaining, flaggedQuestions } = req.body;
  const exam = await Exam.findById(response.exam).select('duration endTime');
  if (!exam) throw new AppError('Exam not found', 404);
  const remainingSeconds = getRemainingSeconds(response, exam);
  if (remainingSeconds === 0) throw new AppError('Exam time has expired; submit your attempt', 409);

  if (answers) {
    answers.forEach((ans) => {
      const existing = response.answers.find((a) => a.question.toString() === ans.question);
      if (existing) {
        if (ans.answer !== undefined) existing.answer = ans.answer;
        if (ans.fileUrl !== undefined) existing.fileUrl = ans.fileUrl;
        if (ans.flagged !== undefined) existing.flagged = ans.flagged;
        if (ans.timeSpent !== undefined) existing.timeSpent = ans.timeSpent;
      }
    });
  }

  if (currentQuestionIndex !== undefined) response.currentQuestionIndex = currentQuestionIndex;
  response.timeRemaining = remainingSeconds;
  if (flaggedQuestions) response.flaggedQuestions = flaggedQuestions;
  response.autoSavedAt = new Date();
  response.activityLog.push({ action: 'auto_save', details: 'Progress saved' });

  await response.save();
  sendSuccess(res, { response }, 'Progress saved');
});

export const logWarning = asyncHandler(async (req, res) => {
  const response = await Response.findOne({
    _id: req.params.id,
    student: req.user._id,
    status: 'in_progress',
  }).populate('exam');

  if (!response) throw new AppError('Active exam session not found', 404);

  if (!response.exam.settings?.antiCheat?.enabled) {
    return sendSuccess(res, { warnings: response.warnings, autoSubmitted: false, maxWarnings: 0, skipped: true }, 'Anti-cheat disabled');
  }

  const sessionToken = req.get('X-Exam-Session');
  if (!sessionToken || sessionToken !== response.sessionToken) {
    throw new AppError('Invalid exam session token', 403);
  }

  const { type, message } = req.body;
  if (!type || !VALID_WARNING_TYPES.has(type)) {
    throw new AppError('Invalid warning type', 400);
  }

  const maxWarnings = response.exam.settings?.antiCheat?.maxWarnings || 3;

  if (shouldSkipWarning(response, type)) {
    return sendSuccess(
      res,
      { warnings: response.warnings, autoSubmitted: false, maxWarnings, skipped: true },
      'Warning skipped (cooldown)'
    );
  }

  response.warnings += 1;
  response.lastWarningAt = new Date();
  response.lastWarningType = type;
  response.warningLogs.push({ type, message: message || type });
  response.activityLog.push({
    action: 'warning',
    details: `${type}: ${message || type}`,
  });

  await ActivityLog.create({
    user: req.user._id,
    action: 'exam_warning',
    resource: 'response',
    resourceId: response._id,
    exam: response.exam._id,
    details: `${type}: ${message}`,
    severity: 'high',
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  const maxWarningsResolved = response.exam.settings?.antiCheat?.maxWarnings || 3;
  let autoSubmitted = false;

  if (response.warnings >= maxWarningsResolved && response.exam.settings?.antiCheat?.enabled) {
    await submitExamInternal(response);
    autoSubmitted = true;
  } else {
    await response.save();
  }

  // Emit via socket if available
  const io = req.app.get('io');
  if (io) {
    io.to(`exam:${response.exam._id}`).emit('student:warning', {
      studentId: req.user._id,
      studentName: `${req.user.firstName} ${req.user.lastName}`,
      warnings: response.warnings,
      type,
      message,
      autoSubmitted,
    });
  }

  sendSuccess(res, { warnings: response.warnings, autoSubmitted, maxWarnings: maxWarningsResolved }, 'Warning logged');
});

export const logActivity = asyncHandler(async (req, res) => {
  const response = req.examResponse || await Response.findOne({
    _id: req.params.id,
    student: req.user._id,
  });
  if (!response) throw new AppError('Response not found', 404);

  if (response.status === 'in_progress') {
    const examDoc = await Exam.findById(response.exam).select('settings');
    if (examDoc?.settings?.antiCheat?.logActivity === false) {
      return sendSuccess(res, null, 'Activity logging disabled');
    }
  }

  response.activityLog.push({
    action: req.body.action,
    details: req.body.details || '',
  });
  await response.save();
  sendSuccess(res, null, 'Activity logged');
});

export const uploadProctoringMedia = asyncHandler(async (req, res) => {
  const response = req.examResponse;
  if (!response) throw new AppError('Active exam session not found', 404);

  if (!req.file) throw new AppError('No file uploaded', 400);

  const url = `/uploads/${req.file.filename}`;

  response.proctoring = response.proctoring || {};
  const consentGiven = req.body.consent === 'true' || req.body.consent === '1' || req.body.consent === true;
  if (consentGiven) {
    response.proctoring.consentGiven = true;
    response.proctoring.consentAt = new Date();
  } else if (!response.proctoring.consentGiven) {
    throw new AppError('Proctoring consent required before media upload', 403);
  }

  response.proctoring.media = response.proctoring.media || [];
  response.proctoring.media.push({
    type: req.file.mimetype,
    url,
    filename: req.file.filename,
    uploadedAt: new Date(),
  });

  response.activityLog.push({ action: 'proctoring_upload', details: `Uploaded ${req.file.originalname}` });
  await response.save();

  const filePath = path.join(uploadDir, req.file.filename);
  processMedia(filePath, {
    responseId: response._id,
    type: req.file.mimetype,
    filename: req.file.filename,
  }).catch((err) => console.error('Proctoring worker error:', err.message));

  await ActivityLog.create({
    user: req.user._id,
    action: 'upload_proctoring_media',
    resource: 'response',
    resourceId: response._id,
    exam: response.exam,
    details: req.file.originalname,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  }).catch(() => {});

  sendSuccess(res, { url, filename: req.file.filename }, 'Media uploaded');
});

const submitExamInternal = async (response) => {
  const exam = await Exam.findById(response.exam).populate('questions');
  const questionsMap = new Map(exam.questions.map((q) => [q._id.toString(), q]));

  let obtainedMarks = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;
  const essayQuestions = [];

  for (const ans of response.answers) {
    const question = questionsMap.get(ans.question.toString());
    if (!question) continue;

    const hasAnswer =
      ans.answer !== null &&
      ans.answer !== undefined &&
      ans.answer !== '' &&
      !(Array.isArray(ans.answer) && ans.answer.length === 0);

    if (!hasAnswer) {
      unansweredCount += 1;
      continue;
    }

    const grade = autoGradeAnswer(question, ans.answer);
    ans.isCorrect = grade.isCorrect;
    ans.marksAwarded = grade.marksAwarded;
    ans.autoGraded = grade.autoGraded;

    if (grade.autoGraded) {
      obtainedMarks += grade.marksAwarded;
      if (grade.isCorrect) correctCount += 1;
      else wrongCount += 1;
    } else if (question.type === 'essay' && exam.settings?.aiGrading) {
      essayQuestions.push({ ans, question });
    }
  }

  // AI grade essays
  for (const { ans, question } of essayQuestions) {
    try {
      const aiResult = await gradeEssayWithAI({
        studentAnswer: String(ans.answer),
        referenceAnswer: question.referenceAnswer,
        rubric: question.rubric,
        maxMarks: question.marks,
      });

      ans.marksAwarded = aiResult.score;
      ans.aiGraded = true;
      ans.feedback = aiResult.feedback;
      ans.isCorrect = aiResult.score >= question.marks * 0.5;
      obtainedMarks += aiResult.score;

      await AIGrade.findOneAndUpdate(
        { response: response._id, question: question._id },
        {
          response: response._id,
          question: question._id,
          student: response.student,
          exam: exam._id,
          studentAnswer: String(ans.answer),
          referenceAnswer: question.referenceAnswer,
          rubric: question.rubric,
          maxMarks: question.marks,
          score: aiResult.score,
          feedback: aiResult.feedback,
          reasoning: aiResult.reasoning,
          suggestions: aiResult.suggestions,
          provider: aiResult.provider,
          rawResponse: aiResult.rawResponse,
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error('AI grading failed:', err.message);
      ans.feedback = 'Pending manual review';
    }
  }

  const totalMarks = exam.totalMarks || exam.questions.reduce((s, q) => s + q.marks, 0);
  const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 1000) / 10 : 0;
  const passed = obtainedMarks >= (exam.passingMarks || 0);

  response.status = 'submitted';
  response.submittedAt = new Date();
  response.score = obtainedMarks;
  response.obtainedMarks = obtainedMarks;
  response.totalMarks = totalMarks;
  response.percentage = percentage;
  response.passed = passed;
  response.timeRemaining = 0;
  response.activityLog.push({ action: 'submitted', details: 'Exam submitted' });

  await response.save();

  const needsManual =
    response.answers.some((a) => a.autoGraded === false && !a.aiGraded) ||
    exam.questions.some((q) => ['file_upload', 'image', 'video'].includes(q.type));

  await Result.findOneAndUpdate(
    { exam: exam._id, student: response.student },
    {
      exam: exam._id,
      student: response.student,
      response: response._id,
      totalMarks,
      obtainedMarks,
      percentage,
      grade: calculateLetterGrade(percentage),
      passed,
      correctCount,
      wrongCount,
      unansweredCount,
      published: exam.settings?.showResults && !needsManual,
      publishedAt: exam.settings?.showResults && !needsManual ? new Date() : undefined,
    },
    { upsert: true, new: true }
  );

  if (!needsManual) {
    response.status = 'graded';
    await response.save();
  }

  await Notification.create({
    recipient: exam.createdBy,
    title: 'Exam Submitted',
    message: `A student submitted "${exam.title}"`,
    type: 'exam',
    link: `/teacher/grading/${response._id}`,
  });

  return response;
};

export const submitExam = asyncHandler(async (req, res) => {
  const response = await Response.findOne({
    _id: req.params.id,
    student: req.user._id,
    status: 'in_progress',
  });
  if (!response) throw new AppError('Active exam session not found', 404);

  const exam = await Exam.findById(response.exam).select('duration endTime');
  if (!exam) throw new AppError('Exam not found', 404);
  const expired = isExamExpired(response, exam);

  if (!expired && req.body.answers) {
    req.body.answers.forEach((ans) => {
      const existing = response.answers.find((a) => a.question.toString() === ans.question);
      if (existing && ans.answer !== undefined) existing.answer = ans.answer;
    });
  }

  if (expired) response.activityLog.push({ action: 'time_expired', details: 'Submission received after server deadline' });

  const result = await submitExamInternal(response);

  const io = req.app.get('io');
  if (io) {
    io.to(`exam:${response.exam}`).emit('student:submitted', {
      studentId: req.user._id,
      responseId: response._id,
    });
  }

  sendSuccess(res, { response: result }, 'Exam submitted successfully');
});

export const getMyResponses = asyncHandler(async (req, res) => {
  const responses = await Response.find({ student: req.user._id })
    .populate('exam', 'title duration totalMarks passingMarks settings')
    .sort('-createdAt');
  sendSuccess(res, { responses });
});

export const getResponse = asyncHandler(async (req, res) => {
  const response = await Response.findById(req.params.id)
    .populate({
      path: 'exam',
      populate: { path: 'questions' },
    })
    .populate('student', 'firstName lastName email studentId');

  if (!response) throw new AppError('Response not found', 404);

  const isOwner = response.student._id.equals(req.user._id);
  const isTeacherOrAdmin = ['teacher', 'admin'].includes(req.user.role);

  if (!isOwner && !isTeacherOrAdmin) throw new AppError('Not authorized', 403);
  if (req.user.role === 'teacher' && !response.exam.createdBy.equals(req.user._id)) {
    throw new AppError('Not authorized', 403);
  }

  // Students only see results if published
  if (isOwner && !isTeacherOrAdmin) {
    const result = await Result.findOne({ response: response._id });
    if (!result?.published && response.status !== 'in_progress') {
      return sendSuccess(res, {
        response: {
          _id: response._id,
          status: response.status,
          submittedAt: response.submittedAt,
          exam: { title: response.exam.title },
        },
        message: 'Results not yet published',
      });
    }
  }

  const aiGrades = await AIGrade.find({ response: response._id });
  if (isOwner && !isTeacherOrAdmin) {
    const responseObj = response.toObject();
    if (responseObj.exam?.questions) {
      responseObj.exam.questions = responseObj.exam.questions.map((question) => {
        const { correctAnswers, explanation, referenceAnswer, rubric, ...safe } = question;
        safe.options = (safe.options || []).map(({ isCorrect, ...option }) => option);
        return safe;
      });
    }
    return sendSuccess(res, { response: responseObj, aiGrades });
  }

  sendSuccess(res, { response, aiGrades });
});

export const getExamResponses = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.examId);
  if (!exam) throw new AppError('Exam not found', 404);

  if (req.user.role === 'teacher' && !exam.createdBy.equals(req.user._id)) {
    throw new AppError('Not authorized', 403);
  }

  const responses = await Response.find({ exam: exam._id })
    .populate('student', 'firstName lastName email studentId')
    .sort('-submittedAt');

  sendSuccess(res, { responses });
});

export const getPendingGrading = asyncHandler(async (req, res) => {
  const filter = { status: { $in: ['submitted', 'graded'] } };

  if (req.user.role === 'teacher') {
    const exams = await Exam.find({ createdBy: req.user._id }).select('_id');
    filter.exam = { $in: exams.map((e) => e._id) };
  }

  const responses = await Response.find(filter)
    .populate('student', 'firstName lastName email')
    .populate('exam', 'title')
    .sort('-submittedAt');

  // Filter those needing manual attention
  const pending = responses.filter((r) =>
    r.answers.some((a) => !a.autoGraded && !a.manuallyGraded && a.answer != null)
  );

  sendSuccess(res, { responses: pending.length ? pending : responses });
});
