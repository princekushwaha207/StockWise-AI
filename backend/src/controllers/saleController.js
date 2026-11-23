
const mongoose = require("mongoose");
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const StockMovement = require("../models/stockMovement");

// CREATE SALE
const createSale = async (req, res) => {
    try {
        const { items, paymentMethod, customerName } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one product is required"
            });
        }

        const validPaymentMethods = ["cash", "upi", "card", "other"];

        if (
            paymentMethod &&
            !validPaymentMethods.includes(paymentMethod)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment method"
            });
        }

        const safeCustomerName =
            typeof customerName === "string" && customerName.trim()
                ? customerName.trim()
                : "Walk-in Customer";

        let totalAmount = 0;
        const saleItems = [];
        const stockMovements = [];

        // Validate all products and quantities first
        for (const item of items) {
            const { productId, quantity } = item;

            if (
                !productId ||
                !mongoose.Types.ObjectId.isValid(productId) ||
                !Number.isInteger(quantity) ||
                quantity <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid product ID or quantity"
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
                    message: `Product not found: ${productId}`
                });
            }

            if (product.quantity < quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${product.name}`
                });
            }

            const previousQuantity = product.quantity;
            const newQuantity = previousQuantity - quantity;
            const subtotal = product.sellingPrice * quantity;

            saleItems.push({
                productId: product._id,
                productName: product.name,
                quantity,
                sellingPrice: product.sellingPrice,
                subtotal
            });

            stockMovements.push({
                productId: product._id,
                type: "out",
                quantity,
                previousQuantity,
                newQuantity,
                reason: "Product sold",
                shopId: req.user.shopId,
                createdBy: req.user._id
            });

            totalAmount += subtotal;
        }

        // Create invoice number
        const invoiceNumber = `INV-${Date.now()}`;

        // Save sale
        const sale = await Sale.create({
            invoiceNumber,
            customerName: safeCustomerName,
            items: saleItems,
            totalAmount,
            paymentMethod: paymentMethod || "cash",
            shopId: req.user.shopId,
            createdBy: req.user._id
        });

        // Update product quantities
        for (const movement of stockMovements) {
            await Product.findOneAndUpdate(
                {
                    _id: movement.productId,
                    shopId: req.user.shopId,
                    quantity: { $gte: movement.quantity }
                },
                {
                    $inc: { quantity: -movement.quantity }
                }
            );
        }

        // Save stock movement history
        await StockMovement.insertMany(stockMovements);

        return res.status(201).json({
            success: true,
            message: "Sale created successfully",
            sale
        });

    } catch (error) {
        console.error("Create Sale Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while creating sale"
        });
    }
};


// GET ALL SALES
const getSales = async (req, res) => {
    try {
        const sales = await Sale.find({
            shopId: req.user.shopId
        })
            .populate("items.productId", "name sku")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: sales.length,
            sales
        });

    } catch (error) {
        console.error("Get Sales Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while fetching sales"
        });
    }
};


// GET SINGLE SALE
const getSaleById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid sale ID"
            });
        }

        const sale = await Sale.findOne({
            _id: req.params.id,
            shopId: req.user.shopId
        }).populate("items.productId", "name sku");

        if (!sale) {
            return res.status(404).json({
                success: false,
                message: "Sale not found"
            });
        }

        return res.status(200).json({
            success: true,
            sale
        });

    } catch (error) {
        console.error("Get Sale Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while fetching sale"
        });
    }
};


module.exports = {
    createSale,
    getSales,
    getSaleById
};
