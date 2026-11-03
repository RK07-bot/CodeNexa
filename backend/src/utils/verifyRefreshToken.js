import jwt from "jsonwebtoken";
import config from "../config/env.js";
import { redisClient } from "../config/redis.js";

export const verifyRefreshToken = async (refreshToken) => {
  const decoded = jwt.verify(
    refreshToken,
    config.REFRESH_JWT_SECRET
  );

  const raw = await redisClient.get(
    `refresh-token:${decoded.id}`
  );

  if (!raw) {
    const error = new Error("Refresh token not found");
    error.statusCode = 401;
    throw error;
  }

  const session = JSON.parse(raw);

  if (session.token !== refreshToken) {
    const error = new Error("Invalid refresh token");
    error.statusCode = 401;
    throw error;
  }

  return decoded;
};