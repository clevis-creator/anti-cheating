import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, default: '' },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    semester: { type: String, default: '' },
    academicYear: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    coverImage: { type: String, default: '' },
  },
  { timestamps: true }
);

courseSchema.index({ code: 1, teacher: 1 }, { unique: true });

export default mongoose.model('Course', courseSchema);
