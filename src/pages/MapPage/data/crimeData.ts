export const CRIME_DATA_URL = '/crime-data-ast.geojson';

export const CRIME_YEAR_BUCKETS = [
  { id: '2015-2016', label: '2015–16', min: 2015, max: 2016, color: '#68D5E8' },
  { id: '2017-2018', label: '2017–18', min: 2017, max: 2018, color: '#4D8AAD' },
  { id: '2019-2020', label: '2019–20', min: 2019, max: 2020, color: '#D4A85E' },
  { id: '2021-2022', label: '2021–22', min: 2021, max: 2022, color: '#F06A6A' },
] as const;

export interface CrimeProperties {
  objectId: number | null;
  year: number;
  month: number | null;
  date: string | null;
  crimeCode: string | null;
  article: string | null;
  severityCode: number;
  authority: string | null;
  recordId: string;
  weekday: number | null;
}

export type CrimeFeature = GeoJSON.Feature<GeoJSON.Point, CrimeProperties>;
export type CrimeFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Point, CrimeProperties>;

export interface CrimeDataStats {
  sourceFeatures: number;
  validFeatures: number;
  invalidGeometries: number;
  missingRequiredProperties: number;
  duplicateStableIds: number;
  coincidentRecords: number;
  bounds: [number, number, number, number] | null;
  yearCounts: Record<number, number>;
  severityCounts: Record<number, number>;
  crs: string;
}

export interface CrimeDataResult {
  data: CrimeFeatureCollection;
  stats: CrimeDataStats;
}

interface RawCrimeProperties {
  objectid?: unknown;
  yr?: unknown;
  period?: unknown;
  crime_code?: unknown;
  hard_code?: unknown;
  ud?: unknown;
  organ?: unknown;
  dat_sover?: unknown;
  stat?: unknown;
  globalid?: unknown;
  weekday?: unknown;
}

interface RawFeature {
  type?: unknown;
  properties?: RawCrimeProperties | null;
  geometry?: { type?: unknown; coordinates?: unknown } | null;
}

interface RawFeatureCollection {
  type?: unknown;
  features?: unknown;
  crs?: { properties?: { name?: unknown } };
}

function finiteNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cleanInteger(value: unknown, min: number, max: number): number | null {
  const parsed = finiteNumber(value);
  if (parsed === null) return null;
  const integer = Math.trunc(parsed);
  return integer >= min && integer <= max ? integer : null;
}

function validateCrs(raw: RawFeatureCollection): string {
  const crs = cleanString(raw.crs?.properties?.name) ?? 'unspecified (assumed CRS84)';
  if (
    crs !== 'unspecified (assumed CRS84)' &&
    !/CRS84|EPSG(?::|::)4326/i.test(crs)
  ) {
    throw new Error(`Unsupported crime-data coordinate reference system: ${crs}`);
  }
  return crs;
}

/**
 * Validates and normalizes the public police-record GeoJSON. Stable record IDs
 * are the only safe deduplication key: coincident records can represent separate
 * reports at the same location and time, so they are counted but preserved.
 */
export function parseCrimeData(input: unknown): CrimeDataResult {
  if (!input || typeof input !== 'object') throw new Error('Crime data is not a JSON object.');
  const raw = input as RawFeatureCollection;
  if (raw.type !== 'FeatureCollection' || !Array.isArray(raw.features)) {
    throw new Error('Crime data must be a GeoJSON FeatureCollection.');
  }

  const crs = validateCrs(raw);
  const features: CrimeFeature[] = [];
  const stableIds = new Set<string>();
  const coincidenceKeys = new Set<string>();
  const yearCounts: Record<number, number> = {};
  const severityCounts: Record<number, number> = {};
  let invalidGeometries = 0;
  let missingRequiredProperties = 0;
  let duplicateStableIds = 0;
  let coincidentRecords = 0;
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  for (let index = 0; index < raw.features.length; index += 1) {
    const feature = raw.features[index] as RawFeature;
    const coordinates = feature.geometry?.coordinates;
    if (
      feature.type !== 'Feature' ||
      feature.geometry?.type !== 'Point' ||
      !Array.isArray(coordinates) ||
      coordinates.length < 2
    ) {
      invalidGeometries += 1;
      continue;
    }

    const lng = finiteNumber(coordinates[0]);
    const lat = finiteNumber(coordinates[1]);
    if (lng === null || lat === null || Math.abs(lng) > 180 || Math.abs(lat) > 90) {
      invalidGeometries += 1;
      continue;
    }

    const source = feature.properties ?? {};
    const date = cleanString(source.dat_sover);
    const dateYear = date ? Number(date.slice(0, 4)) : NaN;
    const year = cleanInteger(source.yr, 1900, 2100) ??
      (Number.isInteger(dateYear) && dateYear >= 1900 && dateYear <= 2100 ? dateYear : null);
    const crimeCode = cleanString(source.crime_code);
    const sourceRecordId = cleanString(source.globalid) ?? cleanString(source.ud);

    if (year === null || !crimeCode || !sourceRecordId) {
      missingRequiredProperties += 1;
      continue;
    }

    if (stableIds.has(sourceRecordId)) {
      duplicateStableIds += 1;
      continue;
    }
    stableIds.add(sourceRecordId);

    const coincidenceKey = `${lng.toFixed(7)}|${lat.toFixed(7)}|${date ?? ''}|${crimeCode}`;
    if (coincidenceKeys.has(coincidenceKey)) coincidentRecords += 1;
    coincidenceKeys.add(coincidenceKey);

    const severityCode = cleanInteger(source.hard_code, 1, 4) ?? 1;
    const month = cleanInteger(source.period, 1, 12) ??
      (date ? cleanInteger(Number(date.slice(5, 7)), 1, 12) : null);
    const objectId = cleanInteger(source.objectid, 0, Number.MAX_SAFE_INTEGER);

    west = Math.min(west, lng);
    south = Math.min(south, lat);
    east = Math.max(east, lng);
    north = Math.max(north, lat);
    yearCounts[year] = (yearCounts[year] ?? 0) + 1;
    severityCounts[severityCode] = (severityCounts[severityCode] ?? 0) + 1;

    features.push({
      type: 'Feature',
      id: sourceRecordId,
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        objectId,
        year,
        month,
        date,
        crimeCode,
        article: cleanString(source.stat),
        severityCode,
        authority: cleanString(source.organ),
        recordId: sourceRecordId,
        weekday: cleanInteger(source.weekday, 1, 7),
      },
    });
  }

  return {
    data: { type: 'FeatureCollection', features },
    stats: {
      sourceFeatures: raw.features.length,
      validFeatures: features.length,
      invalidGeometries,
      missingRequiredProperties,
      duplicateStableIds,
      coincidentRecords,
      bounds: features.length > 0 ? [west, south, east, north] : null,
      yearCounts,
      severityCounts,
      crs,
    },
  };
}

let cachedCrimeData: Promise<CrimeDataResult> | null = null;

function loadOnMainThread(): Promise<CrimeDataResult> {
  return fetch(CRIME_DATA_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`Crime data request failed (${response.status}).`);
      return response.json() as Promise<unknown>;
    })
    .then(parseCrimeData);
}

/** Lazily loads and validates the 4.4 MB dataset in a worker when supported. */
export function loadCrimeData(): Promise<CrimeDataResult> {
  if (cachedCrimeData) return cachedCrimeData;

  if (typeof Worker === 'undefined') {
    cachedCrimeData = loadOnMainThread();
    return cachedCrimeData;
  }

  cachedCrimeData = new Promise<CrimeDataResult>((resolve, reject) => {
    const worker = new Worker(new URL('./crimeData.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<
      { ok: true; result: CrimeDataResult } | { ok: false; error: string }
    >) => {
      worker.terminate();
      if (event.data.ok) resolve(event.data.result);
      else reject(new Error(event.data.error));
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || 'Crime data worker failed.'));
    };
    worker.postMessage(CRIME_DATA_URL);
  }).catch((error) => {
    cachedCrimeData = null;
    throw error;
  });

  return cachedCrimeData;
}
