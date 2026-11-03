import config from "../config/env.js";

// secure only makes sense over https — turning it off locally so
// cookies actually get set while testing on http://localhost
const isProd = process.env.NODE_ENV === "production";

export const accessTokenCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  maxAge: 15 * 60 * 1000,
};

export const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};