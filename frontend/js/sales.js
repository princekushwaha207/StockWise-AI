
document.addEventListener("DOMContentLoaded", async () => {
    const token = getToken();

    if (!token) {
        window.location.replace("login.html");
        return;
    }

    const form = document.getElementById("saleForm");
    const productSelect = document.getElementById("saleProduct");
    const quantityInput = document.getElementById("saleQuantity");
    const customerInput = document.getElementById("customerName");
    const paymentSelect = document.getElementById("paymentMethod");
    const message = document.getElementById("saleMessage");
    const tableBody = document.getElementById("salesTableBody");
    const submitButton = document.getElementById("recordSaleButton");

    const modal = document.getElementById("saleDetailsModal");
    const modalContent = document.getElementById("saleDetailsContent");

    let salesCache = [];

    document.getElementById("logoutButton").addEventListener("click", logout);

    const user = JSON.parse(localStorage.getItem("stockwise_user") || "{}");

    document.getElementById("welcomeUser").textContent =
        `Welcome, ${user.name || "User"}`;

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);
    }

    function formatCurrency(amount) {
        return "₹" + Number(amount || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function formatDate(date) {
        if (!date) return "-";

        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) return "-";

        return parsedDate.toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short"
        });
    }

    // LOAD PRODUCTS
    async function loadProducts() {
        const result = await apiRequest("/products", "GET", null, token);

        const products = result.products || result.data?.products || [];

        productSelect.innerHTML =
            '<option value="">Select Product</option>';

        products.forEach(product => {
            const option = document.createElement("option");

            option.value = product._id;
            option.textContent =
                `${product.name} (Stock: ${product.quantity})`;

            productSelect.appendChild(option);
        });
    }

    // LOAD SALES HISTORY
    async function loadSales() {
        const result = await apiRequest("/sales", "GET", null, token);

        salesCache = result.sales || result.data?.sales || [];

        tableBody.innerHTML = "";

        if (salesCache.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="sales-empty-state">
                        No transactions recorded yet.
                    </td>
                </tr>
            `;
            return;
        }

        salesCache.forEach(sale => {
            const row = document.createElement("tr");

            const customer = sale.customerName || "Walk-in Customer";

            const itemCount = (sale.items || []).reduce(
                (total, item) => total + Number(item.quantity || 0),
                0
            );

            const payment = (sale.paymentMethod || "cash").toUpperCase();

            row.innerHTML = `
                <td>
                    <span class="sales-invoice">
                        ${escapeHTML(sale.invoiceNumber || "-")}
                    </span>
                </td>

                <td>
                    <span class="sales-customer">
                        ${escapeHTML(customer)}
                    </span>
                </td>

                <td>${escapeHTML(formatDate(sale.createdAt))}</td>

                <td>${itemCount} units</td>

                <td>
                    <strong>${escapeHTML(formatCurrency(sale.totalAmount))}</strong>
                </td>

                <td>
                    <span class="sales-payment-badge">
                        ${escapeHTML(payment)}
                    </span>
                </td>

                <td>
                    <button
                        type="button"
                        class="view-sale-btn"
                        data-sale-id="${escapeHTML(sale._id)}"
                    >
                        View Details ↗
                    </button>
                </td>
            `;

            tableBody.appendChild(row);
        });
    }

    // OPEN TRANSACTION DETAILS
    async function openSaleDetails(saleId) {
        const cachedSale = salesCache.find(
            sale => String(sale._id) === String(saleId)
        );

        if (!cachedSale) {
            alert("Transaction not found.");
            return;
        }

        modal.hidden = false;
        document.body.classList.add("modal-open");

        modalContent.innerHTML = `
            <div class="sale-details-loading">
                Loading transaction details...
            </div>
        `;

        try {
            const result = await apiRequest(
                `/sales/${encodeURIComponent(saleId)}`,
                "GET",
                null,
                token
            );

            const sale = result.sale || result.data?.sale || cachedSale;

            const items = sale.items || [];

            const customerName =
                sale.customerName || cachedSale.customerName || "Walk-in Customer";

            const productRows = items.map(item => {
                const productName =
                    item.productName ||
                    item.productId?.name ||
                    "Unknown Product";

                return `
                    <tr>
                        <td>
                            <strong>${escapeHTML(productName)}</strong>
                            <small>${escapeHTML(item.productId?.sku || "")}</small>
                        </td>

                        <td>${Number(item.quantity || 0)}</td>

                        <td>${escapeHTML(formatCurrency(item.sellingPrice))}</td>

                        <td>
                            <strong>${escapeHTML(formatCurrency(item.subtotal))}</strong>
                        </td>
                    </tr>
                `;
            }).join("");

            modalContent.innerHTML = `
                <div class="sale-detail-customer">
                    <div class="sale-customer-avatar">
                        ${escapeHTML(customerName.charAt(0).toUpperCase())}
                    </div>

                    <div>
                        <span>Customer</span>
                        <h3>${escapeHTML(customerName)}</h3>
                    </div>
                </div>

                <div class="sale-detail-info-grid">

                    <div class="sale-detail-info">
                        <span>Invoice Number</span>
                        <strong>${escapeHTML(sale.invoiceNumber || "-")}</strong>
                    </div>

                    <div class="sale-detail-info">
                        <span>Transaction Date</span>
                        <strong>${escapeHTML(formatDate(sale.createdAt))}</strong>
                    </div>

                    <div class="sale-detail-info">
                        <span>Payment Method</span>
                        <strong>${escapeHTML((sale.paymentMethod || "cash").toUpperCase())}</strong>
                    </div>

                    <div class="sale-detail-info">
                        <span>Total Items</span>
                        <strong>${items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} units</strong>
                    </div>

                </div>

                <div class="sale-products-heading">
                    <h3>Purchased Products</h3>
                    <span>${items.length} product(s)</span>
                </div>

                <div class="sale-detail-table-wrapper">
                    <table class="sale-detail-table">
                        <thead>
                            <tr>
                                <th>PRODUCT</th>
                                <th>QTY</th>
                                <th>UNIT PRICE</th>
                                <th>SUBTOTAL</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${productRows || `
                                <tr>
                                    <td colspan="4">No products found.</td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>

                <div class="sale-grand-total">
                    <span>Total Transaction Amount</span>
                    <strong>${escapeHTML(formatCurrency(sale.totalAmount))}</strong>
                </div>
            `;

        } catch (error) {
            modalContent.innerHTML = `
                <p class="message error">
                    Unable to load transaction details: ${escapeHTML(error.message)}
                </p>
            `;
        }
    }

    // VIEW DETAILS BUTTON
    tableBody.addEventListener("click", event => {
        const button = event.target.closest(".view-sale-btn");

        if (!button) return;

        openSaleDetails(button.dataset.saleId);
    });

    // CLOSE MODAL
    function closeModal() {
        modal.hidden = true;
        document.body.classList.remove("modal-open");
    }

    document.getElementById("closeSaleDetails")
        .addEventListener("click", closeModal);

    document.getElementById("closeSaleDetailsBottom")
        .addEventListener("click", closeModal);

    document.getElementById("saleModalBackdrop")
        .addEventListener("click", closeModal);

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !modal.hidden) {
            closeModal();
        }
    });

    // RECORD NEW SALE
    form.addEventListener("submit", async event => {
        event.preventDefault();

        const productId = productSelect.value;
        const quantity = Number(quantityInput.value);
        const customerName = customerInput.value.trim();

        // CUSTOMER NAME REQUIRED
        if (!customerName) {
            message.textContent = "Please enter customer name.";
            message.className = "message error";
            customerInput.focus();
            return;
        }

        if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
            message.textContent =
                "Select a product and enter a valid quantity.";

            message.className = "message error";
            return;
        }

        submitButton.disabled = true;
        message.textContent = "Recording sale...";
        message.className = "message";

        try {
            const result = await apiRequest(
                "/sales",
                "POST",
                {
                    customerName: customerName,
                    items: [{ productId, quantity }],
                    paymentMethod: paymentSelect.value
                },
                token
            );

            message.textContent =
                result.message || "Sale recorded successfully!";

            message.className = "message success";

            form.reset();

            await loadProducts();
            await loadSales();

        } catch (error) {
            message.textContent = error.message;
            message.className = "message error";

        } finally {
            submitButton.disabled = false;
        }
    });

    // INITIAL PAGE LOAD
    try {
        await loadProducts();
        await loadSales();

        document.getElementById("loadingScreen").hidden = true;
        document.getElementById("dashboardApp").hidden = false;

    } catch (error) {
        document.getElementById("loadingScreen").textContent =
            `Unable to load sales: ${error.message}`;
    }
});
