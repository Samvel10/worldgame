/** NFC and one canonical spelling for the ligature; never trim invalid input. */
export function normalizeWord(word: string): string {
  return word.normalize('NFC').toLowerCase().replace(/եւ|եվ/g, 'և');
}
export function isArmenian(word: string): boolean {
  return /^[ա-ֆև]+$/.test(normalizeWord(word));
}
/** Armenian ու and և each occupy one playable tile. */
export function letters(word: string): string[] {
  return normalizeWord(word).match(/ու|և|[ա-ֆ]/g) ?? [];
}

/**
 * Build the current row: paid reveals keep their seats; typed letters fill the rest left to right.
 */
export function currentRowLetters(
  draft: string,
  revealed: Record<number, string>,
  length: number,
): string[] {
  const row = Array.from({ length }, (_, i) => revealed[i] ?? '');
  let typedAt = 0;
  const typed = letters(draft);
  for (let i = 0; i < length; i++) {
    if (row[i]) continue;
    if (typedAt < typed.length) {
      row[i] = typed[typedAt];
      typedAt += 1;
    }
  }
  return row;
}

/** Letters the player typed into non-revealed seats (excludes paid reveals). */
export function draftFromRow(row: string[], revealed: Record<number, string>): string {
  return row.filter((char, i) => Boolean(char) && revealed[i] === undefined).join('');
}

/** Delete whole Armenian tiles while preserving the native input's caret/selection. */
export function deleteBackward(
  word: string,
  start: number,
  end: number,
): { value: string; caret: number } {
  let offset = 0;
  const ranges = letters(word).map((letter) => {
    const range = { start: offset, end: offset + letter.length };
    offset = range.end;
    return range;
  });
  const selected = ranges.filter((range) =>
    start === end
      ? range.start < start && range.end >= start
      : range.end > start && range.start < end,
  );
  if (!selected.length) return { value: word, caret: start };
  const from = selected[0].start;
  const to = selected[selected.length - 1].end;
  return { value: word.slice(0, from) + word.slice(to), caret: from };
}
