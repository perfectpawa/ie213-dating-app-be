const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const isAuthenticated = require('../middleware/isAuthenticated');

// Add authentication to message routes
router.get('/', isAuthenticated, messageController.getAllMessages);
router.post('/', isAuthenticated, messageController.sendMessage);
router.get('/conversations', isAuthenticated, messageController.getConversations);
router.get('/conversations/:otherUserId', isAuthenticated, messageController.getConversation);
router.get('/:messageId', isAuthenticated, messageController.getMessageById);
router.patch('/:messageId', isAuthenticated, messageController.updateMessage);
router.delete('/:messageId', isAuthenticated, messageController.deleteMessage);

module.exports = router;
