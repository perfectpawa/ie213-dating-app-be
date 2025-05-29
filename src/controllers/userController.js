const User = require('../models/userModel');
const getDataUri = require("../utils/dataUri");
const {uploadToCloudinary} = require("../utils/cloudinary");
const { Post } = require('../models/postModel');
const Notification = require('../models/notificationModel');
const Message = require('../models/messageModel');
const Swipe = require('../models/swipeModel');
const Block = require('../models/blockModel');
const Match = require('../models/matchModel');

// Get user by ID
exports.getUserById = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: { user }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

//Complete user profile
exports.completeUserProfile = async (req, res) => {
    try {
        console.log(req.body);

        const { id } = req.params;

        const { user_name, full_name, gender, bio } = req.body;
        const profilePic = req.file;

        let cloudinaryResponse;

        if (profilePic) {
            const dataUri = getDataUri(profilePic);
            cloudinaryResponse = await uploadToCloudinary(dataUri);
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        //update user profile
        user.user_name = user_name || user.user_name;
        user.full_name = full_name || user.full_name;
        user.gender = gender || user.gender;
        user.bio = bio || user.bio;
        user.profile_picture = cloudinaryResponse ? cloudinaryResponse : user.profile_picture;
        user.completeProfile = true;

        await user.save({validateBeforeSave: false});

        res.status(200).json({
            status: 'success',
            message: 'Profile updated successfully',
            user
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// update user cover picture
exports.updateUserCoverPicture = async (req, res) => {
    try {
        const coverPic = req.file;

        let cloudinaryResponse;

        if (coverPic) {
            const dataUri = getDataUri(coverPic);
            cloudinaryResponse = await uploadToCloudinary(dataUri);
            console.log(cloudinaryResponse);
        }

        //find user by auth_id
        const user = await User.findOne({ id });

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        //update cover user profile
        user.cover_picture = cloudinaryResponse ? cloudinaryResponse : user.cover_picture;

        await user.save({validateBeforeSave: false});

        res.status(200).json({
            status: 'success',
            message: 'Profile updated successfully',
            data: {
                user
            }
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.getOtherUsers = async (req, res) => {
    const currentUser = req.user;

    try {
        const users = await User.find({ _id: { $ne: currentUser._id } })
            .select('-password -otp -otpExpires -resetPasswordOtp -resetPasswordOtpExpires -createdAt -updatedAt -__v')
            .sort({ createdAt: -1 });

        res.status(200).json({
            status: 'success',
            data: { users }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

exports.deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // Delete all associated data in parallel
        await Promise.all([
            // Delete user's posts and their associated comments
            Post.deleteMany({ user: userId }),
            
            // Delete notifications where user is either sender or recipient
            Notification.deleteMany({
                $or: [
                    { sender: userId },
                    { recipient: userId }
                ]
            }),
            
            // Delete messages where user is either sender or receiver
            Message.deleteMany({
                $or: [
                    { senderId: userId },
                    { receiverId: userId }
                ]
            }),
            
            // Delete swipes where user is either swiper or swiped user
            Swipe.deleteMany({
                $or: [
                    { swiperId: userId },
                    { swipedUserId: userId }
                ]
            }),
            
            // Delete blocks where user is either blocker or blocked user
            Block.deleteMany({
                $or: [
                    { blockerId: userId },
                    { blockedUserId: userId }
                ]
            }),
            
            // Delete matches where user is either user1 or user2
            Match.deleteMany({
                $or: [
                    { user1Id: userId },
                    { user2Id: userId }
                ]
            }),
            
            // Finally delete the user
            User.findByIdAndDelete(userId)
        ]);

        res.status(200).json({
            status: 'success',
            message: 'User and all associated data deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

exports.getMatchedUsers = async (req, res) => {
    try {
        const userId = req.user.id;

        //get all matched users id in match, and sort by match createdAt, filter duplicates and userId
        const matchedUserIds = await Match.find({
            $or: [
                { user1Id: userId },
                { user2Id: userId }
            ]
        })
        .sort({ createdAt: -1 })
        .distinct('user1Id user2Id')
        .then(matches => {
            return matches.filter(id => id.toString() !== userId);
        });

        if (matchedUserIds.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'No matched found'
            });
        }

        // Fetch user details for matched users
        const matchedUsers = await User.find({ _id: { $in: matchedUserIds } })
            .select('-password -otp -otpExpires -resetPasswordOtp -resetPasswordOtpExpires -createdAt -updatedAt -__v');

        if (matchedUsers.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'No matched users found'
            });
        }
        

        res.status(200).json({
            status: 'success',
            data: { matchedUsers }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

exports.getSwipedUsers = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get all swiped users' IDs
        const swipedUserIds = await Swipe.find({ swiperId: userId })
            .distinct('swipedUserId');

        if (swipedUserIds.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'No swiped users found'
            });
        }

        // Fetch user details for swiped users
        const swipedUsers = await User.find({ _id: { $in: swipedUserIds } })
            .select('-password -otp -otpExpires -resetPasswordOtp -resetPasswordOtpExpires -createdAt -updatedAt -__v');

        res.status(200).json({
            status: 'success',
            data: { users: swipedUsers }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }

}