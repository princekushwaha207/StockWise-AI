
const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        companyName: {
            type: String,
            trim: true,
            default: ""
        },

        email: {
            type: String,
            lowercase: true,
            trim: true
        },

        phone: {
            type: String,
            required: true,
            trim: true
        },

        address: {
            street: String,
            city: String,
            state: String,
            pincode: String,
            country: {
                type: String,
                default: "India"
            }
        },

        gstNumber: {
            type: String,
            trim: true,
            uppercase: true
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

// Prevent duplicate supplier phone numbers within a shop
supplierSchema.index(
    { shopId: 1, phone: 1 },
    { unique: true }
);

const Supplier = mongoose.model("Supplier", supplierSchema);

module.exports = Supplier;
