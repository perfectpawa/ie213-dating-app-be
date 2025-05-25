const express = require('express');
const router = express.Router();
const blockController = require('../controllers/blockController');

router.get('/', blockController.getAllBlocks);
router.get('/:blockId', blockController.getBlockById);
router.post('/:userId', blockController.blockUser);
router.delete('/:userId', blockController.unblockUser);
router.get('/list', blockController.getBlockedUsers);
router.get('/check/:userId', blockController.checkBlock);
router.get('/blockers', blockController.getBlockersUsers);

module.exports = router;
