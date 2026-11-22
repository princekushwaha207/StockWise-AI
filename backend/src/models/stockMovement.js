const mongoose = require("mongoose");

const stockMovementSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        type: {
            type: String,
            enum: ["in", "out", "adjustment"],
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        previousQuantity: {
            type: Number,
            required: true
        },
        newQuantity: {
            type: Number,
            required: true
        },
        reason: {
            type: String,
            trim: true,
            default: ""
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
        }
    },
    { timestamps: true }
);

const StockMovement = mongoose.model(
    "StockMovement",
    stockMovementSchema
);

module.exports = StockMovement;