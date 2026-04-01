import { Router, Response } from 'express';
import Feedback from '../models/Feedback';
import CreatorProfile from '../models/CreatorProfile';
import Application from '../models/Application';
import { protect } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

// POST /api/feedback — submit feedback after a completed collaboration
router.post('/', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { campaignId, toUserId, rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ message: 'Rating must be between 1 and 5' });
      return;
    }

    // Verify there's an approved application linking these two users on this campaign
    const applicationFilter =
      req.user?.role === 'creator'
        ? { campaign: campaignId, creator: req.user.id, status: 'approved' }
        : { campaign: campaignId, creator: toUserId, status: 'approved' };

    const application = await Application.findOne(applicationFilter);
    if (!application) {
      res.status(403).json({ message: 'No approved collaboration found for this campaign' });
      return;
    }

    const existing = await Feedback.findOne({
      campaign: campaignId,
      fromUser: req.user?.id,
    });
    if (existing) {
      res.status(409).json({ message: 'You have already submitted feedback for this campaign' });
      return;
    }

    const feedback = await Feedback.create({
      campaign: campaignId,
      fromUser: req.user?.id,
      toUser: toUserId,
      rating,
      comment,
      fromRole: req.user?.role,
    });

    // Recalculate creator's average rating whenever they receive new feedback
    if (req.user?.role === 'organisation') {
      const allFeedback = await Feedback.find({
        toUser: toUserId,
        fromRole: 'organisation',
      });
      const avg =
        allFeedback.reduce((sum, f) => sum + f.rating, 0) / allFeedback.length;

      await CreatorProfile.findOneAndUpdate(
        { user: toUserId },
        { averageRating: Math.round(avg * 10) / 10 }
      );
    }

    res.status(201).json(feedback);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// GET /api/feedback/user/:userId — get all feedback for a user
router.get('/user/:userId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const feedback = await Feedback.find({ toUser: req.params.userId })
      .populate('fromUser', 'name role')
      .populate('campaign', 'title')
      .sort({ createdAt: -1 });

    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// GET /api/feedback/campaign/:campaignId — get all feedback for a campaign
router.get('/campaign/:campaignId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const feedback = await Feedback.find({ campaign: req.params.campaignId })
      .populate('fromUser', 'name role')
      .populate('toUser', 'name')
      .sort({ createdAt: -1 });

    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;