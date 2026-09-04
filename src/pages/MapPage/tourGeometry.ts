import { TOUR_ROUTES, type TourLeg } from './tourRoutes';

/**
 * Measuring and sampling along a tour leg's real street geometry.
 *
 * Distances use an equirectangular approximation with longitude scaled by
 * cos(latitude). Over a single city that is accurate to well under a metre and
 * costs a fraction of haversine, which matters because these run per frame.
 */

export interface MeasuredLeg {
  coordinates: [number, number][];
  /** Cumulative distance at each vertex; last entry is the total. */
  cumulative: number[];
  length: number;
  /** Walking distance in metres from the router, for display. */
  distance: number;
}

const DEG_TO_M = 111_320;

function planarDistance(a: [number, number], b: [number, number]): number {
  const midLat = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  const dx = (b[0] - a[0]) * Math.cos(midLat);
  const dy = b[1] - a[1];
  return Math.hypot(dx, dy) * DEG_TO_M;
}

function measure(leg: TourLeg): MeasuredLeg {
  const { coordinates } = leg;
  const cumulative = [0];
  for (let i = 1; i < coordinates.length; i++) {
    cumulative.push(cumulative[i - 1] + planarDistance(coordinates[i - 1], coordinates[i]));
  }
  return {
    coordinates,
    cumulative,
    length: cumulative[cumulative.length - 1] || 1,
    distance: leg.distance,
  };
}

const measuredCache = new Map<string, MeasuredLeg[]>();

/** Measured legs for a tour, or an empty array if it has no generated route. */
export function legsForTour(tourId: string): MeasuredLeg[] {
  const cached = measuredCache.get(tourId);
  if (cached) return cached;
  const legs = (TOUR_ROUTES[tourId] ?? []).map(measure);
  measuredCache.set(tourId, legs);
  return legs;
}

/** Total walking distance of a tour in metres. */
export function tourDistance(tourId: string): number {
  return legsForTour(tourId).reduce((sum, leg) => sum + leg.distance, 0);
}

/** Vertex index whose cumulative distance brackets `target`, plus the local mix. */
function locate(leg: MeasuredLeg, target: number): { index: number; mix: number } {
  const { cumulative } = leg;
  let lo = 0;
  let hi = cumulative.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid] <= target) lo = mid;
    else hi = mid;
  }
  const span = cumulative[hi] - cumulative[lo];
  return { index: lo, mix: span > 0 ? (target - cumulative[lo]) / span : 0 };
}

/** Point at fraction `t` (0-1) of the leg, measured by distance travelled. */
export function pointAt(leg: MeasuredLeg, t: number): [number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  const { index, mix } = locate(leg, clamped * leg.length);
  const a = leg.coordinates[index];
  const b = leg.coordinates[Math.min(index + 1, leg.coordinates.length - 1)];
  return [a[0] + (b[0] - a[0]) * mix, a[1] + (b[1] - a[1]) * mix];
}

/**
 * How far ahead and behind the travel bearing is averaged.
 *
 * A fixed window is too small on a long leg: the camera crosses a leg in on the
 * order of a hundred frames, so on an 11 km leg it advances ~100 m per frame and
 * a 90 m window leaves consecutive samples with nothing in common — the bearing
 * then jumps a whole hairpin in one frame. Scaling with leg length keeps the
 * samples overlapping whatever the distance.
 */
const BEARING_WINDOW_M = 90;
const BEARING_WINDOW_RATIO = 0.04;

/**
 * Compass bearing of the leg's direction of travel at fraction `t`.
 *
 * Taken between points a little behind and a little ahead rather than from the
 * single segment underfoot, so the camera leans through a corner instead of
 * snapping round it the instant a vertex is crossed.
 */
export function bearingAt(leg: MeasuredLeg, t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  const here = clamped * leg.length;
  const window = Math.min(
    Math.max(BEARING_WINDOW_M, leg.length * BEARING_WINDOW_RATIO),
    leg.length / 2,
  );
  // Slide the window inward at the ends rather than letting it collapse. A
  // shrinking window hands the bearing to the short stub that anchors the leg
  // on its stop, which can point anywhere and snap the camera round on arrival.
  const start = Math.max(0, Math.min(here - window, leg.length - 2 * window));
  const a = pointAt(leg, start / leg.length);
  const b = pointAt(leg, (start + 2 * window) / leg.length);
  const midLat = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  const dx = (b[0] - a[0]) * Math.cos(midLat);
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return 0;
  return (Math.atan2(dx, dy) * 180) / Math.PI;
}

/** The leg's coordinates from its start up to fraction `t`. */
export function sliceTo(leg: MeasuredLeg, t: number): [number, number][] {
  const clamped = Math.max(0, Math.min(1, t));
  const target = clamped * leg.length;
  const { index } = locate(leg, target);
  const head = leg.coordinates.slice(0, index + 1);
  head.push(pointAt(leg, clamped));
  return head;
}

/** Shortest signed angle from `from` to `to`, in degrees. */
export function angleDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

export function lerpAngle(from: number, to: number, t: number): number {
  return from + angleDelta(from, to) * t;
}
