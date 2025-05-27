const User = require('../models/userModel');
const getDataUri = require("../utils/dataUri");
const {uploadToCloudinary} = require("../utils/cloudinary");

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