const errorHandler = (error, req, res, next) => {
    console.error("Error:", error);

    // MongoDB duplicate key error
    if (error.code === 11000) {
        const duplicateField = Object.keys(
            error.keyPattern || {}
        )[0];

        if (duplicateField === "email") {
            return res.status(409).json({
                success: false,
                message: "Email already exists",
            });
        }

        if (duplicateField === "username") {
            return res.status(409).json({
                success: false,
                message: "Username already exists",
            });
        }

        return res.status(409).json({
            success: false,
            message: "A value already exists",
        });
    }

    // Mongoose validation error
    if (error.name === "ValidationError") {
        return res.status(400).json({
            success: false,
            message: "Invalid data",
        });
    }

    // Mongoose invalid ObjectId
    if (error.name === "CastError") {
        return res.status(400).json({
            success: false,
            message: "Invalid resource ID",
        });
    }

    // JWT errors
    if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
            success: false,
            message: "Invalid token",
        });
    }

    if (error.name === "TokenExpiredError") {
        return res.status(401).json({
            success: false,
            message: "Token expired",
        });
    }

    // Default error
    return res.status(500).json({
        success: false,
        message: "Internal server error",
    });
};

export default errorHandler;