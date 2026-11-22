
document.addEventListener("DOMContentLoaded", async function () {

    const dashboardApp = document.getElementById("dashboardApp");
    const loadingScreen = document.getElementById("loadingScreen");
    const logoutButton = document.getElementById("logoutButton");

    const token = getToken();

    // ==========================================
    // AUTHENTICATION
    // ==========================================

    if (!token) {
        window.location.replace("login.html");
        return;
    }

    logoutButton.addEventListener("click", logout);

    // ==========================================
    // CHART INSTANCES
    // ==========================================

    let monthlySalesChart = null;
    let dailySalesChart = null;
    let inventoryChart = null;

    // ==========================================
    // CHART HELPERS
    // ==========================================

    function formatCurrency(value) {
        return "₹" + Number(value || 0).toLocaleString("en-IN");
    }

    function getMonthKey(date) {
        return `${date.getFullYear()}-${String(
            date.getMonth() + 1
        ).padStart(2, "0")}`;
    }

    function getDateKey(date) {
        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
    }

    function getMonthLabel(date) {
        return date.toLocaleDateString("en-IN", {
            month: "short",
            year: "2-digit"
        });
    }

    function getDayLabel(date) {
        return date.toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric"
        });
    }

    // ==========================================
    // CHART CONFIGURATION
    // ==========================================

    function getCommonChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: "index"
            },
            plugins: {
                legend: {
                    labels: {
                        color: "#cbd5e1",
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    backgroundColor: "#0b1220",
                    titleColor: "#f8fafc",
                    bodyColor: "#cbd5e1",
                    borderColor: "#334155",
                    borderWidth: 1,
                    padding: 12
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: "#94a3b8"
                    },
                    border: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: "rgba(148, 163, 184, 0.12)"
                    },
                    ticks: {
                        color: "#94a3b8"
                    },
                    border: {
                        display: false
                    }
                }
            }
        };
    }

    // ==========================================
    // MONTHLY SALES & REVENUE CHART
    // ==========================================

    function renderMonthlySalesChart(monthlySales) {

        const canvas = document.getElementById("monthlySalesChart");

        if (!canvas || typeof Chart === "undefined") {
            return;
        }

        const salesMap = new Map(
            monthlySales.map(item => [item._id, item])
        );

        const labels = [];
        const revenueData = [];
        const ordersData = [];

        // Last 6 months including current month
        for (let i = 5; i >= 0; i--) {

            const date = new Date();
            date.setDate(1);
            date.setMonth(date.getMonth() - i);

            const key = getMonthKey(date);
            const monthData = salesMap.get(key);

            labels.push(getMonthLabel(date));
            revenueData.push(Number(monthData?.revenue || 0));
            ordersData.push(Number(monthData?.orders || 0));
        }

        if (monthlySalesChart) {
            monthlySalesChart.destroy();
        }

        monthlySalesChart = new Chart(canvas, {
            type: "bar",

            data: {
                labels,

                datasets: [
                    {
                        label: "Revenue (₹)",
                        data: revenueData,
                        backgroundColor: "rgba(99, 102, 241, 0.75)",
                        borderColor: "#818cf8",
                        borderWidth: 1,
                        borderRadius: 7,
                        yAxisID: "y"
                    },
                    {
                        label: "Orders",
                        data: ordersData,
                        type: "line",
                        borderColor: "#34d399",
                        backgroundColor: "#34d399",
                        pointBackgroundColor: "#34d399",
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        tension: 0.35,
                        yAxisID: "y1"
                    }
                ]
            },

            options: {
                ...getCommonChartOptions(),

                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: "#94a3b8" }
                    },

                    y: {
                        beginAtZero: true,
                        position: "left",
                        grid: {
                            color: "rgba(148, 163, 184, 0.12)"
                        },
                        ticks: {
                            color: "#94a3b8",
                            callback: value => "₹" +
                                Number(value).toLocaleString("en-IN")
                        }
                    },

                    y1: {
                        beginAtZero: true,
                        position: "right",
                        grid: {
                            drawOnChartArea: false
                        },
                        ticks: {
                            color: "#34d399",
                            precision: 0
                        }
                    }
                }
            }
        });
    }

    // ==========================================
    // DAILY SALES TREND CHART
    // ==========================================

    function renderDailySalesChart(dailySales) {

        const canvas = document.getElementById("dailySalesChart");

        if (!canvas || typeof Chart === "undefined") {
            return;
        }

        const salesMap = new Map(
            dailySales.map(item => [item._id, item])
        );

        const labels = [];
        const revenueData = [];

        // Last 7 days including today
        for (let i = 6; i >= 0; i--) {

            const date = new Date();
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() - i);

            const key = getDateKey(date);
            const dayData = salesMap.get(key);

            labels.push(getDayLabel(date));
            revenueData.push(Number(dayData?.revenue || 0));
        }

        if (dailySalesChart) {
            dailySalesChart.destroy();
        }

        dailySalesChart = new Chart(canvas, {
            type: "line",

            data: {
                labels,

                datasets: [
                    {
                        label: "Daily Revenue",
                        data: revenueData,
                        borderColor: "#38bdf8",
                        backgroundColor: "rgba(56, 189, 248, 0.13)",
                        pointBackgroundColor: "#38bdf8",
                        pointBorderColor: "#0f172a",
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 7,
                        fill: true,
                        tension: 0.4
                    }
                ]
            },

            options: {
                ...getCommonChartOptions(),

                plugins: {
                    ...getCommonChartOptions().plugins,

                    tooltip: {
                        ...getCommonChartOptions().plugins.tooltip,
                        callbacks: {
                            label: context =>
                                "Revenue: " + formatCurrency(context.raw)
                        }
                    }
                },

                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: "#94a3b8" }
                    },

                    y: {
                        beginAtZero: true,
                        grid: {
                            color: "rgba(148, 163, 184, 0.12)"
                        },
                        ticks: {
                            color: "#94a3b8",
                            callback: value => "₹" +
                                Number(value).toLocaleString("en-IN")
                        }
                    }
                }
            }
        });
    }

    // ==========================================
    // INVENTORY DOUGHNUT CHART
    // ==========================================

    function renderInventoryChart(inventory) {

        const canvas = document.getElementById("inventoryChart");
        const legend = document.getElementById("inventoryChartLegend");

        if (!canvas || typeof Chart === "undefined") {
            return;
        }

        const values = [
            Number(inventory.inStock || 0),
            Number(inventory.lowStock || 0),
            Number(inventory.outOfStock || 0)
        ];

        const labels = [
            "In Stock",
            "Low Stock",
            "Out of Stock"
        ];

        const colors = [
            "#34d399",
            "#fbbf24",
            "#fb7185"
        ];

        if (inventoryChart) {
            inventoryChart.destroy();
        }

        inventoryChart = new Chart(canvas, {
            type: "doughnut",

            data: {
                labels,

                datasets: [
                    {
                        data: values,
                        backgroundColor: colors,
                        borderColor: "#111c30",
                        borderWidth: 4,
                        hoverOffset: 8
                    }
                ]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "70%",

                plugins: {
                    legend: {
                        display: false
                    },

                    tooltip: {
                        backgroundColor: "#0b1220",
                        titleColor: "#f8fafc",
                        bodyColor: "#cbd5e1",
                        borderColor: "#334155",
                        borderWidth: 1,
                        padding: 12,

                        callbacks: {
                            label: context =>
                                `${context.label}: ${context.raw} products`
                        }
                    }
                }
            }
        });

        // Custom legend
        if (legend) {

            legend.textContent = "";

            labels.forEach((label, index) => {

                const item = document.createElement("div");
                item.className = "inventory-legend-item";

                const dot = document.createElement("span");
                dot.className = "inventory-legend-dot";
                dot.style.backgroundColor = colors[index];

                const name = document.createElement("span");
                name.textContent = label;

                const value = document.createElement("strong");
                value.className = "inventory-legend-value";
                value.textContent = values[index];

                item.append(dot, name, value);
                legend.appendChild(item);
            });
        }
    }

    // ==========================================
    // RENDER ALL DASHBOARD CHARTS
    // ==========================================

    function renderDashboardCharts(charts) {

        if (typeof Chart === "undefined") {
            console.error("Chart.js is not loaded.");
            return;
        }

        renderMonthlySalesChart(charts.monthlySales || []);
        renderDailySalesChart(charts.dailySales || []);

        renderInventoryChart(
            charts.inventoryOverview || {
                inStock: 0,
                lowStock: 0,
                outOfStock: 0
            }
        );
    }

    // ==========================================
    // LOAD DASHBOARD DATA
    // ==========================================

    try {

        const result = await apiRequest(
            "/dashboard/stats",
            "GET",
            null,
            token
        );

        // Backend response: { success, dashboard: {...} }
        const stats =
            result.dashboard ||
            result.data?.dashboard ||
            result.data ||
            result.stats ||
            result;

        const user = JSON.parse(
            localStorage.getItem("stockwise_user") || "{}"
        );

        document.getElementById("welcomeUser").textContent =
            `Welcome, ${user.name || "User"}`;

        document.getElementById("totalProducts").textContent =
            stats.totalProducts ?? 0;

        document.getElementById("totalStock").textContent =
            stats.totalStock ?? 0;

        document.getElementById("totalSales").textContent =
            stats.totalSales ?? 0;

        document.getElementById("totalRevenue").textContent =
            formatCurrency(stats.totalRevenue);

        // LOW STOCK ALERTS
        const lowStockList = document.getElementById("lowStockList");

        lowStockList.textContent = "";

        const lowStockItems =
            stats.lowStockProducts || stats.lowStock || [];

        if (lowStockItems.length === 0) {

            lowStockList.textContent = "No low-stock alerts.";

        } else {

            lowStockItems.forEach(product => {

                const item = document.createElement("p");

                item.textContent =
                    `${product.name || "Product"} — Stock: ${product.quantity ?? product.stock ?? 0}`;

                lowStockList.appendChild(item);
            });
        }

        // RECENT SALES
        const recentSalesList =
            document.getElementById("recentSalesList");

        recentSalesList.textContent = "";

        const recentSales = stats.recentSales || [];

        if (recentSales.length === 0) {

            recentSalesList.textContent = "No recent sales.";

        } else {

            recentSales.forEach(sale => {

                const item = document.createElement("p");

                item.textContent =
                    `Sale: ${formatCurrency(sale.totalAmount ?? sale.total)}`;

                recentSalesList.appendChild(item);
            });
        }

        // DASHBOARD CHARTS
        renderDashboardCharts(stats.charts || {});

        dashboardApp.hidden = false;
        loadingScreen.hidden = true;

    } catch (error) {

        console.error("Dashboard Error:", error);

        localStorage.removeItem("stockwise_token");
        localStorage.removeItem("stockwise_user");
        localStorage.removeItem("stockwise_shop");

        window.location.replace("login.html");
        return;
    }

    // ==========================================
    // PROFILE ELEMENTS
    // ==========================================

    const profileButton = document.getElementById("profileButton");
    const profileModal = document.getElementById("profileModal");
    const profileOverlay = document.getElementById("profileOverlay");

    const closeProfileButton =
        document.getElementById("closeProfileButton");

    const profileDoneButton =
        document.getElementById("profileDoneButton");

    const editProfileButton =
        document.getElementById("editProfileButton");

    const editProfileForm =
        document.getElementById("editProfileForm");

    const profileDetails =
        document.getElementById("profileDetails");

    const profileViewFooter =
        document.getElementById("profileViewFooter");

    const cancelEditButton =
        document.getElementById("cancelEditButton");

    const saveProfileButton =
        document.getElementById("saveProfileButton");

    const profileMessage =
        document.getElementById("profileMessage");

    let currentProfile = null;

    // ==========================================
    // OPEN AND CLOSE PROFILE
    // ==========================================

    function openProfileModal() {
        profileModal.hidden = false;
        showViewMode();
        loadProfile();
    }

    function closeProfileModal() {
        profileModal.hidden = true;
        showViewMode();
    }

    profileButton.addEventListener("click", openProfileModal);
    closeProfileButton.addEventListener("click", closeProfileModal);
    profileDoneButton.addEventListener("click", closeProfileModal);
    profileOverlay.addEventListener("click", closeProfileModal);

    document.addEventListener("keydown", function (event) {

        if (event.key === "Escape" && !profileModal.hidden) {
            closeProfileModal();
        }

    });

    // ==========================================
    // PROFILE VIEW MODE
    // ==========================================

    function showViewMode() {
        profileDetails.hidden = false;
        editProfileForm.hidden = true;
        profileViewFooter.hidden = false;
    }

    // ==========================================
    // PROFILE EDIT MODE
    // ==========================================

    function showEditMode() {

        if (!currentProfile) {
            return;
        }

        const shop = currentProfile.shop || {};

        document.getElementById("editProfileName").value =
            currentProfile.name || "";

        document.getElementById("editProfileEmail").value =
            currentProfile.email || "";

        document.getElementById("editShopName").value =
            shop.shopName || "";

        document.getElementById("editBusinessType").value =
            shop.businessType || "General Store";

        profileDetails.hidden = true;
        editProfileForm.hidden = false;
        profileViewFooter.hidden = true;

        profileMessage.textContent = "";
    }

    editProfileButton.addEventListener("click", showEditMode);

    cancelEditButton.addEventListener("click", function () {
        showViewMode();
        profileMessage.textContent = "";
    });

    // ==========================================
    // LOAD PROFILE FROM BACKEND
    // ==========================================

    async function loadProfile() {

        profileMessage.textContent = "Loading your profile...";

        try {

            const result = await apiRequest(
                "/auth/profile",
                "GET",
                null,
                token
            );

            const profile =
                result.profile || result.data?.profile;

            if (!profile) {
                throw new Error("Profile information not received.");
            }

            currentProfile = profile;

            const shop = profile.shop || {};

            // PROFILE SUMMARY
            document.getElementById("profileUserName").textContent =
                profile.name || "User";

            document.getElementById("profileDisplayName").textContent =
                profile.name || "User";

            document.getElementById("profileDisplayEmail").textContent =
                profile.email || "Not available";

            // PERSONAL INFORMATION
            document.getElementById("profileNameValue").textContent =
                profile.name || "Not available";

            document.getElementById("profileEmailValue").textContent =
                profile.email || "Not available";

            document.getElementById("profileRole").textContent =
                profile.role || "User";

            const joiningDate = profile.dateOfJoining
                ? new Date(profile.dateOfJoining)
                : null;

            document.getElementById("profileJoiningDate").textContent =
                joiningDate && !Number.isNaN(joiningDate.getTime())
                    ? joiningDate.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                    })
                    : "Not available";

            document.getElementById("profileAccountStatus").textContent =
                profile.accountStatus || "Unknown";

            // BUSINESS INFORMATION
            document.getElementById("profileShopName").textContent =
                shop.shopName || "Not available";

            document.getElementById("profileBusinessType").textContent =
                shop.businessType || "Not available";

            // AVATAR INITIALS
            const initials = (profile.name || "U")
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map(part => part.charAt(0).toUpperCase())
                .join("");

            document.querySelectorAll(
                ".profile-avatar, .profile-large-avatar"
            ).forEach(avatar => {
                avatar.textContent = initials || "U";
            });

            profileMessage.textContent =
                "Profile loaded successfully.";

        } catch (error) {

            console.error("Profile Error:", error);

            profileMessage.textContent =
                error.message ||
                "Unable to load profile. Please try again.";
        }
    }

    // ==========================================
    // SAVE PROFILE
    // ==========================================

    editProfileForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const name =
            document.getElementById("editProfileName").value.trim();

        const shopName =
            document.getElementById("editShopName").value.trim();

        const businessType =
            document.getElementById("editBusinessType").value;

        if (!name || !shopName || !businessType) {

            profileMessage.textContent =
                "Please fill in all required fields.";

            return;
        }

        saveProfileButton.disabled = true;
        saveProfileButton.textContent = "Saving...";

        profileMessage.textContent = "Updating your profile...";

        try {

            const result = await apiRequest(
                "/auth/profile",
                "PUT",
                {
                    name,
                    shopName,
                    businessType
                },
                token
            );

            if (result.success === false) {
                throw new Error(
                    result.message || "Profile update failed."
                );
            }

            // REFRESH PROFILE FROM DATABASE
            await loadProfile();

            showViewMode();

            // UPDATE LOCAL USER DATA
            const savedUser = JSON.parse(
                localStorage.getItem("stockwise_user") || "{}"
            );

            savedUser.name = name;

            localStorage.setItem(
                "stockwise_user",
                JSON.stringify(savedUser)
            );

            document.getElementById("welcomeUser").textContent =
                `Welcome, ${name}`;

            profileMessage.textContent =
                "Profile updated successfully!";

        } catch (error) {

            console.error("Update Profile Error:", error);

            profileMessage.textContent =
                error.message ||
                "Unable to update profile. Please try again.";

        } finally {

            saveProfileButton.disabled = false;
            saveProfileButton.textContent = "Save Changes";
        }

    });

});
