const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const Redis = require("ioredis");

const redis = new Redis({ host: "redis", port: 6379 });

const app = express();
app.use(bodyParser.json());

const AUTH_API = "http://auth-api"; // PHP Auth
const RECORD_API = "http://record-api:5000"; // Python Record

// POST /message
app.post("/message", async (req, res) => {
  const token = req.headers.authorization;
  const { userIdSend, userIdReceive, message } = req.body;

  const auth = await axios.get(`${AUTH_API}/token?user=${userIdSend}`, {
    headers: { Authorization: token },
  });

  if (!auth.data.auth) return res.status(401).json({ msg: "not auth" });

  const queueName = `${userIdSend}${userIdReceive}`;
  await redis.lpush(queueName, message);

  await axios.post(`${RECORD_API}/message`, {
    userIdSend,
    userIdReceive,
    message,
  });

  res.json({ message: "message sended with success" });
});

// POST /message/worker
app.post("/message/worker", async (req, res) => {
  const token = req.headers.authorization;
  const { userIdSend, userIdReceive } = req.body;

  const auth = await axios.get(`${AUTH_API}/token?user=${userIdSend}`, {
    headers: { Authorization: token },
  });

  if (!auth.data.auth) return res.status(401).json({ msg: "not auth" });

  const queueName = `${userIdSend}${userIdReceive}`;
  let message;

  while ((message = await redis.rpop(queueName))) {
    await axios.post(`${RECORD_API}/message`, {
      userIdSend,
      userIdReceive,
      message,
    });
  }

  res.json({ msg: "ok" });
});

// GET /message
app.get("/message", async (req, res) => {
  const token = req.headers.authorization;
  const userId = req.query.user;

  const auth = await axios.get(`${AUTH_API}/token?user=${userId}`, {
    headers: { Authorization: token },
  });

  if (!auth.data.auth) return res.status(401).json({ msg: "not auth" });

  const users = await axios.get(`${AUTH_API}/user-list`);
  const result = [];

  for (const user of users.data) {
    const channel = `${user.user_id}${userId}`;
    const messages = await axios.get(
      `${RECORD_API}/message?channel=${channel}`
    );
    messages.data.forEach((m) =>
      result.push({ userId: user.user_id, msg: m.message })
    );
  }

  res.json(result);
});

app.listen(3000, () => console.log("Receive-Send-API rodando na porta 3000"));
