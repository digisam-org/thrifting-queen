import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import maplibregl from 'maplibre-gl';
import { CATEGORIES } from '../data/categories';
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

function buildAvatarElement(isDemoMode: boolean): HTMLDivElement {
  const base = import.meta.env.BASE_URL || '/';
  const avatarSrc = `${base.endsWith('/') ? base : `${base}/`}icons/angi-avatar.svg`;

  const root = document.createElement('div');
  root.className = 'avatar-marker';
  root.setAttribute('aria-label', 'Your location');

  root.innerHTML = `
    <div class="avatar-pulse"></div>
    <div class="avatar-frame">
      <img src="${avatarSrc}" alt="Angi" class="avatar-img" />
    </div>
    <div class="avatar-tag">${isDemoMode ? 'Demo' : 'You'}</div>
  `;

  return root;
}

function placesToGeoJSON(places: Place[], visitedIds: Set<string>) {
  return {
    type: 'FeatureCollection' as const,
    features: places.map((place) => ({
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
        visited: visitedIds.has(place.id) ? 1 : 0,
      },
    })),
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
          'circle-radius': 16,
          'circle-color': 'rgba(196, 69, 105, 0.22)',
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#C44569',
        },
      });

      map.addLayer({
        id: POINT_LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 5, 13, 8.5, 16, 11],
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': [
            'case',
            ['==', ['get', 'visited'], 1],
            '#E5B25D',
            '#FAF6F0',
          ],
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
        anchor: 'center',
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
