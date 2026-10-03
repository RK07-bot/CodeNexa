// Check if the logged-in user has one of the allowed roles
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    // Make sure the user is logged in
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Check if the user's role is allowed
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to do this",
      });
    }

    // User has the required role, so continue
    next();
  };
};

// Only admins can access the route
export const requireAdmin = requireRole("admin");