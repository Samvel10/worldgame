export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type Mode = Difficulty | 'custom';
export type Mark = 'correct' | 'present' | 'absent';
export type KeyboardState = Record<string, Mark>;
export interface Answer {
  word: string;
  difficulty: Difficulty;
  theme: string;
  definition?: string;
  /** Soft paid clue — does not name the word. */
  hint?: string;
}
export interface Settings {
  mode: Mode;
  length: number;
  attempts: number;
  difficulty: Difficulty | 'all';
}
export interface Stats {
  played: number;
  wins: number;
  streak: number;
  bestStreak: number;
  distribution: Record<string, number>;
}
export type Status = 'playing' | 'won' | 'lost';
export interface Round {
  answer: Answer;
  guesses: string[];
  attempts: number;
  mode: Mode;
  hintUsed: boolean;
  /** Paid letter reveal: tile index → letter */
  revealed: Record<number, string>;
  /** Paid soft description shown once */
  clueShown: boolean;
}
export type Theme = 'light' | 'dark';
