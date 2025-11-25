import api from './axiosInstance';

export interface DailyRewardStatus {
  can_claim: boolean;
  time_remaining: number;
  last_claim: string | null;
}

export interface DailyRewardResponse {
  message: string;
  reward_amount: string;
  new_balance: string;
  next_claim_at: string;
}

export const checkDailyReward = async (): Promise<DailyRewardStatus> => {
  const response = await api.get('/api/user/claim-daily-reward/');
  return response.data;
};

export const claimDailyReward = async (): Promise<DailyRewardResponse> => {
  const response = await api.post('/api/user/claim-daily-reward/');
  return response.data;
};
