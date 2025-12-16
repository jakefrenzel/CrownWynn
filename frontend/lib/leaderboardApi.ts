import axiosInstance from './axiosInstance';

export const getLeaderboard = async (category: 'balance' | 'total_wagered' | 'biggest_win' = 'balance', limit: number = 50) => {
  const response = await axiosInstance.get('/api/leaderboard/', {
    params: { category, limit }
  });
  return response.data;
};
