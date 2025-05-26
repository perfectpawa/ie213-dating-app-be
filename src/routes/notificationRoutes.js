const express = require('express');
const router = express.Router();
const isAuthenticated = require('../middleware/isAuthenticated');
const {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead
} = require('../controllers/notificationController');

// Get all notifications for the authenticated user
router.get('/', isAuthenticated, getNotifications);

// Get unread notifications count
router.get('/unread-count', isAuthenticated, getUnreadCount);

// Mark specific notifications as read
router.post('/mark-read', isAuthenticated, markAsRead);

// Mark all notifications as read
router.post('/mark-all-read', isAuthenticated, markAllAsRead);

module.exports = router; 