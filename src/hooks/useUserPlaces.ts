import { useCallback, useMemo, useState } from 'react';
import { readUserPlaces, writeUserPlaces, type UserPlaceMap } from '../services/userStore';
import type { UserPlaceRecord } from '../types/place';

const DEFAULT_RECORD: UserPlaceRecord = {
  favourite: false,
  visited: false,
};

export function useUserPlaces() {
  const [records, setRecords] = useState<UserPlaceMap>(() => readUserPlaces());

  const updateRecord = useCallback(
    (placeId: string, updater: (prev: UserPlaceRecord) => UserPlaceRecord) => {
      setRecords((prev) => {
        const current = prev[placeId] ?? DEFAULT_RECORD;
        const nextRecord = updater(current);
        const nextMap: UserPlaceMap = { ...prev, [placeId]: nextRecord };
        writeUserPlaces(nextMap);
        return nextMap;
      });
    },
    [],
  );

  const toggleFavourite = useCallback(
    (placeId: string) => {
      updateRecord(placeId, (prev) => ({ ...prev, favourite: !prev.favourite }));
    },
    [updateRecord],
  );

  const toggleVisited = useCallback(
    (placeId: string) => {
      updateRecord(placeId, (prev) => ({
        ...prev,
        visited: !prev.visited,
        visitedAt: !prev.visited ? new Date().toISOString() : undefined,
      }));
    },
    [updateRecord],
  );

  const setNote = useCallback(
    (placeId: string, note: string) => {
      updateRecord(placeId, (prev) => ({ ...prev, note }));
    },
    [updateRecord],
  );

  const favouriteIds = useMemo(() => {
    const set = new Set<string>();
    for (const [id, rec] of Object.entries(records)) {
      if (rec.favourite) set.add(id);
    }
    return set;
  }, [records]);

  const visitedIds = useMemo(() => {
    const set = new Set<string>();
    for (const [id, rec] of Object.entries(records)) {
      if (rec.visited) set.add(id);
    }
    return set;
  }, [records]);

  return {
    records,
    favouriteIds,
    visitedIds,
    toggleFavourite,
    toggleVisited,
    setNote,
  };
}
