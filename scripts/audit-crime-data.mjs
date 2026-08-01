import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const sourcePath = resolve('public/crime-data-ast.geojson');
const [rawText, file] = await Promise.all([
  readFile(sourcePath, 'utf8'),
  stat(sourcePath),
]);
const geojson = JSON.parse(rawText);

if (geojson?.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
  throw new Error('Expected a GeoJSON FeatureCollection.');
}

const crs = geojson.crs?.properties?.name ?? 'unspecified';
if (crs !== 'unspecified' && !/CRS84|EPSG(?::|::)4326/i.test(crs)) {
  throw new Error(`Unsupported CRS: ${crs}`);
}

const stableIds = new Set();
const coincidenceKeys = new Set();
const yearCounts = {};
const severityCounts = {};
let invalidGeometries = 0;
let missingRequiredProperties = 0;
let duplicateStableIds = 0;
let coincidentRecords = 0;
let west = Infinity;
let south = Infinity;
let east = -Infinity;
let north = -Infinity;

for (const feature of geojson.features) {
  const coordinates = feature?.geometry?.coordinates;
  const lng = Array.isArray(coordinates) ? Number(coordinates[0]) : NaN;
  const lat = Array.isArray(coordinates) ? Number(coordinates[1]) : NaN;
  if (
    feature?.geometry?.type !== 'Point' ||
    !Number.isFinite(lng) || !Number.isFinite(lat) ||
    Math.abs(lng) > 180 || Math.abs(lat) > 90
  ) {
    invalidGeometries += 1;
    continue;
  }

  const properties = feature.properties ?? {};
  const stableId = properties.globalid || properties.ud;
  const year = Number(properties.yr);
  const crimeCode = String(properties.crime_code ?? '').trim();
  if (!stableId || !Number.isInteger(year) || !crimeCode) {
    missingRequiredProperties += 1;
    continue;
  }

  if (stableIds.has(stableId)) duplicateStableIds += 1;
  stableIds.add(stableId);

  const coincidenceKey = [
    lng.toFixed(7), lat.toFixed(7), properties.dat_sover ?? '', crimeCode,
  ].join('|');
  if (coincidenceKeys.has(coincidenceKey)) coincidentRecords += 1;
  coincidenceKeys.add(coincidenceKey);

  const severity = Number(properties.hard_code);
  yearCounts[year] = (yearCounts[year] ?? 0) + 1;
  severityCounts[severity] = (severityCounts[severity] ?? 0) + 1;
  west = Math.min(west, lng);
  south = Math.min(south, lat);
  east = Math.max(east, lng);
  north = Math.max(north, lat);
}

const audit = {
  source: 'public/crime-data-ast.geojson',
  bytes: file.size,
  crs,
  sourceFeatures: geojson.features.length,
  validFeatures: stableIds.size,
  invalidGeometries,
  missingRequiredProperties,
  duplicateStableIds,
  coincidentRecords,
  bounds: [west, south, east, north],
  yearCounts,
  severityCounts,
};

console.log(JSON.stringify(audit, null, 2));

if (invalidGeometries > 0 || missingRequiredProperties > 0 || duplicateStableIds > 0) {
  process.exitCode = 1;
}
