import test from 'node:test';
import assert from 'node:assert/strict';
import { isPortalUnlocked, PORTAL_ORDER } from '../src/content/portalProgress.ts';

test('first portal is always unlocked initially', () => {
  const empty = new Set();
  assert.equal(isPortalUnlocked('little-moments', empty), true);
});

test('second portal is locked when first portal is incomplete', () => {
  const empty = new Set();
  assert.equal(isPortalUnlocked('little-magic', empty), false);
});

test('second portal unlocks when first portal is completed', () => {
  const completed = new Set(['little-moments']);
  assert.equal(isPortalUnlocked('little-magic', completed), true);
});

test('third portal remains locked when only first portal is completed', () => {
  const completed = new Set(['little-moments']);
  assert.equal(isPortalUnlocked('something-ahead', completed), false);
});

test('third portal unlocks when both first and second portals are completed', () => {
  const completed = new Set(['little-moments', 'little-magic']);
  assert.equal(isPortalUnlocked('something-ahead', completed), true);
});

test('portals order is strictly little-moments -> little-magic -> something-ahead', () => {
  assert.deepEqual([...PORTAL_ORDER], ['little-moments', 'little-magic', 'something-ahead']);
});
