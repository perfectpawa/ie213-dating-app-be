const express = require("express");
const router = express.Router();
const interestController = require("../controllers/interestController");

// Lấy tất cả interests
router.get("/", interestController.getAllInterests);

module.exports = router;
