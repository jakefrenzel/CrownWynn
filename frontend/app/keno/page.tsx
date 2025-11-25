"use client";

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from '@/context/UserContext';
import Image from 'next/image';
import styles from '@/css/Mines.module.css';
import {
  startKenoGame,
  getActiveKenoGame,
  getKenoGameHistory,
  getKenoStats,
  type StartKenoGameResponse,
} from '@/lib/kenoApi';
import { verify_keno_game } from '@/lib/kenoVerification';
import { getSeedInfo, rerollSeed } from '@/lib/minesApi';

export default function KenoPage() {
  const { user, loading, setBalance } = useUser();
  const router = useRouter();
  const [betAmount, setBetAmount] = useState<string>('0.00');
  const [spotsToSelect, setSpotsToSelect] = useState<number>(10);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [matches, setMatches] = useState<number>(0);
  const [isGameActive, setIsGameActive] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [multiplier, setMultiplier] = useState<number>(0.00);
  const [netGain, setNetGain] = useState<string>('0.00');
  const [gameId, setGameId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [showProvablyFair, setShowProvablyFair] = useState<boolean>(false);
  const [selectedVerifyGame, setSelectedVerifyGame] = useState<any>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [currentClientSeed, setCurrentClientSeed] = useState<string>('');
  const [seedGamesPlayed, setSeedGamesPlayed] = useState<number>(0);
  const [nextServerSeedHash, setNextServerSeedHash] = useState<string>('');
  const verificationResultRef = useRef<HTMLDivElement>(null);
  const [showStats, setShowStats] = useState<boolean>(false);
  const [stats, setStats] = useState<any>(null);
  const [currentDrawIndex, setCurrentDrawIndex] = useState<number>(0);
  const [quickPickAmount, setQuickPickAmount] = useState<number>(10);

  const handleHalfBet = () => {
    const current = parseFloat(betAmount) || 0;
    setBetAmount((current / 2).toFixed(2));
  };

  const handleDoubleBet = () => {
    const current = parseFloat(betAmount) || 0;
    setBetAmount((current * 2).toFixed(2));
  };

  const handleNumberClick = (number: number) => {
    if (isGameActive || isAnimating) return;
    
    if (selectedNumbers.includes(number)) {
      // Deselect
      setSelectedNumbers(selectedNumbers.filter(n => n !== number));
    } else {
      // Select only if under limit (max 10)
      if (selectedNumbers.length < 10) {
        setSelectedNumbers([...selectedNumbers, number].sort((a, b) => a - b));
      }
    }
  };

  const handleStartGame = async () => {
    try {
      setErrorMessage('');
      const bet = parseFloat(betAmount);
      
      if (isNaN(bet) || bet <= 0) {
        setErrorMessage('Please enter a valid bet amount');
        return;
      }

      if (selectedNumbers.length === 0) {
        setErrorMessage('Please select at least 1 number');
        return;
      }

      setIsGameActive(true);
      setIsAnimating(true);
      setCurrentDrawIndex(0);

      const response = await startKenoGame(bet, selectedNumbers);
      
      setGameId(response.game_id);
      setDrawnNumbers(response.drawn_numbers);
      setMatches(response.matches);
      setMultiplier(parseFloat(response.multiplier));
      setNetGain(response.net_profit);
      
      // Update user balance
      setBalance(parseFloat(response.balance));
      
      // Animate the drawn numbers one by one
      animateDrawnNumbers(response.drawn_numbers);
      
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Failed to start game');
      setIsGameActive(false);
      setIsAnimating(false);
    }
  };

  const animateDrawnNumbers = async (drawn: number[]) => {
    for (let i = 0; i < drawn.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay between each number
      setCurrentDrawIndex(i + 1);
    }
    
    // After animation completes
    setIsAnimating(false);
    setIsGameActive(false);
    
    // Refresh game history
    fetchGameHistory();
    
    // Keep drawn numbers and results visible until cleared
  };

  const handleClearSelection = () => {
    if (isGameActive || isAnimating) return;
    setSelectedNumbers([]);
    setDrawnNumbers([]);
    setMatches(0);
    setMultiplier(0.00);
    setNetGain('0.00');
    setGameId(null);
    setCurrentDrawIndex(0);
  };

  const handleQuickPick = () => {
    if (isGameActive || isAnimating) return;
    
    // Generate random numbers based on quickPickAmount (max 10)
    const amount = Math.min(quickPickAmount, 10);
    const numbers: number[] = [];
    while (numbers.length < amount) {
      const random = Math.floor(Math.random() * 40) + 1;
      if (!numbers.includes(random)) {
        numbers.push(random);
      }
    }
    setSelectedNumbers(numbers.sort((a, b) => a - b));
  };

  const handleAutoPick = () => {
    if (isGameActive || isAnimating || selectedNumbers.length >= 10) return;
    
    // Add one random number that hasn't been selected yet
    let random: number;
    do {
      random = Math.floor(Math.random() * 40) + 1;
    } while (selectedNumbers.includes(random));
    
    setSelectedNumbers([...selectedNumbers, random].sort((a, b) => a - b));
  };

  const handleVerifyGame = async () => {
    if (!selectedVerifyGame) return;
    
    const result = await verify_keno_game(
      selectedVerifyGame.server_seed,
      selectedVerifyGame.server_seed_hash,
      selectedVerifyGame.client_seed,
      selectedVerifyGame.nonce,
      selectedVerifyGame.drawn_numbers
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
    
    try {
      const response = await rerollSeed();
      setCurrentClientSeed(response.client_seed);
      setSeedGamesPlayed(response.seed_games_played);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Failed to reroll seed');
    }
  };

  const openProvablyFairModal = () => {
    if (gameHistory.length > 0) {
      setSelectedVerifyGame(gameHistory[0]);
    }
    setVerificationResult(null);
    fetchSeedInfo();
    setShowProvablyFair(true);
  };

  const closeProvablyFairModal = () => {
    setShowProvablyFair(false);
    setSelectedVerifyGame(null);
    setVerificationResult(null);
  };

  const openStatsModal = async () => {
    try {
      const statsData = await getKenoStats();
      setStats(statsData);
      setShowStats(true);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const closeStatsModal = () => {
    setShowStats(false);
  };

  const fetchGameHistory = async () => {
    if (!user) return;
    
    try {
      const response = await getKenoGameHistory();
      setGameHistory(response.games);
    } catch (error) {
      console.error('Failed to fetch game history:', error);
    }
  };

  // Load game history and seed info on mount
  useEffect(() => {
    if (!user) return;
    
    fetchGameHistory();
    fetchSeedInfo();
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
                  type="number"
                  id="bet-amount"
                  className={styles.bet_input_field}
                  placeholder="0.00"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  min="0"
                  step="0.01"
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
              <div className={`${styles.label} ${styles.game_label}`}>Selected Numbers</div>
            </div>
            <div className={styles.crowns_display}>
              {selectedNumbers.length} / 10
            </div>
            <div className={styles.label_container}>
              <div className={`${styles.label} ${styles.game_label}`}>Selection</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'stretch', marginTop: '10px', width: '100%' }}>
              <button 
                className={`${styles.bet_section_button} ${(isGameActive || isAnimating) ? styles.disabled : ''}`}
                disabled={isGameActive || isAnimating}
                onClick={handleQuickPick}
                style={{ 
                  borderRadius: '5px 0 0 5px',
                  borderRight: 'none',
                  margin: 0,
                  flex: 1
                }}
              >
                Quick Pick
              </button>
              <select
                className={styles.mines_select}
                value={quickPickAmount}
                onChange={(e) => setQuickPickAmount(Number(e.target.value))}
                disabled={isGameActive || isAnimating}
                style={{
                  borderRadius: '0 5px 5px 0',
                  width: '70px',
                  margin: 0,
                  padding: '0 24px 0 8px'
                }}
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
            <button 
              className={`${styles.bet_section_button} ${(isGameActive || isAnimating || selectedNumbers.length >= 10) ? styles.disabled : ''}`}
              disabled={isGameActive || isAnimating || selectedNumbers.length >= 10}
              onClick={handleAutoPick}
            >
              Auto Pick
            </button>
            <button 
              className={`${styles.bet_section_button} ${(isGameActive || isAnimating) ? styles.disabled : ''}`}
              disabled={isGameActive || isAnimating}
              onClick={handleClearSelection}
            >
              Clear
            </button>
            <button 
              className={`${styles.bet_section_button} ${styles.play_button_green}`}
              onClick={handleStartGame}
              disabled={isGameActive || isAnimating || selectedNumbers.length === 0}
            >
              Play
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
            <div className={styles.keno_board}>
              {Array.from({ length: 40 }, (_, i) => i + 1).map((num) => {
                const isSelected = selectedNumbers.includes(num);
                const isDrawn = drawnNumbers.slice(0, currentDrawIndex).includes(num);
                const isHit = isSelected && isDrawn;
                
                return (
                  <button
                    key={num}
                    className={`${styles.keno_number} ${
                      isSelected ? styles.keno_selected : ''
                    } ${isDrawn ? styles.keno_drawn : ''} ${
                      isHit ? styles.keno_hit : ''
                    }`}
                    onClick={() => {
                      if (!isGameActive && !isAnimating) {
                        handleNumberClick(num);
                      }
                    }}
                    style={{ pointerEvents: (isGameActive || isAnimating) ? 'none' : 'auto' }}
                  >
                    {isHit ? '👑' : num}
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
              disabled={gameHistory.length === 0}
            >
              Provably Fair
            </button>
          </div>

          {gameHistory.length === 0 ? (
            <div className={styles.no_history}>
              <p>No games played yet. Start playing to see your history!</p>
            </div>
          ) : (
            <div className={styles.history_table_wrapper}>
                <div className={styles.history_table_header}>
                <div className={styles.col_game}>Game</div>
                <div className={styles.col_bet}>Bet</div>
                <div className={styles.col_mines}>Spots</div>
                <div className={styles.col_tiles}>Hits</div>
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
                      <div className={styles.col_mines}>{game.spots_selected}</div>
                      <div className={styles.col_tiles}>{game.matches}</div>
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
                  disabled={isGameActive}
                >
                  {isGameActive ? 'Cannot reroll during game' : 'Reroll Client Seed'}
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
                      Game #{game.game_id} - {game.spots_selected} Spots, {game.matches} Hits - {game.status === 'won' ? `Won ${game.payout}` : `Lost ${game.bet_amount}`} 👑
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
                      <span className={styles.seed_label}>Numbers Selected:</span>
                      <span className={styles.seed_value}>{selectedVerifyGame.numbers_selected?.join(', ')}</span>
                    </div>

                    <div className={styles.seed_item}>
                      <span className={styles.seed_label}>Drawn Numbers:</span>
                      <span className={styles.seed_value}>{selectedVerifyGame.drawn_numbers?.join(', ')}</span>
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
                          ? 'Regenerated drawn numbers match the actual game results.'
                          : 'Drawn numbers do not match. This game may have been tampered with.'}
                      </p>

                      {verificationResult.regeneratedDrawnNumbers && (
                        <div className={styles.mine_grid}>
                          <div className={styles.grid_title}>Regenerated Drawn Numbers:</div>
                          <div className={styles.seed_value} style={{ padding: '12px', marginTop: '8px' }}>
                            {verificationResult.regeneratedDrawnNumbers.join(', ')}
                          </div>
                        </div>
                      )}
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
              <h2 className={styles.modal_title}>Keno Statistics</h2>
              <button className={styles.modal_close} onClick={closeStatsModal}>✕</button>
            </div>

            <div className={styles.stats_container}>
              <div className={styles.stats_grid}>
                <div className={styles.stat_card}>
                  <div className={styles.stat_label}>Games Played</div>
                  <div className={styles.stat_value}>{stats.games_played}</div>
                </div>
                
                <div className={styles.stat_card}>
                  <div className={styles.stat_label}>Win Rate</div>
                  <div className={styles.stat_value}>{stats.win_rate}%</div>
                </div>
                
                <div className={styles.stat_card}>
                  <div className={styles.stat_label}>Games Won</div>
                  <div className={styles.stat_value_success}>{stats.games_won}</div>
                </div>
                
                <div className={styles.stat_card}>
                  <div className={styles.stat_label}>Games Lost</div>
                  <div className={styles.stat_value_danger}>{stats.games_lost}</div>
                </div>
                
                <div className={styles.stat_card}>
                  <div className={styles.stat_label}>Total Wagered</div>
                  <div className={styles.stat_value}>{stats.total_wagered} 👑</div>
                </div>
                
                <div className={styles.stat_card}>
                  <div className={styles.stat_label}>Total Profit</div>
                  <div className={parseFloat(stats.total_profit) >= 0 ? styles.stat_value_success : styles.stat_value_danger}>
                    {parseFloat(stats.total_profit) >= 0 ? '+' : ''}{stats.total_profit} 👑
                  </div>
                </div>
                
                <div className={styles.stat_card}>
                  <div className={styles.stat_label}>Biggest Win</div>
                  <div className={styles.stat_value_success}>{stats.biggest_win} 👑</div>
                </div>
                
                <div className={styles.stat_card}>
                  <div className={styles.stat_label}>Average Bet</div>
                  <div className={styles.stat_value}>{stats.average_bet} 👑</div>
                </div>
                
                <div className={styles.stat_card}>
                  <div className={styles.stat_label}>Current Streak</div>
                  <div className={stats.current_streak > 0 ? styles.stat_value_success : stats.current_streak < 0 ? styles.stat_value_danger : styles.stat_value}>
                    {stats.current_streak > 0 ? `${stats.current_streak} Wins 🔥` : stats.current_streak < 0 ? `${Math.abs(stats.current_streak)} Losses` : '0'}
                  </div>
                </div>
                
                <div className={styles.stat_card}>
                  <div className={styles.stat_label}>Best Streak</div>
                  <div className={styles.stat_value_success}>{stats.best_streak} Wins 🏆</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
