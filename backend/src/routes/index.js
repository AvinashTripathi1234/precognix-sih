import express from 'express';
import apiRoutes from './api.js';
import referralRoutes from './referrals.js';

const router = express.Router();

// Mount API routes under /api
router.use('/api', apiRoutes);
router.use('/api', referralRoutes);

export default router;
