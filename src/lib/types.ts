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

export interface ImportValidationError {
  source_row: number | null;
  reason: string;
}

export interface ImportPreviewRow {
  action: 'new' | 'update' | 'retire' | 'error';
  source_row: number | null;
  player_id?: string;
  player_name: string;
  division: string;
  current_score: number | null;
  proposed_score: number | null;
  score_diff: number | null;
  message?: string;
}

export interface ImportPlan {
  rows: ImportPreviewRow[];
  counts: { new: number; updated: number; retired: number; errors: number };
  errors: ImportValidationError[];
}

export interface ImportPreview {
  source_name: string;
  source_fingerprint: string;
  comparison_fingerprint: string;
  confirmation_token: string | null;
  rows: ImportPreviewRow[];
  counts: { new: number; updated: number; retired: number; errors: number };
  errors: ImportValidationError[];
}

export interface ImportComparisonState {
  players: Player[];
}
