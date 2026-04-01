import { Router, Response } from 'express';
import Campaign from '../models/Campaign';
import { protect, requireRole } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

// GET /api/campaigns — list active campaigns (creators browse these)
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      niche,
      contentType,
      tier,
      minBudget,
      maxBudget,
      page = '1',
      limit = '12',
    } = req.query;

    const filter: Record<string, unknown> = { status: 'active' };

    if (niche) filter.niche = { $in: (niche as string).split(',') };
    if (contentType) filter.contentType = { $in: (contentType as string).split(',') };
    if (tier) filter.tier = tier;
    if (minBudget || maxBudget) {
      filter.budget = {
        ...(minBudget && { $gte: Number(minBudget) }),
        ...(maxBudget && { $lte: Number(maxBudget) }),
      };
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, parseInt(limit as string));
    const skip = (pageNum - 1) * limitNum;

    const [campaigns, total] = await Promise.all([
      Campaign.find(filter)
        .populate('organisation', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Campaign.countDocuments(filter),
    ]);

    res.json({
      campaigns,
      pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// GET /api/campaigns/mine — org sees their own campaigns
router.get('/mine', protect, requireRole('organisation'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const campaigns = await Campaign.find({ organisation: req.user?.id })
      .sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// GET /api/campaigns/:id — single campaign detail
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('organisation', 'name email')
      .populate('selectedCreators', 'name email');

    if (!campaign) {
      res.status(404).json({ message: 'Campaign not found' });
      return;
    }

    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// POST /api/campaigns — org creates a campaign
router.post('/', protect, requireRole('organisation'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title, description, niche, contentType,
      budget, tier, maxParticipants, requirements, deadline,
    } = req.body;

    if (!title || !description || !budget || !maxParticipants || !deadline) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }

    const campaign = await Campaign.create({
      organisation: req.user?.id,
      title, description, niche, contentType,
      budget, tier, maxParticipants, requirements,
      deadline: new Date(deadline),
      status: 'draft',
    });

    res.status(201).json(campaign);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// PUT /api/campaigns/:id — org updates their campaign
router.put('/:id', protect, requireRole('organisation'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      organisation: req.user?.id,
    });

    if (!campaign) {
      res.status(404).json({ message: 'Campaign not found or not authorised' });
      return;
    }

    if (campaign.status === 'completed') {
      res.status(400).json({ message: 'Cannot edit a completed campaign' });
      return;
    }

    const disallowed = ['organisation', 'selectedCreators', 'currentParticipants'];
    disallowed.forEach((field) => delete req.body[field]);

    Object.assign(campaign, req.body);
    await campaign.save();

    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// PATCH /api/campaigns/:id/status — org changes campaign status
router.patch('/:id/status', protect, requireRole('organisation'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const validTransitions: Record<string, string[]> = {
      draft: ['active'],
      active: ['closed'],
      closed: ['completed'],
    };

    const campaign = await Campaign.findOne({
      _id: req.params.id,
      organisation: req.user?.id,
    });

    if (!campaign) {
      res.status(404).json({ message: 'Campaign not found or not authorised' });
      return;
    }

    if (!validTransitions[campaign.status]?.includes(status)) {
      res.status(400).json({
        message: `Cannot transition from ${campaign.status} to ${status}`,
      });
      return;
    }

    campaign.status = status;
    await campaign.save();

    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// DELETE /api/campaigns/:id — org deletes a draft campaign only
router.delete('/:id', protect, requireRole('organisation'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      organisation: req.user?.id,
    });

    if (!campaign) {
      res.status(404).json({ message: 'Campaign not found or not authorised' });
      return;
    }

    if (campaign.status !== 'draft') {
      res.status(400).json({ message: 'Only draft campaigns can be deleted' });
      return;
    }

    await campaign.deleteOne();
    res.json({ message: 'Campaign deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;