import { Router, Response } from 'express';
import Application from '../models/Application';
import Campaign from '../models/Campaign';
import CreatorProfile from '../models/CreatorProfile';
import { protect, requireRole } from '../middleware/auth';
import { AuthRequest } from '../types';
import mongoose from 'mongoose';

const router = Router();

// POST /api/applications — creator applies to a campaign
router.post('/', protect, requireRole('creator'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { campaignId, coverNote, proposedRate } = req.body;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign || campaign.status !== 'active') {
      res.status(404).json({ message: 'Campaign not found or not accepting applications' });
      return;
    }

    if (campaign.currentParticipants >= campaign.maxParticipants) {
      res.status(400).json({ message: 'Campaign has reached its participant limit' });
      return;
    }

    const existing = await Application.findOne({
      campaign: campaignId,
      creator: req.user?.id,
    });
    if (existing) {
      res.status(409).json({ message: 'You have already applied to this campaign' });
      return;
    }

    const application = await Application.create({
      campaign: campaignId,
      creator: req.user?.id,
      coverNote,
      proposedRate,
    });

    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// GET /api/applications/mine — creator sees their own applications
router.get('/mine', protect, requireRole('creator'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const applications = await Application.find({ creator: req.user?.id })
      .populate('campaign', 'title status deadline budget organisation')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// GET /api/applications/campaign/:campaignId — org sees applicants for their campaign
router.get('/campaign/:campaignId', protect, requireRole('organisation'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.campaignId,
      organisation: req.user?.id,
    });

    if (!campaign) {
      res.status(404).json({ message: 'Campaign not found or not authorised' });
      return;
    }

    const applications = await Application.find({ campaign: req.params.campaignId })
      .populate({
        path: 'creator',
        select: 'name email',
      })
      .sort({ createdAt: -1 });

    // Attach creator profiles alongside each application
    const enriched = await Promise.all(
      applications.map(async (app) => {
        const profile = await CreatorProfile.findOne({ user: app.creator });
        return { ...app.toObject(), creatorProfile: profile };
      })
    );

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// PATCH /api/applications/:id/status — org approves or rejects an application
router.patch('/:id/status', protect, requireRole('organisation'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, feedback } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      res.status(400).json({ message: 'Status must be approved or rejected' });
      return;
    }

    const application = await Application.findById(req.params.id)
      .populate<{ campaign: InstanceType<typeof Campaign> }>('campaign');

    if (!application) {
      res.status(404).json({ message: 'Application not found' });
      return;
    }

    const campaign = application.campaign as InstanceType<typeof Campaign>;

    // Verify the org owns this campaign
    if (campaign.organisation.toString() !== req.user?.id) {
      res.status(403).json({ message: 'Not authorised' });
      return;
    }

    if (status === 'approved') {
      if (campaign.currentParticipants >= campaign.maxParticipants) {
        res.status(400).json({ message: 'Campaign participant limit reached' });
        return;
      }
      application.approvedAt = new Date();
      campaign.currentParticipants += 1;
      campaign.selectedCreators.push(application.creator as mongoose.Types.ObjectId);
      await campaign.save();
    }

    application.status = status;
    if (feedback) application.feedback = feedback;
    await application.save();

    res.json(application);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// PATCH /api/applications/:id/submit — creator submits content URL
router.patch('/:id/submit', protect, requireRole('creator'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { contentSubmissionUrl } = req.body;

    if (!contentSubmissionUrl) {
      res.status(400).json({ message: 'Content URL is required' });
      return;
    }

    const application = await Application.findOne({
      _id: req.params.id,
      creator: req.user?.id,
      status: 'approved',
    });

    if (!application) {
      res.status(404).json({ message: 'Approved application not found' });
      return;
    }

    application.contentSubmissionUrl = contentSubmissionUrl;
    application.submittedAt = new Date();
    await application.save();

    // Update collaborations count on creator profile
    await CreatorProfile.findOneAndUpdate(
      { user: req.user?.id },
      { $inc: { totalCollaborations: 1 } }
    );

    res.json(application);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;