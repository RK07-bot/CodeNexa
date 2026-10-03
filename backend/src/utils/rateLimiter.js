import { redisClient } from "../config/redis.js";

const rateLimiter = async ({
  key,
  limit,
  windowSeconds,
}) => {
  // Increase the request count for this key
  const currentCount = await redisClient.incr(key);

  // Start the timer when the key is created for the first time
  if (currentCount === 1) {
    await redisClient.expire(key, windowSeconds);
  }

  // Block the request if the limit has been exceeded
  if (currentCount > limit) {
    return {
      allowed: false,
      remaining: 0,
    };
  }

  // Request is allowed, return how many attempts are left
  return {
    allowed: true,
    remaining: limit - currentCount,
  };
};

export default rateLimiter;