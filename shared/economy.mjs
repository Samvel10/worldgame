/** Virtual currency granted on account registration. Not real money. */
export const STARTING_BALANCE = 100;

/** Coerce stored balance to a non-negative integer. Invalid values become 0. */
export function normalizeBalance(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}
