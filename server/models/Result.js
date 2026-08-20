import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    response: { type: mongoose.Schema.Types.ObjectId, ref: 'Response', required: true },
    totalMarks: { type: Number, required: true },
    obtainedMarks: { type: Number, required: true },
    percentage: { type: Number, required: true },
    grade: { type: String, default: '' },
    passed: { type: Boolean, required: true },
    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
    unansweredCount: { type: Number, default: 0 },
    published: { type: Boolean, default: false },
    publishedAt: Date,
    certificateUrl: { type: String, default: '' },
    teacherComments: { type: String, default: '' },
  },
  { timestamps: true }
);

resultSchema.index({ exam: 1, student: 1 }, { unique: true });

export default mongoose.model('Result', resultSchema);
