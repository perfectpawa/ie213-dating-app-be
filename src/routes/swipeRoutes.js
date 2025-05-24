const express = require('express');
const router = express.Router();
const swipeController = require('../controllers/swipeController');

router.get('/', swipeController.getAllSwipes);
router.get('/:swipeId', swipeController.getSwipeById);
router.post('/', swipeController.createSwipe);
router.post('/batch', swipeController.batchProcessSwipes);
router.get('/user', swipeController.getUserSwipes);
router.get('/potential-matches', swipeController.getPotentialMatches);
router.get('/stats', swipeController.getSwipeStats);
router.patch('/:swipeId', swipeController.updateSwipe);
router.delete('/:swipeId', swipeController.deleteSwipe);

module.exports = router;
