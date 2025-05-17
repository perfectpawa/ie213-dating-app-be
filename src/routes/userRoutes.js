const express = require('express');
const router = express.Router();
const { createUser, completeUserProfile, getUserByAuthId, deleteUserByAuthId } = require('../controllers/userController');
const upload = require('../middleware/multer');

router.post('/create', createUser);
router.post('/complete-profile', upload.single("profilePic"), completeUserProfile);
router.get('/:auth_id', getUserByAuthId);
// router.delete('/:auth_id', deleteUserByAuthId);

module.exports = router; 