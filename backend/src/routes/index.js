import express from 'express';
import apiRoutes from './api.js';
import authRoutes from './auth.js';

const router = express.Router();

// Mount Auth routes under /api/auth
router.use('/api/auth', authRoutes);

// Mount core API routes under /api
router.use('/api', apiRoutes);

export default router;
