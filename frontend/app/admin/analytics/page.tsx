"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useUser } from '@/context/UserContext';
import { getAdminAnalytics } from '@/lib/analyticsApi';
import styles from '@/css/Analytics.module.css';

type AnalyticsData = {
  summary: {
    total_wagered: string;
    total_payouts: string;
    house_profit: string;
    total_games: number;
    total_wins: number;
    active_players: number;
    unique_players: number;
  };
  metrics: {
    rtp: string;
    house_edge: string;
    win_rate: string;
    avg_bet: string;
  };
  games: {
    mines: {
      games_played: number;
      games_won: number;
      total_wagered: string;
      total_payouts: string;
      avg_bet: string;
      max_payout: string;
      win_rate: string;
    };
    keno: {
      games_played: number;
      games_won: number;
      total_wagered: string;
      total_payouts: string;
      avg_bet: string;
      max_payout: string;
      win_rate: string;
    };
  };
  popularity: {
    mines: number;
    keno: number;
    most_popular: string;
  };
  period: {
    start_date: string | null;
    end_date: string;
  };
};

export default function AdminAnalyticsPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [gameType, setGameType] = useState<'all' | 'mines' | 'keno'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    fetchAnalytics();
  }, [gameType, startDate, endDate]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getAdminAnalytics({
        game: gameType,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setAnalyticsData(data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('Admin access required. You do not have permission to view this page.');
      } else {
        setError(err.response?.data?.error || 'Failed to load analytics');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className={styles.container}>
        <Header />
        <Sidebar />
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Header />
      <Sidebar />

      <main className={styles.main}>
        <div className={styles.analytics_container}>
          <div className={styles.header_section}>
            <h1 className={styles.title}>📊 Admin Analytics</h1>
            <p className={styles.subtitle}>Game Performance & Business Metrics</p>
          </div>

          {error && (
            <div className={styles.error_message}>{error}</div>
          )}

          {!error && (
            <>
              <div className={styles.controls}>
                <div className={styles.control_group}>
                  <label>Game Type</label>
                  <select value={gameType} onChange={(e) => setGameType(e.target.value as any)}>
                    <option value="all">All Games</option>
                    <option value="mines">Mines Only</option>
                    <option value="keno">Keno Only</option>
                  </select>
                </div>
                <div className={styles.control_group}>
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className={styles.control_group}>
                  <label>End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {isLoading ? (
                <div className={styles.loading_state}>
                  <div className={styles.spinner}></div>
                  <p>Loading analytics...</p>
                </div>
              ) : analyticsData ? (
                <>
                  {/* Key Metrics Section */}
                  <section className={styles.section}>
                    <h2 className={styles.section_title}>Key Performance Indicators</h2>
                    <div className={styles.metrics_grid}>
                      <div className={styles.metric_card}>
                        <div className={styles.metric_label}>RTP (Return to Player)</div>
                        <div className={styles.metric_value}>{analyticsData.metrics.rtp}%</div>
                        <div className={styles.metric_subtext}>Player payout ratio</div>
                      </div>
                      <div className={styles.metric_card}>
                        <div className={styles.metric_label}>House Edge</div>
                        <div className={styles.metric_value}>{analyticsData.metrics.house_edge}%</div>
                        <div className={styles.metric_subtext}>House profit ratio</div>
                      </div>
                      <div className={styles.metric_card}>
                        <div className={styles.metric_label}>Overall Win Rate</div>
                        <div className={styles.metric_value}>{analyticsData.metrics.win_rate}%</div>
                        <div className={styles.metric_subtext}>Games won by players</div>
                      </div>
                      <div className={styles.metric_card}>
                        <div className={styles.metric_label}>Average Bet</div>
                        <div className={styles.metric_value}>{analyticsData.metrics.avg_bet} 👑</div>
                        <div className={styles.metric_subtext}>Per game average</div>
                      </div>
                    </div>
                  </section>

                  {/* Financial Summary */}
                  <section className={styles.section}>
                    <h2 className={styles.section_title}>Financial Summary</h2>
                    <div className={styles.summary_grid}>
                      <div className={styles.summary_card}>
                        <div className={styles.summary_label}>Total Wagered</div>
                        <div className={styles.summary_value}>{analyticsData.summary.total_wagered} 👑</div>
                      </div>
                      <div className={styles.summary_card}>
                        <div className={styles.summary_label}>Total Payouts</div>
                        <div className={styles.summary_value}>{analyticsData.summary.total_payouts} 👑</div>
                      </div>
                      <div className={`${styles.summary_card} ${styles.profit_card}`}>
                        <div className={styles.summary_label}>House Profit</div>
                        <div className={styles.summary_value}>{analyticsData.summary.house_profit} 👑</div>
                      </div>
                    </div>
                  </section>

                  {/* Game Activity */}
                  <section className={styles.section}>
                    <h2 className={styles.section_title}>Activity Overview</h2>
                    <div className={styles.activity_grid}>
                      <div className={styles.activity_card}>
                        <div className={styles.activity_label}>Total Games</div>
                        <div className={styles.activity_value}>{analyticsData.summary.total_games}</div>
                      </div>
                      <div className={styles.activity_card}>
                        <div className={styles.activity_label}>Total Wins</div>
                        <div className={styles.activity_value}>{analyticsData.summary.total_wins}</div>
                      </div>
                      <div className={styles.activity_card}>
                        <div className={styles.activity_label}>Active Players</div>
                        <div className={styles.activity_value}>{analyticsData.summary.active_players}</div>
                      </div>
                      <div className={styles.activity_card}>
                        <div className={styles.activity_label}>Unique Players</div>
                        <div className={styles.activity_value}>{analyticsData.summary.unique_players}</div>
                      </div>
                    </div>
                  </section>

                  {/* Game Breakdown */}
                  <section className={styles.section}>
                    <h2 className={styles.section_title}>Game Breakdown</h2>
                    <div className={styles.games_grid}>
                      {/* Mines */}
                      <div className={styles.game_breakdown_card}>
                        <div className={styles.game_header}>
                          <span className={styles.game_title}>💣 Mines</span>
                          <span className={styles.game_popularity}>
                            {analyticsData.popularity.mines} games (
                            {analyticsData.popularity.mines + analyticsData.popularity.keno > 0
                              ? (
                                  (analyticsData.popularity.mines /
                                    (analyticsData.popularity.mines + analyticsData.popularity.keno)) *
                                  100
                                ).toFixed(1)
                              : 0}
                            %)
                          </span>
                        </div>
                        <div className={styles.breakdown_row}>
                          <span>Games Played:</span>
                          <span className={styles.value}>{analyticsData.games.mines.games_played}</span>
                        </div>
                        <div className={styles.breakdown_row}>
                          <span>Games Won:</span>
                          <span className={styles.value}>{analyticsData.games.mines.games_won}</span>
                        </div>
                        <div className={styles.breakdown_row}>
                          <span>Win Rate:</span>
                          <span className={styles.value}>{analyticsData.games.mines.win_rate}%</span>
                        </div>
                        <div className={styles.breakdown_row}>
                          <span>Total Wagered:</span>
                          <span className={styles.value}>{analyticsData.games.mines.total_wagered} 👑</span>
                        </div>
                        <div className={styles.breakdown_row}>
                          <span>Total Payouts:</span>
                          <span className={styles.value}>{analyticsData.games.mines.total_payouts} 👑</span>
                        </div>
                        <div className={styles.breakdown_row}>
                          <span>Average Bet:</span>
                          <span className={styles.value}>{analyticsData.games.mines.avg_bet} 👑</span>
                        </div>
                        <div className={styles.breakdown_row}>
                          <span>Max Payout:</span>
                          <span className={styles.value}>{analyticsData.games.mines.max_payout} 👑</span>
                        </div>
                      </div>

                      {/* Keno */}
                      <div className={styles.game_breakdown_card}>
                        <div className={styles.game_header}>
                          <span className={styles.game_title}>🎱 Keno</span>
                          <span className={styles.game_popularity}>
                            {analyticsData.popularity.keno} games (
                            {analyticsData.popularity.mines + analyticsData.popularity.keno > 0
                              ? (
                                  (analyticsData.popularity.keno /
                                    (analyticsData.popularity.mines + analyticsData.popularity.keno)) *
                                  100
                                ).toFixed(1)
                              : 0}
                            %)
                          </span>
                        </div>
                        <div className={styles.breakdown_row}>
                          <span>Games Played:</span>
                          <span className={styles.value}>{analyticsData.games.keno.games_played}</span>
                        </div>
                        <div className={styles.breakdown_row}>
                          <span>Games Won:</span>
                          <span className={styles.value}>{analyticsData.games.keno.games_won}</span>
                        </div>
                        <div className={styles.breakdown_row}>
                          <span>Win Rate:</span>
                          <span className={styles.value}>{analyticsData.games.keno.win_rate}%</span>
                        </div>
                        <div className={styles.breakdown_row}>
                          <span>Total Wagered:</span>
                          <span className={styles.value}>{analyticsData.games.keno.total_wagered} 👑</span>
                        </div>
                        <div className={styles.breakdown_row}>
                          <span>Total Payouts:</span>
                          <span className={styles.value}>{analyticsData.games.keno.total_payouts} 👑</span>
                        </div>
                        <div className={styles.breakdown_row}>
                          <span>Average Bet:</span>
                          <span className={styles.value}>{analyticsData.games.keno.avg_bet} 👑</span>
                        </div>
                        <div className={styles.breakdown_row}>
                          <span>Max Payout:</span>
                          <span className={styles.value}>{analyticsData.games.keno.max_payout} 👑</span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.most_popular}>
                      <strong>Most Popular:</strong> {analyticsData.popularity.most_popular}
                    </div>
                  </section>
                </>
              ) : null}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
