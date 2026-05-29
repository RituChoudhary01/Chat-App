import axios from "axios";
import TryCatch from "../config/TryCatch.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import { Chat } from "../models/Chat.js";
import { Messages } from "../models/Messages.js";
import { getReceiverSocketId, io } from "../config/socket.js";
import { Types } from "mongoose";

export const createNewChat = TryCatch(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?._id;
  const { otherUserId } = req.body;

  if (!otherUserId) {
    res.status(400).json({
      message: "Other userid is required",
    });
    return;
  }

  const existingChat = await Chat.findOne({
    users: { $all: [userId, otherUserId], $size: 2 },
  });

  if (existingChat) {
    res.json({
      message: "Chat already exist",
      chatId: existingChat._id,
    });
    return;
  }

  const newChat = await Chat.create({
    users: [userId, otherUserId],
  });

  res.status(201).json({
    message: "New Chat created",
    chatId: newChat._id,
  });
});

export const getAllChats = TryCatch(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?._id;

  if (!userId) {
    res.status(400).json({ message: "UserId missing" });
    return;
  }
  const chats = await Chat.find({ users: userId }).sort({ updatedAt: -1 });

  const chatWithUserData = await Promise.all(
    chats.map(async (chat) => {
      const otherUserId = chat.users.find(
        (id) => id.toString() !== userId.toString()
      );

      const unseenCount = await Messages.countDocuments({
        chatId: chat._id,
        sender: { $ne: userId },
        seen: false,
      });

      const chatData = {
        ...chat.toObject(),
        latestMessage: chat.latestMessage ?? null,
        unseenCount,
      };

      try {
        const { data } = await axios.get(
          `${process.env.USER_SERVICE}/api/v1/user/${otherUserId}`
        );
        return { user: data, chat: chatData };
      } catch {
        return {
          user: { _id: otherUserId, name: "Unknown User" },
          chat: chatData,
        };
      }
    })
  );
  res.json({ chats: chatWithUserData });
});

export const sendMessage = TryCatch(async (req: AuthenticatedRequest, res) => {
  const senderId = req.user?._id;
  const { chatId, text } = req.body;
  const imageFile = req.file;

  if (!senderId) {
    res.status(401).json({
      message: "Unauthorized",
    });
    return;
  }

  if (!chatId) {
    res.status(400).json({
      message: "ChatId Required",
    });
    return;
  }

  if (!text && !imageFile) {
    res.status(400).json({
      message: "Either text or image is required",
    });
    return;
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    res.status(404).json({
      message: "Chat not found",
    });
    return;
  }

  const isUserInChat = chat.users.some(
    (id) => id.toString() === senderId.toString()
  );
  if (!isUserInChat) {
    res.status(403).json({
      message: "You are not a participant of this chat",
    });
    return;
  }

  const otherUserId = chat.users.find(
    (id) => id.toString() !== senderId.toString()
  );
  if (!otherUserId) {
    res.status(401).json({
      message: "No other user",
    });
    return;
  }

  // Socket setup
  const receiverSocketId = getReceiverSocketId(otherUserId.toString());
  let isReceiverInChatRoom = false;

  if (receiverSocketId) {
    const receiverSocket = io.sockets.sockets.get(receiverSocketId);
    if (receiverSocket && receiverSocket.rooms.has(chatId)) {
      isReceiverInChatRoom = true;
    }
  }

  let messageData: any = {
    chatId: chatId,
    sender: senderId,
    seen: isReceiverInChatRoom,
    seenAt: isReceiverInChatRoom ? new Date() : undefined,
  };

  if (imageFile) {
    messageData.image = {
      url: imageFile.path,
      publicId: imageFile.filename,
    };
    messageData.messageType = "image";
    messageData.text = text || "";
  } else {
    messageData.text = text;
    messageData.messageType = "text";
  }

  const message = new Messages(messageData);
  const savedMessage = await message.save();

  const latestMessageText = imageFile ? "Image" : text;

  await Chat.findByIdAndUpdate(
    chatId,
    {
      latestMessage: {
        text: latestMessageText,
        sender: senderId,
      },
      updatedAt: new Date(),
    },
    { returnDocument: "after" }
  );

  // Emit to sockets
  io.to(chatId).emit("newMessage", savedMessage);

  if (receiverSocketId) {
    io.to(receiverSocketId).emit("newMessage", savedMessage);
  }

  const senderSocketId = getReceiverSocketId(senderId.toString());
  if (senderSocketId) {
    io.to(senderSocketId).emit("newMessage", savedMessage);
  }

  if (isReceiverInChatRoom && senderSocketId) {
    io.to(senderSocketId).emit("messageSeen", {
      chatId: chatId,
      seenBy: otherUserId,
      messageIds: [savedMessage._id],
    });
  }

  res.status(201).json({
    message: savedMessage,
    sender: senderId,
  });
});

export const getMessageByChat = TryCatch(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?._id;
  const { chatId } = req.params;

  if (!userId) {
    res.status(401).json({
      message: "Unauthorized",
    });
    return;
  }

  if (!chatId) {
    res.status(400).json({
      message: "ChatId Required",
    });
    return;
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    res.status(404).json({
      message: "Chat not found",
    });
    return;
  }

  const isUserInChat = chat.users.some(
    (id) => id.toString() === userId.toString()
  );
  if (!isUserInChat) {
    res.status(403).json({
      message: "You are not a participant of this chat",
    });
    return;
  }
  const otherUserId = chat.users.find(
    (id) => id.toString() !== userId.toString()
  );

  if (!otherUserId) {
    res.status(400).json({
      message: "No other user",
    });
    return;
  }

  const messagesToMarkSeen = await Messages.find({
    chatId: chatId,
    sender: { $ne: userId },
    seen: false,
  });

  await Messages.updateMany(
    {
      chatId: chatId,
      sender: { $ne: userId },
      seen: false,
    },
    {
      seen: true,
      seenAt: new Date(),
    }
  );

  const messages = await Messages.find({ chatId }).sort({ createdAt: 1 });

  try {
    const { data } = await axios.get(
      `${process.env.USER_SERVICE}/api/v1/user/${otherUserId}`
    );

    // Socket work
    if (messagesToMarkSeen.length > 0) {
      const otherUserSocketId = getReceiverSocketId(otherUserId.toString());
      if (otherUserSocketId) {
        io.to(otherUserSocketId).emit("messageSeen", {
          chatId: chatId,
          seenBy: userId,
          messageIds: messagesToMarkSeen.map((msg) => msg._id),
        });
      }
    }
    res.json({
      messages,
      user: data,
    });
  } catch (error) {
    console.log(error);
    res.json({
      messages,
      user: { _id: otherUserId, name: "Unknown User" },
    });
  }
});