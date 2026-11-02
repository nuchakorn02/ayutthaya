export interface Player {
  id: string;
  player_name: string;
  division: string;
  total_score: number;
  position?: string;
  starting_score?: number;
  latest_change?: number;
  created_at: string;
}

export interface ScoreHistory {
  id: string;
  player_id: string;
  old_score: number;
  new_score: number;
  score_diff: number;
  reason?: string;
  updated_at: string;
}

export interface TopIncrease {
  player_name: string;
  division: string;
  score_increase: number;
  last_updated: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface ImportSession {
  id: string;
  filename: string;
  imported_count: number;
  updated_count: number;
  created_at: string;
}

export interface ImportLog {
  id: string;
  import_id: string;
  player_name: string;
  division: string;
  old_score: number;
  new_score: number;
  score_diff: number;
  is_new?: boolean;
  created_at: string;
}

// Improvement #13: type กลางสำหรับ Rank Threshold แทนการใช้ any[]
export interface RankThreshold {
  score: number;
  policeTitle: string;
  guardTitle: string;
}
