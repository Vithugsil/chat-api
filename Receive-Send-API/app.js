const express = require("express");
const axios = require("axios");
const rabbitmq = require("amqplib/callback_api");
const redis = require("redis");
const app = express();

app.use(express.json());

const SUCCESS = 200;
const ERROR = 500;
const NOT_FOUND = 404;
const BAD_REQUEST = 400;
const UNAUTHORIZED = 401;
const FORBIDDEN = 403;

// Redis client setup
const redisClient = redis.createClient({
  url: "redis://redis:6379",
});

(async () => {
  try {
    await redisClient.connect();
    console.log("Connected to Redis successfully");
  } catch (err) {
    console.error("Failed to connect to Redis:", err);
  }
})();

app.post("/message", async (req, res) => {
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

  redisClient.rPush(`${userIdSend}:${userIdReceive}`, JSON.stringify(message));

  addToRabbitQueue("messageQueue", {
    message,
    userIdSend,
    userIdReceive,
  });

  await addToHistory({
    message,
    userIdSend,
    userIdReceive,
  });

  return res.status(SUCCESS).json({
    message: "mesage sended with success",
  });
});

app.post("/message/worker", async (req, res) => {
  const token = req.headers["authorization"];
  const { userIdSend, userIdReceive } = req.body;
  const authRsponse = verifyToken(token);

  if (!authRsponse) {
    return res.status(FORBIDDEN).json({
      error: "Invalid token",
    });
  }

  const channel = `${userIdSend}:${userIdReceive}`;
  console.log(`Processing worker for channel ${channel}`);
  const messages = await DequeueMessages(channel);
  console.log(`Found ${messages.length} messages`);

  for (const message of messages) {
    await addToHistory({
      message: message,
      userIdSend,
      userIdReceive,
    });
  }

  return res.status(SUCCESS).json({
    message: "Messages processed successfully",
  });
});

async function verifyToken(token) {
  return true;
}

async function DequeueMessages(queueName) {
  const messages = [];
  let mesage;
  do {
    mesage = await redisClient.lPop(queueName);
    if (mesage) messages.push(JSON.parse(mesage));
  } while (mesage !== null);
  return messages;
}

function addToRabbitQueue(queueName, messageBody) {
  rabbitmq.connect("amqp://admin:admin@rabbitmq:5672", (error0, connection) => {
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
      channel.sendToQueue(queueName, Buffer.from(JSON.stringify(messageBody)), {
        persistent: true,
      });
      setTimeout(() => {
        channel.close();
        connection.close();
      }, 500);
    });
  });
}

async function addToHistory(messageBody) {
  await axios
    .post("http://record-api:5000/message", messageBody, { timeout: 5000 })
    .then((response) => {
      if (response.status !== SUCCESS) {
        console.error("Failed to add to history:", response.data);
      } else {
        console.log("Message added to history successfully");
      }
    })
    .catch((error) => {
      console.error("Error adding to history:", error.message);
    });
}

app.post("/message/worker2", async (req, res) => {
  const token = req.headers["authorization"];
  const { userIdSend, userIdReceive } = req.body;
  const authRsponse = verifyToken(token);

  if (!authRsponse) {
    return res.status(FORBIDDEN).json({
      error: "Invalid token",
    });
  }

  const channel = `${userIdSend}:${userIdReceive}`;
  console.log(`Processing worker for channel ${channel}`);
  const messages = await DequeueMessages(channel);
  console.log(`Found ${messages.length} messages`);

  for (const message of messages) {
    await addToHistory({
      message: message,
      userIdSend,
      userIdReceive,
    });
  }

  return res.status(SUCCESS).json({
    message: "Messages processed successfully",
  });
});

async function DequeueMessagesRabbit(queueName) {
  return new Promise((resolve, reject) => {
    rabbitmq.connect(
      "amqp://admin:admin@rabbitmq:5672",
      (error0, connection) => {
        if (error0) {
          console.error("RabbitMQ connection error:", error0);
          return reject(error0);
        }
        connection.createChannel(async (error1, channel) => {
          if (error1) {
            console.error("RabbitMQ channel error:", error1);
            connection.close();
            return reject(error1);
          }
          channel.assertQueue(queueName, { durable: true });
          let messages = [];
          let keepConsuming = true;

          const consumeNext = () => {
            channel.get(queueName, {}, async (err, msg) => {
              if (err) {
                console.error("RabbitMQ get error:", err);
                keepConsuming = false;
                channel.close();
                connection.close();
                return reject(err);
              }
              if (msg) {
                try {
                  const payload = JSON.parse(msg.content.toString());
                  await addToHistory(payload);
                  messages.push(payload);
                  channel.ack(msg);
                  consumeNext();
                } catch (e) {
                  console.error("Error processing message:", e);
                  channel.nack(msg, false, false); // remove from queue
                  consumeNext();
                }
              } else {
                // No more messages
                keepConsuming = false;
                channel.close();
                connection.close();
                resolve(messages);
              }
            });
          };

          consumeNext();
        });
      }
    );
  });
}

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
