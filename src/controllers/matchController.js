const mongoose = require('mongoose');
const Match = require('../models/matchModel');
const User = require('../models/userModel');
const Message = require('../models/messageModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Swipe = require('../models/swipeModel');

// Helper function to get ObjectId from user id
const getUserObjectId = async (userId) => {
  // If it's already a valid ObjectId, return it
  if (mongoose.Types.ObjectId.isValid(userId)) {
    return userId;
  }
  
  // Otherwise, try to find the user by _id
  const user = await User.findById(userId);
  if (!user) {
    throw new Error(`User with ID ${userId} not found`);
  }
  return user._id;
};

// Get all matches
exports.getMatches = catchAsync(async (req, res, next) => {
  try {
    // Optional pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;
    
    // Initialize filter
    let filter = {};
    
    // If userId is provided, find by MongoDB ObjectId
    if (req.query.userId) {
      let userObjectId;
      
      // Check if it's a valid ObjectId
      if (mongoose.Types.ObjectId.isValid(req.query.userId)) {
        userObjectId = req.query.userId;
      } else {
        // If it's not a valid ObjectId, try to find the user by MongoDB _id
        // This assumes the userId is the string representation of MongoDB _id
        try {
          // First check if it's an existing user (using _id)
          const user = await User.findById(req.query.userId);
          if (user) {
            userObjectId = user._id;
          } else {
            return res.status(404).json({
              status: 'fail',
              message: `User with ID ${req.query.userId} not found`,
            });
          }
        } catch (err) {
          return res.status(400).json({
            status: 'fail',
            message: `Invalid user ID format: ${req.query.userId}`,
          });
        }
      }
      
      // Use the userObjectId for filtering
      filter = { 
        $or: [
          { user1Id: userObjectId }, 
          { user2Id: userObjectId }
        ] 
      };
    }
    
    const matches = await Match.find(filter)
      .select('_id matchId user1Id user2Id swipeId matchDate isMutual createdAt updatedAt')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);
    
    res.status(200).json({
      status: 'success',
      results: matches.length,
      data: {
        matches
      }
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
});

// Get single match by ID
exports.getMatch = catchAsync(async (req, res, next) => {
  const { matchId } = req.params;
  
  // Use findOne to allow different types of IDs (MongoDB _id or custom matchId)
  const match = await Match.findOne({
    $or: [
      { _id: matchId },
      { matchId: matchId }
    ]
  }).populate({
    path: 'user1Id user2Id',
    select: 'username email'
  });
  
  if (!match) {
    return next(new AppError('Match not found', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      match
    }
  });
});

// Create a match (typically done from swipe controller, but added for completeness)
exports.createMatch = catchAsync(async (req, res, next) => {
  try {
    const { user1Id, user2Id, matchDate, isMutual = true } = req.body;
    
    // Convert user IDs to ObjectIds if needed
    let user1ObjectId, user2ObjectId;
    
    try {
      user1ObjectId = await getUserObjectId(user1Id);
      user2ObjectId = await getUserObjectId(user2Id);
    } catch (error) {
      return next(new AppError(`Error converting user IDs: ${error.message}`, 400));
    }
    
    const matchData = {
      user1Id: user1ObjectId,
      user2Id: user2ObjectId,
      isMutual
    };
    
    if (matchDate) {
      matchData.matchDate = new Date(matchDate);
    }
    
    const match = await Match.create(matchData);
    
    res.status(201).json({
      status: 'success',
      data: {
        match
      }
    });
  } catch (error) {
    return next(new AppError(`Failed to create match: ${error.message}`, 500));
  }
});

// Update match details
exports.updateMatch = catchAsync(async (req, res, next) => {
  const { matchId } = req.params;
  const { isMutual, userId } = req.body;
  
  if (!userId) {
    return next(new AppError('User ID is required in the request body', 400));
  }
  
  // Only allow updating isMutual status
  if (typeof isMutual !== 'boolean') {
    return next(new AppError('Only isMutual status can be updated', 400));
  }
  
  // Find match
  const match = await Match.findOne({
    $or: [
      { _id: matchId },
      { matchId: matchId }
    ]
  });
  
  if (!match) {
    return next(new AppError('Match not found', 404));
  }
  
  // Check if user is part of the match
  if (match.user1Id.toString() !== userId.toString() && match.user2Id.toString() !== userId.toString()) {
    return next(new AppError('You can only update matches you are part of', 403));
  }
  
  // Update match
  match.isMutual = isMutual;
  await match.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      match
    }
  });
});

// Unmatch (delete match)
exports.unmatch = catchAsync(async (req, res, next) => {
  const { matchId } = req.params;
  // const { userId } = req.query;
  
  // if (!userId) {
  //   return next(new AppError('User ID is required as a query parameter', 400));
  // }
  
  const match = await Match.findOne({
    $or: [
      { _id: matchId },
      { matchId: matchId }
    ]
  });
  
  if (!match) {
    return next(new AppError('Match not found', 404));
  }
  
  // // Check if user is part of the match
  // if (match.user1Id.toString() !== userId.toString() && match.user2Id.toString() !== userId.toString()) {
  //   return next(new AppError('You can only unmatch from matches you are part of', 403));
  // }
  
  // Delete any messages between the users
  await Message.deleteMany({
    $or: [
      { senderId: match.user1Id, receiverId: match.user2Id },
      { senderId: match.user2Id, receiverId: match.user1Id }
    ]
  });

  //delete any swipes related to this match
  await Swipe.deleteMany({
    $or: [
      { swiperId: match.user1Id, swipedUserId: match.user2Id },
      { swiperId: match.user2Id, swipedUserId: match.user1Id }
    ]
  });
  
  // Delete the match
  await Match.findByIdAndDelete(match._id);
  
  res.status(200).json({
    status: 'success',
    message: 'Match deleted successfully'
  });
});

// Get all matches for current user
exports.getUserMatches = catchAsync(async (req, res, next) => {
  // Get userId from query parameter
  const { userId } = req.query;
  
  if (!userId) {
    return next(new AppError('User ID is required as a query parameter', 400));
  }
  
  // Find all matches for the current user
  const matches = await Match.find({
    $or: [
      { user1Id: userId },
      { user2Id: userId }
    ]
  }).populate({
    path: 'user1Id user2Id',
    select: 'username email profile'
  });
  
  // Format the response to show the other user in each match
  const formattedMatches = matches.map(match => {
    const otherUser = match.user1Id._id.toString() === userId.toString() 
      ? match.user2Id 
      : match.user1Id;
      
    return {
      matchId: match._id,
      customMatchId: match.matchId,
      userId: otherUser._id,
      username: otherUser.username,
      email: otherUser.email,
      profile: otherUser.profile,
      matchDate: match.matchDate,
      isMutual: match.isMutual
    };
  });
  
  res.status(200).json({
    status: 'success',
    results: formattedMatches.length,
    data: {
      matches: formattedMatches
    }
  });
});

// Get all matches with latest messages for the current user
exports.getUserMatchesWithMessages = catchAsync(async (req, res, next) => {
  // Get userId from query parameter
  const { userId } = req.query;
  
  if (!userId) {
    return next(new AppError('User ID is required as a query parameter', 400));
  }
  
  // Use the aggregation pipeline from the model
  const matchesWithMessages = await Match.getMatchesWithLatestMessages(userId);
  
  res.status(200).json({
    status: 'success',
    results: matchesWithMessages.length,
    data: {
      matches: matchesWithMessages
    }
  });
});