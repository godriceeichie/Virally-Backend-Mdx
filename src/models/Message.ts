import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  sender: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  campaign: mongoose.Types.ObjectId | null;
  content: string;
  isRead: boolean;
}

const MessageSchema = new Schema<IMessage>(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    campaign: { type: Schema.Types.ObjectId, ref: 'Campaign', default: null },
    content: { type: String, required: true, trim: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

MessageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });

export default mongoose.model<IMessage>('Message', MessageSchema);