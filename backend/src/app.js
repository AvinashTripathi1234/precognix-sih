import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

// Permitted CORS Origins Whitelist
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigins = [
  clientUrl,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.startsWith('http://localhost') ||
      origin.startsWith('http://127.0.0.1')
    ) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive in development
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-user-role',
    'x-staff-id',
    'x-patient-aadhaar',
    'X-Requested-With',
    'Accept'
  ],
  exposedHeaders: ['Content-Length', 'Content-Type']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight for all routes

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Favicon handler to prevent browser 404 console errors
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Dedicated, lightweight Health Check Polling Endpoint
app.get('/api/health', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root route
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    message: 'SIH26 Rural Medical Triage Backend API is running',
    port: process.env.PORT || 5000,
    health: '/api/health',
    status: '/api/status'
  });
});

// Mount API Routes
app.use(routes);

// 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;
