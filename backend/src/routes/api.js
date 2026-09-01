import express from 'express';
import { isSupabaseConfigured, supabaseUrl, supabaseAnonKey } from '../config/supabase.js';

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

    // Hit Supabase's own health-check endpoint to confirm the project is actually
    // reachable over the network (independent of whether any tables exist yet).
    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`
      }
    });

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        message: `Supabase project responded with HTTP ${response.status}`,
        configured: true
      });
    }

    res.json({
      success: true,
      message: 'Supabase project is configured and reachable',
      configured: true
    });
  } catch (err) {
    next(err);
  }
});

export default router;
