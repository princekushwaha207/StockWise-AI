
const express = require("express");

const router = express.Router();

const {
    registerUser,
    loginUser,
    getProfile,
    updateProfile
} = require("../controllers/authController");

const { protect } = require("../middlewares/authMiddleware");

// Register
router.post("/register", registerUser);

// Login
router.post("/login", loginUser);

// Get logged-in user profile
router.get("/profile", protect, getProfile);

// Update logged-in user profile
router.put("/profile", protect, updateProfile);

module.exports = router;
