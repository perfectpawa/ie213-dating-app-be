const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  matchId: {
    type: String,
    unique: true,
    default: function() {
      return 'MTH' + Math.floor(100000 + Math.random() * 900000);
    }
  },
  user1Id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true
  },
  user2Id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true
  },
  swipeId: {
    type: String
  },
  matchDate: {
    type: Date,
    default: Date.now
  },
  isMutual: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Static method to get matches with latest messages
matchSchema.statics.getMatchesWithLatestMessages = async function(userId) {
  const matches = await this.aggregate([
    // Match documents where userId is either user1Id or user2Id
    {
      $match: {
        $or: [
          { user1Id: userId.toString() },
          { user2Id: userId.toString() }
        ]
      }
    },
    // Add fields to determine the other user
    {
      $addFields: {
        otherUserId: {
          $cond: [
            { $eq: ["$user1Id", userId.toString()] },
            "$user2Id",
            "$user1Id"
          ]
        }
      }
    },
    // Lookup latest message
    {
      $lookup: {
        from: "messages",
        let: { user1: "$user1Id", user2: "$user2Id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  { $and: [
                    { $eq: ["$senderId", "$$user1"] },
                    { $eq: ["$receiverId", "$$user2"] }
                  ]},
                  { $and: [
                    { $eq: ["$senderId", "$$user2"] },
                    { $eq: ["$receiverId", "$$user1"] }
                  ]}
                ]
              }
            }
          },
          { $sort: { createdAt: -1 } },
          { $limit: 1 }
        ],
        as: "latestMessage"
      }
    },
    // Count unread messages
    {
      $lookup: {
        from: "messages",
        let: { user1: "$user1Id", user2: "$user2Id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$senderId", "$$user2"] },
                  { $eq: ["$receiverId", "$$user1"] },
                  { $eq: ["$read", false] }
                ]
              }
            }
          },
          { $count: "unreadCount" }
        ],
        as: "unreadInfo"
      }
    },
    // Lookup other user details
    {
      $lookup: {
        from: "users",
        localField: "otherUserId",
        foreignField: "_id",
        as: "otherUser"
      }
    },
    // Format the output
    {
      $project: {
        _id: 1,
        matchId: 1,
        matchDate: 1,
        isMutual: 1,
        otherUser: { $arrayElemAt: ["$otherUser", 0] },
        latestMessage: { $arrayElemAt: ["$latestMessage", 0] },
        unreadCount: {
          $cond: [
            { $gt: [{ $size: "$unreadInfo" }, 0] },
            { $arrayElemAt: ["$unreadInfo.unreadCount", 0] },
            0
          ]
        }
      }
    },
    // Project selected fields from otherUser
    {
      $project: {
        _id: 1,
        matchId: 1,
        matchDate: 1,
        isMutual: 1,
        otherUserId: "$otherUser._id",
        otherUsername: "$otherUser.username",
        otherEmail: "$otherUser.email",
        otherProfile: "$otherUser.profile",
        latestMessage: 1,
        unreadCount: 1
      }
    },
    // Sort by latest message time, or match date if no messages
    {
      $sort: {
        "latestMessage.createdAt": -1,
        "matchDate": -1
      }
    }
  ]);
  
  return matches;
};

const Match = mongoose.model('Match', matchSchema);
module.exports = Match;
