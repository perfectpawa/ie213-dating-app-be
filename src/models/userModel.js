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
    }
}, {
    timestamps: true
});

const User = mongoose.model('Users', userSchema);
module.exports = User; 