
const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
    {
        invoiceNumber: {
            type: String,
            required: true
        },

        customerName: {
            type: String,
            trim: true,
            default: "Walk-in Customer"
        },

        items: [
            {
                productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                    required: true
                },
                productName: {
                    type: String,
                    required: true
                },
                quantity: {
                    type: Number,
                    required: true,
                    min: 1
                },
                sellingPrice: {
                    type: Number,
                    required: true,
                    min: 0
                },
                subtotal: {
                    type: Number,
                    required: true,
                    min: 0
                }
            }
        ],

        totalAmount: {
            type: Number,
            required: true,
            min: 0
        },

        paymentMethod: {
            type: String,
            enum: ["cash", "upi", "card", "other"],
            default: "cash"
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

saleSchema.index({ shopId: 1, invoiceNumber: 1 }, { unique: true });

const Sale = mongoose.model("Sale", saleSchema);

module.exports = Sale;
