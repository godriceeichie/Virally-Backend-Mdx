import mongoose, { Document, Schema } from 'mongoose';

export interface IFeedback extends Document {
  campaign: mongoose.Types.ObjectId;
  fromUser: mongoose.Types.ObjectId;
  toUser: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  fromRole: 'creator' | 'organisation';
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    campaign: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
    fromUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
    fromRole: { type: String, enum: ['creator', 'organisation'], required: true },
  },
  { timestamps: true }
);

// One feedback per user per campaign
FeedbackSchema.index({ campaign: 1, fromUser: 1 }, { unique: true });

export default mongoose.model<IFeedback>('Feedback', FeedbackSchema);