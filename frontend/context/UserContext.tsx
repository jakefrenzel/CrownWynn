"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import axiosInstance from "@/lib/axiosInstance";
import { usePathname } from "next/navigation";

interface UserContextType {
  user: { username: string } | null;
  setUser: (user: { username: string } | null) => void;
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  loading: boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  balance: 0,
  setBalance: () => {},
  loading: true,
});

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Only fetch user if not on auth pages
        if (pathname?.startsWith("/login") || pathname?.startsWith("/register")) {
          setLoading(false);
          return;
        } else {
          const res = await axiosInstance.get("/api/user/me/");
          setUser({ username: res.data.username });
          setBalance(res.data.profile?.balance ?? 0);
        }

      } catch (err) {

        console.warn("User not authenticated or failed to fetch:", err);

        setUser(null);
        setBalance(0);

      } finally {

        setLoading(false);
        
      }
    };

    fetchUser();
  }, [pathname]);

  return (
    <UserContext.Provider value={{ user, setUser, balance, setBalance, loading }}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook for easier access
export const useUser = () => useContext(UserContext);
