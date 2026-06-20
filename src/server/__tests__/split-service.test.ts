// Tests for pure allocate() function: largest-remainder, sum correctness.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { allocate } from '../services/split-service.ts';

describe('allocate()', () => {
  test('equal split: 860000 / 10 people / 1000 rounding → all 86000, sum = 860000', () => {
    const result = allocate(860000, 10, 1000);
    assert.equal(result.length, 10);
    for (const amount of result) {
      assert.equal(amount, 86000);
    }
    const sum = result.reduce((a, b) => a + b, 0);
    assert.equal(sum, 860000);
  });

  test('remainder distributed: 1000000 / 9 people / 1000 rounding → sum = 1000000', () => {
    const result = allocate(1000000, 9, 1000);
    assert.equal(result.length, 9);
    const sum = result.reduce((a, b) => a + b, 0);
    assert.equal(sum, 1000000);
    // Each amount should be a multiple of 1000
    for (const amount of result) {
      assert.equal(amount % 1000, 0);
    }
    // Max spread is 1 rounding unit (1000)
    const min = Math.min(...result);
    const max = Math.max(...result);
    assert.ok(max - min <= 1000, `spread should be ≤1000, got ${max - min}`);
  });

  test('count = 0 → empty array', () => {
    const result = allocate(100000, 0, 1000);
    assert.deepEqual(result, []);
  });

  test('count = 1 → single entry equals total', () => {
    const result = allocate(123000, 1, 1000);
    assert.equal(result.length, 1);
    assert.equal(result[0], 123000);
  });

  test('total = 0 → all zeros', () => {
    const result = allocate(0, 5, 1000);
    assert.equal(result.length, 5);
    for (const amount of result) {
      assert.equal(amount, 0);
    }
  });
});
