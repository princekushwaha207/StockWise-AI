
const API_BASE_URL = "https://stockwise-ai-backend-4uk1.onrender.com/api/v1";

// ==========================================
// COMMON API REQUEST FUNCTION
// ==========================================

async function apiRequest(endpoint, method = "GET", data = null, token = null) {

    const headers = {
        "Content-Type": "application/json"
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const controller = new AbortController();

    // Maximum waiting time: 15 seconds
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, 15000);

    const options = {
        method,
        headers,
        signal: controller.signal
    };

    if (data !== null) {
        options.body = JSON.stringify(data);
    }

    try {

        const response = await fetch(
            `${API_BASE_URL}${endpoint}`,
            options
        );

        let result;

        try {
            result = await response.json();
        } catch {
            throw new Error("Invalid response from server.");
        }

        if (!response.ok) {
            throw new Error(
                result.message || `Request failed: ${response.status}`
            );
        }

        return result;

    } catch (error) {

        if (error.name === "AbortError") {
            throw new Error(
                "Request timed out. Please check your server and try again."
            );
        }

        if (error instanceof TypeError) {
            throw new Error(
                "Unable to connect to the server. Please check whether the backend is running."
            );
        }

        throw error;

    } finally {

        clearTimeout(timeoutId);

    }
}


// ==========================================
// SAVE LOGIN INFORMATION
// ==========================================

function saveAuthData(data) {

    localStorage.setItem("stockwise_token", data.token);

    localStorage.setItem(
        "stockwise_user",
        JSON.stringify(data.user)
    );

    localStorage.setItem(
        "stockwise_shop",
        JSON.stringify(data.shop)
    );

}


// ==========================================
// GET SAVED TOKEN
// ==========================================

function getToken() {
    return localStorage.getItem("stockwise_token");
}


// ==========================================
// LOGOUT
// ==========================================

function logout() {

    localStorage.removeItem("stockwise_token");
    localStorage.removeItem("stockwise_user");
    localStorage.removeItem("stockwise_shop");

    window.location.replace("login.html");

}
