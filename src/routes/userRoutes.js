const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/', userController.getAllUsers);
router.post('/create', userController.createUser);
router.get('/:auth_id', userController.getUserByAuthId);
router.delete('/:auth_id', userController.deleteUserByAuthId);

module.exports = router;