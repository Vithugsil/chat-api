const express = require("express");
const axios = require("axios");
const rabbitmq = require("amqplib/callback_api");
const app = express();

app.use(express.json());

const SUCCESS = 200;
const ERROR = 500;
const NOT_FOUND = 404;
const BAD_REQUEST = 400;
const UNAUTHORIZED = 401;
const FORBIDDEN = 403;

app.post("/message", (req, res) => {
  //getting headers
  const headers = req.headers["authorization"];
  if (!headers) {
    return res.status(UNAUTHORIZED).json({
      error: "Authorization header is missing",
    });
  }

  //getting token
  const token = headers.split(" ")[1];
  if (!token) {
    return res.status(UNAUTHORIZED).json({
      error: "Token is missing",
    });
  }

  // Verifying token
  const isValidToken = verifyToken(token);

  if (!isValidToken) {
    return res.status(FORBIDDEN).json({
      error: "Invalid token",
    });
  }

  // Verifying userIdSend and userIdReceive
  const { message, userIdSend, userIdReceive } = req.body;

  if (!message || !userIdSend || !userIdReceive) {
    return res.status(BAD_REQUEST).json({
      error: "Message, userIdSend, and userIdReceive are required",
    });
  }

  addToQueue("messageQueue", {
    message,
    userIdSend,
    userIdReceive,
  });

  // Adding to history
  addToHistory({
    message,
    userIdSend,
    userIdReceive,
  });

  // returning  response
  return res.status(SUCCESS).json({
    message: "Message received successfully",
    data: {
      message,
      userIdSend,
      userIdReceive,
    },
  });
});

async function verifyToken(token) {
  return true;
}

function addToQueue(queueName, messageBody) {
  // Use correct credentials: replace 'guest' and 'guest' with your RabbitMQ username and password if different
  rabbitmq.connect(
    "amqp://admin:admin@rabbitmq:5672",
    function (error0, connection) {
      if (error0) {
        console.error("RabbitMQ connection error:", error0);
        return;
      }
      connection.createChannel(function (error1, channel) {
        if (error1) {
          console.error("RabbitMQ channel error:", error1);
          return;
        }
        channel.assertQueue(queueName, { durable: true });
        channel.sendToQueue(
          queueName,
          Buffer.from(JSON.stringify(messageBody)),
          {
            persistent: true,
          }
        );
        setTimeout(() => {
          channel.close();
          connection.close();
        }, 500);
      });
    }
  );
}

function addToHistory(messageBody) {
  axios
    .post("http://record-api:5000/record", messageBody)
    .then((response) => {
      console.log("History added successfully:", response.data);
    })
    .catch((error) => {
      console.error("Error adding to history:", error.message);
    });
}

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
