"use client";

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from '@/context/UserContext';
import Image from 'next/image';
import styles from '@/css/Mines.module.css';
import {
  startMinesGame,
  revealTile,
  cashout,
  getActiveGame,
  getGameHistory,
  getSeedInfo,
  rerollSeed,
  getMinesStats,
  getMinesRecentWins,
  type StartGameResponse,
  type MinesRecentWinItem,
} from '@/lib/minesApi';
import { verify_game } from '@/lib/minesVerification';
import { validateBetAmount, sanitizeBetInput, formatBetDisplay } from '@/lib/betValidation';

export default function MinesPage() {
  const { user, loading, setBalance, balance } = useUser();
  const router = useRouter();
  const [betAmount, setBetAmount] = useState<string>('0.00');
  const [betError, setBetError] = useState<string>('');
  const [minesCount, setMinesCount] = useState<number>(3);
  const [isGameActive, setIsGameActive] = useState<boolean>(false);
  const [multiplier, setMultiplier] = useState<number>(1.00);
  const [netGain, setNetGain] = useState<string>('0.00');
  const [gameId, setGameId] = useState<number | null>(null);
  const [revealedTiles, setRevealedTiles] = useState<number[]>([]);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [showProvablyFair, setShowProvablyFair] = useState<boolean>(false);
  const [selectedVerifyGame, setSelectedVerifyGame] = useState<any>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [currentClientSeed, setCurrentClientSeed] = useState<string>('');
  const [seedGamesPlayed, setSeedGamesPlayed] = useState<number>(0);
  const [nextServerSeedHash, setNextServerSeedHash] = useState<string>('');
  const [isRerolling, setIsRerolling] = useState<boolean>(false);
  const verificationResultRef = useRef<HTMLDivElement>(null);
  const [showStats, setShowStats] = useState<boolean>(false);
  const [stats, setStats] = useState<any>(null);
  const [recentWins, setRecentWins] = useState<MinesRecentWinItem[]>([]);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [isRevealing, setIsRevealing] = useState<boolean>(false);
  const [isCashingOut, setIsCashingOut] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [historyLoading, setHistoryLoading] = useState<boolean>(true);
  const [recentWinsLoading, setRecentWinsLoading] = useState<boolean>(true);
  const [initialHistoryLoad, setInitialHistoryLoad] = useState<boolean>(true);
  const [initialRecentWinsLoad, setInitialRecentWinsLoad] = useState<boolean>(true);
  
  // Calculate crowns: 25 total tiles - mines - revealed tiles
  const crownsCount = 25 - minesCount - revealedTiles.length;

  const handleHalfBet = () => {
    const current = parseFloat(betAmount) || 0;
    const newBet = (current / 2).toFixed(2);
    setBetAmount(newBet);
    validateAndSetBet(newBet);
  };

  const handleDoubleBet = () => {
    const current = parseFloat(betAmount) || 0;
    const newBet = (current * 2).toFixed(2);
    setBetAmount(newBet);
    validateAndSetBet(newBet);
  };

  const validateAndSetBet = (bet: string) => {
    if (!user) return;
    const validation = validateBetAmount(bet, balance);
    setBetError(validation.error || '');
  };

  const handleStartGame = async () => {
    try {
      // Validate bet before submitting
      const validation = validateBetAmount(betAmount, balance);
      if (!validation.isValid) {
        setBetError(validation.error || 'Invalid bet amount');
        return;
      }
      setErrorMessage('');
      setIsStarting(true);
      const bet = parseFloat(betAmount);
      
      if (isNaN(bet) || bet <= 0) {
        setErrorMessage('Please enter a valid bet amount');
        setIsStarting(false);
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
      setIsStarting(false);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Failed to start game');
      setIsStarting(false);
    }
  };

  const handleCashout = async () => {
    if (!gameId) return;
    
    try {
      setErrorMessage('');
      setIsCashingOut(true);
      const response = await cashout(gameId);
      setIsGameActive(false);
      setGameOver(true);
      setMinePositions(response.mine_positions);
      setNetGain(response.net_profit);
      
      // Update user balance
      setBalance(parseFloat(response.balance));
      
      // Refresh game history
      fetchGameHistory();
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Failed to cashout');
    } finally {
      setIsCashingOut(false);
    }
  };

  const handlePlayClick = () => {
    if (isGameActive) {
      handleCashout();
    } else {
      handleStartGame();
    }
  };

  const handleAutoPick = () => {
    if (!isGameActive || gameOver) return;
    
    // Get all unrevealed tiles (0-24, excluding already revealed)
    const unrevealedTiles = Array.from({ length: 25 }, (_, i) => i)
      .filter(i => !revealedTiles.includes(i));
    
    if (unrevealedTiles.length === 0) return;
    
    // Pick a random unrevealed tile
    const randomIndex = Math.floor(Math.random() * unrevealedTiles.length);
    const randomTile = unrevealedTiles[randomIndex];
    
    // Click that tile
    handleTileClick(randomTile);
  };

  const handleVerifyGame = async () => {
    if (!selectedVerifyGame) return;
    
    const result = await verify_game(
      selectedVerifyGame.server_seed,
      selectedVerifyGame.server_seed_hash,
      selectedVerifyGame.client_seed,
      selectedVerifyGame.nonce,
      selectedVerifyGame.mines_count,
      selectedVerifyGame.mine_positions
    );
    
    setVerificationResult(result);
    
    // Scroll to verification result after a brief delay to allow render
    setTimeout(() => {
      verificationResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const fetchSeedInfo = async () => {
    if (!user) return;
    
    try {
      const response = await getSeedInfo();
      setCurrentClientSeed(response.client_seed);
      setSeedGamesPlayed(response.seed_games_played);
      setNextServerSeedHash(response.next_server_seed_hash);
    } catch (error) {
      console.error('Failed to fetch seed info:', error);
    }
  };

  const handleRerollSeed = async () => {
    if (isGameActive) {
      setErrorMessage('Cannot reroll seed while a game is active');
      return;
    }
    
    setIsRerolling(true);
    try {
      const response = await rerollSeed();
      setCurrentClientSeed(response.client_seed);
      setSeedGamesPlayed(response.seed_games_played);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Failed to reroll seed');
    } finally {
      setIsRerolling(false);
    }
  };

  const openProvablyFairModal = async () => {
    if (gameHistory.length > 0) {
      setSelectedVerifyGame(gameHistory[0]);
    } else {
      setSelectedVerifyGame(null);
    }
    setVerificationResult(null);
    await fetchSeedInfo();
    setShowProvablyFair(true);
  };

  const closeProvablyFairModal = () => {
    setShowProvablyFair(false);
    setSelectedVerifyGame(null);
    setVerificationResult(null);
  };

  const openStatsModal = async () => {
    try {
      const statsData = await getMinesStats();
      setStats(statsData);
      setShowStats(true);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const closeStatsModal = () => {
    setShowStats(false);
  };

  const handleTileClick = async (tilePosition: number) => {
    if (!gameId || !isGameActive || gameOver || revealedTiles.includes(tilePosition)) {
      return;
    }

    try {
      setErrorMessage('');
      setIsRevealing(true);
      const response = await revealTile(gameId, tilePosition);
      
      if (response.game_over) {
        // Hit a mine or completed game (auto-win or loss)
        setIsGameActive(false);
        setGameOver(true);
        setMinePositions(response.mine_positions || []);
        
        if (response.hit_mine) {
          setNetGain(response.net_profit || '0.00');
        } else if (response.auto_win) {
          // Auto-win when all safe tiles revealed
          setNetGain(response.net_profit || '0.00');
          setRevealedTiles(response.revealed_tiles || []);
          setMultiplier(parseFloat(response.current_multiplier || '1.00'));
        }
        
        // Update user balance
        if (response.balance) {
          setBalance(parseFloat(response.balance));
        }
        
        // Refresh game history when game ends
        fetchGameHistory();
      } else {
        // Safe tile revealed
        setRevealedTiles(response.revealed_tiles || []);
        setMultiplier(parseFloat(response.current_multiplier || '1.00'));
        
        const potentialProfit = (parseFloat(response.potential_payout || '0') - parseFloat(betAmount)).toFixed(2);
        setNetGain(potentialProfit);
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Failed to reveal tile');
    } finally {
      setIsRevealing(false);
    }
  };

  const fetchGameHistory = async () => {
    if (!user) return;
    
    try {
      // Only show skeletons on very first load
      if (initialHistoryLoad) {
        setHistoryLoading(true);
      }
      const response = await getGameHistory();
      setGameHistory(response.games);
      if (initialHistoryLoad) {
        setInitialHistoryLoad(false);
      }
    } catch (error) {
      console.error('Failed to fetch game history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchRecentWins = async () => {
    try {
      // Avoid skeleton flash during refresh; only show on very first load
      if (initialRecentWinsLoad) {
        setRecentWinsLoading(true);
      }
      const response = await getMinesRecentWins();
      setRecentWins(response.recent_wins);
      if (initialRecentWinsLoad) {
        setInitialRecentWinsLoad(false);
      }
    } catch (error) {
      console.error('Failed to fetch recent wins:', error);
    } finally {
      setRecentWinsLoading(false);
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
    fetchGameHistory();
    fetchSeedInfo();
    fetchRecentWins();
  }, [user]);

  // Auto-refresh recent wins every 5 seconds
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      fetchRecentWins();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [user]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth/login");
    }
  }, [loading, user, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen page_loader" role="status" aria-live="polite">
        <div className="loader_inline" role="status" aria-live="polite">
          <svg className="loader_spinner" width="28" height="28" viewBox="0 0 50 50" aria-hidden="true">
            <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5"></circle>
            <path d="M45 25a20 20 0 0 1-20 20" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round"></path>
          </svg>
          <span className="loader_text">Preparing Game…</span>
        </div>
      </div>
    );
  }

  // Show loading state if user is not authenticated (before redirect)
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen page_loader" role="status" aria-live="polite">
        <div className="loader_inline" role="status" aria-live="polite">
          <svg className="loader_spinner" width="28" height="28" viewBox="0 0 50 50" aria-hidden="true">
            <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5"></circle>
            <path d="M45 25a20 20 0 0 1-20 20" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round"></path>
          </svg>
          <span className="loader_text">Preparing Game…</span>
        </div>
      </div>
    );
  }

  // Main page content for authenticated users
  return (
    <div>
      <Header onStatsClick={openStatsModal} />
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
                  type="text"
                  inputMode="decimal"
                  id="bet-amount"
                  className={`${styles.bet_input_field} ${betError ? styles.input_error : ''}`}
                  placeholder="0.00"
                  value={betAmount}
                  onChange={(e) => {
                    const sanitized = sanitizeBetInput(e.target.value);
                    setBetAmount(sanitized);
                    if (sanitized && user) {
                      const validation = validateBetAmount(sanitized, balance);
                      setBetError(validation.error || '');
                    } else {
                      setBetError('');
                    }
                  }}
                  disabled={isGameActive}
                />
                <Image
                  src="/assets/crown.png"
                  alt="Crown currency"
                  width={18}
                  height={18}
                  className={styles.input_gemstone_image}
                />
              </div>
              {betError && <div className={styles.error_message}>{betError}</div>}
              <button 
                className={styles.quick_bet_button} 
                onClick={handleHalfBet}
                disabled={isGameActive}
              >
                ½
              </button>
              <button 
                className={styles.quick_bet_button} 
                onClick={handleDoubleBet}
                disabled={isGameActive}
              >
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
              disabled={isGameActive}
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
              onClick={handlePlayClick}
              disabled={(isGameActive && revealedTiles.length === 0) || isStarting || isRevealing || isCashingOut || !!betError}
              aria-busy={isStarting || isRevealing || isCashingOut}
            >
              {(isStarting || isAnimating) ? (
                <div className="loading_spinner_icon">
                  <Image
                    src="/assets/cardw.png"
                    alt="Loading"
                    width={24}
                    height={24}
                  />
                </div>
              ) : (
                isGameActive ? 'Cashout' : 'Play'
              )}
            </button>
            <button 
              className={`${styles.bet_section_button} ${!isGameActive ? styles.disabled : ''}`}
              disabled={!isGameActive || isRevealing}
              onClick={handleAutoPick}
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
            <div 
              className={`${styles.error_slot} ${errorMessage ? styles.visible : ''}`}
              role="status" 
              aria-live="polite"
              aria-atomic="true"
            >
              {errorMessage || '\u00A0'}
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
                    style={{ pointerEvents: isRevealing ? 'none' : 'auto' }}
                  >
                    {showContent ? (
                      <span className={styles.tile_content}>
                        {isMine ? '💣' : '👑'}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Game History & Verification Section */}
        <div className={styles.history_section}>
          <div className={styles.history_header}>
            <h2 className={styles.history_title}>Game History</h2>
            <button
              className={styles.provably_fair_button}
              onClick={openProvablyFairModal}
            >
              Provably Fair
            </button>
          </div>

          {(initialHistoryLoad && historyLoading) ? (
            <div className={styles.history_table_wrapper}>
              <div className={styles.history_table_header}>
                <div className={styles.col_game}>Game</div>
                <div className={styles.col_bet}>Bet</div>
                <div className={styles.col_mines}>Mines</div>
                <div className={styles.col_tiles}>Tiles</div>
                <div className={styles.col_multiplier}>Multiplier</div>
                <div className={styles.col_payout}>Payout</div>
                <div className={styles.col_profit}>Net Profit</div>
                <div className={styles.col_date}>Date</div>
              </div>
              <div className={styles.history_scroll_container}>
                <div className={styles.history_list}>
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className={styles.history_row}>
                      <div className={styles.col_game}><span className="skeleton skeleton_pill" style={{ width: '60%' }}></span></div>
                      <div className={styles.col_bet}><span className="skeleton skeleton_line" style={{ width: '50%' }}></span></div>
                      <div className={styles.col_mines}><span className="skeleton skeleton_line" style={{ width: '40%' }}></span></div>
                      <div className={styles.col_tiles}><span className="skeleton skeleton_line" style={{ width: '40%' }}></span></div>
                      <div className={styles.col_multiplier}><span className="skeleton skeleton_line" style={{ width: '55%' }}></span></div>
                      <div className={styles.col_payout}><span className="skeleton skeleton_line" style={{ width: '50%' }}></span></div>
                      <div className={styles.col_profit}><span className="skeleton skeleton_line" style={{ width: '60%' }}></span></div>
                      <div className={styles.col_date}><span className="skeleton skeleton_line" style={{ width: '70%' }}></span></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : gameHistory.length === 0 ? (
            <div className={styles.no_history}>
              <p>No games played yet. Start playing to see your history!</p>
            </div>
          ) : (
            <div className={styles.history_table_wrapper}>
              <div className={styles.history_table_header}>
                <div className={styles.col_game}>Game</div>
                <div className={styles.col_bet}>Bet</div>
                <div className={styles.col_mines}>Mines</div>
                <div className={styles.col_tiles}>Tiles</div>
                <div className={styles.col_multiplier}>Multiplier</div>
                <div className={styles.col_payout}>Payout</div>
                <div className={styles.col_profit}>Net Profit</div>
                <div className={styles.col_date}>Date</div>
              </div>
              <div className={styles.history_scroll_container}>
                <div className={styles.history_list}>
                {gameHistory.map((game) => {
                  const netProfit = parseFloat(game.net_profit);
                  const isWin = game.status === 'won';
                  
                  return (
                    <div key={game.game_id} className={styles.history_row}>
                      <div className={styles.col_game}>
                        <span className={`${styles.status_badge} ${styles[game.status]}`}>
                          {isWin ? '✓' : '✗'}
                        </span>
                        #{game.game_id}
                      </div>
                      <div className={styles.col_bet}>{game.bet_amount} 👑</div>
                      <div className={styles.col_mines}>{game.mines_count}</div>
                      <div className={styles.col_tiles}>{game.tiles_revealed}</div>
                      <div className={styles.col_multiplier}>{game.multiplier}x</div>
                      <div className={styles.col_payout}>{game.payout} 👑</div>
                      <div className={`${styles.col_profit} ${netProfit >= 0 ? styles.profit : styles.loss}`}>
                        {netProfit >= 0 ? '+' : ''}{game.net_profit} 👑
                      </div>
                      <div className={styles.col_date}>
                        {new Date(game.completed_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Wins Section */}
        <div className={styles.history_section}>
          <div className={styles.history_header}>
            <h2 className={styles.history_title}>Recent Wins</h2>
          </div>

          {(initialRecentWinsLoad && recentWinsLoading) ? (
            <div className={styles.history_table_wrapper}>
              <div className={styles.recent_wins_header}>
                <div className={styles.col_game}>Player</div>
                <div className={styles.col_bet}>Bet</div>
                <div className={styles.col_multiplier}>Multiplier</div>
                <div className={styles.col_payout}>Payout</div>
                <div className={styles.col_profit}>Profit</div>
                <div className={styles.col_date}>Date</div>
              </div>
              <div className={styles.recent_wins_scroll}>
                <div className={styles.history_list}>
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className={styles.recent_wins_row}>
                      <div className={styles.col_game}><span className="skeleton skeleton_pill" style={{ width: '50%' }}></span></div>
                      <div className={styles.col_bet}><span className="skeleton skeleton_line" style={{ width: '50%' }}></span></div>
                      <div className={styles.col_multiplier}><span className="skeleton skeleton_line" style={{ width: '55%' }}></span></div>
                      <div className={styles.col_payout}><span className="skeleton skeleton_line" style={{ width: '55%' }}></span></div>
                      <div className={styles.col_profit}><span className="skeleton skeleton_line" style={{ width: '60%' }}></span></div>
                      <div className={styles.col_date}><span className="skeleton skeleton_line" style={{ width: '70%' }}></span></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : recentWins.length === 0 ? (
            <div className={styles.no_history}>
              <p>No recent wins yet. Be the first!</p>
            </div>
          ) : (
            <div className={styles.history_table_wrapper}>
              <div className={styles.recent_wins_header}>
                <div className={styles.col_game}>Player</div>
                <div className={styles.col_bet}>Bet</div>
                <div className={styles.col_multiplier}>Multiplier</div>
                <div className={styles.col_payout}>Payout</div>
                <div className={styles.col_profit}>Profit</div>
                <div className={styles.col_date}>Date</div>
              </div>
              <div className={styles.recent_wins_scroll}>
                <div className={styles.history_list}>
                  {recentWins.map((win, index) => (
                    <div key={`${win.username}-${win.created_at}-${index}`} className={styles.recent_wins_row}>
                      <div className={styles.col_game}>
                        <span className={`${styles.status_badge} ${styles.won}`}>
                          ✓
                        </span>
                        {win.username}
                      </div>
                      <div className={styles.col_bet}>{win.bet_amount} 👑</div>
                      <div className={styles.col_multiplier}>{win.multiplier}x</div>
                      <div className={styles.col_payout}>{win.payout} 👑</div>
                      <div className={`${styles.col_profit} ${styles.profit}`}>
                        +{win.net_profit} 👑
                      </div>
                      <div className={styles.col_date}>
                        {(() => {
                          const parts = new Date(win.created_at).toLocaleString('en-US', {
                            month: 'numeric',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          }).split(', ');
                          return `${parts[0]} ${parts[1].replace(' ', '').toLowerCase()}`;
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mines Info Section */}
        <div className={styles.info_section}>
          <h2 className={styles.info_title}>About Mines</h2>
          <p className={styles.info_text}>
            Mines is a high-risk, high-reward game on a 5×5 grid of 25 tiles. Choose 1-24 mines, then reveal tiles to increase your multiplier. Cash out anytime to secure winnings or risk hitting a mine and losing your bet.
          </p>
          <h3 className={styles.info_subtitle}>How to Play</h3>
          <ul className={styles.info_list}>
            <li>Choose your bet and set the number of mines.</li>
            <li>Press Play, then click tiles to reveal crowns (safe spots).</li>
            <li>Each safe tile increases your multiplier and potential profit.</li>
            <li>Press Cashout to lock in winnings before hitting a mine.</li>
            <li>Use Game History to review results and verify fairness.</li>
          </ul>
          <h3 className={styles.info_subtitle}>Tips</h3>
          <ul className={styles.info_list}>
            <li>More mines mean higher multipliers but greater risk.</li>
            <li>Develop a cashout strategy—don’t wait too long.</li>
            <li>Use smaller bets while experimenting with strategies.</li>
          </ul>
        </div>
      </section>

      {/* Provably Fair Modal */}
      {showProvablyFair && (
        <div className={styles.modal_overlay} onClick={closeProvablyFairModal}>
          <div className={styles.modal_content} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modal_header}>
              <h2 className={styles.modal_title}>Provably Fair Verification</h2>
              <button className={styles.modal_close} onClick={closeProvablyFairModal}>✕</button>
            </div>

            <div className={styles.modal_body}>
              <p className={styles.modal_description}>
                Verify game integrity using cryptographic seeds. All game outcomes are deterministic and verifiable.
              </p>

              {/* Current Seed Information */}
              <div className={styles.current_seed_section}>
                <h3 className={styles.section_title}>Current Active Seed</h3>
                <div className={styles.seed_info}>
                  <div className={styles.seed_item}>
                    <span className={styles.seed_label}>Client Seed:</span>
                    <span className={styles.seed_value}>{currentClientSeed || 'Loading...'}</span>
                  </div>

                  <div className={styles.seed_item}>
                    <span className={styles.seed_label}>Next Server Seed Hash:</span>
                    <span className={styles.seed_value}>{nextServerSeedHash || 'Loading...'}</span>
                  </div>

                  <div className={styles.seed_item}>
                    <span className={styles.seed_label}>Games Played:</span>
                    <span className={styles.seed_value}>{seedGamesPlayed}</span>
                  </div>
                </div>

                <button 
                  className={styles.reroll_button}
                  onClick={handleRerollSeed}
                  disabled={isGameActive || isRerolling}
                  style={{
                    opacity: (isGameActive || isRerolling) ? 0.6 : 1,
                    cursor: (isGameActive || isRerolling) ? 'not-allowed' : 'pointer',
                    position: 'relative'
                  }}
                >
                  {isRerolling ? (
                    <svg width="16" height="16" viewBox="0 0 50 50" style={{ display: 'inline-block', marginRight: '8px', animation: 'spinnerRotate 1s linear infinite' }}>
                      <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="4"></circle>
                      <path d="M45 25a20 20 0 0 1-20 20" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round"></path>
                    </svg>
                  ) : null}
                  {isGameActive ? 'Cannot reroll during game' : isRerolling ? 'Rerolling...' : 'Reroll Client Seed'}
                </button>
              </div>

              <hr className={styles.divider} />

              <h3 className={styles.section_title}>Verify Past Games</h3>

              <div className={styles.form_group}>
                <label className={styles.form_label}>Select Game:</label>
                <select 
                  className={styles.form_select}
                  value={selectedVerifyGame?.game_id || ''}
                  onChange={(e) => {
                    const game = gameHistory.find(g => g.game_id === parseInt(e.target.value));
                    setSelectedVerifyGame(game);
                    setVerificationResult(null);
                  }}
                >
                  {gameHistory.map((game) => (
                    <option key={game.game_id} value={game.game_id}>
                      Game #{game.game_id} - {game.status === 'won' ? `Won ${game.payout}` : `Lost ${game.bet_amount}`} 👑
                    </option>
                  ))}
                </select>
              </div>

              {selectedVerifyGame && (
                <>
                  <div className={styles.seed_info}>
                    <div className={styles.seed_item}>
                      <span className={styles.seed_label}>Server Seed Hash (Pre-game):</span>
                      <span className={styles.seed_value}>{selectedVerifyGame.server_seed_hash}</span>
                    </div>

                    <div className={styles.seed_item}>
                      <span className={styles.seed_label}>Server Seed (Revealed):</span>
                      <span className={styles.seed_value}>{selectedVerifyGame.server_seed}</span>
                    </div>

                    <div className={styles.seed_item}>
                      <span className={styles.seed_label}>Client Seed:</span>
                      <span className={styles.seed_value}>{selectedVerifyGame.client_seed}</span>
                    </div>

                    <div className={styles.seed_item}>
                      <span className={styles.seed_label}>Nonce:</span>
                      <span className={styles.seed_value}>{selectedVerifyGame.nonce}</span>
                    </div>

                    <div className={styles.seed_item}>
                      <span className={styles.seed_label}>Mines Count:</span>
                      <span className={styles.seed_value}>{selectedVerifyGame.mines_count}</span>
                    </div>
                  </div>

                  <button 
                    className={styles.verify_button}
                    onClick={handleVerifyGame}
                  >
                    Verify This Game
                  </button>

                  {verificationResult && (
                    <div ref={verificationResultRef} className={`${styles.verification_result} ${verificationResult.isValid ? styles.valid : styles.invalid}`}>
                      <div className={styles.result_header}>
                        {verificationResult.isValid ? (
                          <><span className={styles.check_icon}>✓</span> Game Verified Successfully!</>
                        ) : (
                          <><span className={styles.x_icon}>✗</span> Verification Failed</>
                        )}
                      </div>
                      
                      <p className={styles.result_text}>
                        {verificationResult.isValid 
                          ? 'Regenerated mine positions match the actual game mines.'
                          : 'Mine positions do not match. This game may have been tampered with.'}
                      </p>

                      <div className={styles.mine_grid}>
                        <div className={styles.grid_title}>Mine Positions:</div>
                        <div className={styles.verification_grid}>
                          {Array.from({ length: 25 }, (_, i) => {
                            const isMine = selectedVerifyGame.mine_positions.includes(i);
                            const wasRevealed = selectedVerifyGame.revealed_tiles.includes(i);
                            
                            return (
                              <div
                                key={i}
                                className={`${styles.verify_tile} ${
                                  isMine ? styles.verify_mine : ''
                                } ${wasRevealed && !isMine ? styles.verify_revealed : ''}`}
                              >
                                {isMine ? '💣' : wasRevealed ? '👑' : ''}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStats && stats && (
        <div className={styles.modal_overlay} onClick={closeStatsModal}>
          <div className={styles.modal_content} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modal_header}>
              <h2 className={styles.modal_title}>Mines Statistics</h2>
              <button className={styles.modal_close} onClick={closeStatsModal}>✕</button>
            </div>

            <div className={styles.stats_container}>
              {/* Overall Performance Section */}
              <div className={styles.stats_section}>
                <h3 className={styles.stats_section_title}>Overall Performance</h3>
                <div className={styles.stats_grid}>
                  <div className={styles.stat_card}>
                    <div className={styles.stat_label}>Games Played</div>
                    <div className={styles.stat_value}>{stats.games_played}</div>
                  </div>
                  
                  <div className={styles.stat_card}>
                    <div className={styles.stat_label}>Win Rate</div>
                    <div className={stats.win_rate >= 50 ? styles.stat_value_success : styles.stat_value_danger}>{stats.win_rate}%</div>
                  </div>
                  
                  <div className={styles.stat_card}>
                    <div className={styles.stat_label}>Games Won</div>
                    <div className={styles.stat_value_success}>{stats.games_won}</div>
                  </div>
                  
                  <div className={styles.stat_card}>
                    <div className={styles.stat_label}>Games Lost</div>
                    <div className={styles.stat_value_danger}>{stats.games_lost}</div>
                  </div>
                </div>
              </div>

              {/* Financial Summary Section */}
              <div className={styles.stats_section}>
                <h3 className={styles.stats_section_title}>Financial Summary</h3>
                <div className={styles.stats_grid}>
                  <div className={styles.stat_card}>
                    <div className={styles.stat_label}>Total Wagered</div>
                    <div className={styles.stat_value}>{stats.total_wagered} 👑</div>
                  </div>
                  
                  <div className={styles.stat_card}>
                    <div className={styles.stat_label}>Total Profit/Loss</div>
                    <div className={parseFloat(stats.total_profit) >= 0 ? styles.stat_value_success : styles.stat_value_danger}>
                      {parseFloat(stats.total_profit) >= 0 ? '+' : ''}{stats.total_profit} 👑
                    </div>
                  </div>
                  
                  <div className={styles.stat_card}>
                    <div className={styles.stat_label}>Average Bet</div>
                    <div className={styles.stat_value}>{stats.average_bet} 👑</div>
                  </div>
                  
                  <div className={styles.stat_card}>
                    <div className={styles.stat_label}>Return on Investment</div>
                    <div className={parseFloat(stats.total_profit) >= 0 ? styles.stat_value_success : styles.stat_value_danger}>
                      {((parseFloat(stats.total_profit) / parseFloat(stats.total_wagered)) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Winning Streaks & Records Section */}
              <div className={styles.stats_section}>
                <h3 className={styles.stats_section_title}>Streaks & Records</h3>
                <div className={styles.stats_grid}>
                  <div className={styles.stat_card}>
                    <div className={styles.stat_label}>Biggest Win</div>
                    <div className={styles.stat_value_success}>{stats.biggest_win} 👑</div>
                  </div>
                  
                  <div className={styles.stat_card}>
                    <div className={styles.stat_label}>Best Streak</div>
                    <div className={styles.stat_value_success}>{stats.best_streak} Wins 🏆</div>
                  </div>

                  <div className={styles.stat_card}>
                    <div className={styles.stat_label}>Current Streak</div>
                    <div className={stats.current_streak > 0 ? styles.stat_value_success : stats.current_streak < 0 ? styles.stat_value_danger : styles.stat_value}>
                      {stats.current_streak > 0 ? `${stats.current_streak} Wins 🔥` : stats.current_streak < 0 ? `${Math.abs(stats.current_streak)} Losses` : 'Reset'}
                    </div>
                  </div>

                  <div className={styles.stat_card}>
                    <div className={styles.stat_label}>Loss Ratio</div>
                    <div className={styles.stat_value_danger}>{stats.games_lost === 0 ? '0%' : ((stats.games_lost / stats.games_played) * 100).toFixed(1) + '%'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
