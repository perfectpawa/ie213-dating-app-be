const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({    messageId: {
        type: String,
        unique: true,
        default: function() {
            return 'MSG' + Math.floor(100000 + Math.random() * 900000);
        }    },    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: [true, 'Message must have a sender']
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: [true, 'Message must have a receiver']
    },
    content: {
        type: String,
        required: [true, 'Message cannot be empty']
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Methods for message management
messageSchema.methods.sendMessage = async function() {
    return await this.save();
};

messageSchema.methods.receiveMessage = function() {
    return this;
};

messageSchema.methods.markAsRead = async function() {
    this.isRead = true;
    return await this.save();
};

// Static method to get conversation between two users
messageSchema.statics.getConversation = async function(user1Id, user2Id, limit = 50) {
    return await this.find({
        $or: [
            { senderId: user1Id, receiverId: user2Id },
            { senderId: user2Id, receiverId: user1Id }
        ]
    }).sort({ timestamp: -1 }).limit(limit);
};

const Message = mongoose.model('Messages', messageSchema);
module.exports = Message;
