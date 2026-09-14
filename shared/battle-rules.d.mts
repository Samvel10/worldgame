export function roundDuration(seconds?: unknown): number;
export function elapsedRound(startedAt: number, deadline: number | null, now: number): number;
export function comparePlayers(
  a: { solvedCount: number; totalTimeMs: number; score: number },
  b: { solvedCount: number; totalTimeMs: number; score: number },
): number;
export function formatTime(ms: number): string;
