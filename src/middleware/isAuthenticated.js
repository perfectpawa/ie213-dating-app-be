const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync.js');
const AppError = require('../utils/appError.js');
const User = require('../models/userModel.js');

const isAuthenticated = catchAsync(async (req, res, next) => {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    if (!token) {
        console.log(token);
        return next(new AppError('You are not logged in', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
        return next(new AppError('The user belonging to this token does no longer exist.', 401));
    }

    req.user = user;
    next();
});

module.exports = isAuthenticated;