const express = require('express');
const router = express.Router();
const { createUser, completeUserProfile, getUserByAuthId } = require('../controllers/userController');
const upload = require('../middleware/multer');

router.post('/create', createUser);
router.post('/:id/complete-profile', upload.single("profilePic"), completeUserProfile);
router.get('/auth/:auth_id', getUserByAuthId);



module.exports = router; 