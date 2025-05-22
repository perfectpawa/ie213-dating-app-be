const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    auth_id: {
        type: String,
        required: [true, 'Auth ID is required'],
        unique: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true
    },
    completeProfile: {
        type: Boolean,
        default: false
    },
    user_name: {
        type: String,
        default: '',
        trim: true
    },
    full_name: {
        type: String,
        default: '',
        trim: true
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other']
    },
    bio: {
        type: String,
        maxLength: 160,
        default: '',
        trim: true
    },
    profile_picture: {
        type: String,
    },
    cover_picture: {
        type: String,
    }
}, {
    timestamps: true
});

const User = mongoose.model('Users', userSchema);
module.exports = User; 