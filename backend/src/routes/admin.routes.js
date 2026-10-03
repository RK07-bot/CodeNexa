import express from "express";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import { requireAdmin } from "../middlewares/rbac.middleware.js";
import { updateUserRole } from "../controllers/admin.controller.js";

const adminRouter = express.Router();

// both middlewares run in order — must be logged in, then must be an admin
adminRouter.patch("/users/:userId/role", isAuthenticated, requireAdmin, updateUserRole);

export default adminRouter;