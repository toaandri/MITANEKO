import { Router, Request, Response } from 'express';
import { asyncHandler } from '@middleware/errorHandler.js';

const router = Router();

// ==========================================
// Signalement Routes
// ==========================================

// GET /api/signalements - Get all signalements with filters
const getSignalements = asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Get signalements - To be implemented'
  });
});

// GET /api/signalements/:id - Get single signalement
const getSignalement = asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Get signalement - To be implemented'
  });
});

// POST /api/signalements - Create signalement
const createSignalement = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json({
    success: true,
    message: 'Create signalement - To be implemented'
  });
});

// PUT /api/signalements/:id - Update signalement
const updateSignalement = asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Update signalement - To be implemented'
  });
});

// DELETE /api/signalements/:id - Delete signalement
const deleteSignalement = asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Delete signalement - To be implemented'
  });
});

// GET /api/signalements/map/geojson - Get GeoJSON for map
const getGeoJSON = asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    type: 'FeatureCollection',
    features: []
  });
});

// ==========================================
// Routes
// ==========================================

router.get('/', getSignalements);
router.get('/map/geojson', getGeoJSON);
router.get('/:id', getSignalement);
router.post('/', createSignalement);
router.put('/:id', updateSignalement);
router.delete('/:id', deleteSignalement);

export default router;
