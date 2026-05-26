export type HexMetric = 'count' | 'year';

export interface HexProperties {
  count: number;
  avgYear: number;
  avgHeight: number;
}

// ── MapLibre paint expressions ───────────────────────────────────────────────

/** Colour ramp for building count (1 → pale blue-grey, high → gold-amber) */
export function buildCountColorExpr(): maplibregl.ExpressionSpecification {
  return [
    'interpolate', ['linear'], ['get', 'count'],
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
    ['>', ['get', 'avgYear'], 0],
    [
      'step', ['get', 'avgYear'],
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
    ['*', ['get', 'avgHeight'], 15],
    10,
  ] as unknown as maplibregl.ExpressionSpecification;
}
