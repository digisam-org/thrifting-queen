import type {
  Coordinates,
  PersonalPicksOverlay,
  Place,
  PlaceCategory,
  PlacesDataset,
} from '../types/place';

const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance in metres between two coordinates. */
export function distanceMeters(a: Coordinates, b: { lat: number; lng: number }): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters / 10) * 10} m`;
  }
  if (meters < 10_000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters / 1000)} km`;
}

function assetUrl(relativePath: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  return `${normalizedBase}${normalizedPath}`;
}

export interface LoadedPlacesResult {
  places: Place[];
  region: string;
  generatedAt: string;
}

/** Loads the bundled Scotland dataset + personal picks overlay locally. */
export async function loadScotlandPlaces(): Promise<LoadedPlacesResult> {
  const [datasetRes, picksRes] = await Promise.all([
    fetch(assetUrl('data/scotland-places.json')),
    fetch(assetUrl('data/personal-picks.json')).catch(() => null),
  ]);

  if (!datasetRes.ok) {
    throw new Error(`Failed to load Scotland places (${datasetRes.status})`);
  }

  const dataset = (await datasetRes.json()) as PlacesDataset;
  let overlay: PersonalPicksOverlay = { places: [], notesByPlaceId: {} };

  if (picksRes && picksRes.ok) {
    try {
      overlay = (await picksRes.json()) as PersonalPicksOverlay;
    } catch {
      // Ignore malformed optional overlay
    }
  }

  const mergedById = new Map<string, Place>();

  for (const place of dataset.places) {
    const personalNote = overlay.notesByPlaceId?.[place.id];
    mergedById.set(place.id, {
      ...place,
      personalNote: personalNote ?? place.personalNote,
      isPersonalPick: Boolean(personalNote || place.isPersonalPick),
    });
  }

  for (const pick of overlay.places ?? []) {
    mergedById.set(pick.id, {
      ...pick,
      isPersonalPick: true,
      source: 'personal',
    });
  }

  return {
    places: Array.from(mergedById.values()),
    region: dataset.region,
    generatedAt: dataset.generatedAt,
  };
}

export function filterPlaces(
  places: Place[],
  activeCategories: Set<PlaceCategory>,
  searchQuery: string,
  favouritesOnly: boolean,
  favouriteIds: Set<string>,
): Place[] {
  const q = searchQuery.trim().toLowerCase();

  return places.filter((place) => {
    if (!activeCategories.has(place.category)) return false;
    if (favouritesOnly && !favouriteIds.has(place.id)) return false;
    if (!q) return true;

    return (
      place.name.toLowerCase().includes(q) ||
      (place.city?.toLowerCase().includes(q) ?? false) ||
      (place.address?.toLowerCase().includes(q) ?? false)
    );
  });
}
