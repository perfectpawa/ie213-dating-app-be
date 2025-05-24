const express = require('express');
const router = express.Router();
const isAuthenticated = require('../middleware/isAuthenticated');
const upload = require('../middleware/multer');
const { createPost, getAllPosts, toggleLike, addComment, deletePost, getAllPostsByUser, getAllPostsExceptOwn } = require('../controllers/postController');

// Create a new post
router.post('/', isAuthenticated, upload.single("image"), createPost);

// Get all posts
router.get('/', isAuthenticated, getAllPosts);

// Like/Unlike a post
router.get('/:id/like', isAuthenticated, toggleLike);

// Add a comment to a post
router.post('/:id/comment', isAuthenticated, addComment);

// Delete a post
router.delete('/:id', isAuthenticated, deletePost);

// Get all posts by user
router.get('/user/:userId', isAuthenticated, getAllPostsByUser);

// Get all posts except own
router.get('/except-own', isAuthenticated, getAllPostsExceptOwn);

module.exports = router; 