const mongoose = require('mongoose');
const User = require('../models/userModel');
const AppError = require('../utils/appError');

/**
 * Middleware to convert auth_id strings to MongoDB ObjectIds
 * This enables the API to handle both auth_id strings and ObjectIds seamlessly
 */
exports.convertAuthIdToObjectId = async (req, res, next) => {
  try {
    const idHelpers = require('../utils/idHelpers');
    
    // Generic function to convert any user ID field
    const convertUserId = async (userId, fieldName) => {
      if (!userId) return userId;
      
      // If already a valid ObjectId, return as is
      if (mongoose.Types.ObjectId.isValid(userId)) {
        return userId;
      }
      
      // Otherwise try to find user by auth_id
      const user = await User.findOne({ auth_id: userId });
      if (!user) {
        return next(new AppError(`User with auth_id ${userId} not found for field ${fieldName}`, 404));
      }
      return user._id;
    };

    // Check for user IDs in req.body
    if (req.body) {
      // Common ID fields in our API
      const idFields = [
        'user1Id', 'user2Id', 'senderId', 'receiverId', 
        'swiperId', 'swipedUserId', 'blockerId', 'blockedUserId', 
        'userId'
      ];

      // Process each potential ID field in the body
      for (const field of idFields) {
        if (req.body[field]) {
          req.body[field] = await convertUserId(req.body[field], field);
        }
      }
    }

    // Check for user IDs in req.params
    if (req.params) {
      // Common ID param fields
      const paramFields = ['userId', 'otherUserId', 'auth_id'];

      // Process each potential ID param
      for (const field of paramFields) {
        if (req.params[field]) {
          req.params[field] = await convertUserId(req.params[field], field);
        }
      }
    }

    // Check for user IDs in req.query
    if (req.query) {
      // Common ID query fields
      const queryFields = ['userId', 'otherUserId'];

      // Process each potential ID query param
      for (const field of queryFields) {
        if (req.query[field]) {
          req.query[field] = await convertUserId(req.query[field], field);
        }
      }
    }

    next();
  } catch (error) {
    return next(new AppError(`Error converting IDs: ${error.message}`, 500));
  }
};
