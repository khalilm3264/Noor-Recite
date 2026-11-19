type NarrationTrack = { item: { id: string }; variantId: string };

export function alignPausedNarrationQueue<T extends NarrationTrack>(
  queue: { tracks: T[]; index: number },
  itemId: string,
  variantId: string,
): { tracks: T[]; index: number } | null {
  const index = queue.tracks.findIndex(
    (track) => track.item.id === itemId && track.variantId === variantId,
  );
  return index < 0 ? null : { ...queue, index };
}
