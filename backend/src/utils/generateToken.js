import jwt from "jsonwebtoken";
import config from "../config/env.js";

export const generateTokens = (user) => {
  const payload = {
    id: user._id,
  };

  const accessToken = jwt.sign(payload, config.ACCESS_JWT_SECRET, {
    expiresIn: "15m",
  });

  const refreshToken = jwt.sign(payload, config.REFRESH_JWT_SECRET, {
    expiresIn: "7d",
  });

  return {
    accessToken,
    refreshToken,
  };
};
