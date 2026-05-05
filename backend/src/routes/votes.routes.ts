import { Router, Request, Response } from 'express';
import { asyncHandler } from '@middleware/errorHandler.js';

const router = Router();

// POST /api/signalements/:id/votes - Vote for signalement
const createVote = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json({
    success: true,
    message: 'Vote created - To be implemented'
  });
});

// DELETE /api/signalements/:id/votes - Remove vote
const removeVote = asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Vote removed - To be implemented'
  });
});

// GET /api/votes - Get votes
const getVotes = asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: [],
    message: 'Get votes - To be implemented'
  });
});

router.get('/', getVotes);
router.post('/signalements/:id/votes', createVote);
router.delete('/signalements/:id/votes', removeVote);

export default router;
