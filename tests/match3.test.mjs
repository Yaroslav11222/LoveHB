import test from 'node:test';
import assert from 'node:assert/strict';
import { areAdjacent, swap, findMatches, findMove, seededRandom, createBoard, refill, countCollected, goalsComplete, planTurn, powerCreations, expandPowers, reshuffle } from '../src/games/match3/engine.ts';

const kinds = ['wafer', 'fondant', 'spread', 'bar', 'blueberry'];
const fromRows = rows => rows.join('').split('').map((kind, index) => ({ id: index + 1, kind }));

test('adjacency rejects row wrapping, diagonals and out of range indices', () => {
  assert.equal(areAdjacent(0, 1, 7), true);
  assert.equal(areAdjacent(0, 7, 7), true);
  for (const [a, b] of [[6, 7], [0, 8], [-1, 0], [48, 49], [3, 3], [1.5, 2.5]]) assert.equal(areAdjacent(a, b, 7), false);
});

test('matching finds long horizontal and vertical runs and counts a cross once', () => {
  const board = fromRows(['bbabb', 'ccacc', 'aaaaa', 'ddadd', 'eeaee']);
  assert.deepEqual(findMatches(board, 5), [2, 7, 10, 11, 12, 13, 14, 17, 22]);
  assert.deepEqual(countCollected(board, findMatches(board, 5)), { a: 9 });
});

test('runs never wrap from one row to the next', () => {
  assert.deepEqual(findMatches(fromRows(['bca', 'aab', 'cdb']), 3), []);
});

test('swap is immutable; move finder returns a legal matching exchange', () => {
  const board = fromRows(['aba', 'cad', 'bcd']);
  const snapshot = structuredClone(board);
  const pair = findMove(board, 3);
  assert.ok(pair);
  assert.equal(areAdjacent(...pair, 3), true);
  assert.ok(findMatches(swap(board, ...pair), 3).length >= 3);
  assert.deepEqual(board, snapshot);
  assert.notStrictEqual(swap(board, ...pair), board);
});

test('gravity preserves surviving IDs and order; all refills have unique IDs', () => {
  const board = fromRows(['abc', 'def', 'ghi']);
  const next = refill(board, [3, 6, 7], 3, kinds, seededRandom(10));
  assert.equal(next[6].id, board[0].id);
  assert.equal(next[7].id, board[4].id);
  assert.equal(next[4].id, board[1].id);
  assert.equal(next[8].id, board[8].id);
  assert.equal(new Set(next.map(tile => tile.id)).size, 9);
  assert.ok(next.filter(tile => tile.id > 9).every(tile => kinds.includes(tile.kind)));
  assert.deepEqual(board.map(tile => tile.id), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test('cross-shaped collections never double count the same tile', () => {
  const board = fromRows(['abc', 'def', 'ghi']);
  assert.deepEqual(countCollected(board, [0, 0, 1, 1, 1]), { a: 1, b: 1 });
});

test('every goal is required; extra collections are allowed', () => {
  const goals = [{ kind: 'wafer', count: 18 }, { kind: 'blueberry', count: 12 }];
  assert.equal(goalsComplete(goals, { wafer: 20, blueberry: 11 }), false);
  assert.equal(goalsComplete(goals, { wafer: 18 }), false);
  assert.equal(goalsComplete(goals, { wafer: 20, blueberry: 15, bar: 100 }), true);
});

test('generated boards have no existing matches, unique IDs and a legal move across 300 seeds', () => {
  for (let seed = 0; seed < 300; seed++) {
    const board = createBoard(7, kinds, seededRandom(seed), 101);
    assert.equal(board.length, 49);
    assert.equal(new Set(board.map(tile => tile.id)).size, 49);
    assert.deepEqual(findMatches(board, 7), [], `seed ${seed}`);
    assert.ok(findMove(board, 7), `seed ${seed}`);
    assert.ok(board.every(tile => kinds.includes(tile.kind) && tile.id >= 101));
  }
});

test('minimum boards and pathological random sources terminate in a playable state', () => {
  for (const size of [3, 4, 7]) {
    for (const rng of [() => 0, () => 0.999999]) {
      const board = createBoard(size, kinds.slice(0, 3), rng);
      assert.deepEqual(findMatches(board, size), []);
      assert.ok(findMove(board, size));
    }
  }
  assert.throws(() => createBoard(2, kinds));
  assert.throws(() => createBoard(7, ['a', 'a', 'b']));
});

test('1000 simulated turns preserve board invariants through cascades and reshuffles', () => {
  const random = seededRandom(58159);
  let board = createBoard(7, kinds, random);
  for (let turn = 0; turn < 1000; turn++) {
    const pair = findMove(board, 7);
    assert.ok(pair);
    board = swap(board, ...pair);
    let matches = findMatches(board, 7);
    let cascades = 0;
    while (matches.length && cascades++ < 24) {
      board = refill(board, matches, 7, kinds, random);
      assert.equal(new Set(board.map(tile => tile.id)).size, 49);
      assert.ok(board.every(tile => kinds.includes(tile.kind)));
      matches = findMatches(board, 7);
    }
    if (matches.length || !findMove(board, 7)) board = createBoard(7, kinds, random, Math.max(...board.map(tile => tile.id)) + 1);
    assert.deepEqual(findMatches(board, 7), []);
  }
});

test('an invalid exchange does not spend moves, collect sweets or mutate progress', () => {
  const progress = { board: fromRows(['aba', 'cad', 'bcd']), moves: 5, collected: {}, score: 0 };
  const snapshot = structuredClone(progress);
  const plan = planTurn(progress, { size: 3, goals: [{ kind: 'a', count: 10 }] }, ['a', 'b', 'c', 'd'], 0, 3, seededRandom(1));
  assert.equal(plan.valid, false);
  assert.equal(plan.progress.moves, 5);
  assert.deepEqual(progress, snapshot);
});

test('winning on the final move takes priority over running out of moves', () => {
  const progress = { board: fromRows(['aba', 'cad', 'bcd']), moves: 1, collected: {}, score: 0 };
  const plan = planTurn(progress, { size: 3, goals: [{ kind: 'a', count: 3 }] }, ['a', 'b', 'c', 'd'], 1, 4, seededRandom(4));
  assert.equal(plan.valid, true);
  assert.equal(plan.progress.moves, 0);
  assert.equal(plan.status, 'won');
  assert.ok(plan.progress.collected.a >= 3);
  assert.ok(plan.progress.score >= 30);
  assert.deepEqual(findMatches(plan.progress.board, 3), []);
  assert.deepEqual(progress.collected, {});
});

test('unmet goals at zero moves produce a loss and prevent another turn', () => {
  const rules = { size: 3, goals: [{ kind: 'a', count: 1000 }] };
  const progress = { board: fromRows(['aba', 'cad', 'bcd']), moves: 1, collected: {}, score: 0 };
  const plan = planTurn(progress, rules, ['a', 'b', 'c', 'd'], 1, 4, seededRandom(4));
  assert.equal(plan.status, 'lost');
  assert.equal(plan.progress.moves, 0);
  assert.equal(planTurn(plan.progress, rules, ['a', 'b', 'c', 'd'], 0, 1).valid, false);
});

test('cascades are bounded even with a pathological refill source', () => {
  const progress = { board: fromRows(['aba', 'cad', 'bcd']), moves: 2, collected: {}, score: 0 };
  const plan = planTurn(progress, { size: 3, goals: [{ kind: 'a', count: 1000 }] }, ['a', 'b', 'c', 'd'], 1, 4, () => 0, 3);
  assert.equal(plan.valid, true);
  assert.ok(plan.frames.length <= 8);
  assert.deepEqual(findMatches(plan.progress.board, 3), []);
  assert.ok(findMove(plan.progress.board, 3));
  assert.equal(plan.progress.moves, 1);
});

const uniqueBoard = (size = 5) => Array.from({ length: size ** 2 }, (_, index) => ({ id: index + 1, kind: `u${index}` }));
const paint = (board, cells, kind = 'a') => board.map((tile, index) => cells.includes(index) ? { ...tile, kind } : tile);

test('four creates an oriented stripe, five a prism, and a T/L a burst', () => {
  for (const [cells, expected] of [
    [[5, 6, 7, 8], 'row'], [[1, 6, 11, 16], 'column'],
    [[10, 11, 12, 13, 14], 'prism'], [[7, 11, 12, 13, 17], 'burst'],
    [[0, 5, 10, 11, 12], 'burst'],
  ]) {
    const creations = powerCreations(paint(uniqueBoard(), cells), 5, [cells[0]]);
    assert.deepEqual(creations, [{ index: cells[0], special: expected }]);
  }
});

test('creation preserves one anchor and collects only the other matched candies', () => {
  const board = paint(uniqueBoard(), [0, 1, 3, 7]);
  const progress = { board, moves: 5, collected: {}, score: 0 };
  const plan = planTurn(progress, { size: 5, goals: [{ kind: 'a', count: 100 }] }, kinds, 2, 7, seededRandom(8));
  const frame = plan.frames[0];
  assert.equal(plan.valid, true);
  assert.deepEqual(frame.created, [2]);
  assert.equal(frame.board[2].special, 'row');
  assert.equal(frame.board[2].id, board[7].id);
  assert.deepEqual(frame.clearing, [0, 1, 3]);
  assert.equal(frame.collected.a, 3);
  assert.equal(board[7].special, undefined);
});

test('blasts chain into other powers once, including intersecting stripes', () => {
  const board = uniqueBoard();
  board[12].special = 'row'; board[14].special = 'column'; board[9].special = 'burst';
  const wave = expandPowers(board, [12], 5);
  assert.deepEqual(wave.clearing, [3, 4, 8, 9, 10, 11, 12, 13, 14, 19, 24]);
  assert.equal(wave.effects.length, 3);
  assert.equal(new Set(wave.effects.map(effect => effect.index)).size, 3);
});

test('corner bursts never wrap to the opposite edge', () => {
  const board = uniqueBoard(); board[0].special = 'burst';
  assert.deepEqual(expandPowers(board, [0], 5).clearing, [0, 1, 5, 6]);
});

test('a prism swaps with any candy and removes that kind across the board', () => {
  const board = paint(uniqueBoard(), [1, 7, 18], 'berry'); board[0].special = 'prism';
  const plan = planTurn({ board, moves: 4, collected: {}, score: 0 }, { size: 5, goals: [{ kind: 'berry', count: 99 }] }, kinds, 0, 1, seededRandom(9));
  assert.equal(plan.valid, true);
  assert.deepEqual(plan.frames[0].clearing, [0, 1, 7, 18]);
  assert.equal(plan.frames[0].collected.berry, 3);
  assert.equal(plan.progress.moves, 3);
});

test('two prisms clear the entire board without duplicate collections', () => {
  const board = uniqueBoard(); board[0].special = 'prism'; board[1].special = 'prism';
  const plan = planTurn({ board, moves: 4, collected: {}, score: 0 }, { size: 5, goals: [{ kind: 'a', count: 99 }] }, kinds, 0, 1, seededRandom(10));
  assert.equal(plan.frames[0].clearing.length, 25);
  assert.equal(Object.values(plan.frames[0].collected).reduce((sum, count) => sum + count, 0), 25);
});

test('two ordinary powers activate together without needing a match', () => {
  const board = uniqueBoard(); board[0].special = 'row'; board[1].special = 'column';
  const plan = planTurn({ board, moves: 4, collected: {}, score: 0 }, { size: 5, goals: [{ kind: 'a', count: 99 }] }, kinds, 0, 1, seededRandom(10));
  assert.equal(plan.valid, true);
  assert.equal(plan.frames[0].effects.length, 2);
  assert.equal(plan.frames[0].clearing.length, 9);
  assert.equal(plan.progress.moves, 3);
  board[1] = { ...board[1], special: undefined };
  assert.equal(planTurn({ board, moves: 4, collected: {}, score: 0 }, { size: 5, goals: [{ kind: 'a', count: 99 }] }, kinds, 0, 1).valid, false);
});

test('shuffle retains powers even in its bounded fallback', () => {
  const board = createBoard(7, kinds, seededRandom(1));
  board[4].special = 'row'; board[12].special = 'prism'; board[30].special = 'burst';
  const next = reshuffle(board, 7, kinds, () => 0);
  assert.deepEqual(next.filter(tile => tile.special).map(tile => tile.special).sort(), ['burst', 'prism', 'row']);
  assert.deepEqual(findMatches(next, 7), []);
  assert.ok(findMove(next, 7));
});

test('600 complete powered turns preserve stable boards, identities and move counts', () => {
  for (let seed = 0; seed < 20; seed++) {
    const random = seededRandom(seed);
    let progress = { board: createBoard(7, kinds, random), moves: 30, collected: {}, score: 0 };
    for (let turn = 0; turn < 30; turn++) {
      const pair = findMove(progress.board, 7);
      assert.ok(pair);
      const plan = planTurn(progress, { size: 7, goals: [{ kind: 'wafer', count: 100000 }] }, kinds, ...pair, random);
      assert.equal(plan.valid, true);
      assert.equal(plan.progress.moves, 29 - turn);
      assert.equal(new Set(plan.progress.board.map(tile => tile.id)).size, 49);
      assert.deepEqual(findMatches(plan.progress.board, 7), []);
      for (const frame of plan.frames) assert.equal(new Set(frame.board.map(tile => tile.id)).size, 49);
      progress = plan.progress;
    }
  }
});
