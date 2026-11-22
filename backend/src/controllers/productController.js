
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Supplier = require("../models/Supplier");

// Validate category belongs to the user's shop
const validateCategory = async (categoryId, shopId) => {
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return false;
    }

    const category = await Category.findOne({
        _id: categoryId,
        shopId,
        isActive: true
    });

    return Boolean(category);
};

// Validate optional supplier belongs to the user's shop
const validateSupplier = async (supplierId, shopId) => {
    if (supplierId === null || supplierId === "") {
        return true;
    }

    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
        return false;
    }

    const supplier = await Supplier.findOne({
        _id: supplierId,
        shopId,
        isActive: true
    });

    return Boolean(supplier);
};

// Validate optional expiry date
const validateExpiryDate = (expiryDate) => {
    if (expiryDate === null || expiryDate === "") {
        return true;
    }

    const date = new Date(expiryDate);
    return !Number.isNaN(date.getTime());
};

// CREATE PRODUCT
const createProduct = async (req, res) => {
    try {
        const {
            name,
            sku,
            description,
            categoryId,
            supplierId,
            purchasePrice,
            sellingPrice,
            quantity,
            minStockLevel,
            reorderLeadTime,
            expiryDate,
            unit
        } = req.body;

        if (
            !name ||
            !sku ||
            !categoryId ||
            purchasePrice === undefined ||
            sellingPrice === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required product details"
            });
        }

        if (
            !Number.isFinite(Number(purchasePrice)) ||
            !Number.isFinite(Number(sellingPrice)) ||
            Number(purchasePrice) < 0 ||
            Number(sellingPrice) < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid product prices"
            });
        }

        if (!validateExpiryDate(expiryDate)) {
            return res.status(400).json({
                success: false,
                message: "Invalid expiry date"
            });
        }

        if (!await validateCategory(categoryId, req.user.shopId)) {
            return res.status(404).json({
                success: false,
                message: "Category not found in your shop"
            });
        }

        if (!await validateSupplier(supplierId, req.user.shopId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid supplier or supplier does not belong to your shop"
            });
        }

        const product = await Product.create({
            name,
            sku,
            description,
            categoryId,
            supplierId: supplierId || null,
            purchasePrice,
            sellingPrice,
            quantity,
            minStockLevel,
            reorderLeadTime,
            expiryDate: expiryDate || null,
            unit,
            shopId: req.user.shopId,
            createdBy: req.user._id
        });

        return res.status(201).json({
            success: true,
            message: "Product created successfully",
            product
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Product SKU already exists in your shop"
            });
        }

        console.error("Create Product Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while creating product"
        });
    }
};

// GET ALL PRODUCTS
const getProducts = async (req, res) => {
    try {
        const products = await Product.find({
            shopId: req.user.shopId,
            isActive: true
        })
            .populate("categoryId", "name")
            .populate("supplierId", "name companyName phone")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: products.length,
            products
        });

    } catch (error) {
        console.error("Get Products Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while fetching products"
        });
    }
};

// UPDATE PRODUCT
const updateProduct = async (req, res) => {
    try {
        const product = await Product.findOne({
            _id: req.params.id,
            shopId: req.user.shopId,
            isActive: true
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        const allowedFields = [
            "name",
            "description",
            "categoryId",
            "supplierId",
            "purchasePrice",
            "sellingPrice",
            "quantity",
            "minStockLevel",
            "reorderLeadTime",
            "expiryDate",
            "unit"
        ];

        if (req.body.categoryId !== undefined) {
            if (!await validateCategory(req.body.categoryId, req.user.shopId)) {
                return res.status(404).json({
                    success: false,
                    message: "Category not found in your shop"
                });
            }
        }

        if (req.body.supplierId !== undefined) {
            if (!await validateSupplier(req.body.supplierId, req.user.shopId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid supplier or supplier does not belong to your shop"
                });
            }

            product.supplierId = req.body.supplierId || null;
        }

        if (
            req.body.expiryDate !== undefined &&
            !validateExpiryDate(req.body.expiryDate)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid expiry date"
            });
        }

        for (const field of allowedFields) {
            if (
                field !== "supplierId" &&
                req.body[field] !== undefined
            ) {
                product[field] =
                    field === "expiryDate" && req.body[field] === ""
                        ? null
                        : req.body[field];
            }
        }

        await product.save();

        return res.status(200).json({
            success: true,
            message: "Product updated successfully",
            product
        });

    } catch (error) {
        console.error("Update Product Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while updating product"
        });
    }
};

// DELETE PRODUCT (SOFT DELETE)
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findOne({
            _id: req.params.id,
            shopId: req.user.shopId,
            isActive: true
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        product.isActive = false;
        await product.save();

        return res.status(200).json({
            success: true,
            message: "Product deleted successfully"
        });

    } catch (error) {
        console.error("Delete Product Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while deleting product"
        });
    }
};

module.exports = {
    createProduct,
    getProducts,
    updateProduct,
    deleteProduct
};
