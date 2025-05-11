const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const getDataUri = require("../utils/dataUri");
const {uploadToCloudinary} = require("../utils/cloudinary");

const User = require('../models/userModel');

//TODO: not tested
exports.getProfile = catchAsync(async (req, res, next) => {
    const { id } = req.user;

    const user = await User.findById(id).select(
        '-password -passwordConfirm -otp -otpExpires -resetPasswordOTP -resetPasswordOTPExpires'
    ).populate({
        path: 'posts',
        options: {
            sort: {
                createdAt: -1
            }
        }
    }).populate({
        path: 'savePosts',
        options: {
            sort: {
                createdAt: -1
            }
        }
    });

    if (user) {
        return next(AppError('User not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            user
        }
    });
});

//TODO: not tested
exports.editProfile = catchAsync(async (req, res, next) => {
    const { id } = req.user;

    const { bio } = req.body;
    const profilePic = req.file;

    let cloudinaryResponse;

    if (profilePic) {
        const dataUri = getDataUri(profilePic);
        cloudinaryResponse = await uploadToCloudinary(dataUri);
    }

    const user = await User.findById(id).select('-password');

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    if (bio) user.bio = bio;
    if (profilePic) user.profilePic = cloudinaryResponse.secure_url;

    await user.save({validateBeforeSave: false});

    res.status(200).json({
        status: 'success',
        message: 'Profile updated successfully',
        data: {
            user
        }
    });
});

//TODO: not tested
exports.suggestedUsers = catchAsync(async (req, res, next) => {
    const loginUserId = req.user._id;

    const users = await User.find({
        _id: {
            $ne: loginUserId
        }
    }).select(
        '-password -passwordConfirm -otp -otpExpires -resetPasswordOTP -resetPasswordOTPExpires'
    );

    res.status(200).json({
        status: 'success',
        data: {
            users
        }
    })

});

//TODO: not tested
exports.followOrUnfollow = catchAsync(async (req, res, next) => {
    const loginUserId = req.user._id;
    const targetUserId = req.params.id;

    //compare two id
    if (loginUserId === targetUserId) {
        return next(new AppError('You cannot follow yourself', 400));
    }

    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
        return next(new AppError('User not found', 404));
    }

    const isFollowing = targetUser.followers.includes(loginUserId);

    if (isFollowing) {
        await Promise.all(
            User.updateOne(
                {_id: loginUserId},
                {$pull: {following: targetUserId}}
            ),
            User.updateOne(
                {_id: targetUserId},
                {$pull: {followers: loginUserId}}
            )
        )
    }else {
        await Promise.all(
            User.updateOne(
                {_id: loginUserId},
                {$addToSet: {following: targetUserId}}
            ),
            User.updateOne(
                {_id: targetUserId},
                {$addToSet: {followers: loginUserId}}
            )
        )
    }

    const updatedLoggedInUser = await User.findById(loginUserId).select(
        '-password'
    );

    res.status(200).json({
        status: isFollowing ? "Unfollowed successfully" : "Followed successfully",
        data: {
            user: updatedLoggedInUser
        }
    })

});

//TODO: not tested
exports.getMe = catchAsync(async (req, res, next) => {
    const user = req.user;

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            user
        }
    });
});