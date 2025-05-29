const express = require('express');
const router = express.Router();
const swipeController = require('../controllers/swipeController');
const AppError = require('../utils/appError');

// Simple check to see if controller methods exist
const methodExists = (method, name) => {
  if (!method) {
    console.error(`Error: ${name} is not defined in swipeController`);
    return (req, res) => res.status(500).json({ 
      status: 'error', 
      message: `Controller method ${name} not implemented` 
    });
  }
  return method;
};

// Log the request method and path for every request to this router
router.use((req, res, next) => {
  console.log(`[Swipe Route] ${req.method} ${req.path}`);
  next();
});

// All routes are now public (no authentication middleware)
router.post('/', methodExists(swipeController.createSwipe, 'createSwipe'));
router.get('/user', methodExists(swipeController.getUserSwipes, 'getUserSwipes'));
router.get('/potential-matches', methodExists(swipeController.getPotentialMatches, 'getPotentialMatches'));
router.get('/:swipeId', methodExists(swipeController.getSwipeById, 'getSwipeById'));
router.patch('/:swipeId', methodExists(swipeController.updateSwipe, 'updateSwipe'));
router.delete('/:swipeId', methodExists(swipeController.deleteSwipe, 'deleteSwipe'));

module.exports = router;
