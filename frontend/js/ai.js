
// ==========================================
// AUTHENTICATION
// ==========================================

const token = getToken();

if (!token) {
    window.location.replace("login.html");
} else {

    const user = JSON.parse(
        localStorage.getItem("stockwise_user") || "{}"
    );

    document.getElementById("dashboardApp").hidden = false;
    document.getElementById("loadingScreen").hidden = true;

    document.getElementById("welcomeUser").textContent =
        `Welcome, ${user.name || "User"}`;

    document.getElementById("logoutButton")
        .addEventListener("click", logout);


    // ==========================================
    // COMMON HELPERS
    // ==========================================

    function formatCurrency(amount) {
        return Number(amount || 0).toLocaleString("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        });
    }

    function formatDate(dateValue) {
        if (!dateValue) return "Not Available";

        return new Date(dateValue).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone: "UTC"
        });
    }

    function formatDateTime(dateValue) {
        if (!dateValue) return "Not Available";

        return new Date(dateValue).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }


    // ==========================================
    // EXISTING AI ANALYSIS FUNCTION
    // ==========================================

    async function runAIAnalysis(
        question,
        resultElement,
        statusElement,
        button
    ) {
        button.disabled = true;
        button.textContent = "AI is thinking...";

        statusElement.textContent =
            "Connecting to StockWise AI...";

        resultElement.textContent = "";
        resultElement.hidden = false;

        try {
            const result = await apiRequest(
                "/ai/analyze",
                "POST",
                { question },
                token
            );

            statusElement.textContent =
                `Analysis generated successfully using ${result.provider}.`;

            resultElement.textContent = result.analysis;
            resultElement.hidden = false;

            resultElement.style.whiteSpace = "pre-wrap";
            resultElement.style.lineHeight = "1.7";

        } catch (error) {
            statusElement.textContent = "AI request failed.";
            resultElement.textContent = error.message;
            resultElement.hidden = false;

        } finally {
            button.disabled = false;

            button.textContent =
                button.id === "analyzeButton"
                    ? "Generate AI Analysis"
                    : "Ask AI";
        }
    }


    document.getElementById("analyzeButton")
        .addEventListener("click", function () {

            runAIAnalysis(
                "Give me a complete inventory and sales analysis with restocking recommendations.",
                document.getElementById("analysisResult"),
                document.getElementById("analysisStatus"),
                this
            );

        });


    document.getElementById("askButton")
        .addEventListener("click", function () {

            const question =
                document.getElementById("aiQuestion").value.trim();

            if (!question) {
                document.getElementById("questionStatus")
                    .textContent = "Please enter a question first.";
                return;
            }

            runAIAnalysis(
                question,
                document.getElementById("questionResult"),
                document.getElementById("questionStatus"),
                this
            );

        });


    // ==========================================
    // SMART DEMAND FORECASTING
    // ==========================================

    const forecastButton =
        document.getElementById("forecastButton");

    const forecastStatus =
        document.getElementById("forecastStatus");

    const forecastSummary =
        document.getElementById("forecastSummary");

    const forecastResult =
        document.getElementById("forecastResult");

    const forecastTableBody =
        document.getElementById("forecastTableBody");


    forecastButton.addEventListener("click", async function () {

        forecastButton.disabled = true;
        forecastButton.textContent = "Analyzing Demand...";

        forecastStatus.textContent =
            "Analyzing last 30 days of sales data...";

        forecastSummary.hidden = true;
        forecastResult.hidden = true;

        try {
            const result = await apiRequest(
                "/ai/forecast",
                "GET",
                null,
                token
            );

            if (!result.success) {
                throw new Error(
                    result.message || "Forecast generation failed"
                );
            }

            document.getElementById("forecastTotalProducts")
                .textContent = result.totalProducts;

            document.getElementById("forecastProductsWithSales")
                .textContent = result.productsWithSales;

            forecastSummary.hidden = false;
            forecastTableBody.innerHTML = "";

            if (!result.forecast || result.forecast.length === 0) {

                const row = document.createElement("tr");
                const cell = document.createElement("td");

                cell.colSpan = 9;
                cell.textContent = "No active products found.";

                row.appendChild(cell);
                forecastTableBody.appendChild(row);

            } else {

                result.forecast.forEach(product => {

                    const row = document.createElement("tr");

                    const values = [
                        product.productName,
                        product.currentStock,
                        product.soldLast30Days,
                        product.averageDailyDemand,
                        product.forecastNext7Days,
                        product.forecastNext30Days,
                        product.daysOfStockRemaining === null
                            ? "Insufficient data"
                            : `${product.daysOfStockRemaining} days`,
                        product.suggestedReorderQuantity,
                        product.status
                    ];

                    values.forEach((value, index) => {

                        const cell = document.createElement("td");
                        cell.textContent = value;

                        if (index === 8) {
                            cell.style.fontWeight = "600";

                            if (product.status === "Out of Stock") {
                                cell.style.color = "#ef4444";
                            } else if (
                                product.status === "Reorder Soon" ||
                                product.status === "Low Stock"
                            ) {
                                cell.style.color = "#f59e0b";
                            } else {
                                cell.style.color = "#22c55e";
                            }
                        }

                        row.appendChild(cell);

                    });

                    forecastTableBody.appendChild(row);

                });

            }

            forecastStatus.textContent =
                "Demand forecast generated successfully.";

            forecastResult.hidden = false;

        } catch (error) {

            forecastStatus.textContent =
                "Unable to generate demand forecast.";

            forecastResult.hidden = true;

            console.error("Forecast Error:", error);
            alert(error.message);

        } finally {

            forecastButton.disabled = false;
            forecastButton.textContent =
                "Generate Demand Forecast";

        }

    });


    // ==========================================
    // DEAD STOCK AND EXPIRY ALERTS
    // ==========================================

    const inventoryAlertsButton =
        document.getElementById("inventoryAlertsButton");

    const inventoryAlertsStatus =
        document.getElementById("inventoryAlertsStatus");

    const inventoryAlertsSummary =
        document.getElementById("inventoryAlertsSummary");

    const expiryAlertsResult =
        document.getElementById("expiryAlertsResult");

    const deadStockResult =
        document.getElementById("deadStockResult");

    const expiryAlertsTableBody =
        document.getElementById("expiryAlertsTableBody");

    const deadStockTableBody =
        document.getElementById("deadStockTableBody");


    inventoryAlertsButton.addEventListener("click", async function () {

        inventoryAlertsButton.disabled = true;
        inventoryAlertsButton.textContent = "Analyzing Inventory...";

        inventoryAlertsStatus.textContent =
            "Checking product expiry dates and last 60 days of sales...";

        inventoryAlertsSummary.hidden = true;
        expiryAlertsResult.hidden = true;
        deadStockResult.hidden = true;

        try {

            const result = await apiRequest(
                "/ai/inventory-alerts",
                "GET",
                null,
                token
            );

            if (!result.success) {
                throw new Error(
                    result.message || "Inventory analysis failed"
                );
            }

            const summary = result.summary;

            document.getElementById("expiredProductsCount")
                .textContent = summary.expiredCount;

            document.getElementById("expiring7DaysCount")
                .textContent = summary.expiringWithin7DaysCount;

            document.getElementById("expiring15DaysCount")
                .textContent = summary.expiringWithin8To15DaysCount;

            document.getElementById("expiring30DaysCount")
                .textContent = summary.expiringWithin16To30DaysCount;

            document.getElementById("deadStockCount")
                .textContent = summary.deadStockCount;

            document.getElementById("expiryRiskValue")
                .textContent = formatCurrency(summary.expiryRiskValue);

            document.getElementById("deadStockValue")
                .textContent = formatCurrency(summary.deadStockValue);

            inventoryAlertsSummary.hidden = false;


            // EXPIRY ALERT TABLE

            expiryAlertsTableBody.innerHTML = "";

            const expiryGroups = [
                result.expiryAlerts.expired || [],
                result.expiryAlerts.within7Days || [],
                result.expiryAlerts.within8To15Days || [],
                result.expiryAlerts.within16To30Days || []
            ];

            const allExpiryProducts = expiryGroups.flat();

            if (allExpiryProducts.length === 0) {

                const row = document.createElement("tr");
                const cell = document.createElement("td");

                cell.colSpan = 7;
                cell.textContent =
                    "No expired or soon-to-expire products found.";

                row.appendChild(cell);
                expiryAlertsTableBody.appendChild(row);

            } else {

                allExpiryProducts.forEach(product => {

                    const row = document.createElement("tr");

                    const values = [
                        product.productName,
                        product.sku || "N/A",
                        product.currentStock,
                        formatDate(product.expiryDate),
                        product.daysUntilExpiry < 0
                            ? `${Math.abs(product.daysUntilExpiry)} days ago`
                            : `${product.daysUntilExpiry} days`,
                        formatCurrency(product.estimatedPurchaseValue),
                        product.alertType
                    ];

                    values.forEach((value, index) => {

                        const cell = document.createElement("td");
                        cell.textContent = value;

                        if (index === 6) {

                            cell.style.fontWeight = "600";

                            if (product.alertType === "Expired") {
                                cell.style.color = "#ef4444";
                            } else {
                                cell.style.color = "#f59e0b";
                            }
                        }

                        row.appendChild(cell);

                    });

                    expiryAlertsTableBody.appendChild(row);

                });

            }

            expiryAlertsResult.hidden = false;


            // DEAD STOCK TABLE

            deadStockTableBody.innerHTML = "";

            const deadStockProducts = result.deadStock || [];

            if (deadStockProducts.length === 0) {

                const row = document.createElement("tr");
                const cell = document.createElement("td");

                cell.colSpan = 6;
                cell.textContent =
                    "No dead stock products found.";

                row.appendChild(cell);
                deadStockTableBody.appendChild(row);

            } else {

                deadStockProducts.forEach(product => {

                    const row = document.createElement("tr");

                    const values = [
                        product.productName,
                        product.sku || "N/A",
                        product.currentStock,
                        formatCurrency(product.purchasePrice),
                        formatCurrency(product.estimatedBlockedValue),
                        product.soldQuantityLast60Days
                    ];

                    values.forEach(value => {

                        const cell = document.createElement("td");
                        cell.textContent = value;

                        row.appendChild(cell);

                    });

                    deadStockTableBody.appendChild(row);

                });

            }

            deadStockResult.hidden = false;

            inventoryAlertsStatus.textContent =
                "Inventory risk analysis completed successfully.";

        } catch (error) {

            console.error("Inventory Alerts Error:", error);

            inventoryAlertsStatus.textContent =
                "Unable to analyze inventory risks.";

            alert(error.message);

        } finally {

            inventoryAlertsButton.disabled = false;
            inventoryAlertsButton.textContent =
                "Analyze Inventory Risks";

        }

    });


    // ==========================================
    // AUTO REORDER SUGGESTIONS
    // ==========================================

    const reorderSuggestionsButton =
        document.getElementById("reorderSuggestionsButton");

    const reorderSuggestionsStatus =
        document.getElementById("reorderSuggestionsStatus");

    const reorderSummary =
        document.getElementById("reorderSummary");

    const reorderSuggestionsResult =
        document.getElementById("reorderSuggestionsResult");

    const reorderSuggestionsTableBody =
        document.getElementById("reorderSuggestionsTableBody");


    reorderSuggestionsButton.addEventListener("click", async function () {

        reorderSuggestionsButton.disabled = true;

        reorderSuggestionsButton.textContent =
            "Generating Suggestions...";

        reorderSuggestionsStatus.textContent =
            "Analyzing stock levels, sales demand and supplier information...";

        reorderSummary.hidden = true;
        reorderSuggestionsResult.hidden = true;

        try {

            const result = await apiRequest(
                "/ai/reorder-suggestions",
                "GET",
                null,
                token
            );

            if (!result.success) {
                throw new Error(
                    result.message || "Reorder suggestions failed"
                );
            }

            const summary = result.summary;

            document.getElementById("reorderProductsChecked")
                .textContent = summary.totalProductsChecked;

            document.getElementById("productsRequiringReorder")
                .textContent = summary.productsRequiringReorder;

            document.getElementById("totalSuggestedUnits")
                .textContent = summary.totalSuggestedUnits;

            document.getElementById("estimatedOrderCost")
                .textContent = formatCurrency(summary.estimatedOrderCost);

            reorderSummary.hidden = false;

            reorderSuggestionsTableBody.innerHTML = "";

            const suggestions = result.suggestions || [];

            if (suggestions.length === 0) {

                const row = document.createElement("tr");
                const cell = document.createElement("td");

                cell.colSpan = 9;

                cell.textContent =
                    "No products currently require reordering.";

                row.appendChild(cell);
                reorderSuggestionsTableBody.appendChild(row);

            } else {

                suggestions.forEach(product => {

                    const row = document.createElement("tr");

                    const supplier = product.supplier || {};

                    const values = [
                        product.productName,
                        product.sku || "N/A",
                        product.currentStock,
                        product.minimumStock,
                        product.suggestedOrderQuantity,
                        product.priority,
                        supplier.name || supplier.companyName || "Not Assigned",
                        supplier.phone || supplier.email || "Not Available",
                        formatCurrency(product.estimatedPurchaseCost)
                    ];

                    values.forEach((value, index) => {

                        const cell = document.createElement("td");
                        cell.textContent = value;

                        if (index === 5) {

                            cell.style.fontWeight = "600";

                            if (product.priority === "Critical") {
                                cell.style.color = "#ef4444";
                            } else if (product.priority === "High") {
                                cell.style.color = "#f59e0b";
                            } else {
                                cell.style.color = "#22c55e";
                            }

                        }

                        row.appendChild(cell);

                    });

                    reorderSuggestionsTableBody.appendChild(row);

                });

            }

            reorderSuggestionsStatus.textContent =
                "Auto reorder suggestions generated successfully.";

            reorderSuggestionsResult.hidden = false;

        } catch (error) {

            console.error("Auto Reorder Error:", error);

            reorderSuggestionsStatus.textContent =
                "Unable to generate reorder suggestions.";

            alert(error.message);

        } finally {

            reorderSuggestionsButton.disabled = false;

            reorderSuggestionsButton.textContent =
                "Generate Reorder Suggestions";

        }

    });


    // ==========================================
    // FRAUD AND ANOMALY DETECTION
    // ==========================================

    const anomalyDetectionButton =
        document.getElementById("anomalyDetectionButton");

    const anomalyDetectionStatus =
        document.getElementById("anomalyDetectionStatus");

    const anomalySummary =
        document.getElementById("anomalySummary");

    const anomalyDetectionResult =
        document.getElementById("anomalyDetectionResult");

    const anomalyTableBody =
        document.getElementById("anomalyTableBody");


    anomalyDetectionButton.addEventListener("click", async function () {

        anomalyDetectionButton.disabled = true;

        anomalyDetectionButton.textContent =
            "Scanning Stock Movements...";

        anomalyDetectionStatus.textContent =
            "Checking the last 30 days of stock movement records...";

        anomalySummary.hidden = true;
        anomalyDetectionResult.hidden = true;

        try {

            const result = await apiRequest(
                "/ai/anomaly-detection",
                "GET",
                null,
                token
            );

            if (!result.success) {
                throw new Error(
                    result.message || "Anomaly detection failed"
                );
            }

            const summary = result.summary || {};

            document.getElementById("anomalyMovementsChecked")
                .textContent = summary.totalMovementsChecked || 0;

            document.getElementById("totalAnomalies")
                .textContent = summary.totalAnomalies || 0;

            document.getElementById("criticalAnomalies")
                .textContent = summary.criticalCount || 0;

            document.getElementById("highAnomalies")
                .textContent = summary.highCount || 0;

            document.getElementById("mediumAnomalies")
                .textContent = summary.mediumCount || 0;

            anomalySummary.hidden = false;


            // ANOMALY TABLE

            anomalyTableBody.innerHTML = "";

            const anomalies = result.anomalies || [];

            if (anomalies.length === 0) {

                const row = document.createElement("tr");
                const cell = document.createElement("td");

                cell.colSpan = 10;

                cell.textContent =
                    "No unusual stock movements detected in the analysis period.";

                row.appendChild(cell);
                anomalyTableBody.appendChild(row);

            } else {

                anomalies.forEach(anomaly => {

                    const row = document.createElement("tr");

                    const product = anomaly.product || {};
                    const user = anomaly.user || {};

                    const values = [
                        formatDateTime(anomaly.date || anomaly.createdAt),
                        anomaly.productName || product.name || "Unknown Product",
                        anomaly.sku || product.sku || "N/A",
                        anomaly.activity || anomaly.type || "N/A",
                        anomaly.previousQuantity ?? "N/A",
                        anomaly.quantity ?? "N/A",
                        anomaly.newQuantity ?? "N/A",
                        user.name || anomaly.userName || "Unknown User",
                        anomaly.severity || "Unclassified",
                        anomaly.reason || anomaly.description || "Unusual activity"
                    ];

                    values.forEach((value, index) => {

                        const cell = document.createElement("td");

                        cell.textContent = value;

                        if (index === 8) {

                            cell.style.fontWeight = "700";

                            const severity = String(value).toLowerCase();

                            if (severity === "critical") {
                                cell.style.color = "#ef4444";
                            } else if (severity === "high") {
                                cell.style.color = "#f97316";
                            } else if (severity === "medium") {
                                cell.style.color = "#f59e0b";
                            } else {
                                cell.style.color = "#22c55e";
                            }

                        }

                        row.appendChild(cell);

                    });

                    anomalyTableBody.appendChild(row);

                });

            }

            anomalyDetectionResult.hidden = false;

            anomalyDetectionStatus.textContent =
                `Anomaly scan completed. ${anomalies.length} unusual activities found.`;

        } catch (error) {

            console.error("Anomaly Detection Error:", error);

            anomalyDetectionStatus.textContent =
                "Unable to detect stock anomalies.";

            alert(error.message);

        } finally {

            anomalyDetectionButton.disabled = false;

            anomalyDetectionButton.textContent =
                "Detect Stock Anomalies";

        }

    });

    // ==========================================
    // SALES ANALYTICS CHARTS
    // ==========================================

    const salesChartsResult =
        document.getElementById("salesChartsResult");

    let aiDailySalesChart = null;
    let aiTopProductsChart = null;
    let aiPaymentChart = null;

    function renderSalesCharts(dailySales, topProducts, paymentEntries) {

        if (typeof Chart === "undefined") {
            salesReportStatus.textContent =
                "Sales report generated, but Chart.js could not be loaded.";
            return;
        }

        // Destroy previous charts before creating new ones
        if (aiDailySalesChart) {
            aiDailySalesChart.destroy();
        }

        if (aiTopProductsChart) {
            aiTopProductsChart.destroy();
        }

        if (aiPaymentChart) {
            aiPaymentChart.destroy();
        }

        const chartTextColor = "#cbd5e1";
        const gridColor = "rgba(148, 163, 184, 0.12)";

        // ----------------------------------
        // 1. DAILY REVENUE AND ORDERS CHART
        // ----------------------------------

        const dailyLabels = dailySales.map(day =>
            formatDate(day.date)
        );

        const dailyRevenue = dailySales.map(day =>
            Number(day.revenue || 0)
        );

        const dailyOrders = dailySales.map(day =>
            Number(day.orders || 0)
        );

        aiDailySalesChart = new Chart(
            document.getElementById("aiDailySalesChart"),
            {
                type: "bar",

                data: {
                    labels: dailyLabels,

                    datasets: [
                        {
                            type: "bar",
                            label: "Revenue",
                            data: dailyRevenue,
                            backgroundColor: "rgba(59, 130, 246, 0.65)",
                            borderColor: "#3b82f6",
                            borderWidth: 1,
                            borderRadius: 5,
                            yAxisID: "y"
                        },
                        {
                            type: "line",
                            label: "Orders",
                            data: dailyOrders,
                            borderColor: "#22c55e",
                            backgroundColor: "#22c55e",
                            borderWidth: 2,
                            pointRadius: 3,
                            pointHoverRadius: 6,
                            tension: 0.35,
                            yAxisID: "y1"
                        }
                    ]
                },

                options: {
                    responsive: true,
                    maintainAspectRatio: false,

                    interaction: {
                        mode: "index",
                        intersect: false
                    },

                    plugins: {
                        legend: {
                            position: "top",
                            labels: {
                                color: chartTextColor,
                                usePointStyle: true,
                                padding: 20
                            }
                        },

                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    if (context.dataset.label === "Revenue") {
                                        return "Revenue: " +
                                            formatCurrency(context.raw);
                                    }

                                    return "Orders: " + context.raw;
                                }
                            }
                        }
                    },

                    scales: {
                        x: {
                            ticks: {
                                color: chartTextColor,
                                maxTicksLimit: 10
                            },
                            grid: {
                                display: false
                            }
                        },

                        y: {
                            beginAtZero: true,

                            title: {
                                display: true,
                                text: "Revenue (₹)",
                                color: chartTextColor
                            },

                            ticks: {
                                color: chartTextColor,

                                callback: function (value) {
                                    return "₹" +
                                        Number(value).toLocaleString("en-IN");
                                }
                            },

                            grid: {
                                color: gridColor
                            }
                        },

                        y1: {
                            beginAtZero: true,

                            position: "right",

                            title: {
                                display: true,
                                text: "Orders",
                                color: chartTextColor
                            },

                            ticks: {
                                color: chartTextColor,
                                precision: 0
                            },

                            grid: {
                                drawOnChartArea: false
                            }
                        }
                    }
                }
            }
        );


        // ----------------------------------
        // 2. TOP SELLING PRODUCTS CHART
        // ----------------------------------

        const productLabels = topProducts
            .slice(0, 5)
            .map(product => product.productName || "Unknown Product");

        const productUnits = topProducts
            .slice(0, 5)
            .map(product => Number(product.unitsSold || 0));

        aiTopProductsChart = new Chart(
            document.getElementById("aiTopProductsChart"),
            {
                type: "bar",

                data: {
                    labels: productLabels,

                    datasets: [
                        {
                            label: "Units Sold",
                            data: productUnits,
                            backgroundColor: [
                                "rgba(59, 130, 246, 0.8)",
                                "rgba(34, 197, 94, 0.8)",
                                "rgba(168, 85, 247, 0.8)",
                                "rgba(245, 158, 11, 0.8)",
                                "rgba(6, 182, 212, 0.8)"
                            ],
                            borderRadius: 6,
                            borderSkipped: false
                        }
                    ]
                },

                options: {
                    indexAxis: "y",
                    responsive: true,
                    maintainAspectRatio: false,

                    plugins: {
                        legend: {
                            display: false
                        },

                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return "Units Sold: " + context.raw;
                                }
                            }
                        }
                    },

                    scales: {
                        x: {
                            beginAtZero: true,

                            ticks: {
                                color: chartTextColor,
                                precision: 0
                            },

                            grid: {
                                color: gridColor
                            }
                        },

                        y: {
                            ticks: {
                                color: chartTextColor
                            },

                            grid: {
                                display: false
                            }
                        }
                    }
                }
            }
        );


        // ----------------------------------
        // 3. PAYMENT METHOD DOUGHNUT CHART
        // ----------------------------------

        const paymentLabels = paymentEntries.map(payment =>
            String(
                payment.paymentMethod ||
                payment.method ||
                payment._id ||
                "Other"
            ).toUpperCase()
        );

        const paymentRevenue = paymentEntries.map(payment =>
            Number(payment.revenue || 0)
        );

        aiPaymentChart = new Chart(
            document.getElementById("aiPaymentChart"),
            {
                type: "doughnut",

                data: {
                    labels: paymentLabels,

                    datasets: [
                        {
                            label: "Revenue",
                            data: paymentRevenue,

                            backgroundColor: [
                                "#3b82f6",
                                "#22c55e",
                                "#a855f7",
                                "#f59e0b",
                                "#06b6d4"
                            ],

                            borderColor: "#0d1729",
                            borderWidth: 3,
                            hoverOffset: 10
                        }
                    ]
                },

                options: {
                    responsive: true,
                    maintainAspectRatio: false,

                    cutout: "65%",

                    plugins: {
                        legend: {
                            position: "bottom",

                            labels: {
                                color: chartTextColor,
                                padding: 18,
                                usePointStyle: true
                            }
                        },

                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return context.label + ": " +
                                        formatCurrency(context.raw);
                                }
                            }
                        }
                    }
                }
            }
        );

        salesChartsResult.hidden = false;
    }


    // ==========================================
    // TOTAL SALES REPORT
    // ==========================================

    const salesReportButton =
        document.getElementById("salesReportButton");

    const salesReportStatus =
        document.getElementById("salesReportStatus");

    const salesReportSummary =
        document.getElementById("salesReportSummary");

    const salesPaymentResult =
        document.getElementById("salesPaymentResult");

    const dailySalesResult =
        document.getElementById("dailySalesResult");

    const topSellingProductsResult =
        document.getElementById("topSellingProductsResult");

    const salesPaymentTableBody =
        document.getElementById("salesPaymentTableBody");

    const dailySalesTableBody =
        document.getElementById("dailySalesTableBody");

    const topSellingProductsTableBody =
        document.getElementById("topSellingProductsTableBody");


    salesReportButton.addEventListener("click", async function () {

        salesReportButton.disabled = true;

        salesReportButton.textContent =
            "Generating Sales Report...";

        salesReportStatus.textContent =
            "Analyzing the last 30 days of sales transactions...";

        salesReportSummary.hidden = true;
        salesChartsResult.hidden = true;
        salesPaymentResult.hidden = true;
        dailySalesResult.hidden = true;
        topSellingProductsResult.hidden = true;

        try {

            const result = await apiRequest(
                "/ai/sales-report",
                "GET",
                null,
                token
            );

            if (!result.success) {
                throw new Error(
                    result.message || "Sales report generation failed"
                );
            }

            const summary = result.summary || {};

            // ----------------------------------
            // SALES SUMMARY CARDS
            // ----------------------------------

            document.getElementById("salesTotalRevenue")
                .textContent = formatCurrency(summary.totalRevenue);

            document.getElementById("salesTotalOrders")
                .textContent = summary.totalOrders || 0;

            document.getElementById("salesTotalUnits")
                .textContent = summary.totalUnitsSold || 0;

            document.getElementById("salesAverageOrderValue")
                .textContent = formatCurrency(summary.averageOrderValue);

            salesReportSummary.hidden = false;


            // ----------------------------------
            // PAYMENT METHOD BREAKDOWN
            // ----------------------------------

            salesPaymentTableBody.innerHTML = "";

            const paymentData = result.paymentBreakdown || {};

            const paymentEntries = Array.isArray(paymentData)
                ? paymentData
                : Object.entries(paymentData).map(([method, data]) => ({
                    paymentMethod: method,
                    ...data
                }));

            if (paymentEntries.length === 0) {

                const row = document.createElement("tr");
                const cell = document.createElement("td");

                cell.colSpan = 4;
                cell.textContent = "No payment records found.";

                row.appendChild(cell);
                salesPaymentTableBody.appendChild(row);

            } else {

                paymentEntries.forEach(payment => {

                    const row = document.createElement("tr");

                    const method =
                        payment.paymentMethod ||
                        payment.method ||
                        payment._id ||
                        "Other";

                    const values = [
                        String(method).toUpperCase(),
                        payment.orders || 0,
                        formatCurrency(payment.revenue),
                        `${Number(payment.percentage || 0).toFixed(2)}%`
                    ];

                    values.forEach(value => {

                        const cell = document.createElement("td");
                        cell.textContent = value;

                        row.appendChild(cell);

                    });

                    salesPaymentTableBody.appendChild(row);

                });

            }

            salesPaymentResult.hidden = false;


            // ----------------------------------
            // DAILY SALES REPORT
            // ----------------------------------

            dailySalesTableBody.innerHTML = "";

            const dailySales = result.dailySales || [];

            if (dailySales.length === 0) {

                const row = document.createElement("tr");
                const cell = document.createElement("td");

                cell.colSpan = 4;
                cell.textContent = "No daily sales records found.";

                row.appendChild(cell);
                dailySalesTableBody.appendChild(row);

            } else {

                dailySales.forEach(day => {

                    const row = document.createElement("tr");

                    const values = [
                        formatDate(day.date),
                        day.orders || 0,
                        day.unitsSold || 0,
                        formatCurrency(day.revenue)
                    ];

                    values.forEach(value => {

                        const cell = document.createElement("td");
                        cell.textContent = value;

                        row.appendChild(cell);

                    });

                    dailySalesTableBody.appendChild(row);

                });

            }

            dailySalesResult.hidden = false;


            // ----------------------------------
            // TOP SELLING PRODUCTS
            // ----------------------------------

            topSellingProductsTableBody.innerHTML = "";

            const topProducts = result.topSellingProducts || [];
            // Render charts using actual MongoDB sales report data
            renderSalesCharts(dailySales, topProducts, paymentEntries); 

            if (topProducts.length === 0) {

                const row = document.createElement("tr");
                const cell = document.createElement("td");

                cell.colSpan = 4;
                cell.textContent =
                    "No product sales found during this period.";

                row.appendChild(cell);
                topSellingProductsTableBody.appendChild(row);

            } else {

                topProducts.forEach((product, index) => {

                    const row = document.createElement("tr");

                    const values = [
                        `#${index + 1}`,
                        product.productName || "Unknown Product",
                        product.unitsSold || 0,
                        formatCurrency(product.revenue)
                    ];

                    values.forEach(value => {

                        const cell = document.createElement("td");
                        cell.textContent = value;

                        row.appendChild(cell);

                    });

                    topSellingProductsTableBody.appendChild(row);

                });

            }

            topSellingProductsResult.hidden = false;

            salesReportStatus.textContent =
                `Sales report generated successfully. Period: ${result.period || "Last 30 days"}.`;

        } catch (error) {

            console.error("Sales Report Error:", error);

            salesReportStatus.textContent =
                "Unable to generate sales report.";

            alert(error.message);

        } finally {

            salesReportButton.disabled = false;

            salesReportButton.textContent =
                "Generate Sales Report";

        }

    });

}
