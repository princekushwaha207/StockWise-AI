
const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema(
    {
        shopName: {
            type: String,
            required: true,
            trim: true
        },

        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },

        businessType: {
            type: String,
            trim: true,
            default: "General Store"
        },

        phone: {
            type: String,
            trim: true
        },

        email: {
            type: String,
            lowercase: true,
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

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

const Shop = mongoose.model("Shop", shopSchema);

module.exports = Shop;
