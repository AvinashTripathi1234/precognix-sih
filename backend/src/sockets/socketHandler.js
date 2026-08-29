/**
 * Socket.io Event Handlers
 * @param {import('socket.io').Server} io
 */
export const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 [Socket.io] Client connected: ${socket.id}`);

    // Send welcome message to newly connected client
    socket.emit('server:welcome', {
      message: 'Connected to backend Socket.io server',
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });

    // Handle ping event
    socket.on('client:ping', (data) => {
      console.log(`📡 [Socket.io] Ping received from ${socket.id}:`, data);
      socket.emit('server:pong', {
        reply: 'pong',
        receivedAt: new Date().toISOString(),
        clientData: data
      });
    });

    // Handle broadcast message
    socket.on('client:message', (data) => {
      console.log(`💬 [Socket.io] Message from ${socket.id}:`, data);
      // Broadcast to all connected clients including sender
      io.emit('server:broadcast', {
        senderId: socket.id,
        message: data.message || data,
        timestamp: new Date().toISOString()
      });
    });

    // Handle room joining
    socket.on('client:join_room', (roomName) => {
      socket.join(roomName);
      console.log(`🚪 [Socket.io] Client ${socket.id} joined room: ${roomName}`);
      socket.emit('server:room_joined', { room: roomName });
    });

    // Disconnect event
    socket.on('disconnect', (reason) => {
      console.log(`❌ [Socket.io] Client disconnected: ${socket.id} (Reason: ${reason})`);
    });
  });
};

export default setupSocketHandlers;
