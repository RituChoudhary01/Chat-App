"use client";

import axios from "axios"; 
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import Cookies from "js-cookie";
import toast, { Toaster } from "react-hot-toast";

export const user_service = "http://localhost:5015"  
export const chat_service = "http://localhost:5002"

export interface User {
  _id: string;
  name: string;
  email: string;
}

export interface Chat {
  _id: string;
  users: string[];
  latestMessage: {
    text: string;
    sender: string;
  };
  createdAt: string;
  updatedAt: string;
  unseenCount?: number;
}

export interface Chats {
  _id: string;
  user: User;
  chat: Chat;
}

interface AppContextType {
  user: User | null;
  loading: boolean;
  isAuth: boolean;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setIsAuth: React.Dispatch<React.SetStateAction<boolean>>;
  logoutUser: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  fetchChats: () => Promise<void>;
  chats: Chats[] | null;
  users: User[] | null;
  setChats: React.Dispatch<React.SetStateAction<Chats[] | null>>;
}

// ✅ Fix 3: Typed API responses so data is never 'unknown'
interface MeResponse {
  user: User;
}
interface ChatsResponse {
  chats: Chats[];   // ✅ Fix 4: was "chates" (typo) — must match your backend key
}
// ✅ Fix: API returns User[] directly, not { users: User[] }
type UsersResponse = User[];

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<Chats[] | null>(null);
  const [users, setUsers] = useState<User[] | null>(null);

  async function fetchUser() {
    try {
      const token = Cookies.get("token");
      const { data } = await axios.get<MeResponse>(   // ✅ Fix 5: typed axios response
        `${user_service}/api/v1/me`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUser(data.user);   // ✅ Fix 6: was data directly — now correctly data.user
      setIsAuth(true);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);   // ✅ Fix 7: always runs, even on error
    }
  }

  async function logoutUser() {
    Cookies.remove("token");
    setUser(null);
    setIsAuth(false);
    toast.success("User Logged Out");
  }

  async function fetchChats() {
    const token = Cookies.get("token");
    try {
      const { data } = await axios.get<ChatsResponse>(  
        `${chat_service}/api/v1/chat/all`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setChats(data.chats);  
    } catch (error) {
      console.log(error);
    }
  }

  async function fetchUsers() {
    const token = Cookies.get("token");
    try {
      const { data } = await axios.get<UsersResponse>(  // ✅ Fix 10: typed axios response
        `${user_service}/api/v1/user/all`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers(data);  
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    fetchUser();
    fetchChats();
    fetchUsers();
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        isAuth,
        setIsAuth,
        loading,
        logoutUser,
        fetchChats,
        fetchUsers,
        chats,
        users,
        setChats,
      }}
    >
      {children}
      <Toaster />
    </AppContext.Provider>
  );
};

export const useAppData = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppData must be used within AppProvider");
  }
  return context;
};