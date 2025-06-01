const axios = require("axios");
const url_record = "http://record-api:5000/message";

exports.postMessageToRecordApi = async (userIdSend, userIdReceive, message) => {
  try {
    const messageBody = {
      userIdSend,
      userIdReceive,
      message,
    };
    await axios.post(url_record, messageBody, { timeout: 5000 });
  } catch (error) {
    console.error("Error saving message:", error);
  }
};

exports.getMessages = async (channelName) => {
  try {
    const response = await axios.get(url_record, {
      params: { channelName },
      timeout: 5000,
    });
    return response.data.messages || [];
  } catch (error) {
    console.error("Error retrieving messages:", error);
    return [];
  }
};
