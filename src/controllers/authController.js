const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const hbs = require('hbs');

const AppError = require('../utils/appError.js');
const catchAsync = require('../utils/catchAsync.js');
const GenerateOTP = require('../utils/generateOTP.js');
const sendEmail = require('../utils/sendEmail.js');

const User = require('../models/userModel.js');

const otpDurationInMinutes = 5;

const loadTemplate = (templateName, context, message = "Xác thực đăng nhập") => {
    const templatePath = path.join(__dirname, "../emailTemplate", templateName);
    const source = fs.readFileSync(templatePath, 'utf-8');
    const template = hbs.compile(source);
    return template(context, message);
}

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
}

const createSendToken = (user, statusCode, res, message) => {
    const token = signToken(user._id);
    const cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.JWT_SECRET === 'production',
        sameSite: process.env.JWT_SECRET === 'production' ? 'none' : "lax"
    };

    res.cookie('token', token, cookieOptions);
    user.password = undefined;
    user.otp = undefined;

    res.status(statusCode).json({
        status: 'success',
        message,
        token,
        user
    });
}

exports.signup = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });

    const otp = GenerateOTP();
    const otpExpires = new Date(Date.now() + otpDurationInMinutes * 60 * 1000);

    if (existingUser) {
        if (existingUser.isVerified) {
            return next(new AppError('Email already exists', 400));
        } else {
            existingUser.otp = otp;
            existingUser.otpExpires = otpExpires;
            await existingUser.save({ validateBeforeSave: false });

            const htmlTemplate = loadTemplate('otpTemplate.hbs', {
                username: existingUser.email,
                otp: otp
            });

            try {
                await sendEmail({
                    email: existingUser.email,
                    subject: 'Email verification - Resend OTP',
                    html: htmlTemplate
                });

                return res.status(200).json({
                    status: 'success',
                    message: 'OTP re-sent to your email address',
                    user: existingUser
                });

            } catch (error) {
                console.error(error);
                return next(new AppError('There was an error resending the email. Try again later!', 500));
            }
        }
    }

    const newUser = await User.create({
        email,
        password,
        otp,
        otpExpires
    });

    const htmlTemplate = loadTemplate('otpTemplate.hbs', {
        username: newUser.email,
        otp: otp
    });

    try {
        await sendEmail({
            email: newUser.email,
            subject: 'Email verification',
            html: htmlTemplate
        });

        createSendToken(
            newUser,
            200,
            res,
            'User registered successfully. Please check your email for verification'

        );

    } catch (error) {
        await User.findByIdAndDelete(newUser._id);
        console.error(error);
        return next(new AppError('There was an error sending the email. Try again later!', 500));
    }
});

exports.verifyAccount = catchAsync(async (req, res, next) => {
    const {otp}=req.body;
    if (!otp) {
        return next(new AppError('OTP is required', 400));
    }

    const user = req.user;

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    if (user.otp !== otp) {
        return next(new AppError('Invalid OTP', 400));
    }

    if (user.otpExpires < new Date()) {
        return next(new AppError('OTP has expired', 400));
    }

    user.otp = undefined;
    user.otpExpires = undefined;
    user.isVerified = true;

    await user.save({ validateBeforeSave: false });

    createSendToken(user, 200, res, 'Account verified successfully');

});

exports.resendOTP = catchAsync(async (req, res, next) => {
    const user = req.user;
    if (!user) {
        return next(new AppError('User not found', 404));
    }

    if (!user.email) {
        return next(new AppError('User email not found', 404));
    }

    if (user.isVerified) {
        return next(new AppError('Account already verified', 400));
    }

    const otp = GenerateOTP();
    const otpExpires = new Date(Date.now() + otpDurationInMinutes * 60 * 1000);

    user.otp = otp;
    user.otpExpires = otpExpires;

    await user.save({ validateBeforeSave: false });

    const htmlTemplate = loadTemplate('otpTemplate.hbs', {
        username: user.username,
        otp: otp
    });

    try {
        await sendEmail({
            email: user.email,
            subject: 'Email verification',
            html: htmlTemplate
        });

        res.status(200).json({
            status: 'success',
            message: 'OTP sent successfully'
        });

    }catch (error){
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save({ validateBeforeSave: false });
        console.error(error);
        return next(new AppError('There was an error resending otp with email. Try again later!', 500));
    }
})

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return next(new AppError('Please provide email and password', 400));
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('Invalid email or password', 401));
    }

    if (!user.isVerified) {
        return next(new AppError('Invalid email or password.', 403));
    }

    createSendToken(user, 200, res, 'Login successfully');
});

exports.logout = catchAsync(async (req, res, next) => {
    res.cookie('token', 'logged-out', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
    });

    res.status(200).json({
        status: 'success',
        message: 'Logout successfully'
    });
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
    const { email } = req.body;
    if (!email) {
        return next(new AppError('Email is required', 400));
    }

    const user = await User.findOne({ email });

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    const resetPasswordOtp = GenerateOTP();
    const resetPasswordOtpExpires = new Date(Date.now() + otpDurationInMinutes * 60 * 1000);

    user.resetPasswordOtp = resetPasswordOtp;
    user.resetPasswordOtpExpires = resetPasswordOtpExpires;

    await user.save({ validateBeforeSave: false });

    const htmlTemplate = loadTemplate('otpTemplate.hbs', {
        username: user.username,
        otp: resetPasswordOtp
    });

    try {
        await sendEmail({
            email: user.email,
            subject: 'Reset Password',
            html: htmlTemplate
        });

        res.status(200).json({
            status: 'success',
            message: 'OTP sent successfully'
        });
    } catch (e){
        user.resetPasswordOtp = undefined;
        user.resetPasswordOtpExpires = undefined;
        await user.save({ validateBeforeSave: false });
        console.error(e);
        return next(new AppError('There was an error sending the email. Try again later!', 500));
    }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    const { email, otp, password, passwordConfirm } = req.body;

    const user = await User.findOne({
        email,
        resetPasswordOtp: otp,
        resetPasswordOtpExpires: { $gt: Date.now() }
    });

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    user.password = password;
    user.passwordConfirm = passwordConfirm;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;

    await user.save({ validateBeforeSave: false });

    createSendToken(user, 200, res, 'Password reset successfully');
});

exports.changePassword = catchAsync(async (req, res, next) => {
    const { currentPassword, newPassword, newPasswordConfirm } = req.body;

    const {email} = req.user;

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    if (!(await user.correctPassword(currentPassword, user.password))) {
        return next(new AppError('Invalid current password', 401));
    }

    if (newPassword !== newPasswordConfirm) {
        return next(new AppError('New password and confirm password do not match', 400));
    }

    user.password = newPassword;
    user.passwordConfirm = newPasswordConfirm;

    await user.save();

    createSendToken(user, 200, res, 'Password changed successfully');
});