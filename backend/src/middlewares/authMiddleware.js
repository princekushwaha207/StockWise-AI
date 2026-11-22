
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
    try {
        let token;

        // Read token from Authorization header
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer ")
        ) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Not authorized. Please login first."
            });
        }

        // Verify JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find user from database
        const user = await User.findById(decoded.id).select("-password");

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: "User not found or account inactive"
            });
        }

        // Attach user information to request
        req.user = user;

        next();

    }  catch (error) {
    console.error("JWT Auth Error:", error.name, error.message);

    return res.status(401).json({
        success: false,
        message: "Invalid or expired token"
    });
}
};

module.exports = { protect };
