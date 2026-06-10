import type maplibregl from 'maplibre-gl';

/**
 * Optional thematic overlays (crime incidents, 3-30-300 green rule, district
 * borders). Sources and layers are added lazily on first activation so the
 * GeoJSON files cost zero bandwidth until the user opts in.
 */

export type OverlayId = 'crime' | 'green' | 'districts';

export const CRIME_CATEGORIES = [
  { id: 'theft',     label: 'Theft',         color: '#F5B82E' },
  { id: 'traffic',   label: 'Road Accident', color: '#4D9DE0' },
  { id: 'vandalism', label: 'Vandalism',     color: '#B07CE8' },
  { id: 'burglary',  label: 'Burglary',      color: '#E8791A' },
  { id: 'assault',   label: 'Assault',       color: '#E15554' },
] as const;

// 3-30-300 score palette: 0 rules met (deficit red) → 3 rules met (healthy green)
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

/** True if the overlay's source+layers have already been attached to this map. */
export function isOverlayAdded(map: maplibregl.Map, id: OverlayId): boolean {
  return added.get(map)?.has(id) ?? false;
}

// ── Crime incidents — heatmap at city scale, categorised dots up close ──────
export function addCrimeLayers(map: maplibregl.Map): void {
  if (!markAdded(map, 'crime')) return;

  map.addSource('crime', { type: 'geojson', data: '/crime-astana.geojson' });

  map.addLayer({
    id: 'crime-heat',
    type: 'heatmap',
    source: 'crime',
    maxzoom: 14.5,
    paint: {
      'heatmap-weight': ['interpolate', ['linear'], ['get', 'severity'], 1, 0.4, 3, 1],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 0.7, 14, 1.6],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 14, 14, 34],
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(0,0,0,0)',
        0.15, 'rgba(77,77,170,0.25)',
        0.35, 'rgba(170,80,140,0.45)',
        0.6, 'rgba(225,85,84,0.65)',
        0.85, 'rgba(245,184,46,0.85)',
        1, 'rgba(255,240,180,0.95)',
      ],
      'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0.85, 14.5, 0],
    },
  });

  map.addLayer({
    id: 'crime-points',
    type: 'circle',
    source: 'crime',
    minzoom: 13,
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        13, ['+', 1.5, ['get', 'severity']],
        17, ['+', 4, ['*', 2.2, ['get', 'severity']]],
      ],
      'circle-color': [
        'match', ['get', 'category'],
        'theft', CRIME_CATEGORIES[0].color,
        'traffic', CRIME_CATEGORIES[1].color,
        'vandalism', CRIME_CATEGORIES[2].color,
        'burglary', CRIME_CATEGORIES[3].color,
        'assault', CRIME_CATEGORIES[4].color,
        '#9aa4b2',
      ],
      'circle-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0, 14, 0.85],
      'circle-stroke-width': 1,
      'circle-stroke-color': 'rgba(0,0,0,0.45)',
      'circle-stroke-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0, 14, 0.6],
    },
  });
}

// ── 3-30-300 green rule grid ─────────────────────────────────────────────────
export function addGreenLayers(map: maplibregl.Map): void {
  if (!markAdded(map, 'green')) return;

  map.addSource('green-330300', { type: 'geojson', data: '/green-330300-astana.geojson' });

  // Insert beneath the building layers so footprints stay readable on top
  const beforeId = map.getLayer('buildings-fill') ? 'buildings-fill' : undefined;

  map.addLayer(
    {
      id: 'green-fill',
      type: 'fill',
      source: 'green-330300',
      paint: {
        'fill-color': [
          'match', ['get', 'score'],
          0, GREEN_SCORE_COLORS[0],
          1, GREEN_SCORE_COLORS[1],
          2, GREEN_SCORE_COLORS[2],
          3, GREEN_SCORE_COLORS[3],
          '#444',
        ],
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.45, 14, 0.32, 16, 0.18],
      },
    },
    beforeId,
  );

  map.addLayer(
    {
      id: 'green-outline',
      type: 'line',
      source: 'green-330300',
      minzoom: 13,
      paint: {
        'line-color': 'rgba(255,255,255,0.05)',
        'line-width': 0.4,
      },
    },
    beforeId,
  );
}

// ── District administrative borders ─────────────────────────────────────────
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
      'line-opacity': 0.45,
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
      'text-opacity': 0.75,
    },
  });
}

const OVERLAY_LAYER_IDS: Record<OverlayId, string[]> = {
  crime: ['crime-heat', 'crime-points'],
  green: ['green-fill', 'green-outline'],
  districts: ['district-borders', 'district-labels'],
};

const OVERLAY_ADDERS: Record<OverlayId, (map: maplibregl.Map) => void> = {
  crime: addCrimeLayers,
  green: addGreenLayers,
  districts: addDistrictLayers,
};

/** Lazily attaches the overlay on first activation, then toggles visibility. */
export function setOverlayVisible(map: maplibregl.Map, id: OverlayId, visible: boolean): void {
  if (visible && !isOverlayAdded(map, id)) OVERLAY_ADDERS[id](map);
  for (const layerId of OVERLAY_LAYER_IDS[id]) {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
    }
  }
}
