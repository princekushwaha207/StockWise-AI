
const express = require("express");
const router = express.Router();

const {
    analyzeInventory,
    forecastDemand,
    getInventoryAlerts,
    getReorderSuggestions,
    detectAnomalies,
    getSalesReport
} = require("../controllers/aiController");

const { protect } = require("../middlewares/authMiddleware");

// Protected AI routes
router.post("/analyze", protect, analyzeInventory);

router.get("/forecast", protect, forecastDemand);

router.get("/inventory-alerts", protect, getInventoryAlerts);

router.get("/reorder-suggestions", protect, getReorderSuggestions);

router.get("/anomaly-detection", protect, detectAnomalies);

// Total Sales Report
router.get("/sales-report", protect, getSalesReport);

module.exports = router;
