import test from 'node:test';
import assert from 'node:assert/strict';
import { questions } from '../src/content/questions.ts';
import { createRun, answerQuestion, nextQuestion, correctCount, restoreRun, isComplete } from '../src/games/quiz/engine.ts';

test('34 distinct sourced facts, each has three distinct choices and one answer', () => {
  assert.equal(questions.length, 34);
  assert.equal(new Set(questions.map(q => q.id)).size, 34);
  assert.equal(new Set(questions.map(q => q.prompt)).size, 34);
  for (const q of questions) {
    assert.equal(q.options.length, 3);
    assert.equal(new Set(q.options).size, 3);
    assert.ok(q.options[q.answer]);
    assert.ok(q.explanation.length > 20);
    assert.equal(new URL(q.source).protocol, 'https:');
  }
});

test('all facts appear once before repeats; choices shuffle independently', () => {
  const positions = new Set();
  for (let i = 0; i < 30; i++) {
    const run = createRun();
    assert.equal(run.cards.length, questions.length);
    assert.equal(new Set(run.cards.map(c => c.id)).size, questions.length);
    for (const card of run.cards) {
      assert.deepEqual([...card.order].sort(), [0, 1, 2]);
      positions.add(card.order.indexOf(0));
    }
  }
  assert.equal(positions.size, 3);
});

test('wrong answers never grow the plant or end the game, even after exhausting deck', () => {
  let run = createRun();
  const poolLen = questions.length;
  for (let i = 0; i < poolLen; i++) {
    assert.equal(nextQuestion(run), run);
    const wrong = run.cards[i].order.indexOf(1);
    run = answerQuestion(run, wrong);
    assert.equal(run.answers.length, i + 1);
    assert.equal(correctCount(run), 0, 'growth equals correct answers, not attempts');
    assert.equal(isComplete(run), false);
    assert.equal(answerQuestion(run, 0), run, 'double click cannot answer twice');
    run = nextQuestion(run);
  }
  assert.equal(run.index, poolLen);
  assert.equal(run.cards.length, poolLen * 2, 'exhausted deck replenishes without a loss');
  assert.equal(correctCount(run), 0);
  assert.deepEqual(restoreRun(JSON.stringify(run)), run);
  assert.notEqual(answerQuestion(run, 0), run);
  assert.equal(nextQuestion(run), run);
});

test('scoring follows shuffled choices and saved state resumes without double growth', () => {
  let run = createRun();
  // 1st question wrong
  run = answerQuestion(run, run.cards[0].order.indexOf(1));
  assert.equal(correctCount(run), 0);
  assert.equal(isComplete(run), false);
  run = nextQuestion(run);

  // 2nd question correct
  run = answerQuestion(run, run.cards[1].order.indexOf(0));
  assert.equal(correctCount(run), 1);
  assert.equal(isComplete(run), false);
  run = nextQuestion(run);

  // 3rd question correct
  run = answerQuestion(run, run.cards[2].order.indexOf(0));
  assert.equal(correctCount(run), 2);
  assert.equal(isComplete(run), false);
  run = nextQuestion(run);

  // 4th question correct -> completes with 3 correct answers
  run = answerQuestion(run, run.cards[3].order.indexOf(0));
  assert.equal(correctCount(run), 3);
  run = nextQuestion(run);
  assert.equal(isComplete(run), true);
  assert.equal(answerQuestion(run, 0), run);
  assert.equal(nextQuestion(run), run);
  assert.deepEqual(restoreRun(JSON.stringify(run)), run);
});

test('bad storage and invalid answer selections are ignored', () => {
  const run = createRun();
  for (const answer of [-1, 3, NaN, .5]) assert.equal(answerQuestion(run, answer), run);
  for (const raw of [null, '', '{', 'null', '{}', JSON.stringify({ ...run, index: 11 }), JSON.stringify({ ...run, answers: [0, 0] }), JSON.stringify({ ...run, cards: run.cards.map(() => run.cards[0]) }), JSON.stringify({ ...run, cards: [{ id: 'missing', order: [0, 1, 2] }, ...run.cards.slice(1)] }), JSON.stringify({ ...run, cards: [{ ...run.cards[0], order: [0, 0, 2] }, ...run.cards.slice(1)] })]) {
    assert.equal(restoreRun(raw), null);
  }
});

test('instant growth to 3 correct answers completes the requirement and assets exist', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const run = createRun();
  const instantCards = run.cards.slice(0, 3);
  const correctAnswers = instantCards.map(c => {
    const q = questions.find(item => item.id === c.id);
    return c.order.indexOf(q.answer);
  });
  const completedRun = {
    ...run,
    index: 2,
    answers: correctAnswers,
  };
  assert.equal(correctCount(completedRun), 3);

  // Check that generated PNG assets exist with PNG magic header
  for (const assetFile of ['quiz-shell.png', 'quiz-mark.png']) {
    const fullPath = path.resolve('public/art/quiz', assetFile);
    const buf = await fs.readFile(fullPath);
    assert.ok(buf.length > 10000, `${assetFile} should be a substantive file`);
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    assert.equal(buf[0], 0x89);
    assert.equal(buf[1], 0x50);
    assert.equal(buf[2], 0x4e);
    assert.equal(buf[3], 0x47);
  }
});

