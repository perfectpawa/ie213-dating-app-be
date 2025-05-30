const express = require('express');
const router = express.Router();
const passport = require('passport');
const upload = require('../middleware/multer');
const isAuthenticated = require('../middleware/isAuthenticated');
const jwt = require('jsonwebtoken');

const { 
    updateUserProfilePicture, updateUserCoverPicture, updateUserProfile, getRelationship,
    completeUserProfile, getCurrentUser, getUserById, getOtherUsers, deleteUser, getMatchedUsers, getSwipedUsers, getInteractedUsers, getEnhancedMatchInfo,
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

// Google OAuth routes
router.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
    (req, res, next) => {
        passport.authenticate('google', { 
            failureRedirect: '/login',
            session: false
        }, async (err, user, info) => {
            try {
                if (err) {
                    if (err.message === 'EMAIL_ALREADY_REGISTERED') {
                        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/signin?error=email_already_registered`);
                    }
                    throw err;
                }

                if (!user) {
                    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/signin?error=google_auth_failed`);
                }

                // Create JWT token
                const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
                    expiresIn: process.env.JWT_EXPIRES_IN
                });

                // Set cookie
                res.cookie('token', token, {
                    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
                });

                // Redirect to frontend with token
                res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/google/callback?token=${token}`);
            } catch (error) {
                console.error('Error during Google authentication:', error);
                res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/signin?error=google_auth_failed`);
            }
        })(req, res, next);
    }
);

module.exports = router; 