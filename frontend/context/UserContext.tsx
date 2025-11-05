"use client";

import { createContext, useContext, useState, ReactNode } from "react";

// Define what data and functions your context holds
type UserContextType = {
  user: string | null;
  setUser: (user: string | null) => void;
  balance: number;
  setBalance: (balance: number) => void;
};

// Create the context
const UserContext = createContext<UserContextType | undefined>(undefined);

// Provider component (wraps the entire app)
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);

  return (
    <UserContext.Provider value={{ user, setUser, balance, setBalance }}>
      {children}
    </UserContext.Provider>
  );
}

// Custom hook to access the context easily
export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
