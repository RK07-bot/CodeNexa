import jwt from "jsonwebtoken";
import config from "../config/env.js";
import { redisClient } from "../config/redis.js";
import userModel from "../models/user.model.js";

export const isAuthenticated = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const decoded = jwt.verify(token, config.ACCESS_JWT_SECRET);

    const cacheKey = `user:${decoded.id}`;
    const cachedUser = await redisClient.get(cacheKey);

    if (cachedUser) {
      req.user = JSON.parse(cachedUser);
      return next();
    }

    const user = await userModel
      .findById(decoded.id)
      .select("username email role")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No user with this id",
      });
    }

    await redisClient.set(cacheKey, JSON.stringify(user), { EX: 3600 });

    req.user = user;
    return next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Access token has expired.",
      });
    }

    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Unathorized access.",
      });
    }

    console.error("Authentication middleware error:", err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
