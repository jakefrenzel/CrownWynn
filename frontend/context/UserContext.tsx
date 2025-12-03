"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import axiosInstance from "@/lib/axiosInstance";
import { usePathname } from "next/navigation";

// Utility function to format balance consistently
const formatBalance = (balance: number | string): number => {
  const num = typeof balance === 'string' ? parseFloat(balance) : balance;
  return Math.round((num || 0) * 100) / 100; // Ensure 2 decimal places
};

// Utility function to display balance with consistent formatting
export const formatBalanceDisplay = (balance: number): string => {
  return balance.toFixed(2);
};

interface UserContextType {
  user: { username: string } | null;
  setUser: (user: { username: string } | null) => void;
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  loading: boolean;
  welcomeBonusClaimed: boolean;
  claimWelcomeBonus: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  balance: 0,
  setBalance: () => {},
  loading: true,
  welcomeBonusClaimed: false,
  claimWelcomeBonus: async () => false,
  logout: async () => {},
});

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [welcomeBonusClaimed, setWelcomeBonusClaimed] = useState<boolean>(false);
  const pathname = usePathname();

  const claimWelcomeBonus = async (): Promise<boolean> => {
    try {
      const res = await axiosInstance.post("/api/user/claim-welcome-bonus/");
      setBalance(formatBalance(res.data.new_balance));
      setWelcomeBonusClaimed(true);
      console.log(res.data.message);
      return true;
    } catch (err: any) {
      console.error("Failed to claim welcome bonus:", err);
      if (err.response?.data?.error) {
        console.error(err.response.data.error);
      }
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Call backend logout endpoint to clear cookies and blacklist tokens
      await axiosInstance.post("/api/logout/");
      
      // Reset user state
      setUser(null);
      setBalance(0);
      setWelcomeBonusClaimed(false);
      
      // Redirect to login page
      window.location.href = '/auth/login';
      
      console.log("Logged out successfully");
    } catch (err) {
      console.error("Logout error:", err);
      // Still clear local state even if API call fails
      setUser(null);
      setBalance(0);
      setWelcomeBonusClaimed(false);
      window.location.href = '/auth/login';
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Only fetch user if not on auth pages
        if (pathname?.startsWith("/auth/login") || pathname?.startsWith("/auth/register")) {
          setLoading(false);
          return;
        } else {
          const res = await axiosInstance.get("/api/user/me/");
          setUser({ username: res.data.username });
          setBalance(formatBalance(res.data.profile?.balance ?? 0));
          setWelcomeBonusClaimed(res.data.profile?.welcome_bonus_claimed ?? false);
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
    <UserContext.Provider value={{ 
      user, 
      setUser, 
      balance, 
      setBalance, 
      loading, 
      welcomeBonusClaimed, 
      claimWelcomeBonus,
      logout
    }}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook for easier access
export const useUser = () => useContext(UserContext);
