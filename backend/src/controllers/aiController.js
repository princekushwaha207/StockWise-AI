
const Product = require("../models/Product");
const Sale = require("../models/Sale");
const StockMovement = require("../models/StockMovement");

// ==========================================
// AI CONFIGURATION
// ==========================================

const AI_TIMEOUT_MS = 12000;
const AI_MAX_OUTPUT_TOKENS = 700;

// ==========================================
// COMMON API REQUEST WITH TIMEOUT
// ==========================================

const requestAI = async (url, options) => {
    const controller = new AbortController();

    const timeout = setTimeout(
        () => controller.abort(),
        AI_TIMEOUT_MS
    );

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error?.message ||
                result.message ||
                `AI API error: ${response.status}`
            );
        }

        return result;

    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error(
                `AI request timed out after ${AI_TIMEOUT_MS / 1000} seconds`
            );
        }

        throw error;

    } finally {
        clearTimeout(timeout);
    }
};

// ==========================================
// GEMINI AI
// ==========================================

const generateWithGemini = async (prompt) => {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    if (!apiKey) {
        throw new Error("Gemini API key is missing");
    }

    const result = await requestAI(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [{ text: prompt }]
                    }
                ],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: AI_MAX_OUTPUT_TOKENS,
                    thinkingConfig: {
                        thinkingBudget: 0
                    }
                }
            })
        }
    );

    const answer = result.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    if (!answer) {
        throw new Error("Gemini returned an empty response");
    }

    return answer;
};

// ==========================================
// GROQ AI
// ==========================================

const generateWithGroq = async (prompt) => {
    const apiKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

    if (!apiKey) {
        throw new Error("Groq API key is missing");
    }

    const result = await requestAI(
        "https://api.groq.com/openai/v1/chat/completions",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: "system",
                        content:
                            "You are StockWise AI, a smart inventory and shop management assistant. Give fast, concise, accurate and practical answers. Use only the supplied business data. Never invent figures. Use headings and bullet points where useful."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_completion_tokens: AI_MAX_OUTPUT_TOKENS
            })
        }
    );

    const answer = result.choices?.[0]?.message?.content?.trim();

    if (!answer) {
        throw new Error("Groq returned an empty response");
    }

    return answer;
};

// ==========================================
// AI PROVIDER WITH AUTOMATIC FALLBACK
// ==========================================

const generateAIResponse = async (prompt) => {
    const providers = process.env.AI_PROVIDER === "groq"
        ? [
            ["Groq", generateWithGroq],
            ["Gemini", generateWithGemini]
        ]
        : [
            ["Gemini", generateWithGemini],
            ["Groq", generateWithGroq]
        ];

    const errors = [];

    for (const [providerName, generate] of providers) {
        try {
            console.log(`${providerName} AI: Request started`);

            const startTime = Date.now();
            const response = await generate(prompt);
            const duration = Date.now() - startTime;

            console.log(
                `${providerName} AI: Response received in ${duration}ms`
            );

            return {
                provider: providerName,
                response,
                duration
            };

        } catch (error) {
            console.error(
                `${providerName} AI failed:`,
                error.message
            );

            errors.push(`${providerName}: ${error.message}`);
        }
    }

    throw new Error(
        `All AI providers failed. ${errors.join(" | ")}`
    );
};

// ==========================================
// INVENTORY AND SALES ANALYSIS / AI CHAT
// ==========================================

const analyzeInventory = async (req, res) => {
    try {
        const shopId = req.user.shopId;

        if (!shopId) {
            return res.status(400).json({
                success: false,
                message: "No shop is linked to this account"
            });
        }

        const { question } = req.body;

        if (
            question !== undefined &&
            (
                typeof question !== "string" ||
                question.length > 1000
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Question must be text and cannot exceed 1000 characters"
            });
        }

        // Fetch only required fields
        const [products, sales] = await Promise.all([
            Product.find({
                shopId,
                isActive: true
            })
                .select(
                    "name quantity minStockLevel purchasePrice sellingPrice"
                )
                .lean(),

            Sale.find({ shopId })
                .select("totalAmount items.productName items.quantity")
                .sort({ createdAt: -1 })
                .limit(50)
                .lean()
        ]);

        const totalProducts = products.length;

        const totalStock = products.reduce(
            (sum, product) =>
                sum + Number(product.quantity || 0),
            0
        );

        const inventoryCostValue = products.reduce(
            (sum, product) =>
                sum +
                Number(product.quantity || 0) *
                Number(product.purchasePrice || 0),
            0
        );

        const inventorySellingValue = products.reduce(
            (sum, product) =>
                sum +
                Number(product.quantity || 0) *
                Number(product.sellingPrice || 0),
            0
        );

        const lowStockProducts = products
            .filter(
                product =>
                    product.quantity <= product.minStockLevel
            )
            .slice(0, 30)
            .map(product => ({
                name: product.name,
                quantity: product.quantity,
                minimumStock: product.minStockLevel
            }));

        const totalRevenue = sales.reduce(
            (sum, sale) =>
                sum + Number(sale.totalAmount || 0),
            0
        );

        const bestSellingMap = {};

        sales.forEach(sale => {
            (sale.items || []).forEach(item => {
                const name = item.productName || "Unknown Product";

                bestSellingMap[name] =
                    (bestSellingMap[name] || 0) +
                    Number(item.quantity || 0);
            });
        });

        const bestSellingProducts = Object.entries(bestSellingMap)
            .map(([name, quantity]) => ({
                name,
                quantity
            }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);

        const businessData = {
            totalProducts,
            totalStock,
            inventoryCostValue: Number(
                inventoryCostValue.toFixed(2)
            ),
            inventorySellingValue: Number(
                inventorySellingValue.toFixed(2)
            ),
            lowStockProducts,
            recentSalesCount: sales.length,
            recentSalesRevenue: Number(totalRevenue.toFixed(2)),
            bestSellingProducts
        };

        // Compact prompt for faster generation
        const prompt = `
You are StockWise AI, an inventory and shop management assistant.

SHOP DATA:
${JSON.stringify(businessData)}

USER QUESTION:
${question?.trim() || "Analyze my shop inventory and sales. Give important insights and recommendations."}

Give a useful, concise answer covering relevant points:
1. Business overview
2. Inventory health
3. Low-stock warnings
4. Best-selling products
5. Restocking recommendations
6. Sales improvement suggestions

RULES:
- Currency: Indian Rupees (₹).
- Use only supplied data.
- Never invent numbers or trends.
- Sales data represents only the latest 50 recorded sales.
- Clearly separate facts from recommendations.
- Use simple language and short bullet points.
- Answer the user's actual question directly.
- Avoid unnecessary long introductions.
`;

        const aiResult = await generateAIResponse(prompt);

        return res.status(200).json({
            success: true,
            provider: aiResult.provider,
            responseTime: aiResult.duration,
            businessData,
            analysis: aiResult.response
        });

    } catch (error) {
        console.error("AI Analysis Error:", error);

        return res.status(502).json({
            success: false,
            message: "AI services are currently unavailable. Please try again.",
            error: process.env.NODE_ENV === "development"
                ? error.message
                : undefined
        });
    }
};

// ==========================================
// SMART DEMAND FORECASTING
// ==========================================

const forecastDemand = async (req, res) => {
    try {
        const shopId = req.user.shopId;

        if (!shopId) {
            return res.status(400).json({
                success: false,
                message: "No shop is linked to this account"
            });
        }

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const [products, sales] = await Promise.all([
            Product.find({
                shopId,
                isActive: true
            })
                .select(
                    "name quantity reorderLeadTime"
                )
                .lean(),

            Sale.find({
                shopId,
                createdAt: {
                    $gte: startDate,
                    $lte: endDate
                }
            })
                .select("items.productId items.quantity")
                .lean()
        ]);

        const salesMap = {};

        sales.forEach(sale => {
            (sale.items || []).forEach(item => {
                const productId = item.productId?.toString();

                if (!productId) return;

                salesMap[productId] =
                    (salesMap[productId] || 0) +
                    Number(item.quantity || 0);
            });
        });

        const forecast = products.map(product => {
            const soldQuantity =
                salesMap[product._id.toString()] || 0;

            const averageDailyDemand = soldQuantity / 30;

            const next7DaysDemand = averageDailyDemand * 7;
            const next30DaysDemand = averageDailyDemand * 30;

            const daysOfStockRemaining = averageDailyDemand > 0
                ? product.quantity / averageDailyDemand
                : null;

            const leadTime = product.reorderLeadTime ?? 3;
            const safetyDays = 7;

            const targetStock = Math.ceil(
                averageDailyDemand * (leadTime + safetyDays)
            );

            const reorderQuantity = Math.max(
                0,
                targetStock - product.quantity
            );

            let status = "Healthy";

            if (product.quantity <= 0) {
                status = "Out of Stock";
            } else if (reorderQuantity > 0) {
                status = "Reorder Soon";
            } else if (
                daysOfStockRemaining !== null &&
                daysOfStockRemaining <= 7
            ) {
                status = "Low Stock";
            }

            return {
                productId: product._id,
                productName: product.name,
                currentStock: product.quantity,
                soldLast30Days: soldQuantity,
                averageDailyDemand: Number(
                    averageDailyDemand.toFixed(2)
                ),
                forecastNext7Days: Number(
                    next7DaysDemand.toFixed(2)
                ),
                forecastNext30Days: Number(
                    next30DaysDemand.toFixed(2)
                ),
                daysOfStockRemaining:
                    daysOfStockRemaining === null
                        ? null
                        : Number(daysOfStockRemaining.toFixed(1)),
                reorderLeadTime: leadTime,
                suggestedReorderQuantity: reorderQuantity,
                status
            };
        });

        forecast.sort(
            (a, b) =>
                b.averageDailyDemand - a.averageDailyDemand
        );

        return res.status(200).json({
            success: true,
            message: "Demand forecast generated successfully",
            period: "Last 30 days",
            forecastPeriod: "Next 7 and 30 days",
            totalProducts: forecast.length,
            productsWithSales: forecast.filter(
                item => item.soldLast30Days > 0
            ).length,
            forecast
        });

    } catch (error) {
        console.error("Demand Forecast Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to generate demand forecast"
        });
    }
};

// ==========================================
// DEAD STOCK AND EXPIRY ALERTS
// ==========================================

const getInventoryAlerts = async (req, res) => {
    try {
        const shopId = req.user.shopId;

        if (!shopId) {
            return res.status(400).json({
                success: false,
                message: "No shop is linked to this account"
            });
        }

        const today = new Date();

        const todayUTC = Date.UTC(
            today.getUTCFullYear(),
            today.getUTCMonth(),
            today.getUTCDate()
        );

        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const [products, sales] = await Promise.all([
            Product.find({
                shopId,
                isActive: true,
                quantity: { $gt: 0 }
            })
                .select(
                    "name sku quantity expiryDate purchasePrice"
                )
                .lean(),

            Sale.find({
                shopId,
                createdAt: { $gte: sixtyDaysAgo }
            })
                .select("items.productId items.quantity")
                .lean()
        ]);

        const salesMap = {};

        sales.forEach(sale => {
            (sale.items || []).forEach(item => {
                const productId = item.productId?.toString();

                if (!productId) return;

                salesMap[productId] =
                    (salesMap[productId] || 0) +
                    Number(item.quantity || 0);
            });
        });

        const expiredProducts = [];
        const expiringWithin7Days = [];
        const expiringWithin8To15Days = [];
        const expiringWithin16To30Days = [];

        products.forEach(product => {
            if (!product.expiryDate) return;

            const expiry = new Date(product.expiryDate);

            if (Number.isNaN(expiry.getTime())) return;

            const expiryUTC = Date.UTC(
                expiry.getUTCFullYear(),
                expiry.getUTCMonth(),
                expiry.getUTCDate()
            );

            const daysUntilExpiry = Math.floor(
                (expiryUTC - todayUTC) /
                (1000 * 60 * 60 * 24)
            );

            const productValue =
                Number(product.purchasePrice || 0) *
                Number(product.quantity || 0);

            const alertProduct = {
                productId: product._id,
                productName: product.name,
                sku: product.sku,
                currentStock: product.quantity,
                expiryDate: product.expiryDate,
                daysUntilExpiry,
                estimatedPurchaseValue: productValue
            };

            if (daysUntilExpiry < 0) {
                expiredProducts.push({
                    ...alertProduct,
                    alertType: "Expired"
                });
            } else if (daysUntilExpiry <= 7) {
                expiringWithin7Days.push({
                    ...alertProduct,
                    alertType: "Expiring Within 7 Days"
                });
            } else if (daysUntilExpiry <= 15) {
                expiringWithin8To15Days.push({
                    ...alertProduct,
                    alertType: "Expiring Within 8-15 Days"
                });
            } else if (daysUntilExpiry <= 30) {
                expiringWithin16To30Days.push({
                    ...alertProduct,
                    alertType: "Expiring Within 16-30 Days"
                });
            }
        });

        const deadStock = products
            .filter(product => {
                const soldQuantity =
                    salesMap[product._id.toString()] || 0;

                return soldQuantity === 0;
            })
            .map(product => ({
                productId: product._id,
                productName: product.name,
                sku: product.sku,
                currentStock: product.quantity,
                purchasePrice: product.purchasePrice,
                estimatedBlockedValue:
                    Number(product.purchasePrice || 0) *
                    Number(product.quantity || 0),
                soldQuantityLast60Days: 0,
                reason: "No recorded sales in the last 60 days"
            }))
            .sort(
                (a, b) =>
                    b.estimatedBlockedValue -
                    a.estimatedBlockedValue
            );

        const expiryAlerts = [
            ...expiredProducts,
            ...expiringWithin7Days,
            ...expiringWithin8To15Days,
            ...expiringWithin16To30Days
        ];

        const expiryRiskValue = expiryAlerts.reduce(
            (sum, product) =>
                sum + product.estimatedPurchaseValue,
            0
        );

        const deadStockValue = deadStock.reduce(
            (sum, product) =>
                sum + product.estimatedBlockedValue,
            0
        );

        return res.status(200).json({
            success: true,
            message: "Inventory alerts generated successfully",
            generatedAt: new Date(),

            period: {
                deadStockAnalysis: "Last 60 days",
                expiryAnalysis: "Next 30 days"
            },

            summary: {
                totalProductsChecked: products.length,
                expiredCount: expiredProducts.length,
                expiringWithin7DaysCount:
                    expiringWithin7Days.length,
                expiringWithin8To15DaysCount:
                    expiringWithin8To15Days.length,
                expiringWithin16To30DaysCount:
                    expiringWithin16To30Days.length,
                totalExpiryAlerts: expiryAlerts.length,
                expiryRiskValue: Number(
                    expiryRiskValue.toFixed(2)
                ),
                deadStockCount: deadStock.length,
                deadStockValue: Number(
                    deadStockValue.toFixed(2)
                )
            },

            expiryAlerts: {
                expired: expiredProducts,
                within7Days: expiringWithin7Days,
                within8To15Days: expiringWithin8To15Days,
                within16To30Days: expiringWithin16To30Days
            },

            deadStock
        });

    } catch (error) {
        console.error("Inventory Alerts Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to generate inventory alerts"
        });
    }
};

// ==========================================
// AUTO REORDER SUGGESTIONS
// ==========================================

const getReorderSuggestions = async (req, res) => {
    try {
        const shopId = req.user.shopId;

        if (!shopId) {
            return res.status(400).json({
                success: false,
                message: "No shop is linked to this account"
            });
        }

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const [products, sales] = await Promise.all([
            Product.find({
                shopId,
                isActive: true
            })
                .select(
                    "name sku quantity minStockLevel purchasePrice reorderLeadTime supplierId"
                )
                .populate(
                    "supplierId",
                    "name companyName phone email"
                )
                .lean(),

            Sale.find({
                shopId,
                createdAt: {
                    $gte: startDate,
                    $lte: endDate
                }
            })
                .select("items.productId items.quantity")
                .lean()
        ]);

        const salesMap = {};

        sales.forEach(sale => {
            (sale.items || []).forEach(item => {
                const productId = item.productId?.toString();

                if (!productId) return;

                salesMap[productId] =
                    (salesMap[productId] || 0) +
                    Number(item.quantity || 0);
            });
        });

        const suggestions = [];

        let totalSuggestedUnits = 0;
        let estimatedOrderCost = 0;

        products.forEach(product => {
            const currentStock = Number(product.quantity || 0);
            const minimumStock = Number(product.minStockLevel || 0);
            const purchasePrice = Number(product.purchasePrice || 0);

            const soldLast30Days =
                salesMap[product._id.toString()] || 0;

            const averageDailyDemand = soldLast30Days / 30;
            const leadTime = Number(
                product.reorderLeadTime ?? 3
            );

            const safetyDays = 7;

            let targetStock = Math.ceil(
                averageDailyDemand * (leadTime + safetyDays)
            );

            targetStock = Math.max(
                targetStock,
                minimumStock + 1
            );

            let suggestedOrderQuantity = Math.max(
                0,
                targetStock - currentStock
            );

            if (soldLast30Days === 0) {
                suggestedOrderQuantity =
                    currentStock <= minimumStock
                        ? Math.max(
                            1,
                            minimumStock + 1 - currentStock
                        )
                        : 0;
            }

            if (suggestedOrderQuantity <= 0) return;

            let priority = "Medium";

            if (currentStock <= 0) {
                priority = "Critical";
            } else if (
                currentStock <= minimumStock ||
                (
                    averageDailyDemand > 0 &&
                    currentStock / averageDailyDemand <= leadTime
                )
            ) {
                priority = "High";
            }

            const estimatedCost =
                suggestedOrderQuantity * purchasePrice;

            const supplier = product.supplierId;

            suggestions.push({
                productId: product._id,
                productName: product.name,
                sku: product.sku,
                currentStock,
                minimumStock,
                soldLast30Days,
                averageDailyDemand: Number(
                    averageDailyDemand.toFixed(2)
                ),
                reorderLeadTime: leadTime,
                safetyDays,
                targetStock,
                suggestedOrderQuantity,
                purchasePrice,
                estimatedPurchaseCost: Number(
                    estimatedCost.toFixed(2)
                ),
                priority,
                supplier: supplier
                    ? {
                        name: supplier.name,
                        companyName: supplier.companyName,
                        phone: supplier.phone,
                        email: supplier.email
                    }
                    : null
            });

            totalSuggestedUnits += suggestedOrderQuantity;
            estimatedOrderCost += estimatedCost;
        });

        const priorityOrder = {
            Critical: 1,
            High: 2,
            Medium: 3
        };

        suggestions.sort(
            (a, b) =>
                priorityOrder[a.priority] -
                priorityOrder[b.priority]
        );

        return res.status(200).json({
            success: true,
            message: "Auto reorder suggestions generated successfully",
            calculationPeriod: "Last 30 days",

            summary: {
                totalProductsChecked: products.length,
                productsRequiringReorder: suggestions.length,
                totalSuggestedUnits,
                estimatedOrderCost: Number(
                    estimatedOrderCost.toFixed(2)
                )
            },

            suggestions
        });

    } catch (error) {
        console.error("Auto Reorder Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to generate reorder suggestions"
        });
    }
};

// ==========================================
// FRAUD AND ANOMALY DETECTION
// ==========================================

const detectAnomalies = async (req, res) => {
    try {
        const shopId = req.user.shopId;

        if (!shopId) {
            return res.status(400).json({
                success: false,
                message: "No shop is linked to this account"
            });
        }

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const movements = await StockMovement.find({
            shopId,
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        })
            .populate("productId", "name sku")
            .populate("createdBy", "name email")
            .sort({ createdAt: -1 })
            .limit(1000)
            .lean();

        const anomalies = [];
        const movementGroups = {};

        movements.forEach(movement => {
            const product = movement.productId;
            const user = movement.createdBy;

            if (!product) return;

            const productName = product.name || "Unknown Product";
            const sku = product.sku || "N/A";
            const userName = user?.name || "Unknown User";

            const quantity = Number(movement.quantity || 0);
            const previousQuantity = Number(
                movement.previousQuantity || 0
            );
            const newQuantity = Number(
                movement.newQuantity || 0
            );

            const difference = Math.abs(
                newQuantity - previousQuantity
            );

            const commonDetails = {
                movementId: movement._id,
                productId: product._id,
                productName,
                sku,
                movementType: movement.type,
                quantity,
                previousQuantity,
                newQuantity,
                user: userName,
                reason: movement.reason || "No reason provided",
                date: movement.createdAt
            };

            if (
                movement.type === "out" &&
                difference >= 10 &&
                difference >= previousQuantity * 0.5
            ) {
                anomalies.push({
                    ...commonDetails,
                    anomalyType: "Large Stock Reduction",
                    severity: "High",
                    description:
                        "A large quantity of stock was removed in a single movement."
                });
            }

            if (
                movement.type === "adjustment" &&
                difference >= 10 &&
                difference >= Math.max(
                    previousQuantity * 0.5,
                    10
                )
            ) {
                anomalies.push({
                    ...commonDetails,
                    anomalyType: "Unusual Stock Adjustment",
                    severity: "High",
                    description:
                        "A large manual stock adjustment was recorded."
                });
            }

            let expectedQuantity = null;

            if (movement.type === "in") {
                expectedQuantity =
                    previousQuantity + quantity;
            }

            if (movement.type === "out") {
                expectedQuantity =
                    previousQuantity - quantity;
            }

            if (
                expectedQuantity !== null &&
                expectedQuantity !== newQuantity
            ) {
                anomalies.push({
                    ...commonDetails,
                    anomalyType: "Quantity Mismatch",
                    severity: "Critical",
                    description:
                        "Recorded previous quantity, movement quantity and new quantity do not match."
                });
            }

            const userId = user?._id?.toString() || "unknown";
            const productId = product._id.toString();
            const groupKey = `${productId}_${userId}`;

            if (!movementGroups[groupKey]) {
                movementGroups[groupKey] = [];
            }

            movementGroups[groupKey].push(movement);
        });

        Object.values(movementGroups).forEach(group => {
            const sortedGroup = [...group].sort(
                (a, b) =>
                    new Date(a.createdAt) -
                    new Date(b.createdAt)
            );

            // Sliding window avoids repeatedly filtering the full group.
            let windowStart = 0;

            for (
                let i = 0;
                i < sortedGroup.length;
                i++
            ) {
                const currentTime = new Date(
                    sortedGroup[i].createdAt
                ).getTime();

                const windowEnd =
                    currentTime + 24 * 60 * 60 * 1000;

                while (
                    windowStart < sortedGroup.length &&
                    new Date(
                        sortedGroup[windowStart].createdAt
                    ).getTime() < currentTime
                ) {
                    windowStart++;
                }

                let repeatedCount = 0;

                for (
                    let j = windowStart;
                    j < sortedGroup.length;
                    j++
                ) {
                    const movementTime = new Date(
                        sortedGroup[j].createdAt
                    ).getTime();

                    if (movementTime > windowEnd) break;

                    repeatedCount++;
                }

                if (repeatedCount < 3) continue;

                const currentMovement = sortedGroup[i];
                const product = currentMovement.productId;
                const user = currentMovement.createdBy;
                const userName = user?.name || "Unknown User";

                const alreadyReported = anomalies.some(
                    anomaly =>
                        anomaly.anomalyType ===
                            "Repeated Stock Movements" &&
                        anomaly.productId?.toString() ===
                            product?._id?.toString() &&
                        anomaly.user === userName &&
                        new Date(anomaly.date).getTime() ===
                            currentTime
                );

                if (alreadyReported) continue;

                anomalies.push({
                    movementId: currentMovement._id,
                    productId: product?._id,
                    productName:
                        product?.name || "Unknown Product",
                    sku: product?.sku || "N/A",
                    movementType: currentMovement.type,
                    quantity: currentMovement.quantity,
                    previousQuantity:
                        currentMovement.previousQuantity,
                    newQuantity: currentMovement.newQuantity,
                    user: userName,
                    reason:
                        currentMovement.reason ||
                        "No reason provided",
                    date: currentMovement.createdAt,
                    anomalyType: "Repeated Stock Movements",
                    severity: "Medium",
                    description:
                        `${repeatedCount} stock movements were recorded for the same product by the same user within 24 hours.`
                });
            }
        });

        const severityOrder = {
            Critical: 1,
            High: 2,
            Medium: 3,
            Low: 4
        };

        anomalies.sort(
            (a, b) =>
                severityOrder[a.severity] -
                severityOrder[b.severity]
        );

        const summary = {
            totalMovementsChecked: movements.length,
            totalAnomalies: anomalies.length,
            criticalCount: anomalies.filter(
                item => item.severity === "Critical"
            ).length,
            highCount: anomalies.filter(
                item => item.severity === "High"
            ).length,
            mediumCount: anomalies.filter(
                item => item.severity === "Medium"
            ).length
        };

        return res.status(200).json({
            success: true,
            message: "Anomaly detection completed successfully",
            analysisPeriod: "Last 30 days",
            generatedAt: new Date(),
            summary,
            anomalies
        });

    } catch (error) {
        console.error("Anomaly Detection Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to detect inventory anomalies"
        });
    }
};

// ==========================================
// TOTAL SALES REPORT
// ==========================================

const getSalesReport = async (req, res) => {
    try {
        const shopId = req.user.shopId;

        if (!shopId) {
            return res.status(400).json({
                success: false,
                message: "No shop is linked to this account"
            });
        }

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const sales = await Sale.find({
            shopId,
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        })
            .select(
                "totalAmount paymentMethod items.productName items.quantity items.subtotal createdAt"
            )
            .sort({ createdAt: 1 })
            .lean();

        let totalRevenue = 0;
        let totalUnitsSold = 0;

        const paymentMap = {};
        const productMap = {};
        const dailyMap = {};

        // Initialize 30 days
        for (let i = 0; i < 30; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);

            const dateKey = date.toISOString().slice(0, 10);

            dailyMap[dateKey] = {
                date: dateKey,
                orders: 0,
                revenue: 0,
                unitsSold: 0
            };
        }

        sales.forEach(sale => {
            const amount = Number(sale.totalAmount || 0);
            const paymentMethod =
                sale.paymentMethod || "other";

            totalRevenue += amount;

            const saleItems = sale.items || [];
            let saleUnits = 0;

            saleItems.forEach(item => {
                const quantity = Number(item.quantity || 0);
                saleUnits += quantity;

                const productName =
                    item.productName || "Unknown Product";

                if (!productMap[productName]) {
                    productMap[productName] = {
                        productName,
                        unitsSold: 0,
                        revenue: 0
                    };
                }

                productMap[productName].unitsSold += quantity;

                productMap[productName].revenue +=
                    Number(item.subtotal || 0);
            });

            totalUnitsSold += saleUnits;

            if (!paymentMap[paymentMethod]) {
                paymentMap[paymentMethod] = {
                    paymentMethod,
                    orders: 0,
                    revenue: 0
                };
            }

            paymentMap[paymentMethod].orders += 1;
            paymentMap[paymentMethod].revenue += amount;

            const saleDate = new Date(sale.createdAt)
                .toISOString()
                .slice(0, 10);

            if (dailyMap[saleDate]) {
                dailyMap[saleDate].orders += 1;
                dailyMap[saleDate].revenue += amount;
                dailyMap[saleDate].unitsSold += saleUnits;
            }
        });

        const totalOrders = sales.length;

        const averageOrderValue = totalOrders > 0
            ? totalRevenue / totalOrders
            : 0;

        const paymentBreakdown = Object.values(paymentMap)
            .map(item => ({
                ...item,
                revenue: Number(item.revenue.toFixed(2)),
                percentage: totalRevenue > 0
                    ? Number(
                        (
                            item.revenue /
                            totalRevenue *
                            100
                        ).toFixed(2)
                    )
                    : 0
            }));

        const topSellingProducts = Object.values(productMap)
            .sort((a, b) => b.unitsSold - a.unitsSold)
            .slice(0, 5)
            .map(item => ({
                ...item,
                revenue: Number(item.revenue.toFixed(2))
            }));

        const dailySales = Object.values(dailyMap)
            .map(item => ({
                ...item,
                revenue: Number(item.revenue.toFixed(2))
            }));

        return res.status(200).json({
            success: true,
            message: "Total sales report generated successfully",
            period: "Last 30 days",
            generatedAt: new Date(),

            summary: {
                totalRevenue: Number(
                    totalRevenue.toFixed(2)
                ),
                totalOrders,
                totalUnitsSold,
                averageOrderValue: Number(
                    averageOrderValue.toFixed(2)
                )
            },

            paymentBreakdown,
            dailySales,
            topSellingProducts
        });

    } catch (error) {
        console.error("Total Sales Report Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to generate total sales report"
        });
    }
};

// ==========================================
// EXPORT CONTROLLERS
// ==========================================

module.exports = {
    analyzeInventory,
    forecastDemand,
    getInventoryAlerts,
    getReorderSuggestions,
    detectAnomalies,
    getSalesReport
};
