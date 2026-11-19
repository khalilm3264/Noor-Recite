import { FavoriteItem, FavoriteItemType } from '../types/quran';

export const FAVORITES_STORAGE_KEY = 'noor_favorites_v1';

export function getVerseFavoriteId(verseKey: string): string {
  return `verse:${verseKey}`;
}

export function getDuaFavoriteId(duaId: string, variantId = 'primary'): string {
  return `dua:${duaId}:${variantId || 'primary'}`;
}

export function getHadithFavoriteId(hadithId: string): string {
  return `hadith:${hadithId}`;
}

export function getSalahFavoriteId(targetId: string): string {
  return `salah:${targetId}`;
}

export function formatFavoriteSavedDate(date = new Date()): string {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function toggleFavoriteItem(
  list: FavoriteItem[],
  candidate: FavoriteItem
): FavoriteItem[] {
  const exists = list.some((entry) => entry.id === candidate.id);
  if (exists) {
    return list.filter((entry) => entry.id !== candidate.id);
  }
  return [candidate, ...list];
}

export function filterFavorites(
  items: FavoriteItem[],
  typeFilter: 'all' | FavoriteItemType,
  query: string
): FavoriteItem[] {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    if (typeFilter !== 'all' && item.type !== typeFilter) {
      return false;
    }
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      (item.reference && item.reference.toLowerCase().includes(q)) ||
      (item.duaVariantLabel && item.duaVariantLabel.toLowerCase().includes(q)) ||
      (item.verseKey && item.verseKey.toLowerCase().includes(q)) ||
      (item.transliteration && item.transliteration.toLowerCase().includes(q)) ||
      item.translation.toLowerCase().includes(q) ||
      item.arabic.includes(q)
    );
  });
}

export function isFavoriteItem(value: unknown): value is FavoriteItem {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  const validType =
    r.type === 'verse' ||
    r.type === 'dua' ||
    r.type === 'hadith' ||
    r.type === 'salah';
  if (!validType) return false;
  if (
    typeof r.id !== 'string' ||
    typeof r.title !== 'string' ||
    typeof r.arabic !== 'string' ||
    typeof r.translation !== 'string' ||
    typeof r.savedAt !== 'string'
  ) {
    return false;
  }
  if (r.subtitle !== undefined && typeof r.subtitle !== 'string') return false;
  if (r.transliteration !== undefined && typeof r.transliteration !== 'string') return false;
  if (r.reference !== undefined && typeof r.reference !== 'string') return false;
  if (r.verseKey !== undefined && typeof r.verseKey !== 'string') return false;
  if (r.duaId !== undefined && typeof r.duaId !== 'string') return false;
  if (r.duaVariantId !== undefined && typeof r.duaVariantId !== 'string') return false;
  if (r.duaVariantLabel !== undefined && typeof r.duaVariantLabel !== 'string') return false;
  if (r.hadithId !== undefined && typeof r.hadithId !== 'string') return false;
  if (r.salahStepId !== undefined && typeof r.salahStepId !== 'string') return false;
  if (
    r.salahTab !== undefined &&
    r.salahTab !== 'guides' &&
    r.salahTab !== 'steps' &&
    r.salahTab !== 'wudu'
  ) {
    return false;
  }
  if (
    r.surahId !== undefined &&
    (typeof r.surahId !== 'number' || !Number.isInteger(r.surahId) || r.surahId < 1 || r.surahId > 114)
  ) {
    return false;
  }
  if (
    r.ayahNumber !== undefined &&
    (typeof r.ayahNumber !== 'number' || !Number.isInteger(r.ayahNumber) || r.ayahNumber < 1 || r.ayahNumber > 286)
  ) {
    return false;
  }
  return true;
}

export function readFavoritesFromStorage(): FavoriteItem[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isFavoriteItem);
  } catch {
    return [];
  }
}

export function saveFavoritesToStorage(items: FavoriteItem[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
}
