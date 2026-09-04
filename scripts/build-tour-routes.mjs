/**
 * Generates src/pages/MapPage/tourRoutes.ts — the real walking geometry between
 * consecutive tour stops.
 *
 * Stop coordinates are read straight out of tours.ts, each consecutive pair is
 * routed over the OpenStreetMap road network with OSRM's foot profile, and the
 * result is simplified so the checked-in file stays small. Run it again after
 * moving a stop:
 *
 *   node scripts/build-tour-routes.mjs
 *
 * Routes are committed rather than fetched at runtime: they change only when a
 * stop moves, and the map should not depend on a third-party router to draw a
 * tour.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOURS_FILE = path.join(ROOT, 'src/pages/MapPage/tours.ts');
const OUT_FILE = path.join(ROOT, 'src/pages/MapPage/tourRoutes.ts');
// Distances live in their own tiny module so the home page can label a tour
// without pulling the route geometry into its bundle.
const DISTANCES_FILE = path.join(ROOT, 'src/data/tourDistances.ts');

const OSRM = 'https://router.project-osrm.org/route/v1/foot';
const USER_AGENT = 'kbh-tour-route-builder/1.0 (github.com/RassCrom/kbh)';
/** Douglas-Peucker tolerance in degrees; ~2 m at this latitude. */
const SIMPLIFY_TOLERANCE = 0.00002;
const REQUEST_SPACING_MS = 1200;
/**
 * Where two stops are close as the crow flies but the walking route loops far
 * around them — around palace grounds, or to the nearest bridge — following it
 * sends the camera wandering off the subject. Past this ratio of walked to
 * direct distance the leg is flown straight instead, and marked `direct`.
 */
const DETOUR_LIMIT = 1.9;

// ── Parse the stops out of tours.ts ─────────────────────────────────────────

function parseTours(source) {
  const tours = [];
  const tourRe = /\.\.\.TOUR_META_BY_ID\.(\w+),/g;
  const stopRe = /id: '([\w-]+)',\s*\n\s*name:[\s\S]*?center: \[([-\d.]+), ([-\d.]+)\]/g;

  const starts = [...source.matchAll(tourRe)].map((m) => ({ id: m[1], index: m.index }));
  for (let i = 0; i < starts.length; i++) {
    const slice = source.slice(starts[i].index, starts[i + 1]?.index ?? source.length);
    const stops = [...slice.matchAll(stopRe)].map((m) => ({
      id: m[1],
      center: [Number(m[2]), Number(m[3])],
    }));
    tours.push({ id: starts[i].id, stops });
  }
  return tours;
}

// ── Geometry helpers ────────────────────────────────────────────────────────

function perpendicularDistance(point, lineStart, lineEnd) {
  const [x, y] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

/** Douglas-Peucker: drops points that don't change the line's shape. */
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  let maxDistance = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (d > maxDistance) { maxDistance = d; index = i; }
  }
  if (maxDistance <= tolerance) return [points[0], points[points.length - 1]];
  return [
    ...simplify(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplify(points.slice(index), tolerance),
  ];
}

/** Great-circle distance in metres. */
function haversine([lng1, lat1], [lng2, lat2]) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const round6 = (coords) => coords.map(([lng, lat]) => [
  Number(lng.toFixed(6)),
  Number(lat.toFixed(6)),
]);

// ── Routing ─────────────────────────────────────────────────────────────────

async function routeLeg(from, to) {
  const url = `${OSRM}/${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson`;
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`OSRM ${response.status} for ${from} -> ${to}`);
  const body = await response.json();
  const route = body.routes?.[0];
  if (!route) throw new Error(`no route for ${from} -> ${to}`);
  return { coordinates: route.geometry.coordinates, distance: route.distance };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const tours = parseTours(fs.readFileSync(TOURS_FILE, 'utf8'));
  if (tours.length === 0) throw new Error('No tours parsed from tours.ts');

  const output = {};
  for (const tour of tours) {
    console.log(`\n${tour.id} (${tour.stops.length} stops)`);
    const legs = [];
    for (let i = 0; i < tour.stops.length - 1; i++) {
      const from = tour.stops[i];
      const to = tour.stops[i + 1];
      const { coordinates, distance } = await routeLeg(from.center, to.center);
      const straight = haversine(from.center, to.center);
      const detourRatio = distance / Math.max(straight, 1);

      if (detourRatio > DETOUR_LIMIT) {
        legs.push({
          coordinates: round6([from.center, to.center]),
          distance: Math.round(straight),
          direct: true,
        });
        console.log(
          `  ${from.id} -> ${to.id}: DIRECT — walking route detours ${detourRatio.toFixed(1)}x ` +
          `(${Math.round(distance)} m vs ${Math.round(straight)} m straight)`,
        );
        await sleep(REQUEST_SPACING_MS);
        continue;
      }

      // Anchor the leg on the stop coordinates themselves: OSRM snaps to the
      // nearest road, which can sit tens of metres off a landmark's centre.
      const simplified = simplify(coordinates, SIMPLIFY_TOLERANCE);
      const withStops = [from.center, ...simplified, to.center];

      legs.push({ coordinates: round6(withStops), distance: Math.round(distance) });
      console.log(
        `  ${from.id} -> ${to.id}: ${coordinates.length} pts -> ${withStops.length}, ` +
        `${Math.round(distance)} m (${detourRatio.toFixed(2)}x direct)`,
      );
      await sleep(REQUEST_SPACING_MS);
    }
    output[tour.id] = legs;
  }

  const totals = Object.entries(output)
    .map(([id, legs]) => `${id}: ${(legs.reduce((s, l) => s + l.distance, 0) / 1000).toFixed(1)} km`)
    .join(', ');

  const file = `/**
 * Real walking geometry between consecutive tour stops, one entry per leg.
 *
 * GENERATED by scripts/build-tour-routes.mjs — routed over the OpenStreetMap
 * road network (OSRM foot profile) and simplified. Do not edit by hand; move a
 * stop in tours.ts and re-run the script instead.
 *
 * Route lengths: ${totals}.
 */

export interface TourLeg {
  /** [lng, lat] following the actual streets, starting and ending on a stop. */
  coordinates: [number, number][];
  /** Distance in metres: walked along the streets, or straight-line if direct. */
  distance: number;
  /**
   * True when the walking route detoured so far that flying it would lose the
   * subject, so this leg is a straight hop between the two stops instead.
   */
  direct?: boolean;
}

export const TOUR_ROUTES: Record<string, TourLeg[]> = ${JSON.stringify(output, null, 2)
    .replace(/"coordinates"/g, 'coordinates')
    .replace(/"distance"/g, 'distance')
    .replace(/"direct"/g, 'direct')} as Record<string, TourLeg[]>;
`;

  fs.writeFileSync(OUT_FILE, file);
  console.log(`\nWrote ${path.relative(ROOT, OUT_FILE)} — ${totals}`);

  const distances = Object.fromEntries(
    Object.entries(output).map(([id, legs]) => [id, legs.reduce((s, l) => s + l.distance, 0)]),
  );
  fs.writeFileSync(DISTANCES_FILE, `/**
 * Total walking distance of each tour, in metres.
 *
 * GENERATED by scripts/build-tour-routes.mjs alongside the route geometry.
 * Kept apart from tourRoutes.ts so the home page can show a tour's length
 * without loading every coordinate.
 */

export const TOUR_DISTANCES: Record<string, number> = ${JSON.stringify(distances, null, 2)};

/** "11.8 km" — or "750 m" for anything under a kilometre. */
export function formatTourDistance(tourId: string): string | null {
  const metres = TOUR_DISTANCES[tourId];
  if (metres == null) return null;
  return metres < 1000 ? \`\${metres} m\` : \`\${(metres / 1000).toFixed(1)} km\`;
}
`);
  console.log(`Wrote ${path.relative(ROOT, DISTANCES_FILE)}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
