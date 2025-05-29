const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer');
const isAuthenticated = require('../middleware/isAuthenticated');

const { completeUserProfile, getCurrentUser, getUserById, getOtherUsers, deleteUser, getMatchedUsers, getSwipedUsers, getInteractedUsers } = require('../controllers/userController');
const {signup, verifyAccount, resendOTP, login, logout, forgotPassword, resetPassword, changePassword } = require('../controllers/authController');

router.get('/me', isAuthenticated, getCurrentUser);
router.get('/other-users', isAuthenticated, getOtherUsers);
router.get('/matched-users', isAuthenticated, getMatchedUsers);
router.get('/swiped-users', isAuthenticated, getSwipedUsers);
router.get('/interacted-users', isAuthenticated, getInteractedUsers);
router.post('/:id/complete-profile', upload.single("profile_picture"), completeUserProfile);
router.get('/:userId', isAuthenticated, getUserById);
router.delete('/:userId', isAuthenticated, deleteUser);

//Auth routes
router.post('/signup', signup);
router.post('/verify', isAuthenticated, verifyAccount);
router.post('/resend-otp', isAuthenticated, resendOTP);
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', isAuthenticated, changePassword);

module.exports = router; 