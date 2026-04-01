import { Router, Response } from 'express';
import CreatorProfile from '../models/CreatorProfile';
import User from '../models/User';
import { protect, requireRole } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

// GET /api/creators — search & filter all creator profiles
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      niche,
      contentType,
      minEngagement,
      maxEngagement,
      minFollowers,
      available,
      sortBy = 'engagementRate',
      order = 'desc',
      page = '1',
      limit = '12',
    } = req.query;

    const filter: Record<string, unknown> = {};

    if (niche) filter.niche = { $in: (niche as string).split(',') };
    if (contentType) filter.contentType = { $in: (contentType as string).split(',') };
    if (available === 'true') filter.isAvailable = true;
    if (minEngagement || maxEngagement) {
      filter.engagementRate = {
        ...(minEngagement && { $gte: Number(minEngagement) }),
        ...(maxEngagement && { $lte: Number(maxEngagement) }),
      };
    }
    if (minFollowers) filter.followerCount = { $gte: Number(minFollowers) };

    const sortOrder = order === 'asc' ? 1 : -1;
    const validSortFields = ['engagementRate', 'followerCount', 'averageRating', 'totalCollaborations'];
    const sortField = validSortFields.includes(sortBy as string) ? (sortBy as string) : 'engagementRate';

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, parseInt(limit as string));
    const skip = (pageNum - 1) * limitNum;

    const [profiles, total] = await Promise.all([
      CreatorProfile.find(filter)
        .populate('user', 'name email')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limitNum),
      CreatorProfile.countDocuments(filter),
    ]);

    res.json({
      profiles,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// GET /api/creators/:userId — get a single creator profile
router.get('/:userId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const profile = await CreatorProfile.findOne({ user: req.params.userId })
      .populate('user', 'name email createdAt');

    if (!profile) {
      res.status(404).json({ message: 'Creator profile not found' });
      return;
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// PUT /api/creators/profile — update own creator profile
router.put('/profile', protect, requireRole('creator'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const updates = req.body;

    // Strip fields that shouldn't be manually set
    delete updates.user;
    delete updates.averageRating;
    delete updates.totalCollaborations;

    const profile = await CreatorProfile.findOneAndUpdate(
      { user: req.user?.id },
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('user', 'name email');

    if (!profile) {
      res.status(404).json({ message: 'Creator profile not found' });
      return;
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;