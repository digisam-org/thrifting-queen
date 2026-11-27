import type { Coordinates } from '../types/place';

/** Stockbridge, Edinburgh — iconic charity shop & cafe neighbourhood for demo/fallback */
export const EDINBURGH_DEMO_COORDS: Coordinates = {
  lat: 55.9581,
  lng: -3.2085,
};

export const SCOTLAND_CENTER: Coordinates = {
  lat: 56.4907,
  lng: -4.2026,
};

export interface LocationCallbacks {
  onSuccess: (coords: Coordinates) => void;
  onError: (message: string) => void;
}

/**
 * Platform location abstraction.
 * Currently uses the Web Geolocation API (works in iOS Safari PWA & Android).
 * When wrapping for Android with Capacitor, swap this implementation to @capacitor/geolocation.
 */
export function watchUserLocation(callbacks: LocationCallbacks): () => void {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    callbacks.onError('Geolocation is not supported on this device.');
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      callbacks.onSuccess({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
    },
    (err) => {
      switch (err.code) {
        case err.PERMISSION_DENIED:
          callbacks.onError('Location access was denied. Enable it in Safari settings to see yourself on the map.');
          break;
        case err.POSITION_UNAVAILABLE:
          callbacks.onError('Could not determine your location right now.');
          break;
        case err.TIMEOUT:
          callbacks.onError('Location request timed out. Tap Locate to try again.');
          break;
        default:
          callbacks.onError('Unable to read your location.');
      }
    },
    {
      enableHighAccuracy: true,
      maximumAge: 15_000,
      timeout: 12_000,
    },
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}

export function getCurrentLocationOnce(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported on this device.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => reject(new Error(err.message || 'Could not fetch current location.')),
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 10_000,
      },
    );
  });
}

export function isInsideScotland(coords: Coordinates): boolean {
  return coords.lat >= 54.5 && coords.lat <= 61.1 && coords.lng >= -8.8 && coords.lng <= -0.5;
}

/** Opens native Apple Maps on iOS devices and Google Maps on Android/desktop. */
export function buildDirectionsUrl(lat: number, lng: number, label: string): string {
  const encodedLabel = encodeURIComponent(label);
  const isIOS =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  if (isIOS) {
    return `https://maps.apple.com/?daddr=${lat},${lng}&q=${encodedLabel}&dirflg=w`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
}

/** Opens the place's Google Maps listing (live star rating, photos & reviews) in one tap. */
export function buildGoogleReviewsUrl(name: string, address?: string, city?: string): string {
  const queryParts = [name, address || city || 'Scotland'].filter(Boolean);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryParts.join(', '))}`;
}
