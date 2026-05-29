import { Server, Socket } from "socket.io"; 
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"], 
  },
});

const userSocketMap: Record<string, string> = {};

export const getReceiverSocketId = (receiverId: string): string | undefined => {
  return userSocketMap[receiverId];
};

io.on("connection", (socket: Socket) => {
  console.log("User Connected", socket.id);

  const userId = socket.handshake.query.userId as string | undefined;

  if (userId && userId !== "undefined") {
    userSocketMap[userId] = socket.id; 
    console.log(`User ${userId} mapped to socket ${socket.id}`);
  }

  // Broadcast online users to everyone
  io.emit("getOnlineUser", Object.keys(userSocketMap));

  // Join personal room for direct messages
  if (userId) {
    socket.join(userId);
  }

  // ── Typing indicators ───────────────────────────────────────────────────

  socket.on("typing", (data: { chatId: string; userId: string }) => {
    console.log(`User ${data.userId} is typing in chat ${data.chatId}`);
    socket.to(data.chatId).emit("userTyping", {
      chatId: data.chatId,
      userId: data.userId,
    });
  });

  socket.on("stopTyping", (data: { chatId: string; userId: string }) => {
    console.log(`User ${data.userId} stopped typing in chat ${data.chatId}`);
    socket.to(data.chatId).emit("userStoppedTyping", {
      chatId: data.chatId,
      userId: data.userId,
    });
  });

  // ── Chat room management ────────────────────────────────────────────────
  socket.on("joinChat", (chatId: string) => {
    socket.join(chatId);
    console.log(`User ${userId} joined chat room ${chatId}`);
  });

  socket.on("leaveChat", (chatId: string) => {
    socket.leave(chatId);
    console.log(`User ${userId} left chat room ${chatId}`);
  });

  // ── Disconnect ──────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
    if (userId) {
      delete userSocketMap[userId];
      console.log(`User ${userId} removed from online users`);
      io.emit("getOnlineUser", Object.keys(userSocketMap));
    }
  });

  socket.on("connect_error", (error: Error) => {
    console.log("Socket connection error:", error.message);
  });
});

export { app, server, io };
