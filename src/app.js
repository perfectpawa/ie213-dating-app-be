const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
require('dotenv').config();

// Import route files
const userRoutes = require('./routes/userRoutes');
const matchRoutes = require('./routes/matchRoutes');
const messageRoutes = require('./routes/messageRoutes');
const swipeRoutes = require('./routes/swipeRoutes');
const blockRoutes = require('./routes/blockRoutes');
const postRoutes = require('./routes/postRoutes');

const app = express();
app.use(cookieParser());

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(morgan('dev'));

// Home route with API info
app.get('/', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Dating App API is running',
        api: {
            version: '1.0.0',
            endpoints: {
                users: '/api/users',
                matches: '/api/matches',
                messages: '/api/messages',
                swipes: '/api/swipes',
                blocks: '/api/blocks'
            }
        }
    });
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/swipes', swipeRoutes);
app.use('/api/blocks', blockRoutes);

// Error handling for invalid ObjectID format
app.use((err, req, res, next) => {
    if (err instanceof mongoose.Error.CastError && err.kind === 'ObjectId') {
        return res.status(400).json({
            status: 'error',
            message: `Invalid ID format: ${err.value}. Must be a valid ObjectId or auth_id string.`
        });
    }
    next(err);
});

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error(err);

    // Set default values
    const statusCode = err.statusCode || 500;
    const status = err.status || 'error';

    // Format the response
    res.status(statusCode).json({
        status,
        message: err.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

module.exports = app;