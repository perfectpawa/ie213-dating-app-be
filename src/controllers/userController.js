const User = require('../models/userModel');
const getDataUri = require("../utils/dataUri");
const {uploadToCloudinary} = require("../utils/cloudinary");
const { Post } = require('../models/postModel');
const Notification = require('../models/notificationModel');
const Message = require('../models/messageModel');
const Swipe = require('../models/swipeModel');
const Block = require('../models/blockModel');
const Match = require('../models/matchModel');
const Interest = require('../models/interestModel');

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

        const { user_name, full_name, gender, bio, birthday } = req.body;
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
        user.birthday = birthday || user.birthday;
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

//update user profile picture
exports.updateUserProfilePicture = async (req, res) => {

    const userId = req.user.id;

    try {
        const profilePic = req.file;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        let cloudinaryResponse;

        if (profilePic) {
            const dataUri = getDataUri(profilePic);
            cloudinaryResponse = await uploadToCloudinary(dataUri);
            console.log(cloudinaryResponse);
        }



        //update user profile picture
        user.profile_picture = cloudinaryResponse ? cloudinaryResponse : user.profile_picture;

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

}

// update user cover picture
exports.updateUserCoverPicture = async (req, res) => {

    const userId = req.user.id;

    try {
        const coverPic = req.file;

        let cloudinaryResponse;

        //find user by auth_id
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        if (coverPic) {
            const dataUri = getDataUri(coverPic);
            cloudinaryResponse = await uploadToCloudinary(dataUri);
            console.log(cloudinaryResponse);
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

// update user profile information
exports.updateUserProfile = async (req, res) => {

    const userId = req.user.id;

    try {
        const { full_name, bio, gender, birthday } = req.body;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        //update user profile
        user.full_name = full_name || user.full_name;
        user.gender = gender || user.gender;
        user.bio = bio || user.bio;
        user.birthday = birthday || user.birthday;

        await user.save({validateBeforeSave: false});
        
        res.status(200).json({
            status: 'success',
            message: 'Profile updated successfully',
            data: {
                user
            }
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }

}

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
        //filler user not verified, not complete profile, not complete interest
        const users = await User.find({ _id: { $ne: currentUser._id } })
            .where('isVerified').equals(true)
            .where('completeProfile').equals(true)
            .where('completeInterest').equals(true)
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

// Get Interacted users infor and status of it (swiped, matched)
// data: [ {user, status: 'swiped' | 'matched' | 'not_interacted'} ]
exports.getInteractedUsers = async (req, res) => {
    try {
        const userId = req.user.id;

        if (!userId) {
            return res.status(400).json({
                status: 'error',
                message: 'User ID is required'
            });
        }

        // Get all swiped users' IDs with status is not dislike
        const swipedUsers = await Swipe.find({
            swiperId: userId,
            status: { $ne: 'dislike' } // Exclude dislikes
        })
        .populate('swipedUserId', '-password -otp -otpExpires -resetPasswordOtp -resetPasswordOtpExpires -createdAt -updatedAt -__v');

        
        // Get all matched users' IDs
        const matchedUsers = await Match.find({
            $or: [
                { user1Id: userId },
                { user2Id: userId }
            ]
        })
        .populate('user1Id', '-password -otp -otpExpires -resetPasswordOtp -resetPasswordOtpExpires -createdAt -updatedAt -__v')
        .populate('user2Id', '-password -otp -otpExpires -resetPasswordOtp -resetPasswordOtpExpires -createdAt -updatedAt -__v');

        // Create a map for matched users
        const matchedUserMap = {};
        matchedUsers.forEach(match => {
            if (match.user1Id._id.toString() !== userId) {
                matchedUserMap[match.user1Id._id.toString()] = 'matched';
            } else {
                matchedUserMap[match.user2Id._id.toString()] = 'matched';
            }
        });

        // Create a map for swiped users
        const swipedUserMap = {};
        swipedUsers.forEach(swipe => {
            swipedUserMap[swipe.swipedUserId._id.toString()] = 'swiped';
        });

        // Combine results
        const interactedUsers = [];
        
        // Add matched users first
        for (const match of matchedUsers) {
            if (match.user1Id._id.toString() !== userId) {
                interactedUsers.push({
                    user: match.user1Id,
                    status: 'matched'
                });
            } else {
                interactedUsers.push({
                    user: match.user2Id,
                    status: 'matched'
                });
            }
        }

        // Add swiped users
        for (const swipe of swipedUsers) {
            if (!matchedUserMap[swipe.swipedUserId._id.toString()]) {
                interactedUsers.push({
                    user: swipe.swipedUserId,
                    status: 'swiped'
                });
            }
        }
    
    
        res.status(200).json({
            status: 'success',
            data: { users: interactedUsers }
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

//get relationship current user and other user (no relevant - wait their swipe - wait your swipe - match)
exports.getRelationship = async (req, res) => {
    try {
        const userId = req.user.id;
        const otherUserId = req.params.otherUserId;

        if (!userId || !otherUserId) {
            return res.status(400).json({
                status: 'error',
                message: 'User ID and Other User ID are required'
            });
        }

        // Check if the users are blocked
        const isBlocked = await Block.findOne({
            $or: [
                { blockerId: userId, blockedUserId: otherUserId },
                { blockerId: otherUserId, blockedUserId: userId }
            ]
        });

        if (isBlocked) {
            return res.status(403).json({
                status: 'error',
                message: 'You cannot interact with this user as they have blocked you or you have blocked them.'
            });
        }

        // Check if the users have matched
        const match = await Match.findOne({
            $or: [
                { user1Id: userId, user2Id: otherUserId },
                { user1Id: otherUserId, user2Id: userId }
            ]
        });

        if (match) {
            return res.status(200).json({
                status: 'success',
                relationship: 'match'
            });
        }

        // Check if the current user has swiped on the other user
        const currentUserSwipe = await Swipe.findOne({
            swiperId: userId,
            swipedUserId: otherUserId
        });

        // Check if the other user has swiped on the current user
        const otherUserSwipe = await Swipe.findOne({
            swiperId: otherUserId,
            swipedUserId: userId
        });

        if (currentUserSwipe) {
            return res.status(200).json({
                status: 'success',
                relationship: 'wait_for_their_swipe'
            });
        }

        if (otherUserSwipe) {
            return res.status(200).json({
                status: 'success',
                relationship: 'wait_for_your_swipe'
            });
        }

        // If no match or swipe found, return no_relevant
        res.status(200).json({
            status: 'success',
            relationship: 'no_relevant'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// Get Enhanced Match Information (Separated by categories)
// Returns: outgoing likes, incoming likes, and mutual matches in separate arrays
exports.getEnhancedMatchInfo = async (req, res) => {
    try {
        const userId = req.user.id;

        if (!userId) {
            return res.status(400).json({
                status: 'error',
                message: 'User ID is required'
            });
        }

        // 1. Get outgoing likes (people current user liked but not matched yet)
        const outgoingSwipes = await Swipe.find({
            swiperId: userId,
            status: { $in: ['like', 'superlike'] }
        })
        .populate('swipedUserId', '-password -otp -otpExpires -resetPasswordOtp -resetPasswordOtpExpires -createdAt -updatedAt -__v');

        // 2. Get incoming likes (people who liked current user but not matched yet)
        const incomingSwipes = await Swipe.find({
            swipedUserId: userId,
            status: { $in: ['like', 'superlike'] }
        })
        .populate('swiperId', '-password -otp -otpExpires -resetPasswordOtp -resetPasswordOtpExpires -createdAt -updatedAt -__v');

        // 3. Get mutual matches
        const mutualMatches = await Match.find({
            $or: [
                { user1Id: userId },
                { user2Id: userId }
            ]
        })
        .populate('user1Id', '-password -otp -otpExpires -resetPasswordOtp -resetPasswordOtpExpires -createdAt -updatedAt -__v')
        .populate('user2Id', '-password -otp -otpExpires -resetPasswordOtp -resetPasswordOtpExpires -createdAt -updatedAt -__v');

        // Create a set of matched user IDs for filtering
        const matchedUserIds = new Set();
        mutualMatches.forEach(match => {
            const otherId = match.user1Id._id.toString() === userId ?
                          match.user2Id._id.toString() :
                          match.user1Id._id.toString();
            matchedUserIds.add(otherId);
        });

        // Filter outgoing likes to exclude already matched users
        const outgoingLikes = outgoingSwipes
            .filter(swipe => !matchedUserIds.has(swipe.swipedUserId._id.toString()))
            .map(swipe => ({
                user: swipe.swipedUserId,
                status: 'swiped',
                swipeType: swipe.status // 'like' or 'superlike'
            }));

        // Filter incoming likes to exclude already matched users
        const incomingLikes = incomingSwipes
            .filter(swipe => !matchedUserIds.has(swipe.swiperId._id.toString()))
            .map(swipe => ({
                user: swipe.swiperId,
                status: 'liked_you',
                swipeType: swipe.status // 'like' or 'superlike'
            }));

        // Format mutual matches
        const matches = mutualMatches.map(match => ({
            user: match.user1Id._id.toString() === userId ? match.user2Id : match.user1Id,
            status: 'matched',
            matchDate: match.matchDate
        }));

        res.status(200).json({
            status: 'success',
            data: {
                outgoingLikes,    // Những người mà bạn đã chọn để ghép đôi
                incomingLikes,    // Những người đã chọn ghép đôi với bạn
                mutualMatches: matches  // Những người đã ghép đôi với bạn (mutual)
            }
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

exports.completeInterest = async (req, res) => {
    try {
        const userId = req.user.id;
        const { interestIds } = req.body;

        if (!userId || !interestIds || !Array.isArray(interestIds)) {
            return res.status(400).json({
                status: 'error',
                message: 'User ID and interests are required'
            });
        }

        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // Validate interest IDs
        const validInterests = await Interest.find({ _id: { $in: interestIds } });
        
        if (validInterests.length !== interestIds.length) {
            return res.status(400).json({
                status: 'error',
                message: 'Some interests are invalid'
            });
        }

        // Update user's interests
        user.interests = validInterests.map(interest => interest._id);
        user.completeInterest = true;
        await user.save({ validateBeforeSave: false });

        res.status(200).json({
            status: 'success',
            message: 'Interests updated successfully',
            user
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }

}

exports.getUserInterests = async (req, res) => {
    try {
        const { id: userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                status: 'error',
                message: 'User ID is required'
            });
        }

        // Find the user
        const user = await User.findById(userId).populate('interests', '-createdAt -updatedAt -__v');
        
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: { interests: user.interests }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

exports.updateUserInterests = async (req, res) => {
    try {
        const userId = req.user.id;
        const { interests: interestIds } = req.body;

        if (!userId || !interestIds || !Array.isArray(interestIds)) {
            return res.status(400).json({
                status: 'error',
                message: 'User ID and interests are required'
            });
        }

        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // Validate interest IDs
        const validInterests = await Interest.find({ _id: { $in: interestIds } });
        
        if (validInterests.length !== interestIds.length) {
            return res.status(400).json({
                status: 'error',
                message: 'Some interests are invalid'
            });
        }

        // Update user's interests
        user.interests = validInterests.map(interest => interest._id);
        await user.save({ validateBeforeSave: false });

        res.status(200).json({
            status: 'success',
            message: 'Interests updated successfully',
            user
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Get similar interests between two users
exports.getSimilarInterests = async (req, res) => {
    try {
        const { otherUserId } = req.params;
        const currentUserId = req.user.id;

        // Get both users with their interests populated
        const [currentUser, otherUser] = await Promise.all([
            User.findById(currentUserId).populate('interests'),
            User.findById(otherUserId).populate('interests')
        ]);

        if (!currentUser || !otherUser) {
            return res.status(404).json({
                status: 'error',
                message: 'One or both users not found'
            });
        }

        // Get the intersection of interests
        const currentUserInterests = currentUser.interests.map(interest => interest._id.toString());
        const otherUserInterests = otherUser.interests.map(interest => interest._id.toString());
        
        const similarInterests = currentUserInterests.filter(interestId => 
            otherUserInterests.includes(interestId)
        );

        // Get the full interest details for the similar interests
        const similarInterestsDetails = await Interest.find({
            _id: { $in: similarInterests }
        });

        res.status(200).json({
            status: 'success',
            data: {
                similarInterests: similarInterestsDetails,
                count: similarInterestsDetails.length
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.getAllLikedPosts = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find all posts liked by the user
        const likedPosts = await Post.find({ likes: userId })
            .populate('user', '-password -otp -otpExpires -resetPasswordOtp -resetPasswordOtpExpires -createdAt -updatedAt -__v')
            .sort({ createdAt: -1 });

        if (likedPosts.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'No liked posts found'
            });
        }

        const postIds = likedPosts.map(post => post._id);

        res.status(200).json({
            status: 'success',
            // posts: likedPosts,
            postIds: postIds
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}