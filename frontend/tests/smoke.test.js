import assert from 'node:assert/strict';
import test from 'node:test';

test('frontend test runner is wired', () => {
  assert.equal(typeof globalThis, 'object');
});
