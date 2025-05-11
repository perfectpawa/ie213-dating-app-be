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
        passwordConfirm: {
            type: String,
            required: [true, 'Please confirm your password'],
            validate: {
                validator: function(el) {
                    return el === this.password;
                },
                message: 'Passwords are not the same',
            },
        },
        profilePic: {
            type: String,
        },
        bio: {
            type: String,
            maxLength: 160,
            default: '',
        },
        followers: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: 'User',
        },
        following: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: 'User',
        },
        posts: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: 'Post',
        },
        savedPosts: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: 'Post',
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        otp: {
            type: String,
            default: null,
        },
        otpExpires: {
            type: Date,
            default: null,
        },
        resetPasswordOtp: {
            type: String,
            default: null,
        },
        resetPasswordOtpExpires: {
            type: Date,
            default: null,
        },
        createdAt: {
            type: Date,
            default: Date.now(),
        }
    },
    {
        timestamps: true,
    }
);

// Hashing the password before saving it to the database
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordConfirm = undefined;
    next();
});

// Compare the password with the hashed password in the database
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

const User = mongoose.model('User', userSchema);
module.exports = User;