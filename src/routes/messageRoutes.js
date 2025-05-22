const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/auth');
const idConverterMiddleware = require('../middleware/idConverter');


router.get('/', messageController.getAllMessages);

// Protected routes - require authentication
router.use(authMiddleware.protect);

// Add ID converter middleware to convert auth_ids to ObjectIds
router.use(idConverterMiddleware.convertAuthIdToObjectId);

router.post('/', messageController.sendMessage);
router.get('/conversations', messageController.getConversations);
router.get('/conversations/:otherUserId', messageController.getConversation);
router.get('/:messageId', messageController.getMessageById);
router.patch('/:messageId', messageController.updateMessage);
router.delete('/:messageId', messageController.deleteMessage);

module.exports = router;
