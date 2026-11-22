
// Store all products loaded from database
let allProducts = [];

document.addEventListener("DOMContentLoaded", async function () {

    const dashboardApp = document.getElementById("dashboardApp");
    const loadingScreen = document.getElementById("loadingScreen");
    const token = getToken();

    const productForm = document.getElementById("productForm");
    const productMessage = document.getElementById("productMessage");
    const productsTableBody = document.getElementById("productsTableBody");

    const categorySelect = document.getElementById("productCategory");
    const supplierSelect = document.getElementById("productSupplier");
    const addButton = document.getElementById("addProductButton");

    const productSearch = document.getElementById("productSearch");
    const categoryFilter = document.getElementById("productCategoryFilter");

    document.getElementById("logoutButton").addEventListener("click", logout);

    if (!token) {
        window.location.replace("login.html");
        return;
    }

    try {

        const [categoryResult, productResult, supplierResult] =
            await Promise.all([
                apiRequest("/categories", "GET", null, token),
                apiRequest("/products", "GET", null, token),
                apiRequest("/suppliers", "GET", null, token)
            ]);

        const user = JSON.parse(
            localStorage.getItem("stockwise_user") || "{}"
        );

        document.getElementById("welcomeUser").textContent =
            `Welcome, ${user.name || "User"}`;

        // LOAD CATEGORIES
        const categories = categoryResult.categories || [];

        categories.forEach(category => {

            // Add category to product form
            const option = document.createElement("option");
            option.value = category._id;
            option.textContent = category.name;
            categorySelect.appendChild(option);

            // Add category to filter
            const filterOption = document.createElement("option");
            filterOption.value = category._id;
            filterOption.textContent = category.name;
            categoryFilter.appendChild(filterOption);

        });

        // LOAD SUPPLIERS
        const suppliers = supplierResult.suppliers || [];

        suppliers.forEach(supplier => {

            const option = document.createElement("option");
            option.value = supplier._id;

            option.textContent = supplier.companyName
                ? `${supplier.name} - ${supplier.companyName}`
                : supplier.name;

            supplierSelect.appendChild(option);

        });

        // DISPLAY PRODUCTS
        displayProducts(productResult.products || []);

        dashboardApp.hidden = false;
        loadingScreen.hidden = true;

    } catch (error) {

        console.error("Products page error:", error);

        loadingScreen.textContent =
            "Unable to load products. Please refresh the page.";

        if (error.status === 401 || error.status === 403) {

            localStorage.removeItem("stockwise_token");
            localStorage.removeItem("stockwise_user");
            localStorage.removeItem("stockwise_shop");

            window.location.replace("login.html");
        }
    }

    // =========================================
    // PRODUCT SEARCH
    // =========================================

    productSearch.addEventListener("input", function () {
        displayProducts(allProducts);
    });

    // =========================================
    // CATEGORY FILTER
    // =========================================

    categoryFilter.addEventListener("change", function () {
        displayProducts(allProducts);
    });

    // =========================================
    // ADD NEW PRODUCT
    // =========================================

    productForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const expiryDateValue =
            document.getElementById("expiryDate").value;

        const productData = {

            name: document.getElementById("productName").value.trim(),

            sku: document.getElementById("productSKU").value.trim(),

            categoryId: categorySelect.value,

            supplierId: supplierSelect.value || null,

            purchasePrice: Number(
                document.getElementById("purchasePrice").value
            ),

            sellingPrice: Number(
                document.getElementById("sellingPrice").value
            ),

            quantity: Number(
                document.getElementById("quantity").value
            ),

            minStockLevel: Number(
                document.getElementById("lowStockThreshold").value
            ),

            reorderLeadTime: Number(
                document.getElementById("reorderLeadTime").value
            ),

            expiryDate: expiryDateValue || null
        };

        if (!productData.categoryId) {

            productMessage.textContent =
                "Please select a category.";

            return;
        }

        if (
            !Number.isFinite(productData.purchasePrice) ||
            !Number.isFinite(productData.sellingPrice) ||
            !Number.isInteger(productData.quantity) ||
            !Number.isInteger(productData.minStockLevel) ||
            !Number.isInteger(productData.reorderLeadTime) ||
            productData.purchasePrice < 0 ||
            productData.sellingPrice < 0 ||
            productData.quantity < 0 ||
            productData.minStockLevel < 0 ||
            productData.reorderLeadTime < 0
        ) {

            productMessage.style.color = "#dc2626";

            productMessage.textContent =
                "Please enter valid non-negative values. Quantities and days must be whole numbers.";

            return;
        }

        try {

            addButton.disabled = true;
            addButton.textContent = "Adding...";

            productMessage.textContent = "";

            await apiRequest(
                "/products",
                "POST",
                productData,
                token
            );

            productMessage.style.color = "#34d399";

            productMessage.textContent =
                "Product added successfully!";

            productForm.reset();

            document.getElementById("lowStockThreshold").value = 5;
            document.getElementById("reorderLeadTime").value = 3;

            // REFRESH PRODUCTS
            const result = await apiRequest(
                "/products",
                "GET",
                null,
                token
            );

            displayProducts(result.products || []);

        } catch (error) {

            productMessage.style.color = "#fb7185";
            productMessage.textContent = error.message;

        } finally {

            addButton.disabled = false;
            addButton.textContent = "+ Add Product";
        }
    });

    // =========================================
    // DELETE PRODUCT
    // =========================================

    productsTableBody.addEventListener("click", async function (event) {

        const deleteButton = event.target.closest(".table-action-btn");

        if (!deleteButton) return;

        const productId = deleteButton.dataset.id;

        if (!confirm("Are you sure you want to delete this product?")) {
            return;
        }

        try {

            await apiRequest(
                `/products/${productId}`,
                "DELETE",
                null,
                token
            );

            productMessage.style.color = "#34d399";

            productMessage.textContent =
                "Product deleted successfully!";

            // REFRESH PRODUCTS
            const result = await apiRequest(
                "/products",
                "GET",
                null,
                token
            );

            displayProducts(result.products || []);

        } catch (error) {

            productMessage.style.color = "#fb7185";
            productMessage.textContent = error.message;
        }
    });

});


// =========================================
// FORMAT EXPIRY DATE
// =========================================

function formatExpiryDate(expiryDate) {

    if (!expiryDate) {
        return "Not Set";
    }

    const dateOnly = String(expiryDate).slice(0, 10);
    const date = new Date(`${dateOnly}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return "Invalid Date";
    }

    return date.toLocaleDateString("en-IN");
}


// =========================================
// DISPLAY AND FILTER PRODUCTS
// =========================================

function displayProducts(products) {

    const tableBody =
        document.getElementById("productsTableBody");

    const searchInput =
        document.getElementById("productSearch");

    const categoryFilter =
        document.getElementById("productCategoryFilter");

    // Update original product list
    allProducts = products;

    const searchText =
        searchInput.value.trim().toLowerCase();

    const selectedCategory =
        categoryFilter.value;

    // FILTER PRODUCTS
    const filteredProducts = allProducts.filter(product => {

        const productName =
            (product.name || "").toLowerCase();

        const productSKU =
            (product.sku || "").toLowerCase();

        const matchesSearch =
            productName.includes(searchText) ||
            productSKU.includes(searchText);

        const productCategoryId =
            product.categoryId?._id ||
            product.categoryId ||
            "";

        const matchesCategory =
            !selectedCategory ||
            String(productCategoryId) === selectedCategory;

        return matchesSearch && matchesCategory;

    });

    tableBody.textContent = "";

    // NO PRODUCTS FOUND
    if (filteredProducts.length === 0) {

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 8;

        cell.textContent = allProducts.length === 0
            ? "No products found. Add your first product."
            : "No matching products found.";

        row.appendChild(cell);
        tableBody.appendChild(row);

        return;
    }

    // DISPLAY FILTERED PRODUCTS
    filteredProducts.forEach(product => {

        const row = document.createElement("tr");

        const categoryName =
            product.categoryId?.name || "Uncategorized";

        const supplierName =
            product.supplierId?.name || "Not Assigned";

        const values = [

            product.name,

            categoryName,

            supplierName,

            `₹${Number(product.purchasePrice || 0).toLocaleString("en-IN")}`,

            `₹${Number(product.sellingPrice || 0).toLocaleString("en-IN")}`,

            product.quantity ?? 0,

            formatExpiryDate(product.expiryDate)

        ];

        values.forEach(value => {

            const cell = document.createElement("td");

            cell.textContent = value;

            row.appendChild(cell);

        });

        // DELETE BUTTON
        const actionCell = document.createElement("td");

        const deleteButton = document.createElement("button");

        deleteButton.type = "button";
        deleteButton.className = "table-action-btn";
        deleteButton.textContent = "Delete";
        deleteButton.dataset.id = product._id;

        actionCell.appendChild(deleteButton);

        row.appendChild(actionCell);

        tableBody.appendChild(row);

    });

}
