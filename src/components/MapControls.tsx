import { Compass, List, LocateFixed, Sparkles } from 'lucide-react';

interface MapControlsProps {
  isLocating: boolean;
  isDemoMode: boolean;
  outsideScotland: boolean;
  nearbyCount: number;
  onLocateMe: () => void;
  onJumpEdinburgh: () => void;
  onOpenNearby: () => void;
}

export function MapControls({
  isLocating,
  isDemoMode,
  outsideScotland,
  nearbyCount,
  onLocateMe,
  onJumpEdinburgh,
  onOpenNearby,
}: MapControlsProps) {
  return (
    <>
      {(isDemoMode || outsideScotland) && (
        <div className="status-banner">
          <Sparkles size={14} />
          <span>
            {outsideScotland
              ? 'Looks like you are outside Scotland right now.'
              : 'Previewing in Stockbridge, Edinburgh'}
          </span>
          {outsideScotland && (
            <button type="button" className="status-action" onClick={onJumpEdinburgh}>
              Jump to Edinburgh
            </button>
          )}
        </div>
      )}

      <div className="floating-controls">
        <button
          type="button"
          className="fab-btn"
          onClick={onLocateMe}
          aria-label="Center on my location"
          title="Center on my location"
        >
          <LocateFixed size={20} className={isLocating ? 'spin' : ''} />
        </button>

        <button
          type="button"
          className="fab-btn"
          onClick={onJumpEdinburgh}
          aria-label="Preview Stockbridge, Edinburgh"
          title="Preview Stockbridge, Edinburgh"
        >
          <Compass size={20} />
        </button>

        <button
          type="button"
          className="nearby-pill-btn"
          onClick={onOpenNearby}
          aria-label="Open nearby places list"
        >
          <List size={18} />
          <span>Nearby</span>
          <span className="nearby-badge">{nearbyCount}</span>
        </button>
      </div>
    </>
  );
}
