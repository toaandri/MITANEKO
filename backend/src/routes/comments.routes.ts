import { Router, Request, Response } from 'express';
import { asyncHandler } from '@middleware/errorHandler.js';

const router = Router();

const getComments = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: [], message: 'To be implemented' });
});

const createComment = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json({ success: true, message: 'To be implemented' });
});

const deleteComment = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, message: 'To be implemented' });
});

router.get('/', getComments);
router.post('/', createComment);
router.delete('/:id', deleteComment);

export default router;
