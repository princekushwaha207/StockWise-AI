
document.addEventListener("DOMContentLoaded", async () => {
    const token = getToken();

    if (!token) {
        window.location.replace("login.html");
        return;
    }

    const form = document.getElementById("stockForm");
    const productSelect = document.getElementById("stockProduct");
    const typeSelect = document.getElementById("stockType");
    const quantityInput = document.getElementById("stockQuantity");
    const noteInput = document.getElementById("stockNote");
    const message = document.getElementById("stockMessage");
    const tableBody = document.getElementById("stockTableBody");
    const submitButton = document.getElementById("updateStockButton");

    const totalStockUnits = document.getElementById("totalStockUnits");
    const totalStockIn = document.getElementById("totalStockIn");
    const totalStockOut = document.getElementById("totalStockOut");

    document.getElementById("logoutButton").addEventListener("click", logout);

    const user = JSON.parse(localStorage.getItem("stockwise_user") || "{}");
    document.getElementById("welcomeUser").textContent =
        `Welcome, ${user.name || "User"}`;

    function updateStockSummary(products) {
        const totalUnits = products.reduce((total, product) => {
            return total + (Number(product.quantity) || 0);
        }, 0);

        totalStockUnits.textContent = totalUnits.toLocaleString();
    }

    function updateMovementSummary(history) {
        const stockIn = history.reduce((total, movement) => {
            return movement.type === "in"
                ? total + (Number(movement.quantity) || 0)
                : total;
        }, 0);

        const stockOut = history.reduce((total, movement) => {
            return movement.type === "out"
                ? total + (Number(movement.quantity) || 0)
                : total;
        }, 0);

        totalStockIn.textContent = stockIn.toLocaleString();
        totalStockOut.textContent = stockOut.toLocaleString();
    }

    async function loadProducts() {
        const result = await apiRequest("/products", "GET", null, token);
        const products = result.products || result.data?.products || [];

        productSelect.innerHTML = '<option value="">Select Product</option>';

        products.forEach((product) => {
            const option = document.createElement("option");
            option.value = product._id;
            option.textContent = `${product.name} (Stock: ${product.quantity})`;
            productSelect.appendChild(option);
        });

        updateStockSummary(products);

        return products;
    }

    async function loadStockHistory() {
        try {
            const result = await apiRequest(
                "/stock/history",
                "GET",
                null,
                token
            );

            const history = result.history || [];

            tableBody.innerHTML = "";

            updateMovementSummary(history);

            if (history.length === 0) {
                tableBody.innerHTML =
                    '<tr><td colspan="5">No stock movements found.</td></tr>';
                return history;
            }

            history.forEach((movement) => {
                const row = document.createElement("tr");

                const productName =
                    movement.productId?.name || "Unknown Product";

                const date = movement.createdAt
                    ? new Date(movement.createdAt).toLocaleString()
                    : "-";

                row.innerHTML = `
                    <td>${productName}</td>
                    <td>${movement.type === "in" ? "Stock In" : "Stock Out"}</td>
                    <td>${movement.quantity}</td>
                    <td>${movement.reason || "-"}</td>
                    <td>${date}</td>
                `;

                tableBody.appendChild(row);
            });

            return history;

        } catch (error) {
            totalStockIn.textContent = "—";
            totalStockOut.textContent = "—";

            tableBody.innerHTML =
                `<tr><td colspan="5">${error.message}</td></tr>`;

            return null;
        }
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const productId = productSelect.value;
        const type = typeSelect.value;
        const quantity = Number(quantityInput.value);
        const reason = noteInput.value.trim();

        if (!productId) {
            message.textContent = "Please select a product.";
            message.className = "message error";
            return;
        }

        submitButton.disabled = true;
        message.textContent = "Updating stock...";
        message.className = "message";

        try {
            const endpoint = type === "in" ? "/stock/in" : "/stock/out";

            const result = await apiRequest(
                endpoint,
                "POST",
                { productId, quantity, reason },
                token
            );

            message.textContent =
                result.message || "Stock updated successfully!";
            message.className = "message success";

            form.reset();

            await loadProducts();
            await loadStockHistory();

        } catch (error) {
            message.textContent = error.message;
            message.className = "message error";
        } finally {
            submitButton.disabled = false;
        }
    });

    try {
        await loadProducts();
        await loadStockHistory();

        document.getElementById("loadingScreen").hidden = true;
        document.getElementById("dashboardApp").hidden = false;

    } catch (error) {
        document.getElementById("loadingScreen").textContent =
            `Unable to load stock data: ${error.message}`;
    }
});
