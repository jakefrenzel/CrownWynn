"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useUser } from '@/context/UserContext';
import { getLeaderboard } from '@/lib/leaderboardApi';
import styles from '@/css/Leaderboard.module.css';

type LeaderboardEntry = {
  rank: number;
  username: string;
  value: string;
  display_value: string;
};

type LeaderboardData = {
  leaderboard: LeaderboardEntry[];
  category: string;
  period: string;
  period_start: string;
};

export default function LeaderboardPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [category, setCategory] = useState<'balance' | 'total_wagered' | 'biggest_win'>('balance');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    fetchLeaderboard();
  }, [category]);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getLeaderboard(category, 10);
      setLeaderboardData(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryTitle = () => {
    switch (category) {
      case 'balance':
        return 'Current Balance';
      case 'total_wagered':
        return 'Total Wagered (This Month)';
      case 'biggest_win':
        return 'Biggest Win (This Month)';
      default:
        return 'Leaderboard';
    }
  };

  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return rank;
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
        <div className={styles.leaderboard_container}>
          <div className={styles.header_section}>
            <h1 className={styles.title}>🏆 Leaderboard</h1>
            <p className={styles.subtitle}>Monthly Rankings - Top 10 Players</p>
          </div>

          <div className={styles.category_selector}>
            <button
              className={`${styles.category_btn} ${category === 'balance' ? styles.active : ''}`}
              onClick={() => setCategory('balance')}
            >
              Current Balance
            </button>
            <button
              className={`${styles.category_btn} ${category === 'total_wagered' ? styles.active : ''}`}
              onClick={() => setCategory('total_wagered')}
            >
              Total Wagered
            </button>
            <button
              className={`${styles.category_btn} ${category === 'biggest_win' ? styles.active : ''}`}
              onClick={() => setCategory('biggest_win')}
            >
              Biggest Win
            </button>
          </div>

          {error && (
            <div className={styles.error_message}>{error}</div>
          )}

          {isLoading ? (
            <div className={styles.loading_state}>
              <div className={styles.spinner}></div>
              <p>Loading leaderboard...</p>
            </div>
          ) : leaderboardData && leaderboardData.leaderboard.length > 0 ? (
            <div className={styles.leaderboard_card}>
              <div className={styles.card_header}>
                <h2 className={styles.card_title}>{getCategoryTitle()}</h2>
              </div>

              <div className={styles.table_container}>
                <table className={styles.leaderboard_table}>
                  <thead>
                    <tr>
                      <th className={styles.rank_col}>Rank</th>
                      <th className={styles.player_col}>Player</th>
                      <th className={styles.value_col}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData.leaderboard.map((entry) => (
                      <tr
                        key={entry.rank}
                        className={`${styles.table_row} ${entry.username === user.username ? styles.current_user : ''}`}
                      >
                        <td className={styles.rank_cell}>
                          <span className={styles.rank_badge}>
                            {getMedalEmoji(entry.rank)}
                          </span>
                        </td>
                        <td className={styles.player_cell}>
                          <span className={styles.username}>
                            {entry.username}
                            {entry.username === user.username && (
                              <span className={styles.you_badge}>You</span>
                            )}
                          </span>
                        </td>
                        <td className={styles.value_cell}>
                          {entry.display_value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className={styles.empty_state}>
              <p>No data available for this category yet.</p>
              <p className={styles.empty_subtitle}>Be the first to make the leaderboard!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
