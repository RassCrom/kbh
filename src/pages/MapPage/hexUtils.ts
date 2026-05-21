import { latLngToCell, cellToBoundary } from 'h3-js';

// Resolution 9 → avg edge length ~174 m  (fits the 150-250 m target)
export const HEX_RESOLUTION = 9;

export type HexMetric = 'count' | 'year';

export interface HexProperties {
  count: number;
  avgYear: number;
  avgHeight: number;
}

interface CentroidPoint {
  lng: number;
  lat: number;
  year: number;
  height: number;
}

// ── Load centroids GeoJSON ────────────────────────────────────────────────────

export async function loadCentroidsGz(url: string): Promise<CentroidPoint[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);

  const json = await response.json() as {
    features: Array<{
      geometry: { coordinates: [number, number] } | null;
      properties: { year?: number | null; b_height?: string | number | null };
    }>;
  };

  return json.features
    .filter(f => f.geometry?.coordinates != null)   // skip the 1 null-geometry feature
    .map(f => ({
      lng: f.geometry!.coordinates[0],
      lat: f.geometry!.coordinates[1],
      year: typeof f.properties.year === 'number' ? f.properties.year : 0,
      height: parseFloat(String(f.properties.b_height ?? '0')) || 0,
    }));
}

// ── Bin centroids into H3 hexagons ───────────────────────────────────────────

export function buildHexBins(points: CentroidPoint[]): GeoJSON.FeatureCollection<GeoJSON.Polygon, HexProperties> {
  const bins = new Map<string, { years: number[]; heights: number[]; count: number }>();

  for (const pt of points) {
    const cell = latLngToCell(pt.lat, pt.lng, HEX_RESOLUTION);
    if (!bins.has(cell)) bins.set(cell, { years: [], heights: [], count: 0 });
    const bin = bins.get(cell)!;
    bin.count++;
    if (pt.year >= 1900 && pt.year <= 2100) bin.years.push(pt.year);
    if (pt.height > 0 && pt.height < 500) bin.heights.push(pt.height);
  }

  const features: GeoJSON.Feature<GeoJSON.Polygon, HexProperties>[] = [];

  for (const [cell, bin] of bins) {
    // cellToBoundary returns [lat, lng] pairs — flip to [lng, lat] for GeoJSON
    const boundary = cellToBoundary(cell);
    const ring: [number, number][] = boundary.map(([lat, lng]) => [lng, lat]);
    ring.push(ring[0]); // close the ring

    const avgYear = bin.years.length > 0
      ? Math.round(bin.years.reduce((s, y) => s + y, 0) / bin.years.length)
      : 0;
    const avgHeight = bin.heights.length > 0
      ? Math.round(bin.heights.reduce((s, h) => s + h, 0) / bin.heights.length)
      : 10;

    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [ring] },
      properties: { count: bin.count, avgYear, avgHeight },
    });
  }

  return { type: 'FeatureCollection', features };
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

/** Extrusion height — 10× real average height, minimum 5 m so zero-data hexagons still read */
export function buildHexHeightExpr(): maplibregl.ExpressionSpecification {
  return [
    'max',
    ['*', ['get', 'avgHeight'], 10],
    5,
  ] as unknown as maplibregl.ExpressionSpecification;
}
