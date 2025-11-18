"use client";

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from '@/context/UserContext';
import styles from '@/css/Mines.module.css';

export default function MinesPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  // Show loading state if user is not authenticated (before redirect)
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        Redirecting to login...
      </div>
    );
  }

  // Main page content for authenticated users
  return (
    <div>
      <Header />
      <Sidebar />
      
      <div className={styles.section}>
        {/* Betting Section - Left Side */}
        <div className={styles.betting_section}>
          <h3>Place Your Bet</h3>
          
          <div className={styles.input_group}>
            <label htmlFor="bet-amount">Bet Amount</label>
            <input
              type="number"
              id="bet-amount"
              placeholder="Enter bet amount..."
              min="0"
              step="0.01"
            />
          </div>

          <button className={styles.play_button}>
            Play
          </button>
        </div>

        {/* Game Section - Right Side */}
        <div className={styles.game_section}>
          Game area - coming soon
        </div>
      </div>
    </div>
  );
}
