import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

// CORS configuration
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({
  origin: [clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root health route
app.get('/', (req, res) => {
  res.json({
    message: 'SIH26 Backend API Server is running',
    docs: '/api/status',
    health: '/api/health'
  });
});

// API Routes
app.use(routes);

// 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;
