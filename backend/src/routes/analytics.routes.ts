import { Router, Request, Response } from 'express';
import { asyncHandler } from '@middleware/errorHandler.js';

const router = Router();

const getAnalytics = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: {}, message: 'To be implemented' });
});

const getReports = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: [], message: 'To be implemented' });
});

router.get('/', getAnalytics);
router.get('/reports', getReports);

export default router;
