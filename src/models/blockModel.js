const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({    blockId: {
        type: String,
        unique: true,
        default: function() {
            return 'BLK' + Math.floor(100000 + Math.random() * 900000);
        }    },    blockerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: [true, 'Block must have a blocker']
    },
    blockedUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: [true, 'Block must have a blocked user']
    },
    blockDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index to ensure a user can only block another user once
blockSchema.index({ blockerId: 1, blockedUserId: 1 }, { unique: true });

// Block methods
blockSchema.statics.blockUser = async function(blockerId, blockedUserId) {
    return await this.create({
        blockerId,
        blockedUserId
    });
};

blockSchema.statics.unblockUser = async function(blockerId, blockedUserId) {
    return await this.findOneAndDelete({
        blockerId,
        blockedUserId
    });
};

// Check if a user is blocked
blockSchema.statics.isBlocked = async function(user1Id, user2Id) {
    const block = await this.findOne({
        $or: [
            { blockerId: user1Id, blockedUserId: user2Id },
            { blockerId: user2Id, blockedUserId: user1Id }
        ]
    });
    return !!block;
};

const Block = mongoose.model('Blocks', blockSchema);
module.exports = Block;
