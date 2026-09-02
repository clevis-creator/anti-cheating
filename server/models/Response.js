import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    answer: mongoose.Schema.Types.Mixed,
    fileUrl: { type: String, default: '' },
    isCorrect: { type: Boolean, default: null },
    marksAwarded: { type: Number, default: 0 },
    autoGraded: { type: Boolean, default: false },
    aiGraded: { type: Boolean, default: false },
    manuallyGraded: { type: Boolean, default: false },
    feedback: { type: String, default: '' },
    flagged: { type: Boolean, default: false },
    timeSpent: { type: Number, default: 0 },
  },
  { _id: true }
);

const responseSchema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    answers: [answerSchema],
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'submitted', 'graded', 'published'],
      default: 'not_started',
    },
    attemptNumber: { type: Number, default: 1 },
    startedAt: Date,
    submittedAt: Date,
    timeRemaining: { type: Number },
    autoSavedAt: Date,
    currentQuestionIndex: { type: Number, default: 0 },
    flaggedQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    warnings: { type: Number, default: 0 },
    sessionToken: { type: String, select: false },
    sessionFingerprint: { type: String, select: false },
    lastWarningAt: Date,
    lastWarningType: String,
    sebVerified: { type: Boolean, default: false },
    warningLogs: [
      {
        type: { type: String },
        message: String,
        severity: { type: String, default: 'warning' },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    ipAddress: String,
    userAgent: String,
    deviceInfo: {
      browser: String,
      os: String,
      device: String,
    },
    activityLog: [
      {
        action: String,
        details: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    proctoring: {
      consentGiven: { type: Boolean, default: false },
      consentAt: Date,
      media: [
        {
          type: { type: String },
          url: String,
          filename: String,
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
    },
    score: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    totalMarks: { type: Number, default: 0 },
    obtainedMarks: { type: Number, default: 0 },
  },
  { timestamps: true }
);

responseSchema.index({ exam: 1, student: 1, attemptNumber: 1 }, { unique: true });

export default mongoose.model('Response', responseSchema);
