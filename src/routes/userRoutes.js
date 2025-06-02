const express = require('express');
const router = express.Router();
const passport = require('passport');
const upload = require('../middleware/multer');
const isAuthenticated = require('../middleware/isAuthenticated');
const jwt = require('jsonwebtoken');

const { 
    updateUserProfilePicture, updateUserCoverPicture, updateUserProfile, getRelationship, completeInterest, getUserInterests,
    completeUserProfile, getCurrentUser, getUserById, getOtherUsers, deleteUser, getMatchedUsers, getSwipedUsers, getInteractedUsers, getEnhancedMatchInfo,
    getSimilarInterests, updateUserInterests, getAllLikedPosts
} = require('../controllers/userController');
const {
    signup, verifyAccount, resendOTP, login, logout, forgotPassword, resetPassword, 
    changePassword, checkUserNameValidation, getMe, handleGoogleAuth 
} = require('../controllers/authController');

router.get('/me', isAuthenticated, getCurrentUser);
router.get('/other-users', isAuthenticated, getOtherUsers);
router.get('/matched-users', isAuthenticated, getMatchedUsers);
router.get('/swiped-users', isAuthenticated, getSwipedUsers);
router.get('/interacted-users', isAuthenticated, getInteractedUsers);
router.get('/enhanced-match-info', isAuthenticated, getEnhancedMatchInfo);
router.get('/similar-interests/:otherUserId', isAuthenticated, getSimilarInterests);

router.get('/relationship/:otherUserId', isAuthenticated, getRelationship);

router.post('/update-profile-picture', isAuthenticated, upload.single("profile_picture"), updateUserProfilePicture);
router.post('/update-cover-picture', isAuthenticated, upload.single("cover_picture"), updateUserCoverPicture);
router.post('/update-profile', isAuthenticated, updateUserProfile);

router.post('/update-interests', isAuthenticated, updateUserInterests);
router.get('/liked-posts', isAuthenticated, getAllLikedPosts);

router.post('/:id/complete-profile', upload.single("profile_picture"), completeUserProfile);
router.post('/:id/complete-interest', isAuthenticated, completeInterest);
router.get('/:id/interests', isAuthenticated, getUserInterests);
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
router.get('/me', isAuthenticated, getMe);


router.get('/check-username/:user_name', checkUserNameValidation);

// Google OAuth routes
router.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback', handleGoogleAuth);

module.exports = router; 