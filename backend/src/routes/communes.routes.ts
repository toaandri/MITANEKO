import { Router, Request, Response } from 'express';
import { asyncHandler } from '@middleware/errorHandler.js';

const router = Router();

const getCommunes = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: [], message: 'To be implemented' });
});

const getCommune = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: {}, message: 'To be implemented' });
});

const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: {}, message: 'To be implemented' });
});

const getStats = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: {}, message: 'To be implemented' });
});

router.get('/', getCommunes);
router.get('/:id', getCommune);
router.get('/:id/dashboard', getDashboard);
router.get('/:id/stats', getStats);

export default router;
