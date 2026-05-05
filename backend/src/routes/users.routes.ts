import { Router, Request, Response } from 'express';
import { asyncHandler } from '@middleware/errorHandler.js';

const router = Router();

const getUsers = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: [], message: 'To be implemented' });
});

const getProfile = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: {}, message: 'To be implemented' });
});

const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, message: 'To be implemented' });
});

router.get('/', getUsers);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

export default router;
