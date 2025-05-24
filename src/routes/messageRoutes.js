const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

// All routes are now public
router.get('/', messageController.getAllMessages);
router.post('/', messageController.sendMessage);
router.get('/conversations', messageController.getConversations);
router.get('/conversations/:otherUserId', messageController.getConversation);
router.get('/:messageId', messageController.getMessageById);
router.patch('/:messageId', messageController.updateMessage);
router.delete('/:messageId', messageController.deleteMessage);

module.exports = router;
