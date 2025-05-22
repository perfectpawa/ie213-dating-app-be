const mongoose = require('mongoose');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.protect = catchAsync(async (req, res, next) => {
    // Trong môi trường thực tế, bạn sẽ kiểm tra JWT token
    // Nhưng vì mục đích demo, chúng ta sẽ sử dụng userId từ header hoặc query
    
    let userId;
    if (req.headers.authorization) {
        userId = req.headers.authorization;
    } else if (req.query.userId) {
        userId = req.query.userId;
    }

    if (!userId) {
        return next(new AppError('You are not logged in! Please provide user ID.', 401));
    }

    // Tìm user từ database - check by ObjectId first, then by auth_id
    let user;
    
    if (mongoose.Types.ObjectId.isValid(userId)) {
        // If userId is a valid ObjectId, search by _id
        user = await User.findById(userId);
    }
    
    // If not found or not a valid ObjectId, try searching by auth_id
    if (!user) {
        user = await User.findOne({ auth_id: userId });
    }

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    // Gán user vào request object
    req.user = user;
    next();
});

exports.verifyUserExists = catchAsync(async (req, res, next) => {
    const { auth_id } = req.params;
    
    if (!auth_id) {
        return next(new AppError('Authentication ID is required', 400));
    }
    
    const user = await User.findOne({ auth_id });
    
    if (!user) {
        return next(new AppError('User not found', 404));
    }
    
    req.user = user;
    next();
});
