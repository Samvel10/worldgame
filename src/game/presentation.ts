import type { Mark } from './types';
export const markNames: Record<Mark, string> = {
  correct: 'Ճիշտ դիրքում',
  present: 'Այլ դիրքում',
  absent: 'Բառում չկա',
};
export const markSymbols: Record<Mark, string> = { correct: '✓', present: '•', absent: '−' };
