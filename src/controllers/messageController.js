const Message = require('../models/messageModel');
const Match = require('../models/matchModel');
const User = require('../models/userModel');
const mongoose = require('mongoose');
const { AppError } = require('../utils/appError');

// Get all conversations for a user
exports.getConversations = async (req, res, next) => {  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'User ID is required as a query parameter'
      });
    }
    
    // Get all matches for the user
    const matches = await Match.find({
      $or: [
        { user1Id: userId },
        { user2Id: userId }
      ]
    }).populate('user1Id', 'username email user_name full_name profile_picture profile')
     .populate('user2Id', 'username email user_name full_name profile_picture profile')
     .sort({ createdAt: -1 });

    const conversations = [];

    for (const match of matches) {
      // Determine which user is the "other" user
      const otherUser = match.user1Id._id.toString() === userId ? match.user2Id : match.user1Id;
      
      if (otherUser) {
        // Get the last message between these users
        const lastMessage = await Message.findOne({
          $or: [
            { senderId: userId, receiverId: otherUser._id },
            { senderId: otherUser._id, receiverId: userId }
          ]
        }).sort({ createdAt: -1 });

        // Count unread messages
        const unreadCount = await Message.countDocuments({
          senderId: otherUser._id,
          receiverId: userId,
          isRead: false
        });        conversations.push({
          matchId: match._id,
          user: {
            _id: otherUser._id,
            username: otherUser.username,
            user_name: otherUser.user_name,
            full_name: otherUser.full_name,
            email: otherUser.email,
            profile_picture: otherUser.profile_picture,
            profile: otherUser.profile
          },
          lastMessage,
          unreadCount,
          matchDate: match.createdAt
        });
      }
    }

    res.status(200).json({
      status: 'success',
      results: conversations.length,
      data: {
        conversations
      }
    });

  } catch (error) {
    console.error('Error in getConversations:', error);
    next(error);
  }
};

// Get conversation between two users
exports.getConversation = async (req, res, next) => {
  try {
    const { otherUserId } = req.params;
    const userId = req.query.userId || req.user?._id;

    console.log('Getting conversation between:', userId, 'and', otherUserId);

    if (!userId || !otherUserId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Both user IDs are required'
      });
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid user IDs provided'
      });
    }    // Find messages between the two users
    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ]
    })
    .populate('senderId', 'username email user_name full_name profile_picture profile')
    .populate('receiverId', 'username email user_name full_name profile_picture profile')
    .sort({ createdAt: 1 });

    console.log(`Found ${messages.length} messages`);
    
    // Transform messages for frontend
    const transformedMessages = messages.map(message => ({
      _id: message._id,
      sender: {
        _id: message.senderId._id,
        user_name: message.senderId.user_name || message.senderId.full_name || message.senderId.username || message.senderId.email,
        full_name: message.senderId.full_name,
        username: message.senderId.username,
        email: message.senderId.email,
        profile_picture: message.senderId.profile_picture || message.senderId.profile?.profile_picture,
        profile: message.senderId.profile
      },
      receiver: message.receiverId._id,
      content: message.content,
      timestamp: message.timestamp || message.createdAt,
      createdAt: message.createdAt
    }));

    res.status(200).json({
      status: 'success',
      results: transformedMessages.length,
      data: {
        messages: transformedMessages
      }
    });

  } catch (error) {
    console.error('Error in getConversation:', error);
    next(error);
  }
};

// Send a message
exports.sendMessage = async (req, res, next) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user._id;

    console.log('Send message request:', { senderId, receiverId, content });

    if (!receiverId || !content) {
      return res.status(400).json({
        status: 'fail',
        message: 'Receiver ID and content are required'
      });
    }    // Check if users are matched
    const match = await Match.findOne({
      $or: [
        { user1Id: senderId, user2Id: receiverId },
        { user1Id: receiverId, user2Id: senderId }
      ]
    });

    if (!match) {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only message matched users'
      });
    }

    // Create message with a simple messageId
    const messageCount = await Message.countDocuments();
    const message = await Message.create({
      senderId,
      receiverId,
      content,
      messageId: `MSG${Math.floor(Math.random() * 900000) + 100000}`, // Simple random ID
      timestamp: new Date(),
      isRead: false
    });

    console.log('Message created:', message);    // Populate sender info with all relevant fields
    await message.populate('senderId', 'username email user_name full_name profile_picture profile');

    res.status(201).json({
      status: 'success',
      data: {
        _id: message._id,
        sender: {
          _id: message.senderId._id,
          username: message.senderId.username,
          user_name: message.senderId.user_name || message.senderId.full_name || message.senderId.username || message.senderId.email,
          full_name: message.senderId.full_name,
          email: message.senderId.email,
          profile_picture: message.senderId.profile_picture || message.senderId.profile?.profile_picture,
          profile: message.senderId.profile
        },
        receiver: message.receiverId,
        content: message.content,
        timestamp: message.timestamp,
        createdAt: message.createdAt
      }
    });

  } catch (error) {
    console.error('Error in sendMessage:', error);
    next(error);
  }
};

// Other message controller functions...
exports.getAllMessages = async (req, res, next) => {
  try {
    const messages = await Message.find().populate('senderId receiverId');
    res.status(200).json({
      status: 'success',
      results: messages.length,
      data: { messages }
    });
  } catch (error) {
    next(error);
  }
};

exports.getMessageById = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.messageId).populate('senderId receiverId');
    if (!message) {
      return next(new AppError('Message not found', 404));
    }
    res.status(200).json({
      status: 'success',
      data: { message }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateMessage = async (req, res, next) => {
  try {
    const message = await Message.findByIdAndUpdate(req.params.messageId, req.body, { new: true });
    if (!message) {
      return next(new AppError('Message not found', 404));
    }
    res.status(200).json({
      status: 'success',
      data: { message }
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.messageId);
    if (!message) {
      return next(new AppError('Message not found', 404));
    }
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// Mark messages as read
exports.markMessagesAsRead = async (req, res, next) => {
  try {
    const { otherUserId } = req.body;
    const currentUserId = req.user._id;
    
    if (!otherUserId) {
      return res.status(400).json({
        status: 'fail',
        message: 'otherUserId is required'
      });
    }
    
    console.log(`Marking messages from ${otherUserId} to ${currentUserId} as read`);
    
    // Count unread messages before update for logging
    const unreadCount = await Message.countDocuments({
      senderId: otherUserId,
      receiverId: currentUserId,
      isRead: false
    });
    
    console.log(`Found ${unreadCount} unread messages to mark as read`);
    
    // Update all unread messages from otherUserId to currentUserId
    const result = await Message.updateMany(
      { 
        senderId: otherUserId,
        receiverId: currentUserId,
        isRead: false
      },
      { 
        isRead: true 
      }
    );
    
    console.log(`Updated ${result.modifiedCount} messages to read status`);
    
    // Return more detailed information in the response
    res.status(200).json({
      status: 'success',
      data: {
        markedRead: result.modifiedCount,
        previousUnreadCount: unreadCount
      },
      message: `${result.modifiedCount} messages marked as read`
    });
    
  } catch (error) {
    console.error('Error marking messages as read:', error);
    next(error);
  }
};
