import { useCallback, useEffect, useState } from 'react';
import {
  EDINBURGH_DEMO_COORDS,
  getCurrentLocationOnce,
  isInsideScotland,
  watchUserLocation,
} from '../services/location';
import type { Coordinates } from '../types/place';

export interface GeolocationState {
  coords: Coordinates | null;
  isDemoMode: boolean;
  isLocating: boolean;
  error: string | null;
  outsideScotland: boolean;
  requestLocate: () => Promise<Coordinates | null>;
  enableEdinburghDemo: () => void;
}

export function useGeolocation(): GeolocationState {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isLocating, setIsLocating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stopWatching = watchUserLocation({
      onSuccess: (nextCoords) => {
        setIsDemoMode(false);
        setCoords(nextCoords);
        setError(null);
        setIsLocating(false);
      },
      onError: (message) => {
        setError(message);
        setIsLocating(false);
        // Fall back smoothly to Stockbridge, Edinburgh so the avatar still appears on first open
        setCoords((current) => {
          if (current) return current;
          setIsDemoMode(true);
          return EDINBURGH_DEMO_COORDS;
        });
      },
    });

    return stopWatching;
  }, []);

  const requestLocate = useCallback(async (): Promise<Coordinates | null> => {
    setIsLocating(true);
    setError(null);
    try {
      const liveCoords = await getCurrentLocationOnce();
      setIsDemoMode(false);
      setCoords(liveCoords);
      setIsLocating(false);
      return liveCoords;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to read GPS location.';
      setError(msg);
      setIsLocating(false);
      return null;
    }
  }, []);

  const enableEdinburghDemo = useCallback(() => {
    setIsDemoMode(true);
    setError(null);
    setCoords(EDINBURGH_DEMO_COORDS);
  }, []);

  const outsideScotland = coords !== null && !isDemoMode && !isInsideScotland(coords);

  return {
    coords,
    isDemoMode,
    isLocating,
    error,
    outsideScotland,
    requestLocate,
    enableEdinburghDemo,
  };
}
