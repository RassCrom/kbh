import type maplibregl from 'maplibre-gl';

export type MapTheme = 'dark' | 'light';

/**
 * Each entry: [layerId, paintProperty, lightValue, darkValue]
 * Tuples are applied in order — later entries override earlier ones for the same layer+property.
 */
const THEME_LAYERS: Array<[string, string, unknown, unknown]> = [
  // Background
  ['background', 'background-color', '#f0ede6', '#07080f'],

  // Water
  ['water', 'fill-color', '#c2d8ec', '#0c1828'],
  ['waterway', 'line-color', '#9ec4de', '#111f35'],

  // Landcover
  ['landcover-wood',    'fill-color',   '#c4dac0', '#0a1210'],
  ['landcover-grass',   'fill-color',   '#d4e8c8', '#0c1310'],
  ['landcover-sand',    'fill-color',   '#ece0c4', '#1a1810'],
  ['landcover-wetland', 'fill-color',   '#b8d4c4', '#0d1a20'],

  // Landuse
  ['landuse-residential', 'fill-color', '#ede8e2', '#0d0d15'],
  ['landuse-commercial',  'fill-color', '#eae4d8', '#0f0f18'],
  ['landuse-industrial',  'fill-color', '#e2ddd6', '#0e0f0d'],
  ['landuse-park',        'fill-color', '#c8e2c0', '#0c1510'],
  ['landuse-cemetery',    'fill-color', '#d4d8cc', '#0e1310'],

  // Aeroway
  ['aeroway-fill',    'fill-color', '#e2dcd8', '#131320'],
  ['aeroway-runway',  'line-color', '#c8beb8', '#2a2840'],

  // Road casings
  ['road-motorway-casing',  'line-color', '#b8a898', '#0e0e1c'],
  ['road-trunk-casing',     'line-color', '#c0b4a4', '#0c0c18'],
  ['road-primary-casing',   'line-color', '#c8bcac', '#0a0a14'],
  ['road-secondary-casing', 'line-color', '#d0c8b8', '#090910'],

  // Road fills — light theme gives a paper-map feel
  ['road-minor',     'line-color', '#d4cec8', '#1e1e2e'],
  ['road-path',      'line-color', '#cac4bc', '#1a1a28'],
  ['road-tertiary',  'line-color', '#b8b4ac', '#32323e'],
  ['road-secondary', 'line-color', '#a0a098', '#50505e'],
  ['road-primary',   'line-color', '#8c8880', '#3a3a42'],
  ['road-trunk',     'line-color', '#807870', '#40404b'],
  ['road-motorway',  'line-color', '#605850', '#e0e0f0'],
  ['rail',           'line-color', '#b4aca4', '#2d2545'],

  // Basemap buildings
  ['building-basemap',         'fill-color',    '#c4beb2', '#1a1a28'],
  ['building-basemap',         'fill-opacity',  ['interpolate', ['linear'], ['zoom'], 13, 0.3, 15, 0.6],
                                                ['interpolate', ['linear'], ['zoom'], 13, 0.2, 15, 0.55]],
  ['building-basemap-outline', 'line-color',    '#ada496', '#252538'],
  ['building-basemap-outline', 'line-opacity',  0.6, 0.5],

  // Boundaries
  ['boundary-state',   'line-color', '#b4a89c', '#3a2858'],
  ['boundary-country', 'line-color', '#9c9088', '#5a4082'],

  // ── Text label colours (halo must match background to stay legible) ──
  ['water-name', 'text-color',       '#3878aa', '#2a5a9a'],
  ['water-name', 'text-halo-color',  '#f0ede6', '#07080f'],

  ['road-label-secondary', 'text-color',      '#706860', '#5a5060'],
  ['road-label-secondary', 'text-halo-color', '#f0ede6', '#07080f'],

  ['road-label-primary', 'text-color',      '#504840', '#3a3a42'],
  ['road-label-primary', 'text-halo-color', '#f0ede6', '#07080f'],

  ['road-label-motorway', 'text-color',      '#302820', '#d0d0e0'],
  ['road-label-motorway', 'text-halo-color', '#f0ede6', '#07080f'],

  ['place-neighbourhood', 'text-color',      '#807870', '#6a6a78'],
  ['place-neighbourhood', 'text-halo-color', '#f0ede6', '#07080f'],

  ['place-village', 'text-color',      '#504840', '#888898'],
  ['place-village', 'text-halo-color', '#f0ede6', '#07080f'],

  ['place-town', 'text-color',      '#403830', '#a0a0b8'],
  ['place-town', 'text-halo-color', '#f0ede6', '#07080f'],

  ['place-city', 'text-color',      '#1c140c', '#c0c0d8'],
  ['place-city', 'text-halo-color', '#f0ede6', '#07080f'],

  ['place-state', 'text-color',      '#58504a', '#7878a0'],
  ['place-state', 'text-halo-color', '#f0ede6', '#07080f'],

  ['place-country', 'text-color',      '#100c08', '#d8d8f0'],
  ['place-country', 'text-halo-color', '#f0ede6', '#07080f'],
];

export function applyMapTheme(map: maplibregl.Map, theme: MapTheme) {
  const valIdx = theme === 'light' ? 2 : 3;
  for (const [layerId, prop, light, dark] of THEME_LAYERS) {
    if (!map.getLayer(layerId)) continue;
    try {
      map.setPaintProperty(layerId, prop, valIdx === 2 ? light : dark);
    } catch {
      // layer doesn't support this property — skip silently
    }
  }
}
