import tryCatch from "../middlewares/try-catch.middleware.js";
import userModel from "../models/user.model.js";
import invalidateUserCache from "../utils/invalidateUserCache.js";

export const updateUserRole = tryCatch(async (req, res) => {
  // Get the user ID from the URL and the new role from the request body
  const { userId } = req.params;
  const { role } = req.body;

  // Only allow user and admin roles
  if (!["user", "admin"].includes(role)) {
    return res.status(400).json({
      success: false,
      message: "Invalid role",
    });
  }

  // Update the user's role and return the updated user
  const user = await userModel
    .findByIdAndUpdate(userId, { role }, { new: true })
    .select("username email role");

  // User with this ID doesn't exist
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Remove the old cached user data so the new role is picked up immediately
  await invalidateUserCache(userId);

  return res.status(200).json({
    success: true,
    message: `${user.username} is now ${role}`,
    user,
  });
});