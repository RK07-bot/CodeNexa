import { redisClient } from "../config/redis.js";

const invalidateUserCache = async (userId) => {
  const cacheKey = `user:${userId}`;

  await redisClient.del(cacheKey);
};

export default invalidateUserCache;
