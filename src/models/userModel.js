const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');


const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: [true, 'A user must have a password'],
        minLength: 8,
        select: false,
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
    },
    completeProfile: {
        type: Boolean,
        default: false
    },
    authProvider: {
        type: String,
        enum: ['email', 'google'],
        default: 'email'  
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
    birthday: {
        type: String,
        validate: {
            validator: function(v) {
                return /^\d{4}-\d{2}-\d{2}$/.test(v);
            },
            message: props => `${props.value} is not a valid date format! Use YYYY-MM-DD`
        }
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
    },
    interests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Interest'
    }],
    completeInterest: {
        type: Boolean,
        default: false
    },
}, {
    timestamps: true
});

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

const User = mongoose.model('Users', userSchema);
module.exports = User; 