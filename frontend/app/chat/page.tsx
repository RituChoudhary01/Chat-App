"use client";

import ChatSideBar from "@/compontent/ChatSideBar";
import { chat_service, Chats, useAppData, User } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import Cookies from "js-cookie";
import ChatHeader from "@/compontent/ChatHeader";
import ChatMessages from "@/compontent/ChatMessages";
import axios from "axios";
import toast from "react-hot-toast";
import MessageInput from "@/compontent/MessageInput";
import { SocketData } from "@/context/SocketContext";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Message {
  _id: string;
  chatId: string;
  sender: string;
  text?: string;
  image?: {
    url: string;
    public: string;
  };
  messageType: "text" | "image";
  seen: boolean;
  seenAt?: string | null;
  createdAt: string;
}

interface ChatEntry {
  _id: string;
  user: User;
  chat: {
    _id: string;
    latestMessage?: { text: string; sender: string };
    unseenCount?: number;
    updatedAt: string;
    users?: string[];
    createdAt?: string;
  };
}

interface LatestMessage {
  text?: string;
  sender: string;
}

// ── API response types ────────────────────────────────────────────────────────

// ✅ FIX: backend returns "messages" (plural), not "message"
// Confirmed from API response: { messages: [...], user: {...} }
interface FetchChatResponse {
  messages: Message[];
  user: User;
}

interface SendMessageResponse {
  // ✅ FIX: backend returns "message" (singular) for send — keep as-is
  message: Message;
}

interface CreateChatResponse {
  chatId: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

function ChatApp() {
  const {
    loading,
    isAuth,
    logoutUser,
    chats,
    setChats,
    user: loggedInUser,
    users,
    fetchChats,
  } = useAppData();

  const { onlineUsers, socket } = SocketData();
  const router = useRouter();

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showAllUser, setShowAllUser] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeOutRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ FIX: store fetchChats in a ref — prevents infinite re-render loop
  // because fetchChats gets a new reference on every render from context
  const fetchChatsRef = useRef(fetchChats);
  useEffect(() => {
    fetchChatsRef.current = fetchChats;
  });

  const handleLogout = () => logoutUser();

  // ── Auth guard ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isAuth && !loading) {
      router.push("/login");
    }
  }, [isAuth, router, loading]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const moveChatToTop = useCallback(
    (chatId: string, newMessage: LatestMessage, updateUnseenCount = true) => {
      setChats((prev) => {
        if (!prev) return null;
        const updated = [...prev] as unknown as ChatEntry[];
        const idx = updated.findIndex((c) => c.chat._id === chatId);
        if (idx !== -1) {
          const [moved] = updated.splice(idx, 1);
          const updatedEntry: ChatEntry = {
            ...moved,
            chat: {
              ...moved.chat,
              latestMessage: {
                text: newMessage.text ?? "",
                sender: newMessage.sender,
              },
              updatedAt: new Date().toString(),
              unseenCount:
                updateUnseenCount && newMessage.sender !== loggedInUser?._id
                  ? (moved.chat.unseenCount || 0) + 1
                  : moved.chat.unseenCount || 0,
            },
          };
          updated.unshift(updatedEntry);
        }
        return updated as unknown as Chats[];
      });
    },
    [loggedInUser?._id, setChats]
  );

  const resetUnseenCount = useCallback(
    (chatId: string) => {
      setChats((prev) => {
        if (!prev) return null;
        return prev.map((chat) => {
          if (chat.chat._id === chatId) {
            return { ...chat, chat: { ...chat.chat, unseenCount: 0 } };
          }
          return chat;
        });
      });
    },
    [setChats]
  );

  // ── Fetch messages for selected chat ─────────────────────────────────────

  const fetchChat = useCallback(async (chatId: string) => {
    const token = Cookies.get("token");
    try {
      const { data } = await axios.get<FetchChatResponse>(
        `${chat_service}/api/v1/message/${chatId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // ✅ FIX: use data.messages (plural) — this is why messages erased on refresh!
      // Backend returns { messages: [...], user: {...} }
      setMessages(data.messages);
      setUser(data.user);
      await fetchChatsRef.current();
    } catch {
      toast.error("Failed to load messages.");
    }
  }, []); // stable forever — no deps

  // ── Send message ──────────────────────────────────────────────────────────

  const handleMessageSend = async (
    e: React.FormEvent<HTMLFormElement>,
    imageFile?: File | null
  ): Promise<void> => {
    e.preventDefault();
    if (!message.trim() && !imageFile) return;
    if (!selectedUser) return;

    if (typingTimeOutRef.current) {
      clearTimeout(typingTimeOutRef.current);
      typingTimeOutRef.current = null;
    }
    socket?.emit("stopTyping", {
      chatId: selectedUser,
      userId: loggedInUser?._id,
    });

    const token = Cookies.get("token");
    try {
      const formData = new FormData();
      formData.append("chatId", selectedUser);
      if (message.trim()) formData.append("text", message);
      if (imageFile) formData.append("image", imageFile);

      const { data } = await axios.post<SendMessageResponse>(
        `${chat_service}/api/v1/message`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setMessages((prev) => {
        const current = prev || [];
        const exists = current.some((msg) => msg._id === data.message._id);
        return exists ? current : [...current, data.message];
      });

      setMessage("");

      const displayText = imageFile ? "📷 image" : message;
      moveChatToTop(
        selectedUser,
        { text: displayText, sender: data.message.sender },
        false
      );
    } catch (error: any) {
      toast.error(error.response?.data?.message ?? "Failed to send message.");
    }
  };

  // ── Typing indicator ──────────────────────────────────────────────────────

  const handleTyping = (value: string) => {
    setMessage(value);
    if (!selectedUser || !socket) return;

    if (value.trim()) {
      socket.emit("typing", {
        chatId: selectedUser,
        userId: loggedInUser?._id,
      });
    }

    if (typingTimeOutRef.current) clearTimeout(typingTimeOutRef.current);

    typingTimeOutRef.current = setTimeout(() => {
      socket.emit("stopTyping", {
        chatId: selectedUser,
        userId: loggedInUser?._id,
      });
    }, 2000);
  };

  // ── Socket listeners ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMsg: Message) => {
      if (selectedUser === newMsg.chatId) {
        setMessages((prev) => {
          const current = prev || [];
          const exists = current.some((msg) => msg._id === newMsg._id);
          return exists ? current : [...current, newMsg];
        });
        moveChatToTop(newMsg.chatId, newMsg, false);
      } else {
        moveChatToTop(newMsg.chatId, newMsg, true);
      }
    };

    const handleMessageSeen = (data: {
      chatId: string;
      messageIds?: string[];
    }) => {
      if (selectedUser === data.chatId) {
        setMessages((prev) => {
          if (!prev) return null;
          return prev.map((msg) => {
            const isMine = msg.sender === loggedInUser?._id;
            const inList = data.messageIds?.includes(msg._id);
            if (isMine && (inList || !data.messageIds)) {
              return { ...msg, seen: true, seenAt: new Date().toString() };
            }
            return msg;
          });
        });
      }
    };

    const handleUserTyping = (data: { chatId: string; userId: string }) => {
      if (data.chatId === selectedUser && data.userId !== loggedInUser?._id) {
        setIsTyping(true);
      }
    };

    const handleUserStoppedTyping = (data: {
      chatId: string;
      userId: string;
    }) => {
      if (data.chatId === selectedUser && data.userId !== loggedInUser?._id) {
        setIsTyping(false);
      }
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("messageSeen", handleMessageSeen);
    socket.on("userTyping", handleUserTyping);
    socket.on("userStoppedTyping", handleUserStoppedTyping);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messageSeen", handleMessageSeen);
      socket.off("userTyping", handleUserTyping);
      socket.off("userStoppedTyping", handleUserStoppedTyping);
    };
  }, [socket, selectedUser, loggedInUser?._id, moveChatToTop]);

  // ── Selected user / chat effect ───────────────────────────────────────────

  useEffect(() => {
    if (!selectedUser) return;

    fetchChat(selectedUser);
    setIsTyping(false);
    resetUnseenCount(selectedUser);
    socket?.emit("joinChat", selectedUser);

    return () => {
      socket?.emit("leaveChat", selectedUser);
    };
  }, [selectedUser, socket, fetchChat, resetUnseenCount]);

  // ── Typing timeout cleanup ────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (typingTimeOutRef.current) clearTimeout(typingTimeOutRef.current);
    };
  }, []);

  // ── Create new chat ───────────────────────────────────────────────────────

  async function createChat(u: User) {
    try {
      const token = Cookies.get("token");
      const { data } = await axios.post<CreateChatResponse>(
        `${chat_service}/api/v1/chat/new`,
        { otherUserId: u._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedUser(data.chatId);
      setShowAllUser(false);
      await fetchChatsRef.current();
    } catch {
      toast.error("Failed to create chat.");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900 min-h-screen">
        <div className="h-12 w-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen flex bg-gray-900 text-white relative overflow-hidden">
      <ChatSideBar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        showAllUsers={showAllUser}
        setShowAllUser={setShowAllUser}
        users={users}
        loggedInUser={loggedInUser}
        chats={chats}
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
        handleLogout={handleLogout}
        createChat={createChat}
        onlineUsers={onlineUsers}
      />

      <div className="flex-1 flex flex-col justify-between p-4 backdrop-blur-xl bg-white/5 border border-white/10">
        <ChatHeader
          user={user}
          setSidebarOpen={setSidebarOpen}
          isTyping={isTyping}
          onlineUsers={onlineUsers}
        />
        <ChatMessages
          selectedUser={selectedUser}
          messages={messages}
          loggedInUser={loggedInUser}
        />
        <MessageInput
          selectedUser={selectedUser}
          message={message}
          setMessage={handleTyping}
          handleMessageSend={handleMessageSend}
        />
      </div>
    </div>
  );
}

export default ChatApp;