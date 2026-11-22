
const Category = require("../models/Category");

// CREATE CATEGORY
const createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Category name is required"
            });
        }

        const category = await Category.create({
            name: name.trim(),
            description,
            shopId: req.user.shopId,
            createdBy: req.user._id
        });

        return res.status(201).json({
            success: true,
            message: "Category created successfully",
            category
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "This category already exists"
            });
        }

        console.error("Create Category Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while creating category"
        });
    }
};


// GET ALL CATEGORIES
const getCategories = async (req, res) => {
    try {
        const categories = await Category.find({
            shopId: req.user.shopId,
            isActive: true
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: categories.length,
            categories
        });

    } catch (error) {
        console.error("Get Categories Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while fetching categories"
        });
    }
};


// UPDATE CATEGORY
const updateCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        const category = await Category.findOne({
            _id: req.params.id,
            shopId: req.user.shopId
        });

        if (!category || !category.isActive) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }

        if (name !== undefined) {
            if (typeof name !== "string" || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Category name cannot be empty"
                });
            }

            category.name = name.trim();
        }

        if (description !== undefined) {
            category.description = description;
        }

        await category.save();

        return res.status(200).json({
            success: true,
            message: "Category updated successfully",
            category
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "This category name already exists"
            });
        }

        console.error("Update Category Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while updating category"
        });
    }
};


// DELETE CATEGORY (SOFT DELETE)
const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findOne({
            _id: req.params.id,
            shopId: req.user.shopId
        });

        if (!category || !category.isActive) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }

        category.isActive = false;
        await category.save();

        return res.status(200).json({
            success: true,
            message: "Category deleted successfully"
        });

    } catch (error) {
        console.error("Delete Category Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while deleting category"
        });
    }
};


module.exports = {
    createCategory,
    getCategories,
    updateCategory,
    deleteCategory
};
