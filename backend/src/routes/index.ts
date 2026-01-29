import { Router } from 'express';
import authRoutes from './auth.routes';
import datasetRoutes from './dataset.routes';
import assetRoutes from './asset.routes';
import labelsetRoutes from './labelset.routes';
import listingRoutes from './listing.routes';

const router = Router();

// Mount all route modules
router.use('/auth', authRoutes);
router.use('/datasets', datasetRoutes);
router.use('/assets', assetRoutes);
router.use('/labelsets', labelsetRoutes);
router.use('/listings', listingRoutes);

export default router;
