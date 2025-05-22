const mongoose = require('mongoose');
const User = require('../models/userModel');

/**
 * Utility functions to handle ID conversion throughout the application
 */

/**
 * Find a user by either ObjectId or auth_id
 * @param {string} id - User ID (either ObjectId or auth_id)
 * @returns {Promise<Object>} - User document or null if not found
 */
exports.findUserByAnyId = async (id) => {
  let user = null;
  
  // Try to find by ObjectId if valid
  if (mongoose.Types.ObjectId.isValid(id)) {
    user = await User.findById(id);
  }
  
  // If not found, try by auth_id
  if (!user) {
    user = await User.findOne({ auth_id: id });
  }
  
  return user;
};

/**
 * Convert ID to ObjectId if it's a valid ObjectId, otherwise return as is
 * @param {string} id - ID to convert 
 * @returns {Object|string} - ObjectId or original string
 */
exports.toObjectId = (id) => {
  if (mongoose.Types.ObjectId.isValid(id)) {
    return mongoose.Types.ObjectId(id);
  }
  return id;
};

/**
 * Check if an ID is a valid MongoDB ObjectId
 * @param {string} id - ID to check
 * @returns {boolean} - True if valid ObjectId
 */
exports.isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Get ObjectId from user regardless of input ID type
 * @param {string} id - User ID (either ObjectId or auth_id)
 * @returns {Promise<Object>} - ObjectId or null if user not found
 */
exports.getUserObjectId = async (id) => {
  const user = await exports.findUserByAnyId(id);
  return user ? user._id : null;
};
