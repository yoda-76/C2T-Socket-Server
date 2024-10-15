import express from "express";
import Redis from "ioredis";
import cookieParser from "cookie-parser";
import { createServer } from "node:http";
import { Server as WebSocketServer } from "socket.io";
const redisClient = new Redis("redis://127.0.0.1:6379");

const port = process.env.PORT || 4001;
const app = express();
const httpServer = createServer(app);

// Initialize WebSocket server
const io = new WebSocketServer(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'https://www.oidelta.com', 'https://oidelta.com'],
    credentials: true
  }
});

app.use(express.json());
app.use(cookieParser());

// CORS stuff
const allowedOrigins = ['http://localhost:5173', 'https://www.oidelta.com', 'https://oidelta.com'];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, userId, agentid, adminid, skey"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});


redisClient.subscribe("marketTicks");
redisClient.on("message", (channel, message) => {
  const ticks = JSON.parse(message);
  // console.log(ticks);
  // Loop through each tick and emit it to the corresponding instrument token channel
  ticks.forEach((tick) => {
    io.to(`${tick.instrument_token}`).emit("marketData", tick);
  });
});

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    
    // Handle room joining if needed
    socket.on("subscribe", (token) => {
      socket.join(token);
      console.log(`Client ${socket.id} subscribed to: ${token}`);
    });
  
    // Handle client disconnection
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
  
// Start the server
httpServer.listen(port, () => {
  console.log(`App is running at http://localhost:${port}`);
});
