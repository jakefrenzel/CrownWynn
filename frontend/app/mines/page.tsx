"use client";

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from '@/context/UserContext';
import Image from 'next/image';
import styles from '@/css/Mines.module.css';
import {
  startMinesGame,
  revealTile,
  cashout,
  getActiveGame,
  type StartGameResponse,
} from '@/lib/minesApi';

export default function MinesPage() {
  const { user, loading, setBalance } = useUser();
  const router = useRouter();
  const [betAmount, setBetAmount] = useState<string>('0.00');
  const [minesCount, setMinesCount] = useState<number>(3);
  const [isGameActive, setIsGameActive] = useState<boolean>(false);
  const [multiplier, setMultiplier] = useState<number>(1.00);
  const [netGain, setNetGain] = useState<string>('0.00');
  const [gameId, setGameId] = useState<number | null>(null);
  const [revealedTiles, setRevealedTiles] = useState<number[]>([]);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
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

  const handleStartGame = async () => {
    try {
      setErrorMessage('');
      const bet = parseFloat(betAmount);
      
      if (isNaN(bet) || bet <= 0) {
        setErrorMessage('Please enter a valid bet amount');
        return;
      }

      const response = await startMinesGame(bet, minesCount);
      setGameId(response.game_id);
      setIsGameActive(true);
      setMultiplier(parseFloat(response.current_multiplier));
      setRevealedTiles([]);
      setMinePositions([]);
      setGameOver(false);
      setNetGain('0.00');
      
      // Update user balance
      setBalance(parseFloat(response.balance));
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Failed to start game');
    }
  };

  const handleCashout = async () => {
    if (!gameId) return;
    
    try {
      setErrorMessage('');
      const response = await cashout(gameId);
      setIsGameActive(false);
      setGameOver(true);
      setMinePositions(response.mine_positions);
      setNetGain(response.net_profit);
      
      // Update user balance
      setBalance(parseFloat(response.balance));
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Failed to cashout');
    }
  };

  const handlePlayClick = () => {
    if (isGameActive) {
      handleCashout();
    } else {
      handleStartGame();
    }
  };

  const handleTileClick = async (tilePosition: number) => {
    if (!gameId || !isGameActive || gameOver || revealedTiles.includes(tilePosition)) {
      return;
    }

    try {
      setErrorMessage('');
      const response = await revealTile(gameId, tilePosition);
      
      if (response.game_over) {
        // Hit a mine or completed game
        setIsGameActive(false);
        setGameOver(true);
        setMinePositions(response.mine_positions || []);
        
        if (response.hit_mine) {
          setNetGain(response.net_profit || '0.00');
        }
        
        // Update user balance
        if (response.balance) {
          setBalance(parseFloat(response.balance));
        }
      } else {
        // Safe tile revealed
        setRevealedTiles(response.revealed_tiles || []);
        setMultiplier(parseFloat(response.current_multiplier || '1.00'));
        
        const potentialProfit = (parseFloat(response.potential_payout || '0') - parseFloat(betAmount)).toFixed(2);
        setNetGain(potentialProfit);
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Failed to reveal tile');
    }
  };

  // Check for active game on mount
  useEffect(() => {
    const checkActiveGame = async () => {
      if (!user) return;
      
      try {
        const response = await getActiveGame();
        if (response.has_active_game && response.game_id) {
          const bet = response.bet_amount || '0.00';
          const mult = parseFloat(response.current_multiplier || '1.00');
          
          setGameId(response.game_id);
          setIsGameActive(true);
          setBetAmount(bet);
          setMinesCount(response.mines_count || 3);
          setRevealedTiles(response.revealed_tiles || []);
          setMultiplier(mult);
          
          const potentialPayout = parseFloat(bet) * mult;
          const potentialProfit = (potentialPayout - parseFloat(bet)).toFixed(2);
          setNetGain(potentialProfit);
        }
      } catch (error) {
        console.error('Failed to check for active game:', error);
      }
    };
    
    checkActiveGame();
  }, [user]);

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
            {errorMessage && (
              <div className={styles.error_message}>
                {errorMessage}
              </div>
            )}
            <button 
              className={`${styles.bet_section_button} ${styles.play_button_green}`}
              onClick={handlePlayClick}
              disabled={isGameActive && revealedTiles.length === 0}
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
              {Array.from({ length: 25 }, (_, i) => {
                const isRevealed = revealedTiles.includes(i);
                const isMine = minePositions.includes(i);
                const showContent = gameOver || isRevealed;
                
                return (
                  <button
                    key={i}
                    className={`${styles.grid_tile} ${
                      isRevealed ? styles.revealed : ''
                    } ${isMine && gameOver ? styles.mine : ''}`}
                    disabled={!isGameActive || gameOver}
                    onClick={() => handleTileClick(i)}
                  >
                    {showContent && (
                      <span className={styles.tile_content}>
                        {isMine ? '💣' : '👑'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
