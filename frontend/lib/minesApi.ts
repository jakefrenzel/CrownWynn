import axiosInstance from "./axiosInstance";

export interface StartGameResponse {
  game_id: number;
  server_seed_hash: string;
  client_seed: string;
  nonce: number;
  mines_count: number;
  bet_amount: string;
  current_multiplier: string;
  revealed_tiles: number[];
  balance: string;
}

export interface RevealTileResponse {
  game_over: boolean;
  hit_mine: boolean;
  tile_position: number;
  revealed_tiles?: number[];
  current_multiplier?: string;
  potential_payout?: string;
  tiles_revealed?: number;
  safe_tiles_remaining?: number;
  mine_positions?: number[];
  server_seed?: string;
  payout?: string;
  net_profit?: string;
  balance?: string;
}

export interface CashoutResponse {
  success: boolean;
  payout: string;
  net_profit: string;
  multiplier: string;
  tiles_revealed: number;
  mine_positions: number[];
  server_seed: string;
  balance: string;
}

export interface ActiveGameResponse {
  has_active_game: boolean;
  game_id?: number;
  bet_amount?: string;
  mines_count?: number;
  current_multiplier?: string;
  revealed_tiles?: number[];
  tiles_revealed?: number;
  safe_tiles_remaining?: number;
  server_seed_hash?: string;
  client_seed?: string;
  nonce?: number;
  created_at?: string;
}

export interface GameHistoryItem {
  game_id: number;
  bet_amount: string;
  mines_count: number;
  tiles_revealed: number;
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
  mine_positions: number[];
  revealed_tiles: number[];
}

export interface GameHistoryResponse {
  games: GameHistoryItem[];
  count: number;
}

export const startMinesGame = async (
  betAmount: number,
  minesCount: number,
  clientSeed?: string
): Promise<StartGameResponse> => {
  const response = await axiosInstance.post("/api/mines/start/", {
    bet_amount: betAmount,
    mines_count: minesCount,
    client_seed: clientSeed,
  });
  return response.data;
};

export const revealTile = async (
  gameId: number,
  tilePosition: number
): Promise<RevealTileResponse> => {
  const response = await axiosInstance.post("/api/mines/reveal/", {
    game_id: gameId,
    tile_position: tilePosition,
  });
  return response.data;
};

export const cashout = async (gameId: number): Promise<CashoutResponse> => {
  const response = await axiosInstance.post("/api/mines/cashout/", {
    game_id: gameId,
  });
  return response.data;
};

export const rerollSeed = async (): Promise<{ client_seed: string; message: string }> => {
  const response = await axiosInstance.post("/api/mines/reroll-seed/");
  return response.data;
};

export const getGameHistory = async (): Promise<GameHistoryResponse> => {
  const response = await axiosInstance.get("/api/mines/history/");
  return response.data;
};

export const getActiveGame = async (): Promise<ActiveGameResponse> => {
  const response = await axiosInstance.get("/api/mines/active/");
  return response.data;
};
