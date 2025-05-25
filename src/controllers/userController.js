const User = require('../models/userModel');
const getDataUri = require("../utils/dataUri");
const {uploadToCloudinary} = require("../utils/cloudinary");

// Create a new user
exports.createUser = async (req, res) => {
    try {
        const { auth_id, email } = req.body;

        if (!auth_id || !email) {
            return res.status(400).json({
                status: 'error',
                message: 'Auth ID and email are required'
            });
        }

        const existingUser = await User.findOne({ auth_id });
        if (existingUser) {
            return res.status(400).json({
                status: 'error',
                message: 'User with this auth_id already exists'
            });
        }

        const user = await User.create({
            auth_id,
            email,
            completeProfile: false
        });

        res.status(201).json({
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

// Get user by auth_id
exports.getUserByAuthId = async (req, res) => {
    try {
        const { auth_id } = req.params;

        const user = await User.findOne({ auth_id });
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found - auth_id does not exist: ' + auth_id
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

// Delete user by auth_id
exports.deleteUserByAuthId = async (req, res) => {
    try {
        const { auth_id } = req.params;

        const user = await User.findOneAndDelete({ auth_id });
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        res.status(204).json({
            status: 'success',
            data: null
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