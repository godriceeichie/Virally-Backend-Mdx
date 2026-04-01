import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: 'creator' | 'organisation';
  };
}

export type UserRole = 'creator' | 'organisation';

export type CampaignStatus = 'draft' | 'active' | 'closed' | 'completed';

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export type CampaignTier = 'basic' | 'standard' | 'premium';