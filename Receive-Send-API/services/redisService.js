const redis = require("redis");
const redisClient = redis.createClient({
  url: "redis://redis:6379",
});
redisClient.connect();

exports.addToRedisQueue = async (channel, message) => {
  try {
    await redisClient.rPush(channel, JSON.stringify(message));
    console.log(`Message added to Redis queue on channel ${channel}`);
  } catch (error) {
    console.error("Error adding message to Redis queue:", error);
  }
};

exports.DequeueMessages = async (channel) => {
  try {
    const messages = await redisClient.lRange(channel, 0, -1);
    console.log(`Dequeued ${messages.length} messages from channel ${channel}`);
    return messages.map((msg) => JSON.parse(msg));
  } catch (error) {
    console.error("Error dequeuing messages from Redis:", error);
    return [];
  }
};
