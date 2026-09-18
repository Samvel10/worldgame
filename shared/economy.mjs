/** Virtual currency granted on account registration. Not real money. */
export const STARTING_BALANCE = 100;

/** Solo: one secret word solved (registered accounts only). */
export const SOLO_WIN_REWARD = 3;

/** Battle: awarded to every first-place finisher when the match ends. */
export const BATTLE_WIN_REWARD = 20;

/** Solo paid hints (registered accounts only). */
export const HINT_LETTER_COST = 10;
export const HINT_CLUE_COST = 20;
export const HINT_SKIP_COST = 50;

export const HINT_COSTS = {
  letter: HINT_LETTER_COST,
  clue: HINT_CLUE_COST,
  skip: HINT_SKIP_COST,
};

/** Minimum gap between solo-win credits for one account (anti-spam). */
export const SOLO_REWARD_COOLDOWN_MS = 15_000;

/** Coerce stored balance to a non-negative integer. Invalid values become 0. */
export function normalizeBalance(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}
