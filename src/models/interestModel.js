const mongoose = require("mongoose");

const interestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("Interest", interestSchema);
