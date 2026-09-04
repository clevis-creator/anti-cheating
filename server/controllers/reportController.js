import { Result, Exam, Response, User, Report, ActivityLog } from '../models/index.js';
import { exportToCSV, exportToExcel, exportToPDF } from '../services/export.js';
import { assertExamMonitorAccess, assertTeacherExamAccess } from '../utils/examAccess.js';
import AppError, { asyncHandler, sendSuccess } from '../utils/helpers.js';

export const getExamReport = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.examId).populate('createdBy', 'firstName lastName');
  if (!exam) throw new AppError('Exam not found', 404);
  assertTeacherExamAccess(req.user, exam);

  const results = await Result.find({ exam: exam._id }).populate(
    'student',
    'firstName lastName email studentId'
  );
  const responses = await Response.find({ exam: exam._id });

  const avgPercentage =
    results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length)
      : 0;

  const report = {
    exam: {
      title: exam.title,
      totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks,
      duration: exam.duration,
      status: exam.status,
    },
    summary: {
      totalAttempts: responses.length,
      submitted: responses.filter((r) =>
        ['submitted', 'graded', 'published'].includes(r.status)
      ).length,
      inProgress: responses.filter((r) => r.status === 'in_progress').length,
      avgPercentage,
      passCount: results.filter((r) => r.passed).length,
      failCount: results.filter((r) => !r.passed).length,
      passRate: results.length
        ? Math.round((results.filter((r) => r.passed).length / results.length) * 100)
        : 0,
      avgWarnings:
        responses.length > 0
          ? Math.round(
              (responses.reduce((s, r) => s + r.warnings, 0) / responses.length) * 10
            ) / 10
          : 0,
    },
    results: results.map((r) => ({
      student: `${r.student.firstName} ${r.student.lastName}`,
      email: r.student.email,
      studentId: r.student.studentId,
      obtainedMarks: r.obtainedMarks,
      totalMarks: r.totalMarks,
      percentage: r.percentage,
      grade: r.grade,
      passed: r.passed,
    })),
  };

  sendSuccess(res, { report });
});

export const getPerformanceAnalytics = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'teacher') {
    const exams = await Exam.find({ createdBy: req.user._id }).select('_id');
    filter.exam = { $in: exams.map((e) => e._id) };
  }

  const results = await Result.find(filter)
    .populate('exam', 'title')
    .populate('student', 'firstName lastName');

  const byExam = {};
  results.forEach((r) => {
    const key = r.exam?._id?.toString() || 'unknown';
    if (!byExam[key]) {
      byExam[key] = {
        title: r.exam?.title || 'Unknown',
        scores: [],
        pass: 0,
        fail: 0,
      };
    }
    byExam[key].scores.push(r.percentage);
    if (r.passed) byExam[key].pass += 1;
    else byExam[key].fail += 1;
  });

  const chartData = Object.values(byExam).map((e) => ({
    title: e.title,
    avgScore: Math.round(e.scores.reduce((a, b) => a + b, 0) / e.scores.length),
    pass: e.pass,
    fail: e.fail,
    attempts: e.scores.length,
  }));

  const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  results.forEach((r) => {
    if (distribution[r.grade] !== undefined) distribution[r.grade] += 1;
  });

  sendSuccess(res, {
    analytics: {
      totalResults: results.length,
      chartData,
      distribution,
      overallAvg:
        results.length > 0
          ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length)
          : 0,
    },
  });
});

export const exportReport = asyncHandler(async (req, res) => {
  const { type = 'exam', examId, format = 'csv' } = req.body;

  let rows = [];
  let title = 'Report';

  if (type === 'exam' && examId) {
    const exam = await Exam.findById(examId);
    if (!exam) throw new AppError('Exam not found', 404);
    assertTeacherExamAccess(req.user, exam);

    const results = await Result.find({ exam: examId }).populate(
      'student',
      'firstName lastName email studentId'
    );
    title = `Exam Report - ${exam?.title || examId}`;
    rows = results.map((r) => ({
      Student: `${r.student.firstName} ${r.student.lastName}`,
      Email: r.student.email,
      StudentID: r.student.studentId || '',
      Marks: r.obtainedMarks,
      Total: r.totalMarks,
      Percentage: r.percentage,
      Grade: r.grade,
      Passed: r.passed ? 'Yes' : 'No',
    }));
  } else if (type === 'students') {
    if (req.user.role === 'teacher') {
      throw new AppError('Teachers cannot export the global students report', 403);
    }
    const students = await User.find({ role: 'student' });
    title = 'Students Report';
    rows = students.map((s) => ({
      Name: `${s.firstName} ${s.lastName}`,
      Email: s.email,
      StudentID: s.studentId || '',
      Institution: s.institution || '',
      Active: s.isActive ? 'Yes' : 'No',
      Verified: s.isEmailVerified ? 'Yes' : 'No',
    }));
  } else if (type === 'activity') {
    if (req.user.role === 'teacher') {
      throw new AppError('Teachers cannot export global activity logs', 403);
    }
    const logs = await ActivityLog.find().sort('-createdAt').limit(500).populate('user', 'email');
    title = 'Activity Logs';
    rows = logs.map((l) => ({
      Action: l.action,
      User: l.user?.email || 'System',
      Details: l.details || '',
      Severity: l.severity,
      IP: l.ipAddress || '',
      Date: l.createdAt?.toISOString(),
    }));
  }

  if (!rows.length) throw new AppError('No data to export', 400);

  const ts = Date.now();
  let fileUrl;

  if (format === 'excel') {
    fileUrl = await exportToExcel(rows, `${type}-${ts}.xlsx`, title);
  } else if (format === 'pdf') {
    fileUrl = await exportToPDF(title, rows, `${type}-${ts}.pdf`);
  } else {
    fileUrl = exportToCSV(rows, `${type}-${ts}.csv`);
  }

  await Report.create({
    title,
    type: type === 'activity' ? 'system' : type === 'students' ? 'student' : 'exam',
    generatedBy: req.user._id,
    filters: { examId, format },
    data: { count: rows.length },
    format,
    fileUrl,
  });

  sendSuccess(res, { fileUrl, count: rows.length }, 'Report exported');
});

export const getLiveMonitoring = asyncHandler(async (req, res) => {
  const exam = await assertExamMonitorAccess(req.user, req.params.examId);

  const responses = await Response.find({
    exam: exam._id,
    status: 'in_progress',
  }).populate('student', 'firstName lastName email');

  sendSuccess(res, {
    monitoring: {
      examId: exam._id,
      title: exam.title,
      onlineCount: responses.length,
      students: responses.map((r) => ({
        responseId: r._id,
        student: r.student,
        warnings: r.warnings,
        timeRemaining: r.timeRemaining,
        currentQuestionIndex: r.currentQuestionIndex,
        progress: r.answers.filter((a) => a.answer != null && a.answer !== '').length,
        totalQuestions: r.answers.length,
        lastActivity: r.autoSavedAt || r.updatedAt,
        warningLogs: r.warningLogs.slice(-5),
      })),
    },
  });
});
