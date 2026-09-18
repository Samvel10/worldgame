export const STARTING_BALANCE: number;
export const SOLO_WIN_REWARD: number;
export const BATTLE_WIN_REWARD: number;
export const HINT_LETTER_COST: number;
export const HINT_CLUE_COST: number;
export const HINT_SKIP_COST: number;
export const HINT_COSTS: { letter: number; clue: number; skip: number };
export const SOLO_REWARD_COOLDOWN_MS: number;
export function normalizeBalance(value: unknown): number;
