import mongoose, { Document, Schema } from 'mongoose';

export interface IApplication extends Document {
  campaign: mongoose.Types.ObjectId;
  creator: mongoose.Types.ObjectId;
  coverNote: string;
  proposedRate: number;
  status: 'pending' | 'approved' | 'rejected';
  contentSubmissionUrl: string;
  submittedAt: Date | null;
  approvedAt: Date | null;
  feedback: string;
}

const ApplicationSchema = new Schema<IApplication>(
  {
    campaign: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    coverNote: { type: String, default: '' },
    proposedRate: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    contentSubmissionUrl: { type: String, default: '' },
    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    feedback: { type: String, default: '' },
  },
  { timestamps: true }
);

// One application per creator per campaign
ApplicationSchema.index({ campaign: 1, creator: 1 }, { unique: true });

export default mongoose.model<IApplication>('Application', ApplicationSchema);