export function roundDuration(seconds = 90) {
  if (typeof seconds !== 'number' || !Number.isInteger(seconds) || seconds < 0 || seconds > 3600)
    throw new RangeError('duration');
  return seconds * 1000;
}
export function elapsedRound(startedAt, deadline, now) {
  return Math.max(0, Math.min(now, deadline ?? now) - startedAt);
}
export function comparePlayers(a, b) {
  return b.solvedCount - a.solvedCount || b.score - a.score || a.totalTimeMs - b.totalTimeMs;
}
export function formatTime(ms) {
  const tenths = Math.floor(Math.max(0, ms) / 100);
  return `${Math.floor(tenths / 600)}:${String(Math.floor(tenths / 10) % 60).padStart(2, '0')}.${tenths % 10}`;
}
/** Discovery credit is retained per round, not paid again on every guess. */
export function scoreGuess(previous, letters, marks, solved) {
  const progress = {
    greens: { ...(previous?.greens ?? {}) },
    known: { ...(previous?.known ?? {}) },
  };
  function credit(state) {
    const greens = Object.values(state?.greens ?? {});
    const greenCounts = {};
    for (const letter of greens) greenCounts[letter] = (greenCounts[letter] ?? 0) + 1;
    return (
      greens.length * 100 +
      Object.entries(state?.known ?? {}).reduce(
        (sum, [letter, count]) => sum + 40 * Math.max(0, count - (greenCounts[letter] ?? 0)),
        0,
      )
    );
  }
  const found = {};
  marks.forEach((mark, index) => {
    const letter = letters[index];
    if (mark === 'correct') progress.greens[index] = letter;
    if (mark === 'correct' || mark === 'present') found[letter] = (found[letter] ?? 0) + 1;
  });
  for (const [letter, count] of Object.entries(found))
    progress.known[letter] = Math.max(progress.known[letter] ?? 0, count);
  return { progress, delta: credit(progress) - credit(previous) + (solved ? 1000 : -5) };
}
