const { Post, Comment } = require('../models/postModel');
const User = require('../models/userModel');
const Notification = require('../models/notificationModel');
const getDataUri = require("../utils/dataUri");
const { uploadToCloudinary } = require("../utils/cloudinary");

// Create a new post
exports.createPost = async (req, res) => {
    try {
        const { content } = req.body;
        const image = req.file;

        if (!content || !image) {
            return res.status(400).json({
                status: 'error',
                message: 'Content and image are required for posts'
            });
        }

        if (!req.user) {
            return res.status(401).json({
                status: 'error',
                message: 'Unauthorized'
            });
        }
        const dataUri = getDataUri(image);
        const cloudinaryResponse = await uploadToCloudinary(dataUri);

        if (!cloudinaryResponse) {
            return res.status(400).json({
                status: 'error',
                message: 'Failed to upload image'
            });
        }

        const post = await Post.create({
            user: req.user._id,
            content,
            image: cloudinaryResponse
        });

        res.status(201).json({
            status: 'success',
            data: { post }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Get all posts
exports.getAllPosts = async (req, res) => {
    try {
        const posts = await Post.find()
            .sort('-createdAt');

        res.status(200).json({
            status: 'success',
            data: { posts }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Like/Unlike a post
exports.toggleLike = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        
        if (!post) {
            return res.status(404).json({
                status: 'error',
                message: 'Post not found'
            });
        }

        const likeIndex = post.likes.indexOf(req.user._id);
        
        if (likeIndex === -1) {
            // Like the post
            post.likes.push(req.user._id);
            
            // Create notification for post owner if the liker is not the post owner
            if (post.user.toString() !== req.user._id.toString()) {
                await Notification.createNotification(
                    post.user,
                    req.user._id,
                    'like',
                    post._id
                );
            }
        } else {
            // Unlike the post
            post.likes.splice(likeIndex, 1);
        }

        await post.save();
        await post.populate('user', 'user_name profile_picture full_name bio');
        await post.populate('comments.user', 'user_name profile_picture full_name');

        res.status(200).json({
            status: 'success',
            data: { post }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Add a comment to a post
exports.addComment = async (req, res) => {
    try {
        const { comment } = req.body;
        
        if (!comment) {
            return res.status(400).json({
                status: 'error',
                message: 'Comment is required'
            });
        }

        const post = await Post.findById(req.params.id);
        
        if (!post) {
            return res.status(404).json({
                status: 'error',
                message: 'Post not found'
            });
        }

        post.comments.push({
            user: req.user._id,
            content: comment
        });

        await post.save();
        await post.populate('user', 'user_name');
        await post.populate('comments.user', 'user_name');

        res.status(200).json({
            status: 'success',
            data: { post }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Delete a post
exports.deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        
        if (!post) {
            return res.status(404).json({
                status: 'error',
                message: 'Post not found'
            });
        }

        // Check if user is the post owner
        if (post.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'error',
                message: 'Not authorized to delete this post'
            });
        }

        await post.deleteOne();

        res.status(204).json({
            status: 'success',
            data: null
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Get all posts by a specific user
exports.getAllPostsByUser = async (req, res) => {
    try {
        const posts = await Post.find({ user: req.params.userId })
            .populate('user', 'user_name')
            .sort('-createdAt');

        res.status(200).json({
            status: 'success',
            data: { posts }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Get all posts except your own
exports.getAllPostsExceptOwn = async (req, res) => {
    try {
        const posts = await Post.find({ user: { $ne: req.user._id } })
            .populate('user', 'user_name profile_picture full_name bio')
            .sort('-createdAt');

        res.status(200).json({
            status: 'success',
            data: { posts }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};
