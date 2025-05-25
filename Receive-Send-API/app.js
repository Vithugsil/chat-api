const express = require("express");
const axios = require("axios");
const mysql = require("mysql2");
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

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
