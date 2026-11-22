
const express = require("express");
const router = express.Router();

const { protect } = require("../middlewares/authMiddleware");

const {
    createProduct,
    getProducts,
    updateProduct,
    deleteProduct
} = require("../controllers/productController");

// Protect all product routes
router.use(protect);

// CREATE
router.post("/", createProduct);

// READ
router.get("/", getProducts);

// UPDATE
router.put("/:id", updateProduct);

// DELETE
router.delete("/:id", deleteProduct);

module.exports = router;
