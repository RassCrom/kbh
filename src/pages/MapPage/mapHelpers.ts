import maplibregl from 'maplibre-gl';
import { ERA_CONFIG, type EraStop } from './constants';

export type ColorMode = 'year' | 'elevation' | 'lst' | 'type' | 'uhi';

export const TYPE_LEGEND = [
  { label: 'Residential', color: '#F4A261', desc: 'Apartments, houses, residential complexes' },
  { label: 'Commercial & Leisure', color: '#8B5CF6', desc: 'Business offices, shopping malls, entertainment centers' },
  { label: 'Education & Research', color: '#3B82F6', desc: 'Schools, kindergartens, universities' },
  { label: 'Religious Landmarks', color: '#00E5FF', desc: 'Mosques, churches, cathedrals' },
  { label: 'Culture & Sport', color: '#EC4899', desc: 'Museums, theaters, sports arenas' },
  { label: 'Healthcare', color: '#10B981', desc: 'Hospitals, clinics, medical stations' },
  { label: 'Infrastructure & Admin', color: '#64748B', desc: 'Government buildings, transport hubs, utilities' },
  { label: 'Other / Undocumented', color: '#475569', desc: 'Mixed use or unclassified buildings' },
] as const;

// ── Bivariate Urban Heat Island (UHI) correlation ──────────────────────────
// 3×3 matrix: rows = LST temperature (cool→hot), cols = building age (old→new)
// Color scheme: Professional 3x3 bivariate choropleth
//   Row 0 = coolest LST, Row 2 = hottest LST
//   Col 0 = oldest buildings, Col 2 = newest buildings

// Age bins (columns): Pre-1991 | 1991–2010 | 2011+
export const UHI_AGE_BINS = [
  { label: 'Pre-1991', max: 1990 },
  { label: '1991–2010', max: 2010 },
  { label: '2011+', max: 9999 },
] as const;

// LST bins (rows): <38°C | 38–43°C | ≥43°C
export const UHI_LST_BINS = [
  { label: '< 38 °C', max: 38 },
  { label: '38–43 °C', max: 43 },
  { label: '≥ 43 °C', max: 999 },
] as const;

// 3×3 color grid [row (LST low→high)][col (age old→new)]
export const UHI_MATRIX = [
  // Cool (< 38°C)
  ['#64acbe', '#85b6c2', '#a6c0c6'],
  // Moderate (38–43°C)
  ['#c87a5a', '#ad857a', '#9b919a'],
  // Hot (≥ 43°C)
  ['#c85a5a', '#ad5b78', '#8e5c96'],
] as const;

/**
 * Builds a MapLibre expression for the 3×3 bivariate UHI choropleth.
 * Uses nested case/step: outer step on year_int (3 age columns),
 * each returning an inner step on lst_1mean (3 LST rows).
 */
export function buildUhiColorExpr(): maplibregl.ExpressionSpecification {
  const year = ['coalesce', ['get', 'year_int'], 0] as any;
  const lst = ['to-number', ['get', 'lst_1mean'], 41] as any;

  // Helper: build a step expression over LST for one age column
  const lstStep = (col: number): any => [
    'step', lst,
    UHI_MATRIX[0][col],         // < 38°C
    38, UHI_MATRIX[1][col],     // 38–43°C
    43, UHI_MATRIX[2][col],     // ≥ 43°C
  ];

  return [
    'case',
    // Need both year and lst data
    ['all', ['!=', year, 0], ['has', 'lst_1mean']],
    [
      'case',
      ['<=', year, 1990], lstStep(0),     // Pre-1991
      ['<=', year, 2010], lstStep(1),     // 1991–2010
      lstStep(2),                          // 2011+
    ] as any,
    '#2a2a35',  // Missing data fallback
  ] as unknown as maplibregl.ExpressionSpecification;
}



export type DecadeLstPoint = {
  decade: number;   // e.g. 1960
  meanLst: number;  // mean lst_1mean for all buildings in that decade (°C)
  count: number;    // number of buildings contributing
};

/**
 * Builds a MapLibre 'step' color expression from an era list, keyed by
 * whatever numeric expression `yearExpr` resolves to. Shared by the building
 * year ramp and the hexagon average-year ramp so both respect the same
 * detailed/simplified era grouping.
 */
export function buildEraColorExpr(
  eras: EraStop[],
  yearExpr: unknown = ['coalesce', ['get', 'year_int'], 0],
): maplibregl.ExpressionSpecification {
  const known = eras.filter((e) => e.bounds[0] !== -1).slice().sort((a, b) => a.bounds[0] - b.bounds[0]);
  const unknownColor = eras.find((e) => e.bounds[0] === -1)?.color ?? '#242424';
  const stepArgs: unknown[] = [known[0]?.color ?? unknownColor];
  for (let i = 1; i < known.length; i++) stepArgs.push(known[i].bounds[0], known[i].color);

  return [
    'case',
    ['!=', yearExpr, 0],
    ['step', yearExpr, ...stepArgs],
    unknownColor,
  ] as unknown as maplibregl.ExpressionSpecification;
}

export function buildYearColorExpr(eras: EraStop[] = ERA_CONFIG): maplibregl.ExpressionSpecification {
  return buildEraColorExpr(eras);
}

export function buildTypeColorExpr(): maplibregl.ExpressionSpecification {
  const parsedType = ['coalesce', ['get', 'type'], ''];
  return [
    'match',
    parsedType,
    ['rc', 'house'], '#F4A261', // Residential (warm coral)
    ['bc', 'sc', 'ec'], '#8B5CF6', // Commercial & Leisure (vibrant violet)
    ['school', 'kdgd', 'uni'], '#3B82F6', // Education & Research (electric blue)
    ['mosque', 'church'], '#00E5FF', // Religious Landmarks (glowing turquoise/cyan)
    ['cultural site', 'sf'], '#EC4899', // Culture & Sport (hot pink)
    ['healthcare', 'hospital', 'clinic'], '#10B981', // Healthcare (emerald green)
    ['admin', 'utility', 'airport', 'train station'], '#64748B', // Infrastructure & Admin (cool slate)
    '#475569' // Default fallback / Other / Undocumented (dark gray)
  ] as unknown as maplibregl.ExpressionSpecification;
}

// 12-step hypsometric: Optimized for Astana's flat terrain (~340m-360m core).
// Mineral Navy (waterway basin) -> Luminous Moss-Teal (Left/Right Bank plains) -> Sunset Copper (terraces) -> Plum Peak.
export const ELEVATION_STEPS = [
  { min: 335, color: '#0A1128' }, // Deep mineral navy (riverbed / lowest basins)
  { min: 339, color: '#102A43' }, // Deep slate blue
  { min: 342, color: '#243B53' }, // Muted steel blue
  { min: 344, color: '#1F6B6B' }, // Deep moss green
  { min: 346, color: '#0B9488' }, // Mossy teal
  { min: 348, color: '#14B8A6' }, // Vibrant glowing teal (main Left Bank urban plain)
  { min: 350, color: '#52D1B2' }, // Mint green (subtle flatland elevation)
  { min: 353, color: '#E9C46A' }, // Soft liquid gold (upper residential plains)
  { min: 356, color: '#F4A261' }, // Warm copper (upper terraces)
  { min: 360, color: '#E76F51' }, // Terracotta orange (elevated districts)
  { min: 370, color: '#D94E34' }, // Rich coral red (high points)
  { min: 385, color: '#A23B72' }, // Deep rose-gold / plum (peaks & outlier ridges)
] as const;

export function buildElevationColorExpr(): maplibregl.ExpressionSpecification {
  return [
    'case',
    ['has', 'dem_mean'],
    [
      'step',
      ['to-number', ['get', 'dem_mean'], 376],
      '#2a2a35',                       // < 335: below range
      335, ELEVATION_STEPS[0].color,   // 335–338
      339, ELEVATION_STEPS[1].color,   // 339–341
      342, ELEVATION_STEPS[2].color,   // 342–343
      344, ELEVATION_STEPS[3].color,   // 344–345
      346, ELEVATION_STEPS[4].color,   // 346–347
      348, ELEVATION_STEPS[5].color,   // 348–349
      350, ELEVATION_STEPS[6].color,   // 350–352
      353, ELEVATION_STEPS[7].color,   // 353–355
      356, ELEVATION_STEPS[8].color,   // 356–359
      360, ELEVATION_STEPS[9].color,   // 360–369
      370, ELEVATION_STEPS[10].color,  // 370–384
      385, ELEVATION_STEPS[11].color,  // 385+
    ] as any,
    '#2a2a35',
  ] as unknown as maplibregl.ExpressionSpecification;
}

// 9-step RdYlBu inverted: deep blue (cool) → blue → lt-blue → pale → yellow → orange → red-orange → red → dark red
// Steps: 33 | 35 | 37 | 39 | 41 | 43 | 45 | 47 | 48 (2 °C per band, capped at 48 °C)
export const LST_STEPS = [
  { min: 33, color: '#313695' },
  { min: 35, color: '#4575b4' },
  { min: 37, color: '#74add1' },
  { min: 39, color: '#abd9e9' },
  { min: 41, color: '#ffffbf' },
  { min: 43, color: '#fee090' },
  { min: 45, color: '#fdae61' },
  { min: 47, color: '#f46d43' },
  { min: 48, color: '#a50026' },
] as const;

export function buildLstColorExpr(): maplibregl.ExpressionSpecification {
  return [
    'case',
    ['has', 'lst_1mean'],
    [
      'step',
      ['to-number', ['get', 'lst_1mean'], 41],
      '#2a2a35',                   // < 33°C: below range
      33, LST_STEPS[0].color,      // 33–34
      35, LST_STEPS[1].color,      // 35–36
      37, LST_STEPS[2].color,      // 37–38
      39, LST_STEPS[3].color,      // 39–40
      41, LST_STEPS[4].color,      // 41–42
      43, LST_STEPS[5].color,      // 43–44
      45, LST_STEPS[6].color,      // 45–46
      47, LST_STEPS[7].color,      // 47
      48, LST_STEPS[8].color,      // 48+
    ] as any,
    '#2a2a35',
  ] as unknown as maplibregl.ExpressionSpecification;
}

// ── 3D extrusion modes ───────────────────────────────────────────────────────

export type ExtrudeMode = 'height' | 'age';

/** Real building height (metres), zoom-faded in like the original layer. */
export function buildHeightExtrusionExpr(): maplibregl.ExpressionSpecification {
  return [
    'interpolate', ['linear'], ['zoom'],
    13, 0,
    13.5, ['to-number', ['coalesce', ['get', 'b_height'], 10], 10],
  ] as unknown as maplibregl.ExpressionSpecification;
}

/**
 * Extrude by building AGE — older buildings rise taller, inverting the skyline
 * so the historic Tselinograd core towers over the glass left bank.
 * Unknown years stay flat (6 m) so they don't fake antiquity.
 */
export function buildAgeExtrusionExpr(): maplibregl.ExpressionSpecification {
  const year = ['coalesce', ['get', 'year_int'], 0];
  const currentYear = new Date().getFullYear();
  const age = ['-', currentYear, year];
  return [
    'interpolate', ['linear'], ['zoom'],
    13, 0,
    13.5, [
      'case',
      ['==', year, 0],
      6,
      ['max', 6, ['*', age, 3]],
    ],
  ] as unknown as maplibregl.ExpressionSpecification;
}

export function buildCombinedFilter(
  yearRange: [number, number],
  types: string[],
  districts: string[],
  archStyle: string,
  company: string,
  selectedUhiCells?: string[]
): any[] {
  const parsedYear = ['coalesce', ['get', 'year_int'], 0];
  const conditions: any[] = [
    ['any',
      ['==', parsedYear, 0],
      ['all',
        ['>=', parsedYear, yearRange[0]],
        ['<=', parsedYear, yearRange[1]]
      ]
    ]
  ];

  if (types.length > 0) {
    conditions.push(['match', ['get', 'type'], types, true, false]);
  }
  if (districts.length > 0) {
    conditions.push(['match', ['get', 'district'], districts, true, false]);
  }
  if (archStyle) {
    conditions.push(['==', ['get', 'arch_style'], archStyle]);
  }
  if (company) {
    conditions.push(['==', ['get', 'company'], company]);
  }

  // Bivariate UHI cell filtering
  if (selectedUhiCells && selectedUhiCells.length > 0) {
    const cellConditions = selectedUhiCells.map(cellId => {
      const [rStr, cStr] = cellId.split('-');
      const r = parseInt(rStr, 10);
      const c = parseInt(cStr, 10);

      // c maps to age groups (0: Pre-1991, 1: 1991-2010, 2: 2011+)
      let ageCond: any;
      if (c === 0) {
        ageCond = ['<=', parsedYear, 1990];
      } else if (c === 1) {
        ageCond = ['all', ['>=', parsedYear, 1991], ['<=', parsedYear, 2010]];
      } else {
        ageCond = ['>=', parsedYear, 2011];
      }

      // r maps to LST bands (0: < 38, 1: 38–43, 2: >= 43)
      const lst = ['to-number', ['get', 'lst_1mean'], 41] as any;
      let lstCond: any;
      if (r === 0) {
        lstCond = ['<', lst, 38];
      } else if (r === 1) {
        lstCond = ['all', ['>=', lst, 38], ['<', lst, 43]];
      } else {
        lstCond = ['>=', lst, 43];
      }

      return ['all', ageCond, lstCond];
    });

    conditions.push(['any', ...cellConditions]);
  }

  return ['all', ...conditions];
}
