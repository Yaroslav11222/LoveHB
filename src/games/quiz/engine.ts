import { questions } from '../../content/questions.ts';
import type { Question } from '../../content/questions.ts';

export const QUIZ_LENGTH = 10;
export const QUIZ_STORAGE_KEY = 'lovehb.avocado.v3';
export type QuizCard = { id: string; order: number[] };
export type QuizRun = { cards: QuizCard[]; answers: number[]; index: number };

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createRun(bank: Question[] = questions, random: () => number = Math.random): QuizRun {
  if (bank.length < QUIZ_LENGTH) throw new Error('Для игры нужны хотя бы 10 вопросов.');
  return { cards: shuffle(bank, random).map(q => ({ id: q.id, order: shuffle([0, 1, 2], random) })), answers: [], index: 0 };
}

export function isComplete(run: QuizRun): boolean {
  return run.answers.length === run.index && correctCount(run) === QUIZ_LENGTH;
}

export function answerQuestion(run: QuizRun, answer: number): QuizRun {
  if (correctCount(run) >= QUIZ_LENGTH || run.index >= run.cards.length || run.answers.length !== run.index || !Number.isInteger(answer) || answer < 0 || answer > 2) return run;
  return { ...run, answers: [...run.answers, answer] };
}

export function nextQuestion(run: QuizRun): QuizRun {
  if (run.answers.length !== run.index + 1) return run;
  const index = run.index + 1;
  // Exhausting the bank never forces a loss. Only then may facts repeat.
  const cards = index === run.cards.length && correctCount(run) < QUIZ_LENGTH
    ? [...run.cards, ...createRun().cards] : run.cards;
  return { ...run, cards, index };
}

export function correctCount(run: QuizRun, bank: Question[] = questions): number {
  return run.answers.reduce((score, selected, i) => {
    const card = run.cards[i];
    const question = bank.find(q => q.id === card.id);
    return score + Number(card.order[selected] === question?.answer);
  }, 0);
}

export function restoreRun(raw: string | null, bank: Question[] = questions): QuizRun | null {
  if (!raw) return null;
  try {
    const run = JSON.parse(raw) as QuizRun;
    if (!run || !Array.isArray(run.cards) || run.cards.length === 0 || run.cards.length % bank.length !== 0 || !Array.isArray(run.answers)) return null;
    if (!Number.isInteger(run.index) || run.index < 0 || run.index > run.cards.length) return null;
    if (run.answers.length !== run.index && run.answers.length !== run.index + 1) return null;
    if (run.answers.length > run.cards.length || !run.answers.every(a => Number.isInteger(a) && a >= 0 && a <= 2)) return null;
    for (let offset = 0; offset < run.cards.length; offset += bank.length) {
      if (new Set(run.cards.slice(offset, offset + bank.length).map(c => c?.id)).size !== bank.length) return null;
    }
    if (!run.cards.every(c => c && bank.some(q => q.id === c.id) && Array.isArray(c.order) && c.order.length === 3 && c.order.every(Number.isInteger) && [...c.order].sort().join(',') === '0,1,2')) return null;
    const score = correctCount(run, bank);
    if (score > QUIZ_LENGTH || (run.index === run.cards.length && score < QUIZ_LENGTH)) return null;
    return run;
  } catch { return null; }
}
