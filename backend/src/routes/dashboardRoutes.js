const express = require("express");
const router = express.Router();

const { protect } = require("../middlewares/authMiddleware");
const {
    getDashboardStats
} = require("../controllers/dashboardController");

router.use(protect);

router.get("/stats", getDashboardStats);

module.exports = router;