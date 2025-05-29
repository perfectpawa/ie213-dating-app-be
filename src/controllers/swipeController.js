const mongoose = require('mongoose');
const Swipe = require('../models/swipeModel');
const User = require('../models/userModel');
const Match = require('../models/matchModel');
const Block = require('../models/blockModel');
const Message = require('../models/messageModel');
const { createNotification } = require('./notificationController');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Get all swipes
exports.getAllSwipes = catchAsync(async (req, res, next) => {
    // Optional pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;
    
    // Optional filtering
    const filter = {};
    if (req.query.swiperId) {
        filter.swiperId = req.query.swiperId;
    }
    if (req.query.swipedUserId) {
        filter.swipedUserId = req.query.swipedUserId;
    }
    if (req.query.status) {
        filter.status = req.query.status;
    }
    
    // Find swipes and explicitly select all fields
    const swipes = await Swipe.find(filter)
        .select('_id swipeId swiperId swipedUserId swipeDate status createdAt updatedAt')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit);

    console.log('Fetched swipes:', swipes); // Log for debugging
        
    res.status(200).json({
        status: 'success',
        results: swipes.length,
        data: {
            swipes
        }
    });
});

// Create a swipe
exports.createSwipe = catchAsync(async (req, res, next) => {
    // Get swiperId from request body or query instead of req.user
    let { swiperId, swipedUserId, status, direction } = req.body;
    
    if (!swiperId) {
        swiperId = req.query.userId;
    }
    
    if (!swiperId) {
        return next(new AppError('Swiper ID is required in the request body or as a query parameter', 400));
    }    // If direction is provided instead of status, convert it (for backward compatibility)
    if (!status && direction) {
        if (direction === 'right') status = 'superlike'; // right is love (superlike)
        else if (direction === 'left') status = 'dislike'; // left is dislike
        else if (direction === 'up') status = 'like'; // up is like
    }

    // Validate status
    if (!['like', 'dislike', 'superlike'].includes(status)) {
        return next(new AppError('Invalid swipe status. Must be like, dislike, or superlike', 400));
    }

    // Find the swiped user - can be either ObjectId or auth_id
    let swipedUser;
    if (mongoose.Types.ObjectId.isValid(swipedUserId)) {
        swipedUser = await User.findById(swipedUserId);
    } else {
        swipedUser = await User.findOne({ auth_id: swipedUserId });
    }

    if (!swipedUser) {
        return next(new AppError('User not found', 404));
    }

    // Save the ObjectId for queries
    const swipedUserObjectId = swipedUser._id;    // Check if user is trying to swipe themselves
    if (swiperId.toString() === swipedUserObjectId.toString()) {
        return next(new AppError('You cannot swipe yourself', 400));
    }

    // Check if the users have blocked each other
    const isBlocked = await Block.isBlocked(swiperId, swipedUserObjectId);
    if (isBlocked) {
        return next(new AppError('Action not allowed', 403));
    }

    // Check if a swipe already exists
    let existingSwipe = await Swipe.findOne({
        swiperId,
        swipedUserId: swipedUserObjectId
    });

    // If swipe exists, update it
    if (existingSwipe) {
        // If status hasn't changed, return the existing swipe
        if (existingSwipe.status === status) {
            return res.status(200).json({
                status: 'success',
                message: 'Swipe already exists with the same status',
                data: {
                    swipe: existingSwipe
                }
            });
        }

        // Handle match removal when changing from like to dislike
        if (['like', 'superlike'].includes(existingSwipe.status) && status === 'dislike') {
            // Delete any matches
            await Match.deleteMany({
                $or: [
                    { user1Id: swiperId, user2Id: swipedUserId },
                    { user1Id: swipedUserId, user2Id: swiperId }
                ]
            });
        }

        existingSwipe.status = status;
        existingSwipe.swipeDate = Date.now();
        await existingSwipe.save();
        
        // Check if there's a new potential match after status update to like/superlike
        let match = null;
        if ((status === 'like' || status === 'superlike') && 
            existingSwipe.status !== 'like' && existingSwipe.status !== 'superlike') {
            // Check if the other person has already liked this user
            const mutualSwipe = await Swipe.findOne({
                swiperId: swipedUserId,
                swipedUserId: swiperId,
                status: { $in: ['like', 'superlike'] }
            });

            if (mutualSwipe) {
                // Create a match
                match = await Match.create({
                    user1Id: swiperId,
                    user2Id: swipedUserId,
                    swipeId: existingSwipe._id
                });

                // Create notifications for both users
                await createNotification(swiperId, swipedUserId, 'match', match._id);
                await createNotification(swipedUserId, swiperId, 'match', match._id);
            }
        }
        
        // Return updated swipe
        return res.status(200).json({
            status: 'success',
            data: {
                swipe: existingSwipe,
                match
            }
        });
    }    // Create new swipe
    const newSwipe = await Swipe.create({
        swiperId,
        swipedUserId: swipedUserObjectId,
        status
    });

    // Check if there's a mutual like (match)
    let match = null;
    if (status === 'like' || status === 'superlike') {
        // Check if the other person has already liked this user
        const mutualSwipe = await Swipe.findOne({
            swiperId: swipedUserObjectId,
            swipedUserId: swiperId,
            status: { $in: ['like', 'superlike'] }
        });

        if (mutualSwipe) {
            // Create a match
            match = await Match.create({
                user1Id: swiperId,
                user2Id: swipedUserObjectId,
                swipeId: newSwipe._id
            });

            // Create notifications for both users
            await createNotification(swiperId, swipedUserId, 'match', match._id);
            await createNotification(swipedUserId, swiperId, 'match', match._id);
        }
    }

    res.status(201).json({
        status: 'success',
        data: {
            swipe: newSwipe,
            match: match
        }
    });
});

// Get user swipes
exports.getUserSwipes = catchAsync(async (req, res, next) => {
    const { userId } = req.query;
    
    if (!userId) {
        return next(new AppError('User ID is required as a query parameter', 400));
    }
    
    // Get all swipes created by the user
    const swipes = await Swipe.find({ swiperId: userId })
        .populate({
            path: 'swipedUserId',
            select: 'username email'
        })
        .sort('-createdAt');

    res.status(200).json({
        status: 'success',
        results: swipes.length,
        data: {
            swipes
        }
    });
});

// Get potential matches
exports.getPotentialMatches = catchAsync(async (req, res, next) => {
  // Get userId from query parameter
  const { userId } = req.query;
  
  if (!userId) {
    return next(new AppError('User ID is required as a query parameter', 400));
  }
  
  console.log(`Finding potential matches for user ${userId}`);
  
  // Query to find users the current user hasn't swiped on yet
  // Get users already swiped by this user
  const swipedUserIds = await Swipe.find({ swiperId: userId }).distinct('swipedUserId');
  
  // Add self to excluded ids
  swipedUserIds.push(userId);
  
  console.log(`User has swiped on ${swipedUserIds.length - 1} users`);
  
  // Find users not swiped by this user
  const potentialMatches = await User.find({ 
    _id: { $nin: swipedUserIds },
    completeProfile: true
  }).select('_id user_name full_name gender profile_picture bio');
  
  // Add this return statement
  return res.status(200).json({
    status: 'success',
    results: potentialMatches.length,
    data: {
      potentialMatches
    }
  });
});

// Get swipe by ID
exports.getSwipeById = catchAsync(async (req, res, next) => {
    const { swipeId } = req.params;
    
    // Use findOne to allow different types of IDs (MongoDB _id or custom swipeId)
    const swipe = await Swipe.findOne({
        $or: [
            { _id: swipeId },
            { swipeId: swipeId }
        ]
    });
    
    if (!swipe) {
        return next(new AppError('Swipe not found', 404));
    }
    
    res.status(200).json({
        status: 'success',
        data: {
            swipe
        }
    });
});

// Update swipe
exports.updateSwipe = catchAsync(async (req, res, next) => {
    const { swipeId } = req.params;
    const userId = req.user._id;
    const { status } = req.body;
    
    // Validate status
    if (!['like', 'dislike', 'superlike'].includes(status)) {
        return next(new AppError('Invalid swipe status. Must be like, dislike, or superlike', 400));
    }
    
    // Find swipe
    const swipe = await Swipe.findOne({
        $or: [
            { _id: swipeId },
            { swipeId: swipeId }
        ]
    });
    
    if (!swipe) {
        return next(new AppError('Swipe not found', 404));
    }
    
    // Check if user is the swiper
    if (swipe.swiperId.toString() !== userId.toString()) {
        return next(new AppError('You can only update your own swipes', 403));
    }
    
    // Save previous status to check for match changes
    const previousStatus = swipe.status;
    
    // Update swipe
    swipe.status = status;
    swipe.swipeDate = Date.now();
    await swipe.save();
    
    // Handle match logic based on status change
    let match = null;
    
    // If changed from non-like to like, check for potential match
    if ((previousStatus === 'dislike' && ['like', 'superlike'].includes(status))) {
        // Check if the other person has already liked this user
        const mutualSwipe = await Swipe.findOne({
            swiperId: swipe.swipedUserId,
            swipedUserId: swipe.swiperId,
            status: { $in: ['like', 'superlike'] }
        });

        if (mutualSwipe) {
            // Create a match
            match = await Match.create({
                user1Id: swipe.swiperId,
                user2Id: swipe.swipedUserId,
                swipeId: swipe._id
            });
        }
    }
    // If changed from like to dislike, remove any match
    else if (['like', 'superlike'].includes(previousStatus) && status === 'dislike') {
        await Match.deleteMany({
            $or: [
                { user1Id: swipe.swiperId, user2Id: swipe.swipedUserId },
                { user1Id: swipe.swipedUserId, user2Id: swipe.swiperId }
            ]
        });
    }
    
    res.status(200).json({
        status: 'success',
        data: {
            swipe,
            match
        }
    });
});

// Delete swipe
exports.deleteSwipe = catchAsync(async (req, res, next) => {
    const { swipeId } = req.params;
    const userId = req.user._id;
    
    // Find swipe
    const swipe = await Swipe.findOne({
        $or: [
            { _id: swipeId },
            { swipeId: swipeId }
        ]
    });
    
    if (!swipe) {
        return next(new AppError('Swipe not found', 404));
    }
    
    // Check if user is the swiper
    if (swipe.swiperId.toString() !== userId.toString()) {
        return next(new AppError('You can only delete your own swipes', 403));
    }
    
    // Check if this swipe is part of a match
    const matchExists = await Match.findOne({
        $or: [
            { user1Id: swipe.swiperId, user2Id: swipe.swipedUserId },
            { user1Id: swipe.swipedUserId, user2Id: swipe.swiperId }
        ]
    });
    
    // Delete the match if it exists
    if (matchExists) {
        await Match.findByIdAndDelete(matchExists._id);
    }
    
    // Delete the swipe
    await Swipe.findByIdAndDelete(swipe._id);
    
    res.status(204).json({
        status: 'success',
        data: null
    });
});

// Get swipe statistics
exports.getSwipeStats = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    
    // Get swipe stats for current user
    const swipeStats = await Swipe.aggregate([
        // Match swipes by the current user
        {
            $match: { swiperId: userId.toString() }
        },
        // Group by status and count
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 }
            }
        },
        // Format the output
        {
            $project: {
                _id: 0,
                status: "$_id",
                count: 1
            }
        }
    ]);
    
    // Get received swipe stats
    const receivedSwipeStats = await Swipe.aggregate([
        // Match swipes where the current user is the swiped user
        {
            $match: { swipedUserId: userId.toString() }
        },
        // Group by status and count
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 }
            }
        },
        // Format the output
        {
            $project: {
                _id: 0,
                status: "$_id",
                count: 1
            }
        }
    ]);
    
    // Get match conversion rate
    const totalLikes = await Swipe.countDocuments({
        swiperId: userId,
        status: { $in: ['like', 'superlike'] }
    });
    
    const matchCount = await Match.countDocuments({
        $or: [
            { user1Id: userId },
            { user2Id: userId }
        ]
    });
    
    const conversionRate = totalLikes > 0 ? (matchCount / totalLikes) * 100 : 0;
    
    res.status(200).json({
        status: 'success',
        data: {
            sentSwipes: swipeStats,
            receivedSwipes: receivedSwipeStats,
            matchCount,
            likeCount: totalLikes,
            conversionRate: parseFloat(conversionRate.toFixed(2))
        }
    });
});

// Batch process swipes
exports.batchProcessSwipes = catchAsync(async (req, res, next) => {
    const swiperId = req.user._id;
    const { swipes } = req.body;
    
    if (!Array.isArray(swipes) || swipes.length === 0) {
        return next(new AppError('Swipes must be a non-empty array', 400));
    }
    
    // Validate each swipe
    for (const swipe of swipes) {
        if (!swipe.swipedUserId || !swipe.status) {
            return next(new AppError('Each swipe must have swipedUserId and status', 400));
        }
        
        if (!['like', 'dislike', 'superlike'].includes(swipe.status)) {
            return next(new AppError('Invalid swipe status. Must be like, dislike, or superlike', 400));
        }
    }
    
    const results = {
        processed: 0,
        created: 0,
        updated: 0,
        matches: 0,
        errors: []
    };
    
    const newMatches = [];
    
    // Process each swipe
    for (const swipe of swipes) {
        try {
            // Check if swiped user exists
            const swipedUser = await User.findById(swipe.swipedUserId);
            if (!swipedUser) {
                results.errors.push({
                    swipedUserId: swipe.swipedUserId,
                    error: 'User not found'
                });
                continue;
            }
            
            // Check if user is trying to swipe themselves
            if (swiperId.toString() === swipe.swipedUserId.toString()) {
                results.errors.push({
                    swipedUserId: swipe.swipedUserId,
                    error: 'Cannot swipe yourself'
                });
                continue;
            }
            
            // Check if the users have blocked each other
            const isBlocked = await Block.isBlocked(swiperId, swipe.swipedUserId);
            if (isBlocked) {
                results.errors.push({
                    swipedUserId: swipe.swipedUserId,
                    error: 'Action not allowed'
                });
                continue;
            }
            
            // Check if a swipe already exists
            let existingSwipe = await Swipe.findOne({
                swiperId,
                swipedUserId: swipe.swipedUserId
            });
            
            // Update or create swipe
            let currentSwipe;
            if (existingSwipe) {
                existingSwipe.status = swipe.status;
                existingSwipe.swipeDate = Date.now();
                currentSwipe = await existingSwipe.save();
                results.updated++;
            } else {
                currentSwipe = await Swipe.create({
                    swiperId,
                    swipedUserId: swipe.swipedUserId,
                    status: swipe.status
                });
                results.created++;
            }
            
            results.processed++;
            
            // Check for potential match
            if (swipe.status === 'like' || swipe.status === 'superlike') {
                const mutualSwipe = await Swipe.findOne({
                    swiperId: swipe.swipedUserId,
                    swipedUserId: swiperId,
                    status: { $in: ['like', 'superlike'] }
                });
                
                if (mutualSwipe) {
                    // Create a match
                    const match = await Match.create({
                        user1Id: swiperId,
                        user2Id: swipe.swipedUserId,
                        swipeId: currentSwipe._id
                    });
                    
                    newMatches.push(match);
                    results.matches++;
                }
            }
        } catch (err) {
            results.errors.push({
                swipedUserId: swipe.swipedUserId,
                error: err.message
            });
        }
    }
    
    res.status(200).json({
        status: 'success',
        data: {
            results,
            matches: newMatches
        }
    });
});
