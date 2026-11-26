import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import maplibregl from 'maplibre-gl';
import { CATEGORIES, CATEGORY_LIST } from '../data/categories';
import { EDINBURGH_DEMO_COORDS } from '../services/location';
import type { Coordinates, Place } from '../types/place';

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const SOURCE_ID = 'scotland-places';
const CLUSTER_LAYER_ID = 'places-clusters';
const CLUSTER_COUNT_LAYER_ID = 'places-cluster-count';
const POINT_LAYER_ID = 'places-unclustered';
const POINT_SELECTED_LAYER_ID = 'places-selected-ring';

export interface MapViewHandle {
  flyTo: (coords: { lat: number; lng: number }, zoom?: number) => void;
}

interface MapViewProps {
  places: Place[];
  userCoords: Coordinates | null;
  isDemoMode: boolean;
  selectedPlaceId: string | null;
  visitedIds: Set<string>;
  onSelectPlace: (place: Place) => void;
  onClearSelection: () => void;
}

const AVATAR_QUIPS = [
  'Ready to thrift! ✨',
  'Matcha time? 🍵',
  'Bookshop hunt! 📚',
  'Cosy cafe break? ☕',
  'Pastry stop? 🥐',
  'Treasure hunting! 🏺',
];

function buildAvatarElement(isDemoMode: boolean): HTMLDivElement {
  const base = import.meta.env.BASE_URL || '/';
  const avatarSrc = `${base.endsWith('/') ? base : `${base}/`}icons/angi-avatar.png`;

  const root = document.createElement('div');
  root.className = 'avatar-marker';
  root.setAttribute('aria-label', 'Your location');
  root.setAttribute('role', 'button');
  root.setAttribute('tabindex', '0');

  root.innerHTML = `
    <div class="avatar-bubble" aria-live="polite"></div>
    <span class="avatar-sparkle sparkle-1" aria-hidden="true">✦</span>
    <span class="avatar-sparkle sparkle-2" aria-hidden="true">✦</span>
    <div class="avatar-frame">
      <img src="${avatarSrc}" alt="Angi" class="avatar-img" />
    </div>
    <div class="avatar-pulse"></div>
    <div class="avatar-tag">${isDemoMode ? 'Demo' : 'You'}</div>
  `;

  let quipIndex = 0;
  let hideTimer: number | undefined;
  const bubble = root.querySelector('.avatar-bubble') as HTMLDivElement | null;
  const frame = root.querySelector('.avatar-frame') as HTMLDivElement | null;

  const triggerJoy = (e: Event) => {
    e.stopPropagation();
    if (frame) {
      frame.classList.remove('is-jumping');
      void frame.offsetWidth; // restart CSS keyframe animation cleanly
      frame.classList.add('is-jumping');
    }
    if (bubble) {
      bubble.textContent = AVATAR_QUIPS[quipIndex % AVATAR_QUIPS.length];
      quipIndex += 1;
      bubble.classList.add('visible');
      if (hideTimer !== undefined) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        bubble.classList.remove('visible');
      }, 2400);
    }
  };

  root.addEventListener('click', triggerJoy);
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') triggerJoy(e);
  });

  return root;
}

function declutterBaseMap(map: maplibregl.Map): void {
  const layers = map.getStyle()?.layers ?? [];
  for (const layer of layers) {
    // Hide all generic base-map POIs (offices, schools, clubs, generic shops, etc.)
    // while keeping transit stops/stations (`poi_transit`), street names, and place/water labels.
    if (
      'source-layer' in layer &&
      layer['source-layer'] === 'poi' &&
      layer.id !== 'poi_transit'
    ) {
      map.setLayoutProperty(layer.id, 'visibility', 'none');
    }
  }

  // Show bus & train stations cleanly when zoomed in
  if (map.getLayer('poi_transit')) {
    map.setLayerZoomRange('poi_transit', 13, 24);
  }
}

function createEmojiPinImage(
  emoji: string,
  borderColor: string,
  bgColor: string,
  visited: boolean,
): ImageData {
  const size = 68; // Rendered at 2x pixelRatio -> 34px logical badge
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return new ImageData(size, size);
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = 24;

  // Soft drop shadow + warm badge fill
  ctx.save();
  ctx.shadowColor = 'rgba(36, 30, 26, 0.28)';
  ctx.shadowBlur = 7;
  ctx.shadowOffsetY = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.restore();

  // Category-colored ring (golden ring when visited)
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = visited ? 5 : 4.5;
  ctx.strokeStyle = visited ? '#E5B25D' : borderColor;
  ctx.stroke();

  // Native color emoji centered inside badge
  ctx.font = '27px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, cx, cy + 2);

  // Small checkmark badge in top-right when visited
  if (visited) {
    ctx.beginPath();
    ctx.arc(cx + 17, cy - 17, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#2E6F5E';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#FAF6F0';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + 13, cy - 17);
    ctx.lineTo(cx + 16, cy - 14);
    ctx.lineTo(cx + 21, cy - 20);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#FAF6F0';
    ctx.stroke();
  }

  return ctx.getImageData(0, 0, size, size);
}

function registerEmojiPinSprites(map: maplibregl.Map): void {
  for (const cat of CATEGORY_LIST) {
    const normalId = `pin-${cat.id}`;
    if (!map.hasImage(normalId)) {
      map.addImage(normalId, createEmojiPinImage(cat.emoji, cat.color, '#FFFDF9', false), {
        pixelRatio: 2,
      });
    }

    const visitedId = `pin-${cat.id}-visited`;
    if (!map.hasImage(visitedId)) {
      map.addImage(visitedId, createEmojiPinImage(cat.emoji, cat.color, cat.softBg, true), {
        pixelRatio: 2,
      });
    }
  }
}

function placesToGeoJSON(places: Place[], visitedIds: Set<string>) {
  return {
    type: 'FeatureCollection' as const,
    features: places.map((place) => {
      const isVisited = visitedIds.has(place.id);
      return {
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [place.lng, place.lat] as [number, number],
        },
        properties: {
          id: place.id,
          name: place.name,
          category: place.category,
          color: CATEGORIES[place.category].color,
          icon: isVisited ? `pin-${place.category}-visited` : `pin-${place.category}`,
          visited: isVisited ? 1 : 0,
        },
      };
    }),
  };
}

export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  {
    places,
    userCoords,
    isDemoMode,
    selectedPlaceId,
    visitedIds,
    onSelectPlace,
    onClearSelection,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const avatarMarkerRef = useRef<maplibregl.Marker | null>(null);
  const hasCenteredInitiallyRef = useRef(false);
  const placesByIdRef = useRef<Map<string, Place>>(new Map());
  const onSelectPlaceRef = useRef(onSelectPlace);
  const onClearSelectionRef = useRef(onClearSelection);

  onSelectPlaceRef.current = onSelectPlace;
  onClearSelectionRef.current = onClearSelection;

  useEffect(() => {
    const lookup = new Map<string, Place>();
    for (const p of places) lookup.set(p.id, p);
    placesByIdRef.current = lookup;
  }, [places]);

  useImperativeHandle(ref, () => ({
    flyTo: (coords, zoom = 15) => {
      mapRef.current?.flyTo({
        center: [coords.lng, coords.lat],
        zoom,
        duration: 850,
        essential: true,
      });
    },
  }));

  // Initialize MapLibre map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: [EDINBURGH_DEMO_COORDS.lng, EDINBURGH_DEMO_COORDS.lat],
      zoom: 13.5,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    map.on('load', () => {
      declutterBaseMap(map);
      registerEmojiPinSprites(map);

      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: placesToGeoJSON(places, visitedIds),
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 46,
      });

      map.addLayer({
        id: CLUSTER_LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#241E1A',
          'circle-radius': ['step', ['get', 'point_count'], 18, 15, 22, 50, 27],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#FAF6F0',
        },
      });

      map.addLayer({
        id: CLUSTER_COUNT_LAYER_ID,
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 12,
        },
        paint: {
          'text-color': '#FAF6F0',
        },
      });

      map.addLayer({
        id: POINT_SELECTED_LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['==', ['get', 'id'], ''],
        paint: {
          'circle-radius': 23,
          'circle-color': 'rgba(196, 69, 105, 0.22)',
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#C44569',
        },
      });

      map.addLayer({
        id: POINT_LAYER_ID,
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': ['interpolate', ['linear'], ['zoom'], 9, 0.72, 13, 0.92, 16, 1.08],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
      });

      map.on('click', CLUSTER_LAYER_ID, async (e) => {
        const feature = e.features?.[0];
        if (!feature || feature.geometry.type !== 'Point') return;
        const clusterId = feature.properties?.cluster_id as number | undefined;
        if (clusterId === undefined) return;
        const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
        if (!source) return;
        try {
          const zoom = await source.getClusterExpansionZoom(clusterId);
          map.easeTo({
            center: feature.geometry.coordinates as [number, number],
            zoom: Math.min(zoom + 0.5, 16),
            duration: 500,
          });
        } catch {
          // Ignore expansion errors if source updated mid-click
        }
      });

      map.on('click', POINT_LAYER_ID, (e) => {
        const feature = e.features?.[0];
        const id = feature?.properties?.id as string | undefined;
        if (!id) return;
        const place = placesByIdRef.current.get(id);
        if (!place) return;
        onSelectPlaceRef.current(place);
        map.easeTo({
          center: [place.lng, place.lat],
          zoom: Math.max(map.getZoom(), 14.5),
          duration: 450,
        });
      });

      map.on('click', (e) => {
        const hit = map.queryRenderedFeatures(e.point, {
          layers: [POINT_LAYER_ID, CLUSTER_LAYER_ID],
        });
        if (hit.length === 0) {
          onClearSelectionRef.current();
        }
      });

      map.on('mouseenter', POINT_LAYER_ID, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', POINT_LAYER_ID, () => {
        map.getCanvas().style.cursor = '';
      });
      map.on('mouseenter', CLUSTER_LAYER_ID, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', CLUSTER_LAYER_ID, () => {
        map.getCanvas().style.cursor = '';
      });
    });

    mapRef.current = map;

    return () => {
      avatarMarkerRef.current?.remove();
      avatarMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update GeoJSON data whenever filtered places or visited set changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(placesToGeoJSON(places, visitedIds));
    }
  }, [places, visitedIds]);

  // Highlight selected place ring
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer(POINT_SELECTED_LAYER_ID)) return;
    map.setFilter(POINT_SELECTED_LAYER_ID, ['==', ['get', 'id'], selectedPlaceId ?? '']);
  }, [selectedPlaceId]);

  // Update cartoon avatar marker on user coordinates change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userCoords) return;

    if (!avatarMarkerRef.current) {
      const el = buildAvatarElement(isDemoMode);
      avatarMarkerRef.current = new maplibregl.Marker({
        element: el,
        anchor: 'bottom',
      })
        .setLngLat([userCoords.lng, userCoords.lat])
        .addTo(map);
    } else {
      avatarMarkerRef.current.setLngLat([userCoords.lng, userCoords.lat]);
      const tag = avatarMarkerRef.current.getElement().querySelector('.avatar-tag');
      if (tag) {
        tag.textContent = isDemoMode ? 'Demo' : 'You';
      }
    }

    if (!hasCenteredInitiallyRef.current) {
      hasCenteredInitiallyRef.current = true;
      map.jumpTo({
        center: [userCoords.lng, userCoords.lat],
        zoom: 14,
      });
    }
  }, [userCoords, isDemoMode]);

  return <div ref={containerRef} className="map-canvas" />;
});
