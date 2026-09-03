import { ERA_CONFIG, type EraStop } from './constants';
import { buildEraColorExpr } from './mapHelpers';

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

/** Same era colour ramp as buildings (detailed or simplified), applied to avgYear */
export function buildYearAvgColorExpr(eras: EraStop[] = ERA_CONFIG): maplibregl.ExpressionSpecification {
  return buildEraColorExpr(eras, ['coalesce', ['get', 'year_mean'], 0]);
}

/** Extrusion height — 15× real average height, minimum 10 m so zero-data hexagons still read */
export function buildHexHeightExpr(): maplibregl.ExpressionSpecification {
  return [
    'max',
    ['*', ['coalesce', ['get', 'height_mean_2'], 0], 15],
    10,
  ] as unknown as maplibregl.ExpressionSpecification;
}

/**
 * Cinema sweep height — a hexagon starts rising once the sweep year reaches
 * its average construction year and reaches full height ~4 years later, so
 * cells grow smoothly instead of popping in. Hexagons without year data stay flat.
 */
export function buildHexCinemaHeightExpr(year: number): maplibregl.ExpressionSpecification {
  const yearMean = ['coalesce', ['get', 'year_mean'], 0];
  return [
    'case',
    ['>', yearMean, 0],
    [
      '*',
      ['max', ['*', ['coalesce', ['get', 'height_mean_2'], 0], 15], 10],
      ['min', 1, ['max', 0, ['/', ['-', year, yearMean], 4]]],
    ],
    0,
  ] as unknown as maplibregl.ExpressionSpecification;
}

