
import "dotenv/config";

// Application configuration validation
if (!process.env.PORT) {
  throw new Error("Port is not defined");
}

if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI is not defined");
}

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not defined");
}

if (!process.env.FRONTEND_URL) {
  throw new Error("FRONTEND_URL is not defined");
}

if (!process.env.APP_NAME) {
  throw new Error("APP_NAME is not defined");
}

// Brevo email configuration
if (!process.env.BREVO_API_KEY) {
  throw new Error("BREVO_API_KEY is not defined");
}

if (!process.env.BREVO_SENDER_EMAIL) {
  throw new Error("BREVO_SENDER_EMAIL is not defined");
}

// Authentication configuration
if (!process.env.ACCESS_JWT_SECRET) {
  throw new Error("ACCESS_JWT_SECRET is not defined");
}

if (!process.env.REFRESH_JWT_SECRET) {
  throw new Error("REFRESH_JWT_SECRET is not defined");
}

if (!process.env.NODE_ENV) {
  throw new Error("NODE_ENV is not defined");
}

// External services
if (!process.env.ONLINECOMPILER_API_KEY) {
  throw new Error("ONLINECOMPILER_API_KEY is not defined");
}

// Session configuration
if (!process.env.RECONNECT_GRACE_SECONDS) {
  throw new Error("RECONNECT_GRACE_SECONDS is not defined");
}

if (!process.env.WAITING_ROOM_EXPIRY_MINUTES) {
  throw new Error("WAITING_ROOM_EXPIRY_MINUTES is not defined");
}

// ICE server configuration
const parseIceServers = () => {
  if (!process.env.ICE_SERVERS) {
    return [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun.cloudflare.com:3478",
        ],
      },
    ];
  }

  try {
    const servers = JSON.parse(process.env.ICE_SERVERS);

    if (!Array.isArray(servers) || servers.length === 0) {
      throw new Error("ICE_SERVERS must be a non-empty array");
    }

    return servers;
  } catch (error) {
    throw new Error(`Invalid ICE_SERVERS configuration: ${error.message}`);
  }
};

const config = {
  // Application
  MONGO_URI: process.env.MONGO_URI,
  PORT: process.env.PORT,
  REDIS_URL: process.env.REDIS_URL,
  FRONTEND_URL: process.env.FRONTEND_URL,
  APP_NAME: process.env.APP_NAME,

  NODE_ENV: process.env.NODE_ENV || "development",

  // Brevo transactional email
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL,
  BREVO_SENDER_NAME:
    process.env.BREVO_SENDER_NAME || process.env.APP_NAME,

  // Authentication
  ACCESS_JWT_SECRET: process.env.ACCESS_JWT_SECRET,
  REFRESH_JWT_SECRET: process.env.REFRESH_JWT_SECRET,

  // Code execution
  ONLINECOMPILER_API_KEY: process.env.ONLINECOMPILER_API_KEY,
  ONLINECOMPILER_DEBUG: process.env.ONLINECOMPILER_DEBUG === "true",

  // Gemini AI configuration
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  GEMINI_FALLBACK_MODEL: process.env.GEMINI_FALLBACK_MODEL,

  // Session configuration
  RECONNECT_GRACE_SECONDS:
    Number(process.env.RECONNECT_GRACE_SECONDS) || 60,

  WAITING_ROOM_EXPIRY_MINUTES:
    Number(process.env.WAITING_ROOM_EXPIRY_MINUTES) || 30,

  // STUN and TURN configuration
  ICE_SERVERS: parseIceServers(),
};

export default config;
