const mongoose = require('mongoose');
const Block = require('../models/blockModel');
const User = require('../models/userModel');
const Match = require('../models/matchModel');
const Message = require('../models/messageModel');
const Swipe = require('../models/swipeModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Get all blocks
exports.getAllBlocks = catchAsync(async (req, res, next) => {
    // Optional pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;
    
    // Optional filtering
    const filter = {};
    if (req.query.blockerId) {
        filter.blockerId = req.query.blockerId;
    }
    if (req.query.blockedUserId) {
        filter.blockedUserId = req.query.blockedUserId;
    }
    
    const blocks = await Block.find(filter)
        .select('_id blockId blockerId blockedUserId blockDate createdAt updatedAt')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit);
    
    console.log('Fetched blocks:', blocks); // Log for debugging
        
    res.status(200).json({
        status: 'success',
        results: blocks.length,
        data: {
            blocks
        }
    });
});

// Block a user
exports.blockUser = catchAsync(async (req, res, next) => {
    // Get blockerId from query parameter instead of req.user
    const { userId } = req.query;
    const blockedUserId = req.params.userId;
    
    if (!userId) {
        return next(new AppError('Your user ID is required as a query parameter', 400));
    }
    
    const blockerId = userId;

    // Find the user to block - can be either ObjectId or auth_id
    let blockedUser;
    if (mongoose.Types.ObjectId.isValid(blockedUserId)) {
        blockedUser = await User.findById(blockedUserId);
    } else {
        blockedUser = await User.findOne({ auth_id: blockedUserId });
    }

    if (!blockedUser) {
        return next(new AppError('User not found', 404));
    }

    // Save the ObjectId for queries
    const blockedUserObjectId = blockedUser._id;

    // Check if user is trying to block themselves
    if (blockerId.toString() === blockedUserObjectId.toString()) {
        return next(new AppError('You cannot block yourself', 400));
    }

    // Check if block already exists
    const existingBlock = await Block.findOne({
        blockerId,
        blockedUserId: blockedUserObjectId
    });

    if (existingBlock) {
        return next(new AppError('You have already blocked this user', 400));
    }    // Create block
    const block = await Block.blockUser(blockerId, blockedUserObjectId);

    // Remove any matches between the users
    const deletedMatches = await Match.deleteMany({
        $or: [
            { user1Id: blockerId, user2Id: blockedUserObjectId },
            { user1Id: blockedUserObjectId, user2Id: blockerId }
        ]
    });

    // Delete any messages between the users
    const deletedMessages = await Message.deleteMany({
        $or: [
            { senderId: blockerId, receiverId: blockedUserObjectId },
            { senderId: blockedUserObjectId, receiverId: blockerId }
        ]
    });

    // Delete any swipes between the users
    const deletedSwipes = await Swipe.deleteMany({
        $or: [
            { swiperId: blockerId, swipedUserId: blockedUserObjectId },
            { swiperId: blockedUserObjectId, swipedUserId: blockerId }
        ]
    });

    res.status(201).json({
        status: 'success',
        message: 'User blocked successfully',
        data: {
            block,
            deletedData: {
                matches: deletedMatches.deletedCount,
                messages: deletedMessages.deletedCount,
                swipes: deletedSwipes.deletedCount
            }
        }
    });
});

// Unblock a user
exports.unblockUser = catchAsync(async (req, res, next) => {
    // Get blockerId from query parameter instead of req.user
    const { userId } = req.query;
    const blockedUserId = req.params.userId;
    
    if (!userId) {
        return next(new AppError('Your user ID is required as a query parameter', 400));
    }
    
    const blockerId = userId;

    // Find the blocked user - can be either ObjectId or auth_id
    let blockedUser;
    if (mongoose.Types.ObjectId.isValid(blockedUserId)) {
        blockedUser = await User.findById(blockedUserId);
    } else {
        blockedUser = await User.findOne({ auth_id: blockedUserId });
    }

    if (!blockedUser) {
        return next(new AppError('User not found', 404));
    }

    // Save the ObjectId for queries
    const blockedUserObjectId = blockedUser._id;

    // Check if block exists
    const block = await Block.findOne({
        blockerId,
        blockedUserId: blockedUserObjectId
    });

    if (!block) {
        return next(new AppError('You have not blocked this user', 400));
    }

    // Remove block
    await Block.unblockUser(blockerId, blockedUserObjectId);

    res.status(200).json({
        status: 'success',
        message: 'User unblocked successfully'
    });
});

// Get all blocked users
exports.getBlockedUsers = catchAsync(async (req, res, next) => {
    const { userId } = req.query;
    
    if (!userId) {
        return next(new AppError('User ID is required as a query parameter', 400));
    }

    // Get all users blocked by current user
    const blocks = await Block.find({ blockerId: userId })
        .populate({
            path: 'blockedUserId',
            select: 'username email'
        });

    // Format response
    const blockedUsers = blocks.map(block => ({
        blockId: block._id,
        userId: block.blockedUserId._id,
        username: block.blockedUserId.username,
        email: block.blockedUserId.email,
        blockDate: block.blockDate
    }));

    res.status(200).json({
        status: 'success',
        results: blockedUsers.length,
        data: {
            blockedUsers
        }
    });
});

// Get block by ID
exports.getBlockById = catchAsync(async (req, res, next) => {
    const { blockId } = req.params;
    
    // Use findOne to allow different types of IDs (MongoDB _id or custom blockId)
    const block = await Block.findOne({
        $or: [
            { _id: blockId },
            { blockId: blockId }
        ]
    });
    
    if (!block) {
        return next(new AppError('Block not found', 404));
    }
    
    res.status(200).json({
        status: 'success',
        data: {
            block
        }
    });
});

// Check if a user is blocked
exports.checkBlock = catchAsync(async (req, res, next) => {
    const { userId } = req.params;
    const { currentUserId } = req.query;
    
    if (!currentUserId) {
        return next(new AppError('Current user ID is required as a query parameter', 400));
    }
    
    const isBlocked = await Block.isBlocked(currentUserId, userId);
    
    res.status(200).json({
        status: 'success',
        data: {
            isBlocked
        }
    });
});

// Get users who blocked the current user
exports.getBlockersUsers = catchAsync(async (req, res, next) => {
    const { userId } = req.query;
    
    if (!userId) {
        return next(new AppError('User ID is required as a query parameter', 400));
    }
    
    // Since we're removing middleware, we'll simplify the admin check for now
    // Anyone can see who blocked them

    // Get all users who blocked the current user
    const blocks = await Block.find({ blockedUserId: userId })
        .populate({
            path: 'blockerId',
            select: 'username email'
        });

    // Format response
    const blockers = blocks.map(block => ({
        blockId: block._id,
        userId: block.blockerId._id,
        username: block.blockerId.username,
        email: block.blockerId.email,
        blockDate: block.blockDate
    }));

    res.status(200).json({
        status: 'success',
        results: blockers.length,
        data: {
            blockers
        }
    });
});
