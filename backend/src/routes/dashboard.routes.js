import express from "express";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import { getDashboard } from "../controllers/dashboard.controller.js";

const dashboardRouter = express.Router();

dashboardRouter.use(isAuthenticated);

dashboardRouter.get("/", getDashboard);

export default dashboardRouter;