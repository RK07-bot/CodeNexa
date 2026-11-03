import { redisClient } from "../config/redis.js";
import tryCatch from "../middlewares/try-catch.middleware.js";
import sanitize from "mongo-sanitize";
import userModel from "../models/user.model.js";
import bcrypt from "bcrypt";
import { getOtpHtml, getVerifyEmailHtml } from "../utils/emailHtmlTemplate.js";
import crypto from "crypto";
import generateOtp from "../utils/generateOtp.js";
import { generateTokens } from "../utils/generateToken.js";
import { verifyRefreshToken } from "../utils/verifyRefreshToken.js";
import { revokeRefreshToken } from "../utils/revokeRefreshToken.js";
import { getActiveSession, setActiveSession } from "../utils/sessionStore.js";
import { getDeviceLabel } from "../utils/getDeviceLabel.js";
import invalidateUserCache from "../utils/invalidateUserCache.js";
import { emailQueue } from "../jobs/queues/email.queue.js";
import {
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from "../utils/cookieOptions.js";
import rateLimiter from "../utils/rateLimiter.js";

export const registerUser = tryCatch(async (req, res) => {
  // Remove MongoDB operators from request body to prevent NoSQL injection
  const { username, email, password } = sanitize(req.body);

  // Create a key using the user's IP address.
  // If the same device tries to register again within 1 minute,
  // we'll know because this key will already exist.
  const ipRateLimitKey = `register-ip:${req.ip}`;

  // Create another key using the user's email.
  // This helps us remember that we've already sent
  // a verification email to this email address.
  const emailRateLimitKey = `register-email:${email}`;

  // Check if this IP has already made a registration request recently.
  const { allowed } = await rateLimiter({
    key: ipRateLimitKey,
    limit: 3,
    windowSeconds: 10 * 60,
  });
  if (!allowed) {
    return res.status(429).json({
      success: false,
      message: "Too many requests. Please try again after a minute.",
    });
  }

  // Check if a verification email has already been sent
  // to this email address and is still valid.
  const { allowed: emailAllowed } = await rateLimiter({
    key: emailRateLimitKey,
    limit: 1,
    windowSeconds: 300,
  });

  if (!emailAllowed) {
    return res.status(429).json({
      success: false,
      message:
        "A verification email has already been sent. Please check your inbox.",
    });
  }
  // Check if the email is already registered in the database
  const isUserAlreadyExist = await userModel.findOne({ email });

  if (isUserAlreadyExist) {
    return res.status(400).json({
      success: false,
      message: "User already exists",
    });
  }

  // Hash the user's password before storing it
  const hashedPassword = await bcrypt.hash(password, 10);

  // Generate a secure random token for email verification
  const verificationToken = crypto.randomBytes(32).toString("hex");

  // Redis key used to temporarily store unverified user data
  const verificationKey = `verify:${verificationToken}`;

  // Prepare user data to store in Redis until email is verified
  const dataToStore = JSON.stringify({
    username,
    email,
    password: hashedPassword,
  });

  // Store user data in Redis for 5 minutes
  // If the user verifies their email within this time,
  // the data will be moved to MongoDB
  await redisClient.set(verificationKey, dataToStore, { EX: 300 });

  // Store the current verification token for this email.
  // This allows us to find and replace the token when the user requests a resend.
  await redisClient.set(`pending-token:${email}`, verificationToken, {
    EX: 300,
  });

  // Generate verification email
  const subject = "Verify your CodeNexa account";
  const html = getVerifyEmailHtml({
    email,
    token: verificationToken,
    username,
  });

  // Send verification email to the user
  await emailQueue.add("send-verification", { email, subject, html });

  // Return a generic success response
  // This prevents attackers from determining whether an email exists
  return res.status(201).json({
    success: true,
    message:
      "If your email is valid, a verification link has been sent,it will expire in 5 minutes",
  });
});

export const verifyUser = tryCatch(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: "Verification token is required",
    });
  }

  const verificationKey = `verify:${token}`;

  const userDataJsonString = await redisClient.get(verificationKey);

  if (!userDataJsonString) {
    return res.status(400).json({
      success: false,
      message: "Verification link is expired",
    });
  }

  await redisClient.del(verificationKey);
  const userData = JSON.parse(userDataJsonString);

  //delete email register-email rate limit from redis as it has ttl 5 minutes
  const emailRateLimitKey = `register-email:${userData.email}`;
  await redisClient.del(emailRateLimitKey);

  await redisClient.del(`pending-token:${userData.email}`);

  //Not required as we already did at the time of registration ...just extra safety check
  const isUserAlreadyExist = await userModel.findOne({ email: userData.email });

  if (isUserAlreadyExist) {
    return res.status(400).json({
      success: false,
      message: "User already exists",
    });
  }

  const newUser = await userModel.create({
    username: userData.username,
    email: userData.email,
    password: userData.password,
  });

  return res.status(201).json({
    success: true,
    message: "Email verified successfully! your account has been created ",
    user: {
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
    },
  });
});

export const resendVerificationEmail = tryCatch(async (req, res) => {
  const { email } = sanitize(req.body);

  const cooldownKey = `resend-verify-cooldown:${email}`;

  if (await redisClient.get(cooldownKey)) {
    return res.status(429).json({
      success: false,
      message: "Please wait 60 seconds before requesting another email.",
    });
  }

  const { allowed } = await rateLimiter({
    key: `resend-verify:${email}`,
    limit: 3,
    windowSeconds: 300,
  });
  if (!allowed) {
    return res.status(429).json({
      success: false,
      message: "Too many attempts. Try again in a few minutes.",
    });
  }

  const oldToken = await redisClient.get(`pending-token:${email}`);
  if (!oldToken) {
    return res.status(404).json({
      success: false,
      message:
        "No pending registration found for this email. Please register again.",
    });
  }

  const userDataJsonString = await redisClient.get(`verify:${oldToken}`);
  if (!userDataJsonString) {
    return res.status(404).json({
      success: false,
      message:
        "No pending registration found for this email. Please register again.",
    });
  }

  // old token is being replaced, so it shouldn't stay valid alongside the new one
  await redisClient.del(`verify:${oldToken}`);

  const newToken = crypto.randomBytes(32).toString("hex");
  await redisClient.set(`verify:${newToken}`, userDataJsonString, { EX: 300 });
  await redisClient.set(`pending-token:${email}`, newToken, { EX: 300 });

  const userData = JSON.parse(userDataJsonString);
  const html = getVerifyEmailHtml({
    email,
    token: newToken,
    username: userData.username,
  });

  await emailQueue.add("resend-verification", {
    email,
    subject: "Verify your CodeNexa account",
    html,
  });
  // Prevent another verification email for 60 seconds
  await redisClient.set(`resend-verify-cooldown:${email}`, "true", {
    EX: 60,
  });

  return res
    .status(200)
    .json({ success: true, message: "Verification email resent." });
});

export const loginUser = tryCatch(async (req, res) => {
  const { email, password, force } = sanitize(req.body);

  const ipLimit = await rateLimiter({
    key: `login-ip:${req.ip}`,
    limit: 10,
    windowSeconds: 900,
  });
  const emailLimit = await rateLimiter({
    key: `login-id:${email}`,
    limit: 5,
    windowSeconds: 900,
  });
  if (!ipLimit.allowed || !emailLimit.allowed) {
    return res.status(429).json({
      success: false,
      message: "Too many login attempts. Try again later.",
    });
  }

  const user = await userModel.findOne({ email });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid credentials",
    });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({
      success: false,
      message: "Invalid credentials",
    });
  }

  const existingSession = await getActiveSession(user._id);

  // block the login unless the frontend has already shown the conflict popup
  // and resubmitted with force: true
  if (existingSession && !force) {
    return res.status(409).json({
      success: false,
      sessionConflict: true,
      message: "An active session already exists on another device.",
      existingSession: {
        device: existingSession.device,
        loggedInAt: existingSession.loggedInAt,
      },
    });
  }

  const { accessToken, refreshToken } = generateTokens(user);
  const device = getDeviceLabel(req.headers["user-agent"]);

  // this overwrites whatever session existed before — by this point the
  // user has either confirmed the takeover, or there was nothing to overwrite
  await setActiveSession(user._id, { token: refreshToken, device });

  res.cookie("accessToken", accessToken, accessTokenCookieOptions);
  res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

  return res.status(200).json({
    message: `Welcome ${user.username}`,
    user: {
      username: user.username,
      email: user.email,
      role: user.role,
    },
  });
});

export const refreshAccessToken = tryCatch(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: "Invalid refresh token",
    });
  }

  const decoded = await verifyRefreshToken(refreshToken);

  const user = await userModel.findById(decoded.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  const existingSession = await getActiveSession(user._id);
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

  // keep the original device label — this is a token refresh, not a new device logging in
  await setActiveSession(user._id, {
    token: newRefreshToken,
    device: existingSession?.device ?? "Unknown device",
  });

  res.cookie("accessToken", accessToken, accessTokenCookieOptions);

  res.cookie("refreshToken", newRefreshToken, refreshTokenCookieOptions);

  return res.status(200).json({
    success: true,
    message: "Access token refreshed successfully.",
  });
});

export const forgotPassword = tryCatch(async (req, res) => {
  const { email } = sanitize(req.body);

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }

  const forgotPasswordLimitKey = `forgot-password:${email}`;

  const { allowed } = await rateLimiter({
    key: forgotPasswordLimitKey,
    limit: 5,
    windowSeconds: 300,
  });

  if (!allowed) {
    return res.status(429).json({
      success: false,
      message: "Too many attempts. Try again in a few minutes.",
    });
  }

  const user = await userModel.findOne({ email });

  if (user) {
    // only do the real work if the account exists — but the response is
    // identical either way, so this can't be used to check who's registered
    const otp = generateOtp();

    const otpKey = `forgot-password-otp:${email}`;
    const otpAttemptsKey = `forgot-password-attempts:${email}`;

    await redisClient.set(otpKey, otp, {
      EX: 300, // 5 minutes
    });

    await redisClient.set(otpAttemptsKey, "0", {
      EX: 300,
    });

    const otpHtml = getOtpHtml({ email, otp });

    //add password reset email to the queue
    await emailQueue.add("send-password-reset", {
      email,
      subject: "Reset Your CodeNexa Password",
      html: otpHtml,
    });
  }

  return res.status(200).json({
    success: true,
    message: "If the email is registered, an OTP has been sent.",
  });
});

export const verifyOtp = tryCatch(async (req, res) => {
  const { email, otp } = sanitize(req.body);

  if (!email || !otp) {
    return res.status(400).json({
      success: false,
      message: "Email and OTP are required",
    });
  }

  const { allowed } = await rateLimiter({
    key: `verify-otp-ip:${req.ip}`,
    limit: 10,
    windowSeconds: 900,
  });
  if (!allowed) {
    return res
      .status(429)
      .json({ success: false, message: "Too many attempts. Try again later." });
  }

  const otpKey = `forgot-password-otp:${email}`;
  const otpAttemptsKey = `forgot-password-attempts:${email}`;

  const storedOtp = await redisClient.get(otpKey);

  if (!storedOtp) {
    return res.status(400).json({
      success: false,
      message: "OTP expired or not generated",
    });
  }

  // Get failed attempts
  const attemptsString = await redisClient.get(otpAttemptsKey);
  const attempts = attemptsString ? Number(attemptsString) : 0;

  // Block after 5 failed attempts
  if (attempts >= 5) {
    await redisClient.del(otpKey);
    await redisClient.del(otpAttemptsKey);

    return res.status(429).json({
      success: false,
      message: "Too many incorrect OTP attempts. Please request a new OTP.",
    });
  }

  // Check OTP
  if (storedOtp !== otp) {
    const newAttempts = attempts + 1;

    await redisClient.set(otpAttemptsKey, newAttempts.toString(), { EX: 300 });

    if (newAttempts >= 5) {
      await redisClient.del(otpKey);
      await redisClient.del(otpAttemptsKey);

      return res.status(429).json({
        success: false,
        message: "Too many incorrect OTP attempts. Please request a new OTP.",
      });
    }

    return res.status(400).json({
      success: false,
      message: `Invalid OTP. ${5 - newAttempts} attempts remaining.`,
    });
  }

  // OTP is correct
  await redisClient.del(otpKey);
  await redisClient.del(otpAttemptsKey);

  // Generate temporary password-reset token
  const resetToken = crypto.randomBytes(32).toString("hex");

  const resetTokenKey = `password-reset:${resetToken}`;

  // Reset token valid for 5 minutes
  await redisClient.set(resetTokenKey, email, {
    EX: 300,
  });

  return res.status(200).json({
    success: true,
    message: "OTP verified successfully",
    resetToken,
  });
});

export const changePassword = tryCatch(async (req, res) => {
  const { resetToken, newPassword, confirmNewPassword } = sanitize(req.body);

  if (!resetToken || !newPassword || !confirmNewPassword) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({
      success: false,
      message: "Passwords do not match",
    });
  }

  const resetTokenKey = `password-reset:${resetToken}`;

  // Get email associated with this reset token
  const email = await redisClient.get(resetTokenKey);

  if (!email) {
    return res.status(401).json({
      success: false,
      message: "Password reset session expired. Please request a new OTP.",
    });
  }

  const user = await userModel.findOne({ email });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  user.password = hashedPassword;

  await user.save();
  await revokeRefreshToken(user._id);
  await invalidateUserCache(user._id);

  // Prevent reset-token reuse
  await redisClient.del(resetTokenKey);

  return res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});

export const resendOtp = tryCatch(async (req, res) => {
  const { email } = sanitize(req.body);

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }

  const ipLimit = await rateLimiter({
    key: `resend-otp-ip:${req.ip}`,
    limit: 5,
    windowSeconds: 900,
  });
  const emailLimit = await rateLimiter({
    key: `resend-otp:${email}`,
    limit: 3,
    windowSeconds: 300,
  });

  if (!ipLimit.allowed || !emailLimit.allowed) {
    return res.status(429).json({
      success: false,
      message: "Too many OTP requests. Try again in a few minutes.",
    });
  }

  const user = await userModel.findOne({ email });

  if (user) {
    // Limit OTP resend requests to 3 within 5 minutes
    const resendOtpLimitKey = `resend-otp:${email}`;

    const otpKey = `forgot-password-otp:${email}`;
    const otpAttemptsKey = `forgot-password-attempts:${email}`;

    // Generate a new OTP
    const otp = generateOtp();

    // Replace the old OTP with the new one
    await redisClient.set(otpKey, otp, {
      EX: 300,
    });

    // Reset failed attempts for the new OTP
    await redisClient.set(otpAttemptsKey, "0", {
      EX: 300,
    });

    const otpHtml = getOtpHtml({
      email,
      otp,
    });

    // Add password reset OTP email to the queue
    await emailQueue.add("send-password-reset", {
      email,
      subject: "Reset Your CodeNexa Password",
      html: otpHtml,
    });
  }

  return res.status(200).json({
    success: true,
    message: "If the email is registered, a new OTP has been sent.",
  });
});

export const getMyProfile = tryCatch(async (req, res) => {
  const user = req.user;

  return res.status(200).json({
    success: true,
    message: "User fetched successfully",
    user: user,
  });
});

export const logoutUser = tryCatch(async (req, res) => {
  const userId = req.user._id;

  await revokeRefreshToken(userId);
  await invalidateUserCache(userId);
  res.clearCookie("refreshToken", refreshTokenCookieOptions);
  res.clearCookie("accessToken", accessTokenCookieOptions);

  return res.status(200).json({
    success: true,
    message: "User logged out successfully",
  });
});
