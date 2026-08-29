import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import app from './app.js';
import { setupSocketHandlers } from './sockets/socketHandler.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Setup Socket.io handlers
setupSocketHandlers(io);

// Start server
server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`📡 HTTP API: http://localhost:${PORT}`);
  console.log(`🔌 Socket.io: ws://localhost:${PORT}`);
  console.log(`🎯 Client Origin: ${CLIENT_URL}`);
  console.log(`=========================================`);
});

export { app, server, io };
