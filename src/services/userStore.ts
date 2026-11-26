import type { UserPlaceRecord } from '../types/place';

const STORAGE_KEY = 'thrifting-queen:user-places:v1';

export type UserPlaceMap = Record<string, UserPlaceRecord>;

export function readUserPlaces(): UserPlaceMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as UserPlaceMap;
  } catch {
    return {};
  }
}

export function writeUserPlaces(data: UserPlaceMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage quota or private mode fallback
  }
}

export function exportUserPlacesJson(): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      places: readUserPlaces(),
    },
    null,
    2,
  );
}
