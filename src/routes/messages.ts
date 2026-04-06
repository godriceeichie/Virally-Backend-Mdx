import { Router, Response } from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message';
import { protect } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

// POST /api/messages — send a message
router.post('/', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { recipientId, content, campaignId } = req.body;

    if (!recipientId || !content?.trim()) {
      res.status(400).json({ message: 'Recipient and content are required' });
      return;
    }

    if (recipientId === req.user?.id) {
      res.status(400).json({ message: 'Cannot message yourself' });
      return;
    }

    const message = await Message.create({
      sender: req.user?.id,
      recipient: recipientId,
      content: content.trim(),
      campaign: campaignId || null,
    });

    const populated = await message.populate([
      { path: 'sender', select: 'name email' },
      { path: 'recipient', select: 'name email' },
    ]);
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// GET /api/messages/conversations — list all unique conversation partners (most recent message each)
router.get('/conversations', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Must cast to ObjectId — aggregation pipelines do NOT auto-cast strings like Model.find() does
    const userId = new mongoose.Types.ObjectId(req.user?.id);

    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: userId }, { recipient: userId }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            // Canonical pair key so (A→B) and (B→A) land in the same bucket
            $cond: [
              { $lt: ['$sender', '$recipient'] },
              { a: '$sender', b: '$recipient' },
              { a: '$recipient', b: '$sender' },
            ],
          },
          lastMessage: { $first: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$lastMessage' } },
      { $sort: { createdAt: -1 } },
    ]);

    const populated = await Message.populate(conversations, [
      { path: 'sender',    select: 'name email' },
      { path: 'recipient', select: 'name email' },
    ]);

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// GET /api/messages/unread/count — must be before /:userId so it isn't swallowed
router.get('/unread/count', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const count = await Message.countDocuments({
      recipient: req.user?.id,
      isRead: false,
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// GET /api/messages/:userId — full thread with a specific user + mark incoming as read
router.get('/:userId', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user?.id,      recipient: req.params.userId },
        { sender: req.params.userId, recipient: req.user?.id },
      ],
    })
      .populate('sender',    'name email')
      .populate('recipient', 'name email')
      .sort({ createdAt: 1 });

    // Mark any unread messages sent to the current user as read
    await Message.updateMany(
      { sender: req.params.userId, recipient: req.user?.id, isRead: false },
      { $set: { isRead: true } }
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;
