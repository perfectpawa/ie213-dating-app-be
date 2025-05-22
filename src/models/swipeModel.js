const mongoose = require('mongoose');

const swipeSchema = new mongoose.Schema({    swipeId: {
        type: String,
        unique: true,
        default: function() {
            return 'SWP' + Math.floor(100000 + Math.random() * 900000);
        }    },    swiperId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: [true, 'Swipe must have a swiper']
    },
    swipedUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: [true, 'Swipe must have a swiped user']
    },
    swipeDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['like', 'dislike', 'superlike'],
        required: [true, 'Swipe must have a status']
    }
}, {
    timestamps: true
});

// Compound index to ensure a user can only swipe another user once
swipeSchema.index({ swiperId: 1, swipedUserId: 1 }, { unique: true });

// Static method to create a swipe
swipeSchema.statics.createSwipe = async function(swiperId, swipedUserId, status) {
    return await this.create({
        swiperId,
        swipedUserId,
        status
    });
};

const Swipe = mongoose.model('Swipes', swipeSchema);
module.exports = Swipe;
