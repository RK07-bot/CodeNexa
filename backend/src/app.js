import express from "express";
import morgan from "morgan";
import authRouter from "./routes/auth.routes.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import config from "./config/env.js";
import errorHandler from "./middlewares/error.middleware.js";
import adminRouter from "./routes/admin.routes.js";
import problemRouter from "./routes/problem.routes.js";

const app = express();

app.use(morgan("dev"));
app.use(express.json());
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
app.use(errorHandler);

export default app;
