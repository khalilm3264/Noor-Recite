import { DuaOrKalimaItem } from '../types/quran';

export interface DuaPlaybackQueueEntry {
  itemId: string;
  variantId: string;
  variantIndex: number;
  variantCount: number;
  variantLabel: string;
}

export function resolveEffectiveDuaItem(
  item: DuaOrKalimaItem,
  variantId?: string
): DuaOrKalimaItem {
  if (!variantId || variantId === 'primary' || !item.alternates?.length) {
    return item;
  }
  const alt = item.alternates.find((v) => v.id === variantId);
  if (!alt) return item;
  return {
    ...item,
    badge: alt.badge ?? item.badge,
    arabic: alt.arabic,
    transliteration: alt.transliteration,
    translationEn: alt.translationEn,
    translationHi: alt.translationHi,
    translationUr: alt.translationUr,
    reference: alt.reference,
    note: alt.note ?? item.note,
    audioUrl: alt.audioUrl,
    fallbackAudioUrl: alt.fallbackAudioUrl,
    quranRef: alt.quranRef,
    quranRange: alt.quranRange,
    wordTimings: alt.wordTimings,
  };
}

export function getItemVariantEntries(item: DuaOrKalimaItem): DuaPlaybackQueueEntry[] {
  const alternates = item.alternates ?? [];
  const variantCount = 1 + alternates.length;
  const entries: DuaPlaybackQueueEntry[] = [
    {
      itemId: item.id,
      variantId: 'primary',
      variantIndex: 0,
      variantCount,
      variantLabel: item.primaryVariantLabel ?? 'Standard Narration',
    },
  ];
  for (let i = 0; i < alternates.length; i++) {
    const alt = alternates[i];
    entries.push({
      itemId: item.id,
      variantId: alt.id,
      variantIndex: i + 1,
      variantCount,
      variantLabel: alt.label,
    });
  }
  return entries;
}

export function countTotalDuaVariations(items: DuaOrKalimaItem[]): number {
  let total = 0;
  for (const item of items) {
    total += 1 + (item.alternates?.length ?? 0);
  }
  return total;
}

export function buildDuaPlaybackQueue(
  items: DuaOrKalimaItem[],
  includeAllVariations: boolean,
  getSelectedVariantId: (item: DuaOrKalimaItem) => string,
  favoriteVariantIdsByItem?: ReadonlyMap<string, ReadonlySet<string>>
): DuaPlaybackQueueEntry[] {
  const queue: DuaPlaybackQueueEntry[] = [];

  for (const item of items) {
    const allVariants = getItemVariantEntries(item);

    if (includeAllVariations) {
      queue.push(...allVariants);
      continue;
    }

    const favVariants = favoriteVariantIdsByItem?.get(item.id);
    if (favVariants && favVariants.size > 0) {
      const matched = allVariants.filter((entry) => favVariants.has(entry.variantId));
      if (matched.length > 0) {
        queue.push(...matched);
        continue;
      }
    }

    const chosenId = getSelectedVariantId(item);
    const matched =
      allVariants.find((entry) => entry.variantId === chosenId) ?? allVariants[0];
    queue.push(matched);
  }

  return queue;
}

export function findQueueEntryIndex(
  queue: DuaPlaybackQueueEntry[],
  itemId: string | null,
  variantId?: string | null
): number {
  if (!itemId || queue.length === 0) return -1;
  if (variantId) {
    const exact = queue.findIndex(
      (entry) => entry.itemId === itemId && entry.variantId === variantId
    );
    if (exact >= 0) return exact;
  }
  return queue.findIndex((entry) => entry.itemId === itemId);
}

export function getAdjacentQueueEntry(
  queue: DuaPlaybackQueueEntry[],
  currentItemId: string | null,
  currentVariantId: string | null,
  dir: -1 | 1
): DuaPlaybackQueueEntry | null {
  if (queue.length === 0) return null;
  const idx = findQueueEntryIndex(queue, currentItemId, currentVariantId);
  if (idx < 0) {
    return dir > 0 ? queue[0] : queue[queue.length - 1];
  }
  const nextIdx = idx + dir;
  if (nextIdx < 0 || nextIdx >= queue.length) return null;
  return queue[nextIdx];
}
