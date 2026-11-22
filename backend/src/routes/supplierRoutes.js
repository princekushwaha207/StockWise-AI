const express = require("express");
const router = express.Router();

const { protect } = require("../middlewares/authMiddleware");

const {
    createSupplier,
    getSuppliers,
    updateSupplier,
    deleteSupplier
} = require("../controllers/supplierController");

router.use(protect);

router.post("/", createSupplier);
router.get("/", getSuppliers);
router.put("/:id", updateSupplier);
router.delete("/:id", deleteSupplier);

module.exports = router;