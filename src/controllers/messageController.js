const mongoose = require('mongoose');
const Message = require('../models/messageModel');
const User = require('../models/userModel');
const Match = require('../models/matchModel');
const Block = require('../models/blockModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Get all messages
exports.getAllMessages = catchAsync(async (req, res, next) => {
    // Optional pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    // Optional filtering by senderId or receiverId
    const filter = {};
    if (req.query.senderId) {
        filter.senderId = req.query.senderId;
    }
    if (req.query.receiverId) {
        filter.receiverId = req.query.receiverId;
    }

    const messages = await Message.find(filter)
        .select('_id messageId senderId receiverId content timestamp isRead createdAt updatedAt')
        .sort('-timestamp')
        .skip(skip)
        .limit(limit);
    
    console.log('Fetched messages:', messages); // Log for debugging

    res.status(200).json({
        status: 'success',
        results: messages.length,
        data: {
            messages
        }
    });
});

// Send a message
exports.sendMessage = catchAsync(async (req, res, next) => {
    const { senderId, receiverId, content } = req.body;
    
    if (!senderId || !receiverId || !content) {
        return next(new AppError('Please provide senderId, receiverId and content', 400));
    }

    // Check if users exist
    const sender = await User.findById(senderId);
    if (!sender) {
        return next(new AppError('Sender not found', 404));
    }
    
    const receiver = await User.findById(receiverId);
    if (!receiver) {
        return next(new AppError('Receiver not found', 404));
    }

    // Check if users are matched
    const match = await Match.findOne({
        $or: [
            { user1Id: senderId, user2Id: receiverId },
            { user1Id: receiverId, user2Id: senderId }
        ]
    });

    if (!match) {
        return next(new AppError('You can only send messages to users you have matched with', 403));
    }

    // Check if users have blocked each other
    const isBlocked = await Block.isBlocked(senderId, receiverId);
    if (isBlocked) {
        return next(new AppError('You cannot send messages to this user', 403));
    }

    // Create and save the message
    const message = await Message.create({
        senderId,
        receiverId,
        content
    });

    res.status(201).json({
        status: 'success',
        data: {
            message
        }
    });
});

// Get conversation history
exports.getConversation = catchAsync(async (req, res, next) => {
    // Get userId from query parameter instead of req.user (from middleware)
    const { userId } = req.query;
    const { otherUserId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    if (!userId) {
        return next(new AppError('User ID is required as a query parameter', 400));
    }

    // Find the other user - can be either ObjectId or auth_id
    // Use idHelpers to find user by any ID type
    const otherUser = await require('../utils/idHelpers').findUserByAnyId(otherUserId);

    if (!otherUser) {
        return next(new AppError('User not found', 404));
    }

    // Save the ObjectId for query
    const otherUserObjectId = otherUser._id;

    // Check if users are matched
    const match = await Match.findOne({
        $or: [
            { user1Id: userId, user2Id: otherUserObjectId },
            { user1Id: otherUserObjectId, user2Id: userId }
        ]
    });

    // If no match found but with parameter forceShow=true and user is admin
    // then allow to view messages
    if (!match && !(req.query.forceShow === 'true' && req.user.role === 'admin')) {
        return next(new AppError('You can only view messages with users you have matched with', 403));
    }    // Get messages between the two users
    const messages = await Message.find({
        $or: [
            { senderId: userId, receiverId: otherUserObjectId },
            { senderId: otherUserObjectId, receiverId: userId }
        ]
    })
    .sort('-timestamp')
    .skip(skip)
    .limit(limit);

    // Mark messages as read
    await Message.updateMany(
        { senderId: otherUserObjectId, receiverId: userId, isRead: false },
        { isRead: true }
    );

    res.status(200).json({
        status: 'success',
        results: messages.length,
        data: {
            messages: messages.reverse() // Send in chronological order
        }
    });
});

// Get all conversations (message threads)
exports.getConversations = catchAsync(async (req, res, next) => {
    // Get userId from query parameter instead of req.user (from middleware)
    const { userId } = req.query;
    
    if (!userId) {
        return next(new AppError('User ID is required as a query parameter', 400));
    }
    
    const matches = await Match.find({
        $or: [
            { user1Id: userId },
            { user2Id: userId }
        ]
    });
    
    const otherUserIds = matches.map(match => 
        match.user1Id.toString() === userId.toString() ? match.user2Id : match.user1Id
    );
    
    const users = await User.find({ _id: { $in: otherUserIds } });
    const userMap = {};
    users.forEach(user => { userMap[user._id.toString()] = user });
    
    const latestMessages = await Message.aggregate([
        {
            $match: {
                $or: [
                    { senderId: userId, receiverId: { $in: otherUserIds } },
                    { senderId: { $in: otherUserIds }, receiverId: userId }
                ]
            }
        },
        {
            $sort: { timestamp: -1 }
        },
        {
            $group: {
                _id: {
                    $cond: [
                        { $eq: ["$senderId", userId] },
                        "$receiverId",
                        "$senderId"
                    ]
                },
                latestMessage: { $first: "$$ROOT" }
            }
        }
    ]);

    const messageMap = {};
    latestMessages.forEach(item => { messageMap[item._id.toString()] = item.latestMessage });
    
    const unreadCounts = await Message.aggregate([
        {
            $match: {
                senderId: { $in: otherUserIds },
                receiverId: userId,
                isRead: false
            }
        },
        {
            $group: {
                _id: "$senderId",
                count: { $sum: 1 }
            }
        }
    ]);
    
    const unreadMap = {};
    unreadCounts.forEach(item => { unreadMap[item._id.toString()] = item.count });
    
    try {
        const conversations = await Promise.all(matches.map(async match => {
            const otherUserId = match.user1Id.toString() === userId.toString() ? match.user2Id : match.user1Id;
            const otherUserString = otherUserId.toString();
            
            return {
                matchId: match._id,
                user: {
                    _id: otherUserId,
                    username: userMap[otherUserString]?.username || 'User',
                    email: userMap[otherUserString]?.email || ''
                },
                lastMessage: messageMap[otherUserString] || null,
                unreadCount: unreadMap[otherUserString] || 0,
                matchDate: match.matchDate
            };
        }));
        
        conversations.sort((a, b) => {
            const timeA = a.lastMessage ? new Date(a.lastMessage.timestamp) : new Date(a.matchDate);
            const timeB = b.lastMessage ? new Date(b.lastMessage.timestamp) : new Date(b.matchDate);
            return timeB - timeA;
        });
        
        res.status(200).json({
            status: 'success',
            results: conversations.length,
            data: { conversations }
        });
    } catch (error) {
        return next(new AppError('Failed to fetch conversations: ' + error.message, 500));
    }
});

// Get message by ID
exports.getMessageById = catchAsync(async (req, res, next) => {
    const { messageId } = req.params;
    
    const message = await Message.findById(messageId);
    
    if (!message) {
        return next(new AppError('Message not found', 404));
    }
    
    res.status(200).json({
        status: 'success',
        data: {
            message
        }
    });
});

// Update/Edit message
exports.updateMessage = catchAsync(async (req, res, next) => {
    const { messageId } = req.params;
    const { content, userId } = req.body;
    
    if (!userId) {
        return next(new AppError('User ID is required in the request body', 400));
    }
    
    // Find the message
    const message = await Message.findById(messageId);
    
    if (!message) {
        return next(new AppError('Message not found', 404));
    }
    
    // Check if the user is the sender of the message
    if (message.senderId.toString() !== userId.toString()) {
        return next(new AppError('You can only edit your own messages', 403));
    }
    
    // Update the message
    message.content = content;
    await message.save();
    
    res.status(200).json({
        status: 'success',
        data: {
            message
        }
    });
});

// Delete message
exports.deleteMessage = catchAsync(async (req, res, next) => {
    const { messageId } = req.params;
    const { userId } = req.query;
    
    if (!userId) {
        return next(new AppError('User ID is required as a query parameter', 400));
    }
    
    // Find the message
    const message = await Message.findById(messageId);
    
    if (!message) {
        return next(new AppError('Message not found', 404));
    }
    
    // Check if the user is the sender of the message
    if (message.senderId.toString() !== userId.toString()) {
        return next(new AppError('You can only delete your own messages', 403));
    }
    
    // Delete the message
    await Message.findByIdAndDelete(messageId);
    
    res.status(204).json({
        status: 'success',
        data: null
    });
});
