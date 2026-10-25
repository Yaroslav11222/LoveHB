import { asset } from '../world';

// Swap this directory to change the entire art set without changing candy IDs.
const sweetArt = 'sweets/painted';

export const sweets = [
  { id: 'wafer', name: 'Вафельный тортик', image: asset(`${sweetArt}/wafer.png`) },
  { id: 'fondant', name: 'Шоколадный фондан', image: asset(`${sweetArt}/fondant.png`) },
  { id: 'spread', name: 'Ореховая паста', image: asset(`${sweetArt}/spread.png`) },
  { id: 'bar', name: 'Шоколадная вафелька', image: asset(`${sweetArt}/bar.png`) },
  { id: 'blueberry', name: 'Голубика', image: asset(`${sweetArt}/blueberry.png`) },
] as const;

export type SweetId = typeof sweets[number]['id'];
export type SweetLevel = {
  id: string;
  title: string;
  size: number;
  moves: number;
  goals: { kind: SweetId; count: number }[];
  winTitle: string;
  winMessage: string;
};

// The first playable level. Goals, board size, moves and copy live here.
export const sweetLevel: SweetLevel = {
  id: 'sweet-box-01',
  title: 'Три в ряд',
  size: 7,
  moves: 24,
  goals: [{ kind: 'wafer', count: 18 }, { kind: 'blueberry', count: 12 }, { kind: 'bar', count: 12 }],
  winTitle: 'Уровень пройден',
  winMessage: 'Все цели собраны.',
};

export const sweetMotion = {
  swap: 220,
  clear: 260,
  power: 520,
  fall: 360,
  hint: 4500,
  maxCascades: 24,
};
