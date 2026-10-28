import "dotenv/config";

if (!process.env.PORT) {
  throw new Error("Port is not defined ");
}
if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI is not defined ");
}
if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URLis not defined ");
}
if (!process.env.FRONTEND_URL) {
  throw new Error("FRONTEND_URL is not defined");
}
if (!process.env.APP_NAME) {
  throw new Error("APP_NAME is not defined");
}
if (!process.env.MAIL_USER) {
  throw new Error("MAIL_USER IS NOT DEFINED IN ENVVIRONMENT VARIABLES");
}
if (!process.env.MAIL_PASS) {
  throw new Error("MAIL_PASS IS NOT DEFINED IN ENVVIRONMENT VARIABLES");
}
if (!process.env.ACCESS_JWT_SECRET) {
  throw new Error("ACCESS_JWT_SECRET IS NOT DEFINED IN ENVVIRONMENT VARIABLES");
}
if (!process.env.REFRESH_JWT_SECRET) {
  throw new Error(
    "REFRESH_JWT_SECRET IS NOT DEFINED IN ENVVIRONMENT VARIABLES",
  );
}
if (!process.env.NODE_ENV) {
  throw new Error("NODE_ENV IS NOT DEFINED IN ENVVIRONMENT VARIABLES");
}
if (!process.env.ONLINECOMPILER_API_KEY) {
  throw new Error(
    "ONLINECOMPILER_API_KEY IS NOT DEFINED IN ENVVIRONMENT VARIABLES",
  );
}

if (!process.env.RECONNECT_GRACE_SECONDS) {
  throw new Error(
    "RECONNECT_GRACE_SECOND IS NOT DEFINED IN ENVVIRONMENT VARIABLES",
  );
}
if (!process.env.WAITING_ROOM_EXPIRY_MINUTES) {
  throw new Error(
    "WAITING_ROOM_EXPIRY_MINUTES IS NOT DEFINED IN ENVVIRONMENT VARIABLES",
  );
}

const config = {
  MONGO_URI: process.env.MONGO_URI,
  PORT: process.env.PORT,
  REDIS_URL: process.env.REDIS_URL,
  FRONTEND_URL: process.env.FRONTEND_URL,
  APP_NAME: process.env.APP_NAME,
  MAIL_USER: process.env.MAIL_USER,
  MAIL_PASS: process.env.MAIL_PASS,
  ACCESS_JWT_SECRET: process.env.ACCESS_JWT_SECRET,
  REFRESH_JWT_SECRET: process.env.REFRESH_JWT_SECRET,
  NODE_ENV: process.env.NODE_ENV || "development",
  ONLINECOMPILER_API_KEY: process.env.ONLINECOMPILER_API_KEY,
  ONLINECOMPILER_DEBUG: process.env.ONLINECOMPILER_DEBUG === "true",
  RECONNECT_GRACE_SECONDS: Number(process.env.RECONNECT_GRACE_SECONDS) || 60,
  WAITING_ROOM_EXPIRY_MINUTES:
    Number(process.env.WAITING_ROOM_EXPIRY_MINUTES) || 30,
  // STUN works for most calls, TURN entries go here as extra objects when needed
  ICE_SERVERS: process.env.ICE_SERVERS
    ? JSON.parse(process.env.ICE_SERVERS)
    : [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:stun.cloudflare.com:3478",
          ],
        },
      ],
};

export default config;
