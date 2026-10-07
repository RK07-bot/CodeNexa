import jwt from "jsonwebtoken";
import config from "../config/env.js";
import { redisClient } from "../config/redis.js";

export const verifyRefreshToken = async (refreshToken) => {
  try {
    // Verify the token and get the data stored inside its payload
    const decoded = jwt.verify(
      refreshToken,
      config.REFRESH_JWT_SECRET
    );

    // Get the active session stored for this user
    const raw = await redisClient.get(
      `refresh-token:${decoded.id}`
    );

    if (!raw) {
      throw new Error("Refresh token not found");
    }

    // Redis stores the session as a JSON string, so convert it back to an object
    const session = JSON.parse(raw);

    // Make sure the token is still the active token for this user
    if (session.token !== refreshToken) {
      throw new Error("Invalid refresh token");
    }

    // Return the decoded payload so the caller can use the user's information
    return decoded;
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new Error("Refresh token has expired.");
    }

    if (err.name === "JsonWebTokenError") {
      throw new Error("Invalid refresh token.");
    }

    throw err;
  }
};
