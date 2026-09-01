import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import app from './app.js';
import { setupSocketHandlers } from './sockets/socketHandler.js';

// Load environment variables
dotenv.config();

const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = process.env.HOST || '0.0.0.0'; // Explicit IPv4 binding
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const allowedOrigins = [
  CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
].filter(Boolean);

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io with dual-layer CORS
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1')
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in local development
    },
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-role', 'x-staff-id', 'x-patient-aadhaar']
  }
});

// Bind io instance to express app context for route access
app.set('io', io);

// Setup Socket.io handlers
setupSocketHandlers(io);

// Handle server startup errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ [SERVER ERROR]: Port ${PORT} is already in use.`);
  } else {
    console.error('❌ [SERVER ERROR]:', error);
  }
});

// Start server explicitly listening on IPv4 port 5000
server.listen(PORT, HOST, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`=========================================`);
  console.log(`🚀 Rural Emergency Triage Backend Ready`);
  console.log(`📡 HTTP API: http://127.0.0.1:${PORT}`);
  console.log(`🔌 Socket.io: ws://127.0.0.1:${PORT}`);
  console.log(`🎯 Whitelisted Origins: ${allowedOrigins.join(', ')}`);
  console.log(`=========================================`);
});

export { app, server, io };
