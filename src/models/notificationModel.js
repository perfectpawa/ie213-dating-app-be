const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    notificationId: {
        type: String,
        unique: true,
        default: function() {
            return 'NOT' + Math.floor(100000 + Math.random() * 900000);
        }
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: [true, 'Notification must have a recipient']
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: [true, 'Notification must have a sender']
    },
    type: {
        type: String,
        enum: ['like', 'message', 'connection', 'match'],
        required: [true, 'Notification must have a type']
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Posts'
    },
    read: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Create index for faster queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });

// Static method to create a notification
notificationSchema.statics.createNotification = async function(recipientId, senderId, type, postId = null) {
    return await this.create({
        recipient: recipientId,
        sender: senderId,
        type,
        post: postId
    });
};

// Static method to get unread notifications count
notificationSchema.statics.getUnreadCount = async function(userId) {
    return await this.countDocuments({
        recipient: userId,
        read: false
    });
};

// Static method to mark notifications as read
notificationSchema.statics.markAsRead = async function(notificationIds) {
    return await this.updateMany(
        { _id: { $in: notificationIds } },
        { $set: { read: true } }
    );
};

const Notification = mongoose.model('Notifications', notificationSchema);
module.exports = Notification; 