import mongoose, { Document, Schema } from 'mongoose';

export interface ICreatorProfile extends Document {
  user: mongoose.Types.ObjectId;
  bio: string;
  niche: string[];
  contentType: string[];
  audienceDemographics: {
    ageRange: string;
    location: string;
    gender: string;
  };
  engagementRate: number;
  followerCount: number;
  portfolioLinks: string[];
  socialLinks: {
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    twitter?: string;
  };
  averageRating: number;
  totalCollaborations: number;
  isAvailable: boolean;
}

const CreatorProfileSchema = new Schema<ICreatorProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    bio: { type: String, maxlength: 500, default: '' },
    niche: [{ type: String, trim: true }],
    contentType: [{ type: String, trim: true }],
    audienceDemographics: {
      ageRange: { type: String, default: '' },
      location: { type: String, default: '' },
      gender: { type: String, default: '' },
    },
    engagementRate: { type: Number, default: 0, min: 0, max: 100 },
    followerCount: { type: Number, default: 0 },
    portfolioLinks: [{ type: String }],
    socialLinks: {
      instagram: String,
      tiktok: String,
      youtube: String,
      twitter: String,
    },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalCollaborations: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Index for search/filter queries
CreatorProfileSchema.index({ niche: 1, engagementRate: -1, followerCount: -1 });

export default mongoose.model<ICreatorProfile>('CreatorProfile', CreatorProfileSchema);