import { redisClient } from "../config/redis.js";

// Refresh token stays valid for 7 days
const SESSION_TTL = 7 * 24 * 60 * 60;

export const getActiveSession = async (userId) => {
  // Get the current session stored for this user
  const raw = await redisClient.get(`refresh-token:${userId}`);

  // Redis stores the session as a JSON string, so convert it back to an object
  return raw ? JSON.parse(raw) : null;
};

export const setActiveSession = async (userId, { token, device }) => {
  // Store the refresh token along with device details and login time
  const session = {
    token,
    device,
    loggedInAt: new Date().toISOString(),
  };

  // Save the session in Redis and expire it after 7 days
  await redisClient.set(
    `refresh-token:${userId}`,
    JSON.stringify(session),
    {
      EX: SESSION_TTL,
    }
  );
}