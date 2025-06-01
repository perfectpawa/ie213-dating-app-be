const { Post, Comment } = require('../models/postModel');
const User = require('../models/userModel');
const Notification = require('../models/notificationModel');
const getDataUri = require("../utils/dataUri");
const { uploadToCloudinary } = require("../utils/cloudinary");
const {createNotification} = require("./notificationController");

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

            // Create notification for post owner if the liker is not the post owner - first check is have notification already exists
            const existingNotification = await Notification.findOne({
                recipient: post.user,
                sender: req.user._id,
                type: 'like',
                post: post._id
            });
            if (!existingNotification && post.user.toString() !== req.user._id.toString()) {
                // await Notification.create({
                //     recipient: post.user,
                //     sender: req.user._id,
                //     type: 'like',
                //     post: post._id
                // });
                await createNotification(
                    post.user,
                    req.user._id,
                    'like',
                    post._id,
                    null,
                    null
                );
            }

        } else {
            post.likes.splice(likeIndex, 1);

            // Remove notification if it exists
            await Notification.deleteOne({
                recipient: post.user,
                sender: req.user._id,
                type: 'like',
                post: post._id
            });
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
        await post.populate('comments.user', 'user_name');

        // Create notification for post owner if the commenter is not the post owner
        if (post.user.toString() !== req.user._id.toString()) {
            await createNotification(
                post.user,
                req.user._id,
                'comment',
                post._id
            );
        }

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

// Update a post
exports.updatePost = async (req, res) => {
    try {
        const { content } = req.body;
        const image = req.file;

        if (!content && !image) {
            return res.status(400).json({
                status: 'error',
                message: 'Content or image is required to update the post'
            });
        }

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
                message: 'Not authorized to update this post'
            });
        }

        if (content) {
            post.content = content;
        }

        if (image) {
            const dataUri = getDataUri(image);
            const cloudinaryResponse = await uploadToCloudinary(dataUri);
            post.image = cloudinaryResponse;
        }

        await post.save();
        await post.populate('user', 'user_name profile_picture full_name bio');
        
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

// Get posts sorted by similar interests and like status with pagination
exports.getPostsBySimilarInterests = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Get current user with interests
        const currentUser = await User.findById(currentUserId).populate('interests');
        if (!currentUser) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // Get total count of posts for pagination
        const totalPosts = await Post.countDocuments({ user: { $ne: currentUserId } });
        const totalPages = Math.ceil(totalPosts / limit);

        // Get all posts except current user's posts with pagination
        const posts = await Post.find({ user: { $ne: currentUserId } })
            .populate('user', 'user_name full_name profile_picture interests')
            .populate('likes', '_id')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Process posts to add similar interests count and like status
        const processedPosts = await Promise.all(posts.map(async (post) => {
            const postUser = post.user;
            
            // Get similar interests count
            const currentUserInterests = currentUser.interests.map(interest => interest._id.toString());
            const postUserInterests = postUser.interests.map(interest => interest._id.toString());
            const similarInterestsCount = currentUserInterests.filter(interestId => 
                postUserInterests.includes(interestId)
            ).length;

            // Check if current user has liked the post
            const isLiked = post.likes.some(like => like._id.toString() === currentUserId);

            return {
                ...post.toObject(),
                similarInterestsCount,
                isLiked
            };
        }));

        // Sort posts: unliked first, then by similar interests count
        const sortedPosts = processedPosts.sort((a, b) => {
            // First sort by like status (unliked first)
            if (a.isLiked !== b.isLiked) {
                return a.isLiked ? 1 : -1;
            }
            // Then sort by similar interests count (descending)
            return b.similarInterestsCount - a.similarInterestsCount;
        });

        //suffle the unliked posts with random order
        const unlikedPosts = sortedPosts.filter(post => !post.isLiked);
        const likedPosts = sortedPosts.filter(post => post.isLiked);
        const shuffledUnlikedPosts = unlikedPosts.sort(() => Math.random() - 0.5);
        const shufflePost = [...shuffledUnlikedPosts, ...likedPosts];

        res.status(200).json({
            status: 'success',
            data: {
                posts: shufflePost,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalPosts,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};
