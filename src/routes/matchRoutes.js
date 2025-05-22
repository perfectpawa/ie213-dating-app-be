const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const authMiddleware = require('../middleware/auth');
const idConverterMiddleware = require('../middleware/idConverter');


router.get('/', matchController.getMatches);
router.get('/:matchId', matchController.getMatch);

// Protected routes - require authentication
router.use(authMiddleware.protect);

// Add ID converter middleware to convert auth_ids to ObjectIds
router.use(idConverterMiddleware.convertAuthIdToObjectId);

router.post('/', matchController.createMatch);
router.patch('/:matchId', matchController.updateMatch);
router.delete('/:matchId', matchController.unmatch);
router.get('/user/list', matchController.getUserMatches);
router.get('/user/messages', matchController.getUserMatchesWithMessages);

module.exports = router;
