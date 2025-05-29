const Notification = require('../models/notificationModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { getIO } = require('../services/socketService');

// Get all notifications for a user
exports.getNotifications = catchAsync(async (req, res, next) => {
    const notifications = await Notification.find({ recipient: req.user._id })
        .sort('-createdAt')
        .populate('sender', 'user_name profile_picture full_name')
        .populate('post', 'image');

    res.status(200).json({
        status: 'success',
        data: {
            notifications
        }
    });
});

// Get unread notifications count
exports.getUnreadCount = catchAsync(async (req, res, next) => {
    const count = await Notification.getUnreadCount(req.user._id);

    res.status(200).json({
        status: 'success',
        data: {
            count
        }
    });
});

// Mark notifications as read
exports.markAsRead = catchAsync(async (req, res, next) => {
    const { notificationIds } = req.body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
        return next(new AppError('Please provide an array of notification IDs', 400));
    }

    await Notification.markAsRead(notificationIds);

    res.status(200).json({
        status: 'success',
        message: 'Notifications marked as read'
    });
});

// Mark all notifications as read
exports.markAllAsRead = catchAsync(async (req, res, next) => {
    await Notification.updateMany(
        { recipient: req.user._id, read: false },
        { $set: { read: true } }
    );

    res.status(200).json({
        status: 'success',
        message: 'All notifications marked as read'
    });
});

// Create a new notification and emit it in real-time
exports.createNotification = catchAsync(async (recipientId, senderId, type, postId = null, swipeId = null, matchId = null) => {
    console.log('Creating notification:', { recipientId, senderId, type, postId });
    
    const notification = await Notification.createNotification(recipientId, senderId, type, postId, swipeId, matchId);
    
    // Populate the notification with sender and post details
    const populatedNotification = await Notification.findById(notification._id)
        .populate('sender', 'user_name profile_picture full_name')
        .populate('post', 'image');

    // console.log('Created notification:', populatedNotification);

    // Emit the notification in real-time
    const io = getIO();
    if (io) {
        console.log('Emitting notification to user:', recipientId);
        io.to(`user_${recipientId}`).emit('notification', populatedNotification);
    } else {
        console.error('Socket.io not initialized');
    }

    return populatedNotification;
}); 