export type HexMetric = 'count' | 'year';

export interface HexProperties {
  NUMPOINTS: number;
  year_mean: number | null;
  height_mean_2: number | null;
}

// ── MapLibre paint expressions ───────────────────────────────────────────────

/** Colour ramp for building count (1 → pale blue-grey, high → gold-amber) */
export function buildCountColorExpr(): maplibregl.ExpressionSpecification {
  return [
    'interpolate', ['linear'], ['get', 'NUMPOINTS'],
    1,   '#1e3a4a',
    10,  '#1a5c7a',
    25,  '#1a8aaa',
    50,  '#a07840',
    100, '#d4a85e',
    200, '#e8791a',
  ] as unknown as maplibregl.ExpressionSpecification;
}

/** Same ERA colour step as buildings, applied to avgYear */
export function buildYearAvgColorExpr(): maplibregl.ExpressionSpecification {
  return [
    'case',
    ['>', ['coalesce', ['get', 'year_mean'], 0], 0],
    [
      'step', ['coalesce', ['get', 'year_mean'], 0],
      '#8B2635',
      1917, '#D32F2F',
      1936, '#C47A24',
      1953, '#5E9E6A',
      1964, '#4A7BAA',
      1985, '#7B4D9E',
      1991, '#A07840',
      1997, '#007A9A',
      2007, '#00AFCA',
      2019, '#F5B82E',
    ],
    '#242424',
  ] as unknown as maplibregl.ExpressionSpecification;
}

/** Extrusion height — 15× real average height, minimum 10 m so zero-data hexagons still read */
export function buildHexHeightExpr(): maplibregl.ExpressionSpecification {
  return [
    'max',
    ['*', ['coalesce', ['get', 'height_mean_2'], 0], 15],
    10,
  ] as unknown as maplibregl.ExpressionSpecification;
}

