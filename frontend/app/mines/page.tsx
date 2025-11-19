"use client";

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from '@/context/UserContext';
import Image from 'next/image';
import styles from '@/css/Mines.module.css';

export default function MinesPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [betAmount, setBetAmount] = useState<string>('0.00');
  const [minesCount, setMinesCount] = useState<number>(3);
  const [isGameActive, setIsGameActive] = useState<boolean>(false);
  const [multiplier, setMultiplier] = useState<number>(1.00);
  const [netGain, setNetGain] = useState<string>('0.00');
  
  // Calculate crowns: 25 total tiles - mines
  const crownsCount = 25 - minesCount;

  const handleHalfBet = () => {
    const current = parseFloat(betAmount) || 0;
    setBetAmount((current / 2).toFixed(2));
  };

  const handleDoubleBet = () => {
    const current = parseFloat(betAmount) || 0;
    setBetAmount((current * 2).toFixed(2));
  };

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
      
      <section className={styles.section}>
        <div className={styles.game_container}>
          <div className={styles.bet_container}>
            <div className={styles.label_container}>
              <div className={styles.label}>Amount</div>
            </div>
            <div className={styles.input_row}>
              <div className={styles.input_container}>
                <input
                  type="number"
                  id="bet-amount"
                  className={styles.bet_input_field}
                  placeholder="0.00"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
                <Image
                  src="/assets/crown.png"
                  alt="Crown currency"
                  width={18}
                  height={18}
                  className={styles.input_gemstone_image}
                />
              </div>
              <button className={styles.quick_bet_button} onClick={handleHalfBet}>
                ½
              </button>
              <button className={styles.quick_bet_button} onClick={handleDoubleBet}>
                2×
              </button>
            </div>
            <div className={styles.label_container}>
              <div className={`${styles.label} ${styles.game_label}`}>Mines</div>
            </div>
            <select 
              className={styles.mines_select}
              value={minesCount}
              onChange={(e) => setMinesCount(Number(e.target.value))}
            >
              {Array.from({ length: 24 }, (_, i) => i + 1).map((num) => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
            <div className={styles.label_container}>
              <div className={`${styles.label} ${styles.game_label}`}>Crowns</div>
            </div>
            <div className={styles.crowns_display}>
              {crownsCount}
            </div>
            <button 
              className={`${styles.bet_section_button} ${styles.play_button_green}`}
              onClick={() => setIsGameActive(!isGameActive)}
            >
              {isGameActive ? 'Cashout' : 'Play'}
            </button>
            <button 
              className={`${styles.bet_section_button} ${!isGameActive ? styles.disabled : ''}`}
              disabled={!isGameActive}
            >
              Auto Pick
            </button>
            <div className={styles.label_container}>
              <div className={`${styles.label} ${styles.game_label}`}>
                Total Net Gain ({multiplier.toFixed(2)}x)
              </div>
            </div>
            <div className={styles.crowns_display}>
              {netGain}
            </div>
          </div>
          <div className={styles.mines_container}>
            <div className={styles.grid_container}>
              {Array.from({ length: 25 }, (_, i) => (
                <button
                  key={i}
                  className={styles.grid_tile}
                  disabled={!isGameActive}
                >
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
