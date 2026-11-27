import { useRef, useState, type CSSProperties, type TouchEvent } from 'react';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Heart,
  MapPin,
  Navigation,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { CATEGORIES } from '../data/categories';
import { buildDirectionsUrl, buildGoogleReviewsUrl } from '../services/location';
import { distanceMeters, formatDistance } from '../services/placesRepository';
import type { Coordinates, Place, UserPlaceRecord } from '../types/place';

interface PlaceDetailSheetProps {
  place: Place | null;
  userCoords: Coordinates | null;
  userRecord: UserPlaceRecord;
  onClose: () => void;
  onToggleFavourite: (placeId: string) => void;
  onToggleVisited: (placeId: string) => void;
  onNoteChange: (placeId: string, note: string) => void;
}

export function PlaceDetailSheet({
  place,
  userCoords,
  userRecord,
  onClose,
  onToggleFavourite,
  onToggleVisited,
  onNoteChange,
}: PlaceDetailSheetProps) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartYRef = useRef<number | null>(null);
  const touchStartTimeRef = useRef<number>(0);

  if (!place) return null;

  const meta = CATEGORIES[place.category];
  const dist = userCoords ? formatDistance(distanceMeters(userCoords, place)) : null;
  const directionsUrl = buildDirectionsUrl(place.lat, place.lng, place.name);
  const reviewsUrl = buildGoogleReviewsUrl(place.name, place.address, place.city);

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartYRef.current = e.touches[0].clientY;
    touchStartTimeRef.current = Date.now();
    setIsDragging(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (touchStartYRef.current === null || e.touches.length !== 1) return;
    const deltaY = e.touches[0].clientY - touchStartYRef.current;
    if (deltaY > 0) {
      setDragY(deltaY);
    } else {
      setDragY(0);
    }
  };

  const handleTouchEnd = () => {
    if (touchStartYRef.current === null) return;
    const elapsedMs = Math.max(1, Date.now() - touchStartTimeRef.current);
    const velocity = dragY / elapsedMs; // px per ms

    touchStartYRef.current = null;
    setIsDragging(false);

    if (dragY > 75 || (dragY > 30 && velocity > 0.45)) {
      setDragY(0);
      onClose();
    } else {
      setDragY(0);
    }
  };

  const sheetTheme = {
    '--cat-color': meta.color,
    '--cat-dark': meta.colorDark,
    '--cat-soft': meta.softBg,
    '--cat-border': meta.tintBorder,
    transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
    transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
  } as CSSProperties;

  return (
    <section className="bottom-sheet" style={sheetTheme} aria-label={place.name}>
      <div
        className="sheet-banner"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div className="sheet-handle" />

        <div className="sheet-header">
          <div className="sheet-medallion" aria-hidden="true">
            {meta.emoji}
          </div>

          <div className="sheet-title-wrap">
            <div className="badge-row">
              <span className="category-badge">{meta.label}</span>
              {dist && <span className="distance-chip">{dist} away</span>}
            </div>
            <h2 className="sheet-title">{place.name}</h2>
          </div>

          <button type="button" className="sheet-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="sheet-body">
        {place.personalNote && (
          <div className="personal-note-banner">
            <Sparkles size={15} />
            <p>{place.personalNote}</p>
          </div>
        )}

        {place.description && <p className="sheet-description">{place.description}</p>}

        {(place.address || place.openingHours) && (
          <div className="sheet-meta-list">
            {place.address && (
              <div className="meta-row">
                <MapPin size={15} />
                <span>{place.address}</span>
              </div>
            )}
            {place.openingHours && (
              <div className="meta-row">
                <Clock size={15} />
                <span>{place.openingHours}</span>
              </div>
            )}
          </div>
        )}

        <div className="sheet-actions">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="action-btn primary"
          >
            <Navigation size={15} />
            <span>Directions</span>
          </a>

          <a
            href={reviewsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="action-btn"
          >
            <Star size={15} />
            <span>Reviews</span>
          </a>

          <button
            type="button"
            className={`action-btn ${userRecord.favourite ? 'active-fav' : ''}`}
            onClick={() => onToggleFavourite(place.id)}
          >
            <Heart size={15} fill={userRecord.favourite ? 'currentColor' : 'none'} />
            <span>{userRecord.favourite ? 'Saved' : 'Save'}</span>
          </button>

          <button
            type="button"
            className={`action-btn ${userRecord.visited ? 'active-visited' : ''}`}
            onClick={() => onToggleVisited(place.id)}
          >
            <CheckCircle2 size={15} />
            <span>{userRecord.visited ? 'Visited' : 'Mark Visited'}</span>
          </button>

          {place.website && (
            <a
              href={place.website}
              target="_blank"
              rel="noopener noreferrer"
              className="action-btn icon-only"
              aria-label="Open website"
              title="Website"
            >
              <ExternalLink size={15} />
            </a>
          )}
        </div>

        <div className="note-box">
          <label htmlFor={`note-${place.id}`} className="note-label">
            Your notes (saved on your phone)
          </label>
          <textarea
            id={`note-${place.id}`}
            rows={2}
            className="note-textarea"
            placeholder="Best pastry, cool vintage jacket, cosy reading corner..."
            value={userRecord.note ?? ''}
            onChange={(e) => onNoteChange(place.id, e.target.value)}
          />
        </div>
      </div>
    </section>
  );
}
