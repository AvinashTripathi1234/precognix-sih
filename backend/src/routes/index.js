import express from 'express';
import apiRoutes from './api.js';

const router = express.Router();

// Mount API routes under /api
router.use('/api', apiRoutes);

export default router;
