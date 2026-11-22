
const Supplier = require("../models/Supplier");

// CREATE SUPPLIER
const createSupplier = async (req, res) => {
    try {
        const {
            name,
            companyName,
            email,
            phone,
            address,
            gstNumber
        } = req.body;

        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                message: "Supplier name and phone are required"
            });
        }

        const supplier = await Supplier.create({
            name,
            companyName,
            email,
            phone,
            address,
            gstNumber,
            shopId: req.user.shopId,
            createdBy: req.user._id
        });

        return res.status(201).json({
            success: true,
            message: "Supplier created successfully",
            supplier
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Supplier phone already exists in your shop"
            });
        }

        console.error("Create Supplier Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while creating supplier"
        });
    }
};

// GET ALL SUPPLIERS
const getSuppliers = async (req, res) => {
    try {
        const suppliers = await Supplier.find({
            shopId: req.user.shopId,
            isActive: true
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: suppliers.length,
            suppliers
        });

    } catch (error) {
        console.error("Get Suppliers Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while fetching suppliers"
        });
    }
};

// UPDATE SUPPLIER
const updateSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findOne({
            _id: req.params.id,
            shopId: req.user.shopId,
            isActive: true
        });

        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: "Supplier not found"
            });
        }

        const allowedFields = [
            "name",
            "companyName",
            "email",
            "phone",
            "address",
            "gstNumber"
        ];

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                supplier[field] = req.body[field];
            }
        }

        await supplier.save();

        return res.status(200).json({
            success: true,
            message: "Supplier updated successfully",
            supplier
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Supplier phone already exists in your shop"
            });
        }

        console.error("Update Supplier Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while updating supplier"
        });
    }
};

// DELETE SUPPLIER (SOFT DELETE)
const deleteSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findOne({
            _id: req.params.id,
            shopId: req.user.shopId,
            isActive: true
        });

        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: "Supplier not found"
            });
        }

        supplier.isActive = false;
        await supplier.save();

        return res.status(200).json({
            success: true,
            message: "Supplier deleted successfully"
        });

    } catch (error) {
        console.error("Delete Supplier Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while deleting supplier"
        });
    }
};

module.exports = {
    createSupplier,
    getSuppliers,
    updateSupplier,
    deleteSupplier
};
