import mongoose from 'mongoose';

const aiGradeSchema = new mongoose.Schema(
  {
    response: { type: mongoose.Schema.Types.ObjectId, ref: 'Response', required: true },
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    studentAnswer: { type: String, required: true },
    referenceAnswer: { type: String, default: '' },
    rubric: { type: String, default: '' },
    maxMarks: { type: Number, required: true },
    score: { type: Number, required: true },
    feedback: { type: String, default: '' },
    reasoning: { type: String, default: '' },
    suggestions: { type: String, default: '' },
    provider: { type: String, enum: ['gemini', 'openai'], required: true },
    overridden: { type: Boolean, default: false },
    overrideScore: { type: Number },
    overrideFeedback: { type: String },
    overriddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rawResponse: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

aiGradeSchema.index({ response: 1, question: 1 }, { unique: true });

export default mongoose.model('AIGrade', aiGradeSchema);
