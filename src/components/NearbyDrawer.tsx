import { CheckCircle2, Heart, X } from 'lucide-react';
import { CATEGORIES } from '../data/categories';
import { formatDistance } from '../services/placesRepository';
import type { Place } from '../types/place';

export interface RankedPlace {
  place: Place;
  distanceMeters: number;
}

interface NearbyDrawerProps {
  isOpen: boolean;
  items: RankedPlace[];
  favouriteIds: Set<string>;
  visitedIds: Set<string>;
  onClose: () => void;
  onSelectPlace: (place: Place) => void;
}

export function NearbyDrawer({
  isOpen,
  items,
  favouriteIds,
  visitedIds,
  onClose,
  onSelectPlace,
}: NearbyDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <section
        className="nearby-drawer"
        onClick={(e) => e.stopPropagation()}
        aria-label="Nearby places"
      >
        <div className="sheet-handle" />
        <div className="drawer-header">
          <div>
            <h2 className="sheet-title">Closest Spots</h2>
            <p className="drawer-subtitle">Sorted by distance from your location</p>
          </div>
          <button type="button" className="sheet-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="nearby-list">
          {items.length === 0 ? (
            <p className="empty-state">No places match your current filters.</p>
          ) : (
            items.slice(0, 60).map(({ place, distanceMeters }) => {
              const meta = CATEGORIES[place.category];
              return (
                <button
                  key={place.id}
                  type="button"
                  className="nearby-item"
                  onClick={() => {
                    onSelectPlace(place);
                    onClose();
                  }}
                >
                  <span
                    className="nearby-dot"
                    style={{ backgroundColor: meta.softBg, color: meta.color }}
                    aria-hidden="true"
                  >
                    {meta.emoji}
                  </span>

                  <div className="nearby-info">
                    <div className="nearby-name-row">
                      <span className="nearby-name">{place.name}</span>
                      {favouriteIds.has(place.id) && (
                        <Heart size={13} className="inline-fav" fill="currentColor" />
                      )}
                      {visitedIds.has(place.id) && (
                        <CheckCircle2 size={13} className="inline-visited" />
                      )}
                    </div>
                    <span className="nearby-sub">
                      {meta.label}
                      {place.city ? ` · ${place.city}` : ''}
                    </span>
                  </div>

                  <span className="nearby-distance">{formatDistance(distanceMeters)}</span>
                </button>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
