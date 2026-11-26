import { useMemo, useRef, useState } from 'react';
import { CategoryFilterBar } from './components/CategoryFilterBar';
import { MapControls } from './components/MapControls';
import { MapView, type MapViewHandle } from './components/MapView';
import { NearbyDrawer, type RankedPlace } from './components/NearbyDrawer';
import { PlaceDetailSheet } from './components/PlaceDetailSheet';
import { CATEGORY_LIST } from './data/categories';
import { useGeolocation } from './hooks/useGeolocation';
import { usePlaces } from './hooks/usePlaces';
import { useUserPlaces } from './hooks/useUserPlaces';
import { EDINBURGH_DEMO_COORDS } from './services/location';
import { distanceMeters, filterPlaces } from './services/placesRepository';
import type { Place, PlaceCategory } from './types/place';

const ALL_CATEGORIES = new Set<PlaceCategory>(CATEGORY_LIST.map((c) => c.id));

export function App() {
  const mapRef = useRef<MapViewHandle | null>(null);
  const { places, error: placesError } = usePlaces();
  const {
    coords,
    isDemoMode,
    isLocating,
    outsideScotland,
    requestLocate,
    enableEdinburghDemo,
  } = useGeolocation();
  const { records, favouriteIds, visitedIds, toggleFavourite, toggleVisited, setNote } =
    useUserPlaces();

  const [activeCategories, setActiveCategories] = useState<Set<PlaceCategory>>(
    () => new Set(ALL_CATEGORIES),
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [indiesOnly, setIndiesOnly] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [nearbyOpen, setNearbyOpen] = useState(false);

  const visiblePlaces = useMemo(
    () =>
      filterPlaces(places, activeCategories, searchQuery, favouritesOnly, favouriteIds, indiesOnly),
    [places, activeCategories, searchQuery, favouritesOnly, favouriteIds, indiesOnly],
  );

  const rankedNearby = useMemo<RankedPlace[]>(() => {
    const anchor = coords ?? EDINBURGH_DEMO_COORDS;
    return visiblePlaces
      .map((place) => ({
        place,
        distanceMeters: distanceMeters(anchor, place),
      }))
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [visiblePlaces, coords]);

  const handleToggleCategory = (category: PlaceCategory) => {
    setActiveCategories((prev) => {
      // If all categories are currently selected, tapping one focuses just that category
      if (prev.size === ALL_CATEGORIES.size) {
        return new Set([category]);
      }
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      // Never leave zero categories selected
      return next.size === 0 ? new Set(ALL_CATEGORIES) : next;
    });
  };

  const handleSelectAllCategories = () => {
    setActiveCategories(new Set(ALL_CATEGORIES));
    setFavouritesOnly(false);
    setIndiesOnly(false);
  };

  const handleLocateMe = async () => {
    const live = await requestLocate();
    if (live) {
      mapRef.current?.flyTo(live, 15);
    } else if (coords) {
      mapRef.current?.flyTo(coords, 14.5);
    }
  };

  const handleJumpEdinburgh = () => {
    enableEdinburghDemo();
    mapRef.current?.flyTo(EDINBURGH_DEMO_COORDS, 15);
  };

  const handleSelectFromNearby = (place: Place) => {
    setSelectedPlace(place);
    mapRef.current?.flyTo({ lat: place.lat, lng: place.lng }, 15.5);
  };

  return (
    <main className="app-shell">
      <MapView
        ref={mapRef}
        places={visiblePlaces}
        userCoords={coords}
        isDemoMode={isDemoMode}
        selectedPlaceId={selectedPlace?.id ?? null}
        visitedIds={visitedIds}
        onSelectPlace={setSelectedPlace}
        onClearSelection={() => setSelectedPlace(null)}
      />

      <CategoryFilterBar
        activeCategories={activeCategories}
        searchQuery={searchQuery}
        favouritesOnly={favouritesOnly}
        indiesOnly={indiesOnly}
        totalVisible={visiblePlaces.length}
        onToggleCategory={handleToggleCategory}
        onSelectAllCategories={handleSelectAllCategories}
        onSearchChange={setSearchQuery}
        onToggleFavouritesOnly={() => setFavouritesOnly((v) => !v)}
        onToggleIndiesOnly={() => setIndiesOnly((v) => !v)}
      />

      {placesError && <div className="error-toast">{placesError}</div>}

      {!selectedPlace && (
        <MapControls
          isLocating={isLocating}
          isDemoMode={isDemoMode}
          outsideScotland={outsideScotland}
          nearbyCount={rankedNearby.length}
          onLocateMe={handleLocateMe}
          onJumpEdinburgh={handleJumpEdinburgh}
          onOpenNearby={() => setNearbyOpen(true)}
        />
      )}

      <PlaceDetailSheet
        place={selectedPlace}
        userCoords={coords}
        userRecord={
          selectedPlace
            ? (records[selectedPlace.id] ?? { favourite: false, visited: false })
            : { favourite: false, visited: false }
        }
        onClose={() => setSelectedPlace(null)}
        onToggleFavourite={toggleFavourite}
        onToggleVisited={toggleVisited}
        onNoteChange={setNote}
      />

      <NearbyDrawer
        isOpen={nearbyOpen}
        items={rankedNearby}
        favouriteIds={favouriteIds}
        visitedIds={visitedIds}
        onClose={() => setNearbyOpen(false)}
        onSelectPlace={handleSelectFromNearby}
      />
    </main>
  );
}
