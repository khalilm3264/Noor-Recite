import assert from 'node:assert/strict';
import test from 'node:test';
import { DUAS_AND_KALIMAS } from '../src/data/duasAndKalimas';
import {
  buildDuaPlaybackQueue,
  countTotalDuaVariations,
  getAdjacentQueueEntry,
  getItemVariantEntries,
  resolveEffectiveDuaItem,
} from '../src/utils/duaPlaybackQueue';

test('buildDuaPlaybackQueue expands every card and alternate variation in order when All Variations mode is enabled', () => {
  const sampleItems = DUAS_AND_KALIMAS.filter(
    (item) => item.alternates && item.alternates.length > 0
  ).slice(0, 5);
  assert.ok(sampleItems.length >= 3, 'Expected multiple multi-variation dua cards');

  const singleQueue = buildDuaPlaybackQueue(sampleItems, false, () => 'primary');
  assert.equal(singleQueue.length, sampleItems.length);
  assert.ok(singleQueue.every((entry) => entry.variantId === 'primary'));

  const expandedQueue = buildDuaPlaybackQueue(sampleItems, true, () => 'primary');
  assert.equal(expandedQueue.length, countTotalDuaVariations(sampleItems));
  assert.ok(expandedQueue.length > singleQueue.length);

  // Verify the first card's primary + all alternates appear sequentially before card 2
  const firstCard = sampleItems[0];
  const expectedFirstVariants = getItemVariantEntries(firstCard);
  for (let i = 0; i < expectedFirstVariants.length; i++) {
    assert.equal(expandedQueue[i].itemId, firstCard.id);
    assert.equal(expandedQueue[i].variantId, expectedFirstVariants[i].variantId);
    assert.equal(expandedQueue[i].variantIndex, i);
    assert.equal(expandedQueue[i].variantCount, expectedFirstVariants.length);
  }
  assert.equal(expandedQueue[expectedFirstVariants.length].itemId, sampleItems[1].id);
  assert.equal(expandedQueue[expectedFirstVariants.length].variantId, 'primary');
});

test('getAdjacentQueueEntry steps cleanly through variations and across card boundaries', () => {
  const multiCards = DUAS_AND_KALIMAS.filter(
    (item) => item.alternates && item.alternates.length >= 2
  ).slice(0, 2);
  assert.equal(multiCards.length, 2);

  const queue = buildDuaPlaybackQueue(multiCards, true, () => 'primary');
  const firstAltId = multiCards[0].alternates![0].id;
  const lastFirstCardAltId =
    multiCards[0].alternates![multiCards[0].alternates!.length - 1].id;

  const afterPrimary = getAdjacentQueueEntry(queue, multiCards[0].id, 'primary', 1);
  assert.equal(afterPrimary?.itemId, multiCards[0].id);
  assert.equal(afterPrimary?.variantId, firstAltId);

  const crossCardNext = getAdjacentQueueEntry(
    queue,
    multiCards[0].id,
    lastFirstCardAltId,
    1
  );
  assert.equal(crossCardNext?.itemId, multiCards[1].id);
  assert.equal(crossCardNext?.variantId, 'primary');

  const crossCardPrev = getAdjacentQueueEntry(queue, multiCards[1].id, 'primary', -1);
  assert.equal(crossCardPrev?.itemId, multiCards[0].id);
  assert.equal(crossCardPrev?.variantId, lastFirstCardAltId);

  assert.equal(getAdjacentQueueEntry(queue, multiCards[0].id, 'primary', -1), null);
});

test('buildDuaPlaybackQueue respects favorited variations on a multi-variation card', () => {
  const multiCard = DUAS_AND_KALIMAS.find(
    (item) => item.alternates && item.alternates.length >= 2
  );
  assert.ok(multiCard);
  const chosenAlt = multiCard.alternates![1];
  const favMap = new Map<string, Set<string>>([
    [multiCard.id, new Set([chosenAlt.id])],
  ]);

  const queue = buildDuaPlaybackQueue([multiCard], false, () => 'primary', favMap);
  assert.equal(queue.length, 1);
  assert.equal(queue[0].variantId, chosenAlt.id);

  const resolved = resolveEffectiveDuaItem(multiCard, chosenAlt.id);
  assert.equal(resolved.arabic, chosenAlt.arabic);
  assert.equal(resolved.reference, chosenAlt.reference);
});
