import { useEffect, useState } from 'react';
import { loadScotlandPlaces } from '../services/placesRepository';
import type { Place } from '../types/place';

export interface PlacesState {
  places: Place[];
  region: string;
  generatedAt: string;
  loading: boolean;
  error: string | null;
}

export function usePlaces(): PlacesState {
  const [state, setState] = useState<PlacesState>({
    places: [],
    region: 'Scotland',
    generatedAt: '',
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    loadScotlandPlaces()
      .then((result) => {
        if (cancelled) return;
        setState({
          places: result.places,
          region: result.region,
          generatedAt: result.generatedAt,
          loading: false,
          error: null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load places.',
        }));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
