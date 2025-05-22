const mongoose = require('mongoose');
const Match = require('../models/matchModel');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Helper function to get ObjectId from auth_id
const getUserIdFromAuthId = async (authId) => {
  const user = await User.findOne({ auth_id: authId });
  if (!user) {
    throw new Error(`User with auth_id ${authId} not found`);
  }
  return user._id;
};

// Get all matches
exports.getMatches = catchAsync(async (req, res, next) => {
  // Optional pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;
  const skip = (page - 1) * limit;
  
  // Optional userId filter
  const filter = req.query.userId ? 
    { $or: [{ user1Id: req.query.userId }, { user2Id: req.query.userId }] } : 
    {};
  
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
    
    // Convert auth_ids to ObjectIds if they are strings
    let user1ObjectId, user2ObjectId;
    
    try {
      user1ObjectId = mongoose.Types.ObjectId.isValid(user1Id) ? 
        user1Id : await getUserIdFromAuthId(user1Id);
      
      user2ObjectId = mongoose.Types.ObjectId.isValid(user2Id) ? 
        user2Id : await getUserIdFromAuthId(user2Id);
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
  const userId = req.user._id;
  const { isMutual } = req.body;
  
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
  const userId = req.user._id;
  
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
    return next(new AppError('You can only unmatch from matches you are part of', 403));
  }
  
  // Delete any messages between the users
  await Message.deleteMany({
    $or: [
      { senderId: match.user1Id, receiverId: match.user2Id },
      { senderId: match.user2Id, receiverId: match.user1Id }
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
  const userId = req.user._id;
  
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
  const userId = req.user._id;
  
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
