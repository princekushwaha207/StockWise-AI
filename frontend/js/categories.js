
document.addEventListener("DOMContentLoaded", async function () {
    const token = getToken();

    const dashboardApp = document.getElementById("dashboardApp");
    const loadingScreen = document.getElementById("loadingScreen");

    const categoryForm = document.getElementById("categoryForm");
    const categoryMessage = document.getElementById("categoryMessage");
    const categoriesTableBody = document.getElementById("categoriesTableBody");
    const addCategoryButton = document.getElementById("addCategoryButton");

    document.getElementById("logoutButton").addEventListener("click", logout);

    if (!token) {
        window.location.replace("login.html");
        return;
    }

    // LOAD CATEGORIES
    try {
        const result = await apiRequest(
            "/categories",
            "GET",
            null,
            token
        );

        const user = JSON.parse(
            localStorage.getItem("stockwise_user") || "{}"
        );

        document.getElementById("welcomeUser").textContent =
            `Welcome, ${user.name || "User"}`;

        displayCategories(result.categories || []);

        dashboardApp.hidden = false;
        loadingScreen.hidden = true;

    } catch (error) {
        console.error("Category loading error:", error);

        categoryMessage.textContent = error.message;
        categoryMessage.style.color = "#f87171";

        if (error.message.toLowerCase().includes("token")) {
            localStorage.removeItem("stockwise_token");
            localStorage.removeItem("stockwise_user");
            localStorage.removeItem("stockwise_shop");

            window.location.replace("login.html");
        }
    }

    // ADD CATEGORY
    categoryForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const name = document.getElementById("categoryName").value.trim();
        const description = document.getElementById("categoryDescription").value.trim();

        if (!name) {
            categoryMessage.textContent = "Please enter a category name.";
            categoryMessage.style.color = "#f87171";
            return;
        }

        try {
            addCategoryButton.disabled = true;
            addCategoryButton.textContent = "Adding...";
            categoryMessage.textContent = "";

            await apiRequest(
                "/categories",
                "POST",
                { name, description },
                token
            );

            categoryMessage.style.color = "#34d399";
            categoryMessage.textContent = "Category added successfully!";

            categoryForm.reset();

            await loadCategories();

        } catch (error) {
            categoryMessage.style.color = "#f87171";
            categoryMessage.textContent = error.message;

        } finally {
            addCategoryButton.disabled = false;
            addCategoryButton.textContent = "+ Add Category";
        }
    });

    // RELOAD CATEGORIES
    async function loadCategories() {
        const result = await apiRequest(
            "/categories",
            "GET",
            null,
            token
        );

        displayCategories(result.categories || []);
    }

    // DELETE CATEGORY
    categoriesTableBody.addEventListener("click", async function (event) {
        const deleteButton = event.target.closest(".category-delete-btn");

        if (!deleteButton) return;

        const categoryId = deleteButton.dataset.id;

        if (!confirm("Are you sure you want to delete this category?")) {
            return;
        }

        try {
            deleteButton.disabled = true;
            deleteButton.textContent = "Deleting...";

            await apiRequest(
                `/categories/${categoryId}`,
                "DELETE",
                null,
                token
            );

            categoryMessage.style.color = "#34d399";
            categoryMessage.textContent = "Category deleted successfully!";

            await loadCategories();

        } catch (error) {
            categoryMessage.style.color = "#f87171";
            categoryMessage.textContent = error.message;

            deleteButton.disabled = false;
            deleteButton.textContent = "✕ Delete";
        }
    });
});


// DISPLAY CATEGORIES
function displayCategories(categories) {
    const tableBody = document.getElementById("categoriesTableBody");

    tableBody.textContent = "";

    if (categories.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 3;
        cell.className = "category-empty-state";
        cell.textContent = "No categories found. Add your first category.";

        row.appendChild(cell);
        tableBody.appendChild(row);

        return;
    }

    categories.forEach(category => {
        const row = document.createElement("tr");

        const nameCell = document.createElement("td");
        nameCell.className = "category-name-cell";
        nameCell.textContent = category.name;

        const descriptionCell = document.createElement("td");
        descriptionCell.className = "category-description-cell";
        descriptionCell.textContent = category.description || "No description provided";

        const actionCell = document.createElement("td");
        actionCell.className = "category-action-cell";

        const deleteButton = document.createElement("button");

        deleteButton.type = "button";
        deleteButton.className = "category-delete-btn";
        deleteButton.textContent = "✕ Delete";
        deleteButton.dataset.id = category._id;
        deleteButton.setAttribute("aria-label", `Delete ${category.name}`);

        actionCell.appendChild(deleteButton);

        row.append(nameCell, descriptionCell, actionCell);
        tableBody.appendChild(row);
    });
}
