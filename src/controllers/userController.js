const User = require('../models/userModel');

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

// Get user by auth_id
exports.getUserByAuthId = async (req, res) => {
    try {
        const { auth_id } = req.params;

        const user = await User.findOne({ auth_id });
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