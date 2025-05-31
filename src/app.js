const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('./models/userModel');
require('dotenv').config();

// Import route files
const userRoutes = require('./routes/userRoutes');
const matchRoutes = require('./routes/matchRoutes');
const messageRoutes = require('./routes/messageRoutes');
const swipeRoutes = require('./routes/swipeRoutes');
const blockRoutes = require('./routes/blockRoutes');
const postRoutes = require('./routes/postRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
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

// Passport middleware
app.use(passport.initialize());

// Passport Google OAuth configuration
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/users/auth/google/callback",
    scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if user already exists
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
            // If user exists but hasn't completed profile, update their Google info
            if (!user.completeProfile) {
                user.full_name = profile.displayName;
                user.profile_picture = profile.photos[0].value;
                user.isVerified = true; // Google accounts are pre-verified
                await user.save();
            }
            return done(null, user);
        }

        // Check if email is already registered with a regular account
        const existingUser = await User.findOne({ 
            email: profile.emails[0].value,
            authProvider: { $ne: 'google' } // Check if user exists but not with Google
        });

        console.log('_______Checking:', profile.emails[0].value);
        console.log('_______Checking existing user:', existingUser);

        if (existingUser) {
            console.error('_______Email already registered with a regular account:', existingUser.email);
            return done(new Error('EMAIL_ALREADY_REGISTERED'), null);
        }

        // If user doesn't exist, create new user
        user = await User.create({
            email: profile.emails[0].value,
            full_name: profile.displayName,
            profile_picture: profile.photos[0].value,
            isVerified: true, // Google accounts are pre-verified
            password: Math.random().toString(36).slice(-8), // Generate random password
            authProvider: 'google' // Mark this account as Google-authenticated
        });

        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));

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
app.use('/api/notifications', notificationRoutes);
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

    // Handle specific error cases
    if (err.message === 'EMAIL_ALREADY_REGISTERED') {
        return res.status(400).json({
            status: 'error',
            message: 'Email này đã được đăng ký bằng tài khoản thường. Vui lòng đăng nhập bằng email và mật khẩu.'
        });
    }

    // Format the response
    res.status(statusCode).json({
        status,
        message: err.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

module.exports = app;