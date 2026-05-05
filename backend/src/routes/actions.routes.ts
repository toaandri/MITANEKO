import { Router, Request, Response } from 'express';
import { asyncHandler } from '@middleware/errorHandler.js';

const router = Router();

const getActions = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: [], message: 'To be implemented' });
});

const createAction = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json({ success: true, message: 'To be implemented' });
});

const updateAction = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, message: 'To be implemented' });
});

router.get('/', getActions);
router.post('/', createAction);
router.put('/:id', updateAction);

export default router;
