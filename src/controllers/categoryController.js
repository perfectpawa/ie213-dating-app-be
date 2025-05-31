const Category = require("../models/categoryModel");

const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.json({ status: "success", data: { categories } });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

module.exports = { getAllCategories };
