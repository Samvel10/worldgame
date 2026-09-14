export function roundDuration(seconds = 90) {
  if (typeof seconds !== 'number' || !Number.isInteger(seconds) || seconds < 0 || seconds > 3600)
    throw new RangeError('duration');
  return seconds * 1000;
}
export function elapsedRound(startedAt, deadline, now) {
  return Math.max(0, Math.min(now, deadline ?? now) - startedAt);
}
export function comparePlayers(a, b) {
  return b.solvedCount - a.solvedCount || a.totalTimeMs - b.totalTimeMs || b.score - a.score;
}
export function formatTime(ms) {
  const tenths = Math.floor(Math.max(0, ms) / 100);
  return `${Math.floor(tenths / 600)}:${String(Math.floor(tenths / 10) % 60).padStart(2, '0')}.${tenths % 10}`;
}
