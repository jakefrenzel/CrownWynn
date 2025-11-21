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
  getGameHistory,
  getSeedInfo,
  rerollSeed,
  type StartGameResponse,
} from '@/lib/minesApi';
import { verify_game } from '@/lib/minesVerification';

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
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [showProvablyFair, setShowProvablyFair] = useState<boolean>(false);
  const [selectedVerifyGame, setSelectedVerifyGame] = useState<any>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [currentClientSeed, setCurrentClientSeed] = useState<string>('');
  const [seedGamesPlayed, setSeedGamesPlayed] = useState<number>(0);
  
  // Calculate crowns: 25 total tiles - mines - revealed tiles
  const crownsCount = 25 - minesCount - revealedTiles.length;

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
      
      // Refresh game history
      fetchGameHistory();
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
  };

  const fetchSeedInfo = async () => {
    if (!user) return;
    
    try {
      const response = await getSeedInfo();
      setCurrentClientSeed(response.client_seed);
      setSeedGamesPlayed(response.seed_games_played);
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

  const handleTileClick = async (tilePosition: number) => {
    if (!gameId || !isGameActive || gameOver || revealedTiles.includes(tilePosition)) {
      return;
    }

    try {
      setErrorMessage('');
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
    }
  };

  const fetchGameHistory = async () => {
    if (!user) return;
    
    try {
      const response = await getGameHistory();
      setGameHistory(response.games);
    } catch (error) {
      console.error('Failed to fetch game history:', error);
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
              disabled={isGameActive && revealedTiles.length === 0}
            >
              {isGameActive ? 'Cashout' : 'Play'}
            </button>
            <button 
              className={`${styles.bet_section_button} ${!isGameActive ? styles.disabled : ''}`}
              disabled={!isGameActive}
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
                      Game #{game.game_id} - {game.status === 'won' ? 'Won' : 'Lost'} - {game.bet_amount} 👑
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
                    <div className={`${styles.verification_result} ${verificationResult.isValid ? styles.valid : styles.invalid}`}>
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
    </div>
  );
}
