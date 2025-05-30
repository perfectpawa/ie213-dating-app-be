const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer');
const isAuthenticated = require('../middleware/isAuthenticated');

const { 
    completeUserProfile, getCurrentUser, getUserById, getOtherUsers, deleteUser, getMatchedUsers, getSwipedUsers, getInteractedUsers,
    updateUserProfilePicture, updateUserCoverPicture, updateUserProfile, getRelationship
    completeUserProfile, getCurrentUser, getUserById, getOtherUsers, deleteUser, getMatchedUsers, getSwipedUsers, getInteractedUsers, getEnhancedMatchInfo,
    updateUserProfilePicture, updateUserCoverPicture, updateUserProfile
 } = require('../controllers/userController');
const {signup, verifyAccount, resendOTP, login, logout, forgotPassword, resetPassword, changePassword, checkUserNameValidation, getMe } = require('../controllers/authController');

router.get('/me', isAuthenticated, getCurrentUser);
router.get('/other-users', isAuthenticated, getOtherUsers);
router.get('/matched-users', isAuthenticated, getMatchedUsers);
router.get('/swiped-users', isAuthenticated, getSwipedUsers);
router.get('/interacted-users', isAuthenticated, getInteractedUsers);
router.get('/enhanced-match-info', isAuthenticated, getEnhancedMatchInfo);
router.get('/relationship/:otherUserId', isAuthenticated, getRelationship);

router.post('/update-profile-picture', isAuthenticated, upload.single("profile_picture"), updateUserProfilePicture);
router.post('/update-cover-picture', isAuthenticated, upload.single("cover_picture"), updateUserCoverPicture);
router.post('/update-profile', isAuthenticated, updateUserProfile);

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
router.get('/me', isAuthenticated, getMe);


router.get('/check-username/:user_name', checkUserNameValidation);

module.exports = router; 