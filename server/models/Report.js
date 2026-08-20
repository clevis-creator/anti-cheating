import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ['student', 'teacher', 'exam', 'performance', 'system'],
      required: true,
    },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filters: { type: mongoose.Schema.Types.Mixed },
    data: { type: mongoose.Schema.Types.Mixed },
    format: { type: String, enum: ['json', 'pdf', 'excel', 'csv'], default: 'json' },
    fileUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Report', reportSchema);
