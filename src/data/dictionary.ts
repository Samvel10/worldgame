import rawAnswers from './answers.json';
import { normalizeWord } from '../game/armenian';
import type { Answer } from '../game/types';
export const answers: Answer[] = rawAnswers as Answer[];
export const acceptedWords = new Set<string>();
/** Validate fully before mutation so a failed reload cannot poison a usable dictionary. */
export function initializeDictionary(value: unknown): void {
 if (!Array.isArray(value) || value.length < 1000 || !value.every(word => typeof word === 'string' && /^[ա-ֆև]+$/.test(word) && normalizeWord(word) === word)) throw new Error('Invalid dictionary data');
 const next = new Set<string>(value);
 if (!answers.every(answer => next.has(answer.word))) throw new Error('Invalid dictionary data');
 acceptedWords.clear();
 next.forEach(word => acceptedWords.add(word));
}
