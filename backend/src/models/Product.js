
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        sku: {
            type: String,
            required: true,
            trim: true,
            uppercase: true
        },

        description: {
            type: String,
            trim: true,
            default: ""
        },

        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true
        },

        // Optional supplier relationship
        supplierId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Supplier",
            default: null
        },

        purchasePrice: {
            type: Number,
            required: true,
            min: 0
        },

        sellingPrice: {
            type: Number,
            required: true,
            min: 0
        },

        quantity: {
            type: Number,
            required: true,
            default: 0,
            min: 0
        },

        minStockLevel: {
            type: Number,
            default: 5,
            min: 0
        },

        // Expected supplier delivery time in days
        reorderLeadTime: {
            type: Number,
            default: 3,
            min: 0
        },

        // Product expiry date (optional)
        expiryDate: {
            type: Date,
            default: null
        },

        unit: {
            type: String,
            default: "piece",
            trim: true
        },

        shopId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Shop",
            required: true
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

productSchema.index({ shopId: 1, sku: 1 }, { unique: true });

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
