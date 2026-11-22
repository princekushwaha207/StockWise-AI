const categoryRoutes = require("./src/routes/categoryRoutes");
const supplierRoutes = require("./src/routes/supplierRoutes");
const stockRoutes = require("./src/routes/stockRoutes");
const saleRoutes = require("./src/routes/saleRoutes");
const dashboardRoutes = require("./src/routes/dashboardRoutes");
const aiRoutes = require("./src/routes/aiRoutes");

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./src/config/db");
const authRoutes = require("./src/routes/authRoutes");
const productRoutes = require("./src/routes/productRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Authentication Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/suppliers", supplierRoutes);
app.use("/api/v1/stock", stockRoutes);
app.use("/api/v1/sales", saleRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/ai", aiRoutes);

// Home Route
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Welcome to StockWise AI Backend!"
    });
});

// Health Check Route
app.get("/api/v1/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "StockWise AI API is healthy"
    });
});

// Start Server
const startServer = async () => {
    await connectDB();

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
        console.log(`StockWise AI server running on port ${PORT}`);
    });
};

startServer();
