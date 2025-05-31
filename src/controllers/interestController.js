const Interest = require("../models/interestModel");

const getAllInterests = async (req, res) => {
  try {
    const interests = await Interest.find(); // ❌ Không populate

    res.json({
      status: "success",
      data: {
        interests,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch interests",
      error: error.message,
    });
  }
};

module.exports = {
  getAllInterests,
};
