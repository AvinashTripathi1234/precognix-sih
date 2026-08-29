import express from 'express';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';

const router = express.Router();

// GET /api/health
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// GET /api/status
router.get('/status', (req, res) => {
  res.json({
    server: 'Express.js',
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
    socketIO: 'Active',
    supabase: {
      configured: isSupabaseConfigured(),
      status: isSupabaseConfigured() ? 'Connected / Ready' : 'Placeholder keys (set SUPABASE_URL & SUPABASE_ANON_KEY in .env)'
    }
  });
});

// GET /api/supabase-test
router.get('/supabase-test', async (req, res, next) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(200).json({
        success: false,
        message: 'Supabase credentials are not configured or are placeholders in backend/.env',
        configured: false
      });
    }

    // Try a simple ping query (e.g. check connection or auth settings)
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        error
      });
    }

    res.json({
      success: true,
      message: 'Supabase client initialized and reachable',
      sessionData: data
    });
  } catch (err) {
    next(err);
  }
});

export default router;
