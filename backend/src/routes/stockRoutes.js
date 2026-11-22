const express = require("express");
const router = express.Router();

const { protect } = require("../middlewares/authMiddleware");

const {
    addStock,
    removeStock,
    getStockHistory
} = require("../controllers/stockController");

router.use(protect);

router.post("/in", addStock);
router.post("/out", removeStock);
router.get("/history", getStockHistory);

module.exports = router;