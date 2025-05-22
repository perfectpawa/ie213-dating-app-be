const express = require('express');
const router = express.Router();
const blockController = require('../controllers/blockController');
const authMiddleware = require('../middleware/auth');
const idConverterMiddleware = require('../middleware/idConverter');


router.get('/', blockController.getAllBlocks);
router.get('/:blockId', blockController.getBlockById);

// Protected routes - require authentication
router.use(authMiddleware.protect);

// Add ID converter middleware to convert auth_ids to ObjectIds
router.use(idConverterMiddleware.convertAuthIdToObjectId);

router.post('/:userId', blockController.blockUser);
router.delete('/:userId', blockController.unblockUser);
router.get('/list', blockController.getBlockedUsers);
router.get('/check/:userId', blockController.checkBlock);
router.get('/blockers', blockController.getBlockersUsers);

module.exports = router;
