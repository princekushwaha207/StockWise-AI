
document.addEventListener("DOMContentLoaded", async () => {
    const token = getToken();

    const dashboardApp = document.getElementById("dashboardApp");
    const loadingScreen = document.getElementById("loadingScreen");

    const form = document.getElementById("supplierForm");
    const message = document.getElementById("supplierMessage");
    const tableBody = document.getElementById("suppliersTableBody");
    const submitButton = document.getElementById("addSupplierButton");

    document.getElementById("logoutButton").addEventListener("click", logout);

    if (!token) {
        window.location.replace("login.html");
        return;
    }

    const user = JSON.parse(
        localStorage.getItem("stockwise_user") || "{}"
    );

    document.getElementById("welcomeUser").textContent =
        `Welcome, ${user.name || "User"}`;

    // ==========================================
    // LOAD SUPPLIERS
    // ==========================================

    async function loadSuppliers() {
        try {
            tableBody.textContent = "";

            const loadingRow = document.createElement("tr");
            const loadingCell = document.createElement("td");

            loadingCell.colSpan = 6;
            loadingCell.textContent = "Loading suppliers...";
            loadingCell.className = "supplier-empty-state";

            loadingRow.appendChild(loadingCell);
            tableBody.appendChild(loadingRow);

            const result = await apiRequest(
                "/suppliers",
                "GET",
                null,
                token
            );

            const suppliers =
                result.suppliers ||
                result.data?.suppliers ||
                [];

            displaySuppliers(suppliers);

        } catch (error) {
            console.error("Supplier loading error:", error);

            tableBody.textContent = "";

            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 6;
            cell.textContent = error.message;
            cell.className = "supplier-empty-state supplier-error-state";

            row.appendChild(cell);
            tableBody.appendChild(row);
        }
    }

    // ==========================================
    // DISPLAY SUPPLIERS
    // ==========================================

    function displaySuppliers(suppliers) {
        tableBody.textContent = "";

        if (suppliers.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 6;
            cell.className = "supplier-empty-state";
            cell.textContent =
                "No suppliers found. Add your first supplier.";

            row.appendChild(cell);
            tableBody.appendChild(row);

            return;
        }

        suppliers.forEach(supplier => {
            const row = document.createElement("tr");

            const nameCell = document.createElement("td");
            nameCell.className = "supplier-name-cell";
            nameCell.textContent = supplier.name || "-";

            const companyCell = document.createElement("td");
            companyCell.textContent = supplier.companyName || "-";

            const phoneCell = document.createElement("td");
            phoneCell.textContent = supplier.phone || "-";

            const emailCell = document.createElement("td");
            emailCell.textContent = supplier.email || "-";

            const cityCell = document.createElement("td");
            cityCell.textContent = supplier.address?.city || "-";

            const actionCell = document.createElement("td");
            actionCell.className = "supplier-action-cell";

            const deleteButton = document.createElement("button");

            deleteButton.type = "button";
            deleteButton.className = "supplier-delete-btn";
            deleteButton.textContent = "✕ Delete";
            deleteButton.dataset.id = supplier._id;

            deleteButton.setAttribute(
                "aria-label",
                `Delete supplier ${supplier.name || ""}`
            );

            actionCell.appendChild(deleteButton);

            row.append(
                nameCell,
                companyCell,
                phoneCell,
                emailCell,
                cityCell,
                actionCell
            );

            tableBody.appendChild(row);
        });
    }

    // ==========================================
    // ADD SUPPLIER
    // ==========================================

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const supplierData = {
            name: document.getElementById("supplierName").value.trim(),
            companyName: document.getElementById("companyName").value.trim(),
            email: document.getElementById("supplierEmail").value.trim(),
            phone: document.getElementById("supplierPhone").value.trim(),

            address: {
                street: document.getElementById("street").value.trim(),
                city: document.getElementById("city").value.trim(),
                state: document.getElementById("state").value.trim(),
                pincode: document.getElementById("pincode").value.trim(),
                country: document.getElementById("country").value.trim()
            },

            gstNumber: document.getElementById("gstNumber").value.trim()
        };

        if (!supplierData.name || !supplierData.phone) {
            message.textContent =
                "Supplier name and phone number are required.";

            message.className = "message error";
            return;
        }

        try {
            submitButton.disabled = true;
            submitButton.textContent = "Adding Supplier...";

            message.textContent = "";
            message.className = "message supplier-message";

            const result = await apiRequest(
                "/suppliers",
                "POST",
                supplierData,
                token
            );

            message.textContent =
                result.message || "Supplier added successfully!";

            message.className = "message success";

            form.reset();

            document.getElementById("country").value = "India";

            await loadSuppliers();

        } catch (error) {
            message.textContent = error.message;
            message.className = "message error";

        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = "<span>+</span> Add Supplier";
        }
    });

    // ==========================================
    // DELETE SUPPLIER
    // ==========================================

    tableBody.addEventListener("click", async (event) => {
        const button = event.target.closest(".supplier-delete-btn");

        if (!button) return;

        const supplierId = button.dataset.id;

        if (!confirm("Are you sure you want to delete this supplier?")) {
            return;
        }

        try {
            button.disabled = true;
            button.textContent = "Deleting...";

            await apiRequest(
                `/suppliers/${supplierId}`,
                "DELETE",
                null,
                token
            );

            message.textContent = "Supplier deleted successfully!";
            message.className = "message success";

            await loadSuppliers();

        } catch (error) {
            message.textContent = error.message;
            message.className = "message error";

            button.disabled = false;
            button.textContent = "✕ Delete";
        }
    });

    // INITIAL LOAD
    await loadSuppliers();

    loadingScreen.hidden = true;
    dashboardApp.hidden = false;
});
