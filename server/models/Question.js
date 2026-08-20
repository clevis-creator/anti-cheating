import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    isCorrect: { type: Boolean, default: false },
    matchKey: { type: String, default: '' },
  },
  { _id: true }
);

const questionSchema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', index: true },
    bank: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'multiple_choice',
        'checkbox',
        'true_false',
        'short_answer',
        'essay',
        'fill_blank',
        'matching',
        'dropdown',
        'image',
        'video',
        'file_upload',
      ],
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    required: { type: Boolean, default: true },
    marks: { type: Number, default: 1, min: 0 },
    explanation: { type: String, default: '' },
    randomizeOptions: { type: Boolean, default: false },
    options: [optionSchema],
    correctAnswers: [String],
    blanks: [{ placeholder: String, answers: [String] }],
    matchingPairs: [{ left: String, right: String }],
    mediaUrl: { type: String, default: '' },
    mediaType: { type: String, enum: ['', 'image', 'video', 'audio', 'file'], default: '' },
    referenceAnswer: { type: String, default: '' },
    rubric: { type: String, default: '' },
    autoGrade: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    tags: [String],
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Question', questionSchema);
