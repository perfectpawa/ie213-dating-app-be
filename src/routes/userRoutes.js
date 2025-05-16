const express = require('express');
const router = express.Router();
const { createUser, getUserByAuthId, deleteUserByAuthId } = require('../controllers/userController');

router.post('/create', createUser);
router.get('/:auth_id', getUserByAuthId);
router.delete('/:auth_id', deleteUserByAuthId);

module.exports = router; 