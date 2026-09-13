export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type Mode = Difficulty | 'custom';
export type Mark = 'correct' | 'present' | 'absent';
export type KeyboardState = Record<string, Mark>;
export interface Answer {
  word: string;
  difficulty: Difficulty;
  theme: string;
  definition?: string;
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
}
export type Theme = 'light' | 'dark';
