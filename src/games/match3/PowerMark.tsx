import type { Special } from './engine';

export const powerNames: Record<Special, string> = { row: 'очищает строку', column: 'очищает столбец', burst: 'взрыв 3 на 3', prism: 'убирает все сладости выбранного вида' };

export function PowerMark({ kind }: { kind: Special }) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {kind === 'row' ? <><path d="M3 8h18M3 16h18M3 12h18"/><path d="m18 5 3 3-3 3M6 13l-3 3 3 3"/></>
      : kind === 'column' ? <><path d="M8 3v18M16 3v18M12 3v18"/><path d="m5 6 3-3 3 3M13 18l3 3 3-3"/></>
      : kind === 'burst' ? <><path d="m12 3 2 6 7-2-4 5 4 5-7-2-2 6-2-6-7 2 4-5-4-5 7 2 2-6Z"/></>
      : <><circle cx="12" cy="12" r="8"/><path d="m12 5 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z"/></>}
  </svg>;
}
