import mongoose from 'mongoose';

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    instructions: { type: String, default: '' },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    totalMarks: { type: Number, default: 0 },
    passingMarks: { type: Number, default: 0 },
    duration: { type: Number, required: true, min: 1 },
    startTime: { type: Date },
    endTime: { type: Date },
    status: {
      type: String,
      enum: ['draft', 'published', 'active', 'closed', 'archived'],
      default: 'draft',
    },
    settings: {
      shuffleQuestions: { type: Boolean, default: false },
      shuffleOptions: { type: Boolean, default: false },
      showResults: { type: Boolean, default: true },
      showCorrectAnswers: { type: Boolean, default: false },
      allowReview: { type: Boolean, default: true },
      maxAttempts: { type: Number, default: 1 },
      autoSubmit: { type: Boolean, default: true },
      requireFullscreen: { type: Boolean, default: true },
      requireSEB: { type: Boolean, default: false },
      antiCheat: {
        enabled: { type: Boolean, default: true },
        maxWarnings: { type: Number, default: 3 },
        detectTabSwitch: { type: Boolean, default: true },
        disableCopyPaste: { type: Boolean, default: true },
        disableRightClick: { type: Boolean, default: true },
        disableSelection: { type: Boolean, default: true },
        blockDevTools: { type: Boolean, default: true },
        logActivity: { type: Boolean, default: true },
      },
      aiGrading: { type: Boolean, default: true },
    },
    assignedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    accessCode: { type: String, default: '' },
    sebConfigKeyHash: { type: String, default: '' },
    coverImage: { type: String, default: '' },
  },
  { timestamps: true }
);

examSchema.index({ createdBy: 1, status: 1 });
examSchema.index({ assignedStudents: 1, status: 1 });
examSchema.index({ startTime: 1, endTime: 1 });

export default mongoose.model('Exam', examSchema);
