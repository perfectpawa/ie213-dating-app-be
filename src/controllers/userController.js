const User = require('../models/userModel');
const mongoose = require('mongoose');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Create a new user
exports.createUser = catchAsync(async (req, res, next) => {
    const { auth_id, email } = req.body;

    if (!auth_id || !email) {
        return next(new AppError('Auth ID and email are required', 400));
    }

    const existingUser = await User.findOne({ auth_id });
    if (existingUser) {
        return next(new AppError('User with this auth_id already exists', 400));
    }

    const user = await User.create({
        auth_id,
        email,
        completeProfile: false
    });

    res.status(201).json({
        status: 'success',
        data: { user }
    });
});

// Get user by auth_id or ObjectId
exports.getUserByAuthId = catchAsync(async (req, res, next) => {
    const { auth_id } = req.params;
    
    let user;
    
    // Try to find by ObjectId if valid
    if (mongoose.Types.ObjectId.isValid(auth_id)) {
        user = await User.findById(auth_id);
    }
    
    // If not found, try by auth_id
    if (!user) {
        user = await User.findOne({ auth_id });
    }

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: { user }
    });
});

// Delete user by auth_id or ObjectId
exports.deleteUserByAuthId = catchAsync(async (req, res, next) => {
    const { auth_id } = req.params;
    let user;

    // Try to delete by ObjectId first if valid
    if (mongoose.Types.ObjectId.isValid(auth_id)) {
        user = await User.findByIdAndDelete(auth_id);
    }
    
    // If not found, try by auth_id
    if (!user) {
        user = await User.findOneAndDelete({ auth_id });
    }

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
});

// Get all users
exports.getAllUsers = catchAsync(async (req, res, next) => {
    const users = await User.find();
    
    res.status(200).json({
        status: 'success',
        results: users.length,
        data: {
            users
        }
    });
});