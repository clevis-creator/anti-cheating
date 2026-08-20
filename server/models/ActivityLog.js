import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    resource: { type: String, default: '' },
    resourceId: { type: mongoose.Schema.Types.ObjectId },
    details: { type: String, default: '' },
    ipAddress: String,
    userAgent: String,
    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam' },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
  },
  { timestamps: true }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('ActivityLog', activityLogSchema);
