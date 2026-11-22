
const Product = require("../models/Product");
const Sale = require("../models/Sale");

const getDashboardStats = async (req, res) => {
    try {
        const shopId = req.user.shopId;

        // ==========================================
        // BASIC DASHBOARD STATISTICS
        // ==========================================

        const totalProducts = await Product.countDocuments({
            shopId,
            isActive: true
        });

        const stockData = await Product.aggregate([
            {
                $match: {
                    shopId,
                    isActive: true
                }
            },
            {
                $group: {
                    _id: null,
                    totalStock: { $sum: "$quantity" }
                }
            }
        ]);

        const totalStock = stockData[0]?.totalStock || 0;

        const totalSales = await Sale.countDocuments({ shopId });

        const revenueData = await Sale.aggregate([
            { $match: { shopId } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$totalAmount" }
                }
            }
        ]);

        const totalRevenue = revenueData[0]?.totalRevenue || 0;

        // ==========================================
        // LOW STOCK PRODUCTS
        // ==========================================

        const lowStockProducts = await Product.find({
            shopId,
            isActive: true,
            $expr: {
                $lte: ["$quantity", "$minStockLevel"]
            }
        }).select("name sku quantity minStockLevel");

        // ==========================================
        // RECENT SALES
        // ==========================================

        const recentSales = await Sale.find({ shopId })
            .sort({ createdAt: -1 })
            .limit(5)
            .select("invoiceNumber totalAmount paymentMethod createdAt");

        // ==========================================
        // INVENTORY OVERVIEW CHART
        // ==========================================

        const inventoryOverview = await Product.aggregate([
            {
                $match: {
                    shopId,
                    isActive: true
                }
            },
            {
                $group: {
                    _id: null,

                    inStock: {
                        $sum: {
                            $cond: [
                                { $gt: ["$quantity", "$minStockLevel"] },
                                1,
                                0
                            ]
                        }
                    },

                    lowStock: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $gt: ["$quantity", 0] },
                                        { $lte: ["$quantity", "$minStockLevel"] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },

                    outOfStock: {
                        $sum: {
                            $cond: [
                                { $lte: ["$quantity", 0] },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        // ==========================================
        // MONTHLY SALES & REVENUE CHART
        // LAST 6 MONTHS
        // ==========================================

        const now = new Date();

        const sixMonthsAgo = new Date(
            Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth() - 5,
                1
            )
        );

        const monthlySales = await Sale.aggregate([
            {
                $match: {
                    shopId,
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m",
                            date: "$createdAt"
                        }
                    },
                    revenue: { $sum: "$totalAmount" },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // ==========================================
        // DAILY SALES TREND
        // LAST 7 DAYS
        // ==========================================

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setUTCHours(0, 0, 0, 0);
        sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);

        const dailySales = await Sale.aggregate([
            {
                $match: {
                    shopId,
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$createdAt"
                        }
                    },
                    revenue: { $sum: "$totalAmount" },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // ==========================================
        // FINAL RESPONSE
        // ==========================================

        return res.status(200).json({
            success: true,

            dashboard: {
                totalProducts,
                totalStock,
                totalSales,
                totalRevenue,

                lowStockCount: lowStockProducts.length,
                lowStockProducts,
                recentSales,

                charts: {
                    inventoryOverview:
                        inventoryOverview[0] || {
                            inStock: 0,
                            lowStock: 0,
                            outOfStock: 0
                        },

                    monthlySales,
                    dailySales
                }
            }
        });

    } catch (error) {
        console.error("Dashboard Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while fetching dashboard"
        });
    }
};

module.exports = { getDashboardStats };
