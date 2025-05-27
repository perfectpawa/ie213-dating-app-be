const socketIO = require('socket.io');
let io;

// Initialize Socket.io
const initializeSocket = (server) => {
    io = socketIO(server, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:5173',
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            credentials: true,
            transports: ['websocket', 'polling']
        },
        allowEIO3: true,
        pingTimeout: 60000,
        pingInterval: 25000
    });

    // Handle socket connections
    io.on('connection', (socket) => {
        console.log('New client connected');

        // Join user's personal room for notifications
        socket.on('join', (userId) => {
            socket.join(`user_${userId}`);
            console.log(`User ${userId} joined their notification room`);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected');
        });
    });

    return io;
};

// Get Socket.io instance
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};

// Emit notification to specific user
const emitNotification = (userId, notification) => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    io.to(`user_${userId}`).emit('notification', notification);
};

module.exports = {
    initializeSocket,
    getIO,
    emitNotification
}; 