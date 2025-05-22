const express = require('express');
const router = express.Router();
const swipeController = require('../controllers/swipeController');
const authMiddleware = require('../middleware/auth');
const idConverterMiddleware = require('../middleware/idConverter');


router.get('/', swipeController.getAllSwipes);
router.get('/:swipeId', swipeController.getSwipeById);

// Protected routes - require authentication
router.use(authMiddleware.protect);

// Add ID converter middleware to convert auth_ids to ObjectIds
router.use(idConverterMiddleware.convertAuthIdToObjectId);


router.post('/', swipeController.createSwipe);
router.post('/batch', swipeController.batchProcessSwipes);
router.get('/user', swipeController.getUserSwipes);
router.get('/potential-matches', swipeController.getPotentialMatches);
router.get('/stats', swipeController.getSwipeStats);
router.patch('/:swipeId', swipeController.updateSwipe);
router.delete('/:swipeId', swipeController.deleteSwipe);

module.exports = router;
