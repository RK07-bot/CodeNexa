import express from "express";
import morgan from "morgan";
import authRouter from "./routes/auth.routes.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import config from "./config/env.js";
import errorHandler from "./middlewares/error.middleware.js";
import adminRouter from "./routes/admin.routes.js";
import problemRouter from "./routes/problem.routes.js";
import sessionRouter from "./routes/session.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";

const app = express();

// Trust the single reverse proxy in front of the application
app.set("trust proxy", 1);

app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: config.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/problems", problemRouter);
app.use("/api/sessions",sessionRouter);
app.use("/api/dashboard", dashboardRouter);
app.use(errorHandler);

export default app;