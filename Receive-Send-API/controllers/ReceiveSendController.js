const recordService = require("../services/recordService");
const redisService = require("../services/redisService");

exports.postMessage = async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  const { userIdSend, userIdReceive, message } = req.body;

  if (!token) {
    return res.status(401).json({
      error: "Authorization token is missing",
    });
  }

  await redisService.addToRedisQueue(`${userIdSend}:${userIdReceive}`, message);
  
  await recordService.postMessageToRecordApi(
    userIdSend,
    userIdReceive,
    message
  );

  return res.status(200).json({
    message: "Message sended with success",
  });
};
