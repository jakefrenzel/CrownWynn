import axiosInstance from "./axiosInstance";

export interface StartKenoGameResponse {
  game_id: number;
  server_seed: string;
  server_seed_hash: string;
  client_seed: string;
  nonce: number;
  numbers_selected: number[];
  drawn_numbers: number[];
  matches: number;
  multiplier: string;
  payout: string;
  net_profit: string;
  status: string;
  balance: string;
}

export interface KenoGameHistoryItem {
  game_id: number;
  bet_amount: string;
  numbers_selected: number[];
  spots_selected: number;
  drawn_numbers: number[];
  matches: number;
  multiplier: string;
  payout: string;
  net_profit: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  server_seed: string;
  server_seed_hash: string;
  client_seed: string;
  nonce: number;
}

export interface KenoGameHistoryResponse {
  games: KenoGameHistoryItem[];
  count: number;
}

export interface ActiveKenoGameResponse {
  has_active_game: boolean;
  game_id?: number;
  bet_amount?: string;
  numbers_selected?: number[];
  drawn_numbers?: number[];
  matches?: number;
  multiplier?: string;
  server_seed_hash?: string;
  client_seed?: string;
  nonce?: number;
  created_at?: string;
}

export interface KenoStatsResponse {
  games_played: number;
  games_won: number;
  games_lost: number;
  win_rate: string;
  total_wagered: string;
  total_profit: string;
  biggest_win: string;
  current_streak: number;
  best_streak: number;
  average_bet: string;
}

export const startKenoGame = async (
  betAmount: number,
  numbersSelected: number[],
  clientSeed?: string
): Promise<StartKenoGameResponse> => {
  const response = await axiosInstance.post("/api/keno/start/", {
    bet_amount: betAmount,
    numbers_selected: numbersSelected,
    client_seed: clientSeed,
  });
  return response.data;
};

export const getKenoGameHistory = async (): Promise<KenoGameHistoryResponse> => {
  const response = await axiosInstance.get("/api/keno/history/");
  return response.data;
};

export const getActiveKenoGame = async (): Promise<ActiveKenoGameResponse> => {
  const response = await axiosInstance.get("/api/keno/active/");
  return response.data;
};

export const getKenoStats = async (): Promise<KenoStatsResponse> => {
  const response = await axiosInstance.get("/api/keno/stats/");
  return response.data;
};
