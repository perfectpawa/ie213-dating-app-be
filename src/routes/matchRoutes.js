const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');

router.get('/', matchController.getMatches);
router.get('/:matchId', matchController.getMatch);
router.post('/', matchController.createMatch);
router.patch('/:matchId', matchController.updateMatch);
router.delete('/:matchId', matchController.unmatch);
router.get('/user/list', matchController.getUserMatches);
router.get('/user/messages', matchController.getUserMatchesWithMessages);

module.exports = router;
