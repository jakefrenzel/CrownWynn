"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import axiosInstance from "@/lib/axiosInstance";

type UserContextType = {
  user: string | null;
  setUser: (user: string | null) => void;
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  loading: boolean;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        //const userRes = await axiosInstance.get("/api/user/");
        const balanceRes = await axiosInstance.get("/api/user/balance/");
        //setUser(userRes.data.username);
        setBalance(balanceRes.data.balance);
      } catch (err) {
        console.warn("Error loading user:", err);
        //setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, balance, setBalance, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
