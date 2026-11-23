
const User = require("../models/User");
const Shop = require("../models/Shop");
const generateToken = require("../utils/generateToken");
const bcrypt = require("bcryptjs");

// REGISTER USER AND CREATE SHOP
const registerUser = async (req, res) => {
    try {
        const { name, email, password, shopName, businessType } = req.body;

        if (!name || !email || !password || !shopName) {
            return res.status(400).json({
                success: false,
                message: "Please provide name, email, password and shop name"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User already exists with this email"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            name,
            email: normalizedEmail,
            password: hashedPassword,
            role: "owner"
        });

        const shop = await Shop.create({
            shopName,
            businessType: businessType || "General Store",
            owner: user._id
        });

        user.shopId = shop._id;
        await user.save();

        const token = generateToken(user._id);

        return res.status(201).json({
            success: true,
            message: "Registration and shop creation successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                shopId: user.shopId
            },
            shop: {
                id: shop._id,
                shopName: shop.shopName,
                businessType: shop.businessType
            }
        });

    } catch (error) {
        console.error("Registration Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error during registration"
        });
    }
};




// LOGIN USER
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide email and password"
            });
        }

        const user = await User.findOne({
            email: email.toLowerCase().trim()
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Your account is inactive"
            });
        }

        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const token = generateToken(user._id);

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                shopId: user.shopId
            }
        });

    } catch (error) {
        console.error("Login Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error during login"
        });
    }
};




// GET LOGGED-IN USER PROFILE
const getProfile = async (req, res) => {
    try {
        const user = req.user;

        const shop = user.shopId
            ? await Shop.findById(user.shopId)
            : null;

        return res.status(200).json({
            success: true,
            message: "Profile fetched successfully",
            profile: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                accountStatus: user.isActive ? "Active" : "Inactive",
                dateOfJoining: user.createdAt,
                shop: shop ? {
                    shopName: shop.shopName,
                    businessType: shop.businessType,
                    phone: shop.phone || "",
                    email: shop.email || "",
                    address: shop.address || {}
                } : null
            }
        });

    } catch (error) {
        console.error("Get Profile Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch profile"
        });
    }
};


// UPDATE LOGGED-IN USER PROFILE
const updateProfile = async (req, res) => {
    try {
        const user = req.user;
        const { name, shopName, businessType } = req.body;

        // Validate input
        if (
            name === undefined &&
            shopName === undefined &&
            businessType === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide at least one field to update"
            });
        }

        if (
            name !== undefined &&
            (typeof name !== "string" || !name.trim())
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid name"
            });
        }

        if (
            shopName !== undefined &&
            (typeof shopName !== "string" || !shopName.trim())
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid shop name"
            });
        }

        if (
            businessType !== undefined &&
            (typeof businessType !== "string" || !businessType.trim())
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid business type"
            });
        }

        // Update personal information
        if (name !== undefined) {
            user.name = name.trim();
            await user.save();
        }

        // Find only the logged-in user's own shop
        let shop = null;

        if (user.shopId) {
            shop = await Shop.findOne({
                _id: user.shopId,
                owner: user._id
            });
        }

        // Update shop information
        if (shopName !== undefined || businessType !== undefined) {
            if (!shop) {
                return res.status(404).json({
                    success: false,
                    message: "Shop not found"
                });
            }

            if (shopName !== undefined) {
                shop.shopName = shopName.trim();
            }

            if (businessType !== undefined) {
                shop.businessType = businessType.trim();
            }

            await shop.save();
        }

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            profile: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                accountStatus: user.isActive ? "Active" : "Inactive",
                dateOfJoining: user.createdAt,
                shop: shop ? {
                    shopName: shop.shopName,
                    businessType: shop.businessType,
                    phone: shop.phone || "",
                    email: shop.email || "",
                    address: shop.address || {}
                } : null
            }
        });

    } catch (error) {
        console.error("Update Profile Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update profile"
        });
    }
};


// EXPORT FUNCTIONS
module.exports = {
    registerUser,
    loginUser,
    getProfile,
    updateProfile
};
