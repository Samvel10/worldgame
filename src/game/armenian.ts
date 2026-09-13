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
