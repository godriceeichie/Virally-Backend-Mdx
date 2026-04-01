import mongoose, { Document, Schema } from 'mongoose';

export interface ICampaign extends Document {
  organisation: mongoose.Types.ObjectId;
  title: string;
  description: string;
  niche: string[];
  contentType: string[];
  budget: number;
  tier: 'basic' | 'standard' | 'premium';
  maxParticipants: number;
  currentParticipants: number;
  requirements: string;
  deadline: Date;
  status: 'draft' | 'active' | 'closed' | 'completed';
  selectedCreators: mongoose.Types.ObjectId[];
}

const CampaignSchema = new Schema<ICampaign>(
  {
    organisation: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    niche: [{ type: String, trim: true }],
    contentType: [{ type: String, trim: true }],
    budget: { type: Number, required: true, min: 0 },
    tier: { type: String, enum: ['basic', 'standard', 'premium'], default: 'basic' },
    maxParticipants: { type: Number, required: true, min: 1 },
    currentParticipants: { type: Number, default: 0 },
    requirements: { type: String, default: '' },
    deadline: { type: Date, required: true },
    status: { type: String, enum: ['draft', 'active', 'closed', 'completed'], default: 'draft' },
    selectedCreators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

CampaignSchema.index({ status: 1, niche: 1, deadline: 1 });

export default mongoose.model<ICampaign>('Campaign', CampaignSchema);