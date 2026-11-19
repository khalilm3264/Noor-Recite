import assert from 'node:assert/strict';
import test from 'node:test';
import { alignPausedNarrationQueue } from '../src/utils/narrationQueue';

const protection = { id: 'protection' };
const hasbiyallah = { id: 'hasbiyallah' };
const primary = { item: protection, variantId: 'primary' };
const alternate = { item: protection, variantId: 'body-hearing-sight' };
const next = { item: hasbiyallah, variantId: 'primary' };
const tracks = [primary, alternate, next];

test('switching a paused narration resumes the selected track and advances past it', () => {
  const queue = { tracks, index: 0 };
  const aligned = alignPausedNarrationQueue(queue, protection.id, alternate.variantId);
  assert.ok(aligned);
  assert.equal(aligned.tracks[aligned.index], alternate);
  assert.equal(aligned.tracks[aligned.index + 1], next);
  assert.equal(queue.index, 0);
  assert.equal(alignPausedNarrationQueue(aligned, protection.id, 'primary')?.index, 0);
});

test('an out-of-queue selection cannot resume a stale narration position', () => {
  assert.equal(alignPausedNarrationQueue({ tracks, index: 1 }, protection.id, 'not-in-queue'), null);
});
