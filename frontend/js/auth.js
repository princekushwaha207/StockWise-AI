
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const message = document.getElementById("message");
        const loginButton = document.getElementById("loginButton");

        // Validate input
        if (!email || !password) {
            message.textContent = "Please enter email and password.";
            return;
        }

        try {
            loginButton.disabled = true;
            loginButton.textContent = "Logging in...";
            message.textContent = "";

            const result = await apiRequest(
                "/auth/login",
                "POST",
                { email, password }
            );

            saveAuthData(result);

            message.textContent = "Login successful! Redirecting...";

            window.location.replace("index.html");

        } catch (error) {
            message.textContent = error.message;
        } finally {
            loginButton.disabled = false;
            loginButton.textContent = "Login";
        }
    });
}

const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const name = document.getElementById("name").value.trim();
        const shopName = document.getElementById("shopName").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        const message = document.getElementById("message");
        const registerButton = document.getElementById("registerButton");

        if (!name || !shopName || !email || !password) {
            message.textContent = "Please fill in all fields.";
            return;
        }

        if (password.length < 6) {
            message.textContent = "Password must contain at least 6 characters.";
            return;
        }

        try {
            registerButton.disabled = true;
            registerButton.textContent = "Creating account...";
            message.textContent = "";

            const result = await apiRequest(
                "/auth/register",
                "POST",
                {
                    name,
                    shopName,
                    email,
                    password
                }
            );

            message.textContent = "Account created successfully!";

            // Save authentication details returned by backend
            saveAuthData(result);

            setTimeout(() => {
                window.location.replace("index.html");
            }, 1000);

        } catch (error) {
            message.textContent = error.message;
        } finally {
            registerButton.disabled = false;
            registerButton.textContent = "Create Account";
        }
    });
}
