import type maplibregl from 'maplibre-gl';
import { CRIME_YEAR_BUCKETS, type CrimeFeatureCollection } from '../data/crimeData';

/** Optional thematic overlays are attached only on first activation. */
export type OverlayId = 'crime' | 'green' | 'districts';

export { CRIME_YEAR_BUCKETS };

export const GREEN_SCORE_COLORS = ['#8E3B46', '#C4763B', '#8FA84E', '#2E9E6B'] as const;
export const GREEN_SCORE_LABELS = [
  'Fails all three',
  'Meets 1 of 3',
  'Meets 2 of 3',
  'Meets all three',
] as const;

const added = new WeakMap<maplibregl.Map, Set<OverlayId>>();

function markAdded(map: maplibregl.Map, id: OverlayId): boolean {
  let set = added.get(map);
  if (!set) {
    set = new Set();
    added.set(map, set);
  }
  if (set.has(id)) return false;
  set.add(id);
  return true;
}

export function isOverlayAdded(map: maplibregl.Map, id: OverlayId): boolean {
  return added.get(map)?.has(id) ?? false;
}

const CRIME_POINT_COLOR: maplibregl.ExpressionSpecification = [
  'step', ['get', 'year'],
  CRIME_YEAR_BUCKETS[0].color,
  2017, CRIME_YEAR_BUCKETS[1].color,
  2019, CRIME_YEAR_BUCKETS[2].color,
  2021, CRIME_YEAR_BUCKETS[3].color,
];

/** Real incidents: continuous density, clusters, and clickable street-level points. */
export function addCrimeLayers(map: maplibregl.Map, data: CrimeFeatureCollection): void {
  if (!markAdded(map, 'crime')) return;

  map.addSource('crime-density', { type: 'geojson', data });
  map.addSource('crime', {
    type: 'geojson',
    data,
    cluster: true,
    clusterMaxZoom: 15,
    clusterRadius: 46,
    generateId: true,
  });

  map.addLayer({
    id: 'crime-heat',
    type: 'heatmap',
    source: 'crime-density',
    maxzoom: 14,
    paint: {
      'heatmap-weight': ['interpolate', ['linear'], ['get', 'severityCode'], 1, 0.35, 4, 1],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 9, 0.45, 13.5, 1.55],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 9, 12, 13.5, 32],
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(0,0,0,0)',
        0.12, 'rgba(77,138,173,0.18)',
        0.35, 'rgba(104,213,232,0.42)',
        0.62, 'rgba(212,168,94,0.68)',
        0.84, 'rgba(240,106,106,0.86)',
        1, 'rgba(255,238,193,0.96)',
      ],
      'heatmap-opacity': 0,
      'heatmap-opacity-transition': { duration: 280, delay: 0 },
    },
  });

  map.addLayer({
    id: 'crime-cluster-glow',
    type: 'circle',
    source: 'crime',
    maxzoom: 16,
    filter: ['has', 'point_count'],
    paint: {
      'circle-radius': ['step', ['get', 'point_count'], 17, 50, 23, 250, 31],
      'circle-color': '#68D5E8',
      'circle-blur': 0.75,
      'circle-opacity': 0,
      'circle-opacity-transition': { duration: 280, delay: 0 },
    },
  });

  map.addLayer({
    id: 'crime-clusters',
    type: 'circle',
    source: 'crime',
    maxzoom: 16,
    filter: ['has', 'point_count'],
    paint: {
      'circle-radius': ['step', ['get', 'point_count'], 11, 50, 15, 250, 20],
      'circle-color': ['step', ['get', 'point_count'], '#4D8AAD', 50, '#D4A85E', 250, '#F06A6A'],
      'circle-opacity': 0,
      'circle-stroke-color': 'rgba(255,255,255,0.7)',
      'circle-stroke-width': 1,
      'circle-opacity-transition': { duration: 280, delay: 0 },
    },
  });

  map.addLayer({
    id: 'crime-cluster-count',
    type: 'symbol',
    source: 'crime',
    maxzoom: 16,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['Noto Sans Bold'],
      'text-size': 10,
    },
    paint: {
      'text-color': '#071018',
      'text-opacity': 0,
      'text-opacity-transition': { duration: 280, delay: 0 },
    },
  });

  map.addLayer({
    id: 'crime-point-glow',
    type: 'circle',
    source: 'crime',
    minzoom: 13.5,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-radius': ['+', 7, ['*', 1.8, ['get', 'severityCode']]],
      'circle-color': CRIME_POINT_COLOR,
      'circle-blur': 0.72,
      'circle-opacity': 0,
      'circle-opacity-transition': { duration: 280, delay: 0 },
    },
  });

  map.addLayer({
    id: 'crime-points',
    type: 'circle',
    source: 'crime',
    minzoom: 13.5,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        13.5, ['+', 2, ['get', 'severityCode']],
        18, ['+', 4, ['*', 1.5, ['get', 'severityCode']]],
      ],
      'circle-color': CRIME_POINT_COLOR,
      'circle-opacity': 0,
      'circle-stroke-width': 1.2,
      'circle-stroke-color': '#071018',
      'circle-stroke-opacity': 0.75,
      'circle-opacity-transition': { duration: 280, delay: 0 },
    },
  });
}

export function addGreenLayers(map: maplibregl.Map): void {
  if (!markAdded(map, 'green')) return;
  map.addSource('green-330300', { type: 'geojson', data: '/green-330300-astana.geojson' });
  const beforeId = map.getLayer('buildings-fill') ? 'buildings-fill' : undefined;

  map.addLayer({
    id: 'green-fill',
    type: 'fill',
    source: 'green-330300',
    paint: {
      'fill-color': [
        'match', ['get', 'score'],
        0, GREEN_SCORE_COLORS[0], 1, GREEN_SCORE_COLORS[1],
        2, GREEN_SCORE_COLORS[2], 3, GREEN_SCORE_COLORS[3], '#444',
      ],
      'fill-opacity': 0,
      'fill-opacity-transition': { duration: 280, delay: 0 },
    },
  }, beforeId);

  map.addLayer({
    id: 'green-outline',
    type: 'line',
    source: 'green-330300',
    minzoom: 13,
    paint: {
      'line-color': 'rgba(255,255,255,0.05)',
      'line-width': 0.4,
      'line-opacity': 0,
      'line-opacity-transition': { duration: 280, delay: 0 },
    },
  }, beforeId);
}

export function addDistrictLayers(map: maplibregl.Map): void {
  if (!markAdded(map, 'districts')) return;
  map.addSource('districts', { type: 'geojson', data: '/ast-borders.geojson' });

  map.addLayer({
    id: 'district-borders',
    type: 'line',
    source: 'districts',
    paint: {
      'line-color': '#d4a85e',
      'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 14, 1.8],
      'line-dasharray': [3, 2.5],
      'line-opacity': 0,
      'line-opacity-transition': { duration: 280, delay: 0 },
    },
  });

  map.addLayer({
    id: 'district-labels',
    type: 'symbol',
    source: 'districts',
    layout: {
      'text-field': ['get', 'name_en'],
      'text-font': ['Noto Sans Bold'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 10, 11, 14, 14],
      'text-transform': 'uppercase',
      'text-letter-spacing': 0.12,
    },
    paint: {
      'text-color': '#d4a85e',
      'text-halo-color': 'rgba(7,8,15,0.85)',
      'text-halo-width': 1.6,
      'text-opacity': 0,
      'text-opacity-transition': { duration: 280, delay: 0 },
    },
  });
}

const OVERLAY_ADDERS: Partial<Record<OverlayId, (map: maplibregl.Map) => void>> = {
  green: addGreenLayers,
  districts: addDistrictLayers,
};

const OVERLAY_OPACITY: Record<OverlayId, Array<{
  layer: string;
  property: string;
  visibleValue: unknown;
}>> = {
  crime: [
    { layer: 'crime-heat', property: 'heatmap-opacity', visibleValue: ['interpolate', ['linear'], ['zoom'], 9, 0.72, 13.7, 0] },
    { layer: 'crime-cluster-glow', property: 'circle-opacity', visibleValue: 0.24 },
    { layer: 'crime-clusters', property: 'circle-opacity', visibleValue: 0.9 },
    { layer: 'crime-cluster-count', property: 'text-opacity', visibleValue: 1 },
    { layer: 'crime-point-glow', property: 'circle-opacity', visibleValue: 0.32 },
    { layer: 'crime-points', property: 'circle-opacity', visibleValue: ['interpolate', ['linear'], ['zoom'], 13.5, 0, 14.2, 0.92] },
  ],
  green: [
    { layer: 'green-fill', property: 'fill-opacity', visibleValue: ['interpolate', ['linear'], ['zoom'], 10, 0.45, 14, 0.32, 16, 0.18] },
    { layer: 'green-outline', property: 'line-opacity', visibleValue: 1 },
  ],
  districts: [
    { layer: 'district-borders', property: 'line-opacity', visibleValue: 0.45 },
    { layer: 'district-labels', property: 'text-opacity', visibleValue: 0.75 },
  ],
};

const fadeTimers = new WeakMap<maplibregl.Map, Map<OverlayId, number>>();

function crossFadeOverlay(map: maplibregl.Map, id: OverlayId, visible: boolean): void {
  let timers = fadeTimers.get(map);
  if (!timers) {
    timers = new Map();
    fadeTimers.set(map, timers);
  }
  const pending = timers.get(id);
  if (pending !== undefined) window.clearTimeout(pending);

  const layers = OVERLAY_OPACITY[id].filter(({ layer }) => map.getLayer(layer));
  if (visible) {
    layers.forEach(({ layer, property }) => {
      map.setLayoutProperty(layer, 'visibility', 'visible');
      map.setPaintProperty(layer, property, 0);
    });
    requestAnimationFrame(() => {
      if (!map.getStyle()) return;
      layers.forEach(({ layer, property, visibleValue }) => {
        if (map.getLayer(layer)) map.setPaintProperty(layer, property, visibleValue);
      });
    });
    return;
  }

  layers.forEach(({ layer, property }) => map.setPaintProperty(layer, property, 0));
  timers.set(id, window.setTimeout(() => {
    if (!map.getStyle()) return;
    layers.forEach(({ layer }) => {
      if (map.getLayer(layer)) map.setLayoutProperty(layer, 'visibility', 'none');
    });
  }, 300));
}

/** Lazily attaches non-crime overlays, then cross-fades all overlay types. */
export function setOverlayVisible(map: maplibregl.Map, id: OverlayId, visible: boolean): void {
  if (visible && !isOverlayAdded(map, id)) {
    const addOverlay = OVERLAY_ADDERS[id];
    if (!addOverlay) return;
    addOverlay(map);
  }
  crossFadeOverlay(map, id, visible);
}
