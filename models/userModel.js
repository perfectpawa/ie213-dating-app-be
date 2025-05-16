const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: [true, 'A user must have a username'],
            unique: true,
            trim: true,
            minLength: 4,
            maxLength: 32,
            index: true,
        },
        email: {
            type: String,
            required: [true, 'A user must have an email'],
            unique: true,
            trim: true,
            lowercase: true,
            validate: [validator.isEmail, 'Please provide a valid email'],
        },
        password: {
            type: String,
            required: [true, 'A user must have a password'],
            minLength: 8,
            select: false,
        },
        profilePic: {
            type: String,
        },
        bio: {
            type: String,
            maxLength: 160,
            default: '',
        },
        completeProfile: {
            type: Boolean,
            default: false,
        }
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model('User', userSchema);
module.exports = User;