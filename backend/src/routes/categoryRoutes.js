
const express = require("express");

const router = express.Router();

const { protect } = require("../middlewares/authMiddleware");

const {
    createCategory,
    getCategories,
    updateCategory,
    deleteCategory
} = require("../controllers/categoryController");

// All category routes require login
router.use(protect);

// Create category
router.post("/", createCategory);

// Get all categories
router.get("/", getCategories);

// Update category
router.put("/:id", updateCategory);

// Delete category
router.delete("/:id", deleteCategory);

module.exports = router;
