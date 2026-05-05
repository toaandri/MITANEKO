import { Router, Request, Response } from 'express';
import { asyncHandler } from '@middleware/errorHandler.js';

const router = Router();

const getQuartiers = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: [], message: 'To be implemented' });
});

const getQuartier = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: {}, message: 'To be implemented' });
});

router.get('/', getQuartiers);
router.get('/:id', getQuartier);

export default router;
