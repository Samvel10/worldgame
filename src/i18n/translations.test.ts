import { describe, it, expect } from 'vitest';
import { translations } from './translations';
function keys(value: unknown, prefix = ''): string[] {
  return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) =>
    typeof item === 'string' ? [prefix + key] : keys(item, prefix + key + '.'),
  );
}
describe('complete UI translations', () => {
  it('has the same leaf keys in all three languages', () => {
    expect(keys(translations.en).sort()).toEqual(keys(translations.hy).sort());
    expect(keys(translations.ru).sort()).toEqual(keys(translations.hy).sort());
  });
});
