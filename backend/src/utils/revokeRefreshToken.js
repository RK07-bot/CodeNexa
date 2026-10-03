import { redisClient } from "../config/redis.js";

export const revokeRefreshToken = async (userId) => {
  await redisClient.del(`refresh-token:${userId}`);
};
