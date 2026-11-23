const mongoose = require("mongoose");
const Product = require("../models/Product");
const StockMovement = require("../models/stockMovement");
// ADD STOCK (STOCK IN)
const addStock = async (req, res) => {
    try {
        const { productId, quantity, reason } = req.body;

        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                success: false,
                message: "Valid product ID is required"
            });
        }

        if (!Number.isInteger(quantity) || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be a positive whole number"
            });
        }

        const product = await Product.findOne({
            _id: productId,
            shopId: req.user.shopId,
            isActive: true
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        const previousQuantity = product.quantity;
        const newQuantity = previousQuantity + quantity;

        product.quantity = newQuantity;
        await product.save();

        const movement = await StockMovement.create({
            productId,
            type: "in",
            quantity,
            previousQuantity,
            newQuantity,
            reason,
            shopId: req.user.shopId,
            createdBy: req.user._id
        });

        return res.status(201).json({
            success: true,
            message: "Stock added successfully",
            product,
            movement
        });

    } catch (error) {
        console.error("Add Stock Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while adding stock"
        });
    }
};


// REMOVE STOCK (STOCK OUT)
const removeStock = async (req, res) => {
    try {
        const { productId, quantity, reason } = req.body;

        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                success: false,
                message: "Valid product ID is required"
            });
        }

        if (!Number.isInteger(quantity) || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be a positive whole number"
            });
        }

        const product = await Product.findOne({
            _id: productId,
            shopId: req.user.shopId,
            isActive: true
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        if (product.quantity < quantity) {
            return res.status(400).json({
                success: false,
                message: "Insufficient stock available"
            });
        }

        const previousQuantity = product.quantity;
        const newQuantity = previousQuantity - quantity;

        product.quantity = newQuantity;
        await product.save();

        const movement = await StockMovement.create({
            productId,
            type: "out",
            quantity,
            previousQuantity,
            newQuantity,
            reason,
            shopId: req.user.shopId,
            createdBy: req.user._id
        });

        return res.status(201).json({
            success: true,
            message: "Stock removed successfully",
            product,
            movement
        });

    } catch (error) {
        console.error("Remove Stock Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while removing stock"
        });
    }
};


// GET STOCK MOVEMENT HISTORY
const getStockHistory = async (req, res) => {
    try {
        const history = await StockMovement.find({
            shopId: req.user.shopId
        })
            .populate("productId", "name sku")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: history.length,
            history
        });

    } catch (error) {
        console.error("Get Stock History Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching stock history"
        });
    }
};


module.exports = {
    addStock,
    removeStock,
    getStockHistory
};