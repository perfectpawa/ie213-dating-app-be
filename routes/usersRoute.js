var express = require('express');
var router = express.Router();

const upload = require('../middleware/multer');

// const {signup, login, logout } = require('../controllers/authController');
const { getProfile, editProfile, suggestedUsers, followOrUnfollow, getMe } = require('../controllers/userController');


//Auth routes

//User routes


/* GET users listing. */
// router.get('/', function(req, res, next) {
//   res.send('respond with a resource');
// });

module.exports = router;
