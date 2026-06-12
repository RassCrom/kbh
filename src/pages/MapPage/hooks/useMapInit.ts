import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { darkDramaticStyle } from '../darkDramaticStyle';
import {
  buildYearColorExpr, buildHeightExtrusionExpr,
  type DecadeLstPoint,
} from '../mapHelpers';
import {
  buildCountColorExpr, buildHexHeightExpr,
} from '../hexUtils';
import { landmarksGeoJSON, LANDMARKS, type Landmark } from '../overlays/landmarksData';
import { IS_TOUCH_DEVICE } from '../useIsMobile';

// ---------------------------------------------------------------------------
// Backport of maplibre-gl#7117 — see MapPage.tsx for full comment
// ---------------------------------------------------------------------------
function patchRenderTaskQueue(map: maplibregl.Map): void {
  const queue = (map as unknown as {
    _renderTaskQueue?: { run: (timeStamp?: number) => void; _currentlyRunning: unknown };
  })._renderTaskQueue;
  if (!queue || typeof queue.run !== 'function') return;
  const originalRun = queue.run.bind(queue);
  queue.run = (timeStamp?: number) => {
    try {
      originalRun(timeStamp);
    } finally {
      queue._currentlyRunning = false;
    }
  };
}

/** Lazily attach the three.js landmark layer. */
export function addLandmarks3D(map: maplibregl.Map): void {
  import('../overlays/landmarks3d')
    .then((m) => {
      if (map.getStyle() && !map.getLayer('landmarks-3d')) {
        map.addLayer(m.createLandmarksLayer());
      }
    })
    .catch((err) => console.error('Failed to load 3D landmarks module:', err));
}

/** Parses a shareable #zoom/lat/lng[/pitch[/bearing]] camera hash. */
export function parseCameraHash(): {
  center: [number, number]; zoom: number; pitch: number; bearing: number;
} | null {
  if (typeof window === 'undefined') return null;
  const m = window.location.hash.match(
    /^#(\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)(?:\/(-?\d+(?:\.\d+)?))?(?:\/(-?\d+(?:\.\d+)?))?$/,
  );
  if (!m) return null;
  const zoom = Number(m[1]);
  const lat = Number(m[2]);
  const lng = Number(m[3]);
  if (zoom < 0 || zoom > 24 || Math.abs(lat) > 85 || Math.abs(lng) > 180) return null;
  return {
    zoom,
    center: [lng, lat],
    pitch: m[4] ? Math.min(85, Math.max(0, Number(m[4]))) : 0,
    bearing: m[5] ? Number(m[5]) : 0,
  };
}

export const ASTANA_CAMERA = { center: [71.4306, 51.1282] as [number, number], zoom: 12 };

export const PREFERS_REDUCED_MOTION =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------------------

export interface HoverInfo {
  x: number;
  y: number;
  properties: Record<string, unknown>;
}

interface UseMapInitOptions {
  introActiveRef: React.MutableRefObject<boolean>;
  setIntroActive: (v: boolean) => void;
  setSliderMax: (v: number) => void;
  setYearRange: (fn: (prev: [number, number]) => [number, number]) => void;
  vizModeRef: React.MutableRefObject<'buildings' | 'hexagons'>;
  tapPreviewIdRef: React.MutableRefObject<string | number | null>;
  selectedBuildingIdRef: React.MutableRefObject<string | number | null>;
  onSelectBuilding: (props: Record<string, unknown>) => void;
  onTapPreview: (props: Record<string, unknown> | null) => void;
  onSelectGraffiti: (props: Record<string, unknown>) => void;
  onSelectLandmark: (lm: Landmark) => void;
  onClearSelections: () => void;
  pendingHashCamera: { center: [number, number]; zoom: number; pitch: number; bearing: number } | null;
}

export function useMapInit(containerRef: React.RefObject<HTMLDivElement | null>, opts: UseMapInitOptions) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapSettled, setMapSettled] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [tapPreview, setTapPreview] = useState<Record<string, unknown> | null>(null);
  const [yearCounts, setYearCounts] = useState<Record<number, number>>({});
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const [decadeLstData, setDecadeLstData] = useState<DecadeLstPoint[]>([]);
  const [archStyleOptions, setArchStyleOptions] = useState<string[]>([]);
  const [companyOptions, setCompanyOptions] = useState<string[]>([]);
  const lastBoundsStrRef = useRef<string>('');
  // These are patchable by MapPage after tour/cinema hooks initialize
  const activeTourRef = useRef<unknown>(null);
  const cinemaActiveRef = useRef<boolean>(false);

  const finishIntro = useCallback(() => {
    const map = mapRef.current;
    if (!map || !opts.introActiveRef.current) return;
    opts.introActiveRef.current = false;
    map.stop();
    map.setProjection({ type: 'mercator' });
    map.setMinZoom(10);
    map.jumpTo({ ...ASTANA_CAMERA, pitch: 0, bearing: 0 });
    opts.setIntroActive(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!containerRef.current) return;

    const protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);

    const playIntro = opts.introActiveRef.current;
    const hashCam = opts.pendingHashCamera;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: darkDramaticStyle,
      center: playIntro ? [60.0, 47.5] : hashCam?.center ?? ASTANA_CAMERA.center,
      zoom: playIntro ? 1.4 : hashCam?.zoom ?? ASTANA_CAMERA.zoom,
      pitch: !playIntro && hashCam ? hashCam.pitch : 0,
      bearing: !playIntro && hashCam ? hashCam.bearing : 0,
      minZoom: playIntro ? 0 : 10,
      maxZoom: 23,
      attributionControl: { compact: true },
    });

    patchRenderTaskQueue(map);

    // Shareable #zoom/lat/lng/pitch/bearing hash
    let hashTimer: number | null = null;
    map.on('moveend', () => {
      if (opts.introActiveRef.current) return;
      if (hashTimer !== null) window.clearTimeout(hashTimer);
      hashTimer = window.setTimeout(() => {
        const c = map.getCenter();
        const hash = `#${map.getZoom().toFixed(2)}/${c.lat.toFixed(5)}/${c.lng.toFixed(5)}` +
          `/${map.getPitch().toFixed(0)}/${map.getBearing().toFixed(0)}`;
        window.history.replaceState(
          null, '',
          window.location.pathname + window.location.search + hash,
        );
      }, 250);
    });

    map.once('idle', () => setMapSettled(true));
    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    if (playIntro) {
      map.once('style.load', () => {
        map.setProjection({ type: 'globe' });
      });
    }

    map.on('load', () => {
      // ── Building sources & layers ───────────────────────────────────────
      map.addSource('all-buildings', {
        type: 'vector',
        url: 'pmtiles:///buildings-ast-v44.pmtiles',
      });

      map.addLayer({
        id: 'buildings-fill',
        type: 'fill',
        source: 'all-buildings',
        'source-layer': 'buildings',
        paint: {
          'fill-color': buildYearColorExpr(),
          'fill-opacity': [
            'interpolate', ['linear'], ['zoom'],
            10, 1,
            12, 0.7,
            14, 0.85,
            17, .5,
          ],
        },
      });

      map.addLayer({
        id: 'buildings-outline',
        type: 'line',
        source: 'all-buildings',
        'source-layer': 'buildings',
        paint: {
          'line-color': 'rgba(37, 29, 13, 0.3)',
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            11, 0.3,
            12, 1,
            13, 0,
          ],
        },
      });

      map.addLayer({
        id: 'buildings-3d',
        type: 'fill-extrusion',
        source: 'all-buildings',
        'source-layer': 'buildings',
        minzoom: 13,
        paint: {
          'fill-extrusion-color': buildYearColorExpr(),
          'fill-extrusion-height': buildHeightExtrusionExpr(),
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.85,
        },
      });

      map.addLayer({
        id: 'buildings-hover',
        type: 'fill',
        source: 'all-buildings',
        'source-layer': 'buildings',
        maxzoom: 13,
        paint: {
          'fill-color': '#d4a85e',
          'fill-opacity': [
            'case', ['boolean', ['feature-state', 'hover'], false], 0.45, 0,
          ],
        },
      });

      map.addLayer({
        id: 'buildings-3d-hover',
        type: 'fill-extrusion',
        source: 'all-buildings',
        'source-layer': 'buildings',
        minzoom: 13,
        paint: {
          'fill-extrusion-color': [
            'case', ['boolean', ['feature-state', 'hover'], false],
            'rgba(212,168,94,1)',
            'rgba(0,0,0,0)',
          ],
          'fill-extrusion-height': buildHeightExtrusionExpr(),
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.55,
        },
      });

      map.addLayer({
        id: 'buildings-selected',
        type: 'line',
        source: 'all-buildings',
        'source-layer': 'buildings',
        paint: {
          'line-color': '#d4a85e',
          'line-width': [
            'case', ['boolean', ['feature-state', 'selected'], false], 2.5, 0,
          ],
          'line-opacity': 0.95,
        },
      });

      map.addLayer({
        id: 'buildings-hidden',
        type: 'fill',
        source: 'all-buildings',
        'source-layer': 'buildings',
        paint: { 'fill-color': 'transparent' },
      });

      // ── Hexagon source & layers ─────────────────────────────────────────
      map.addSource('hex-bins', {
        type: 'vector',
        url: 'pmtiles:///hexagon-ast-v441.pmtiles',
      });

      map.addLayer({
        id: 'hex-layer',
        type: 'fill-extrusion',
        source: 'hex-bins',
        'source-layer': 'hex-bins',
        layout: { visibility: 'none' },
        paint: {
          'fill-extrusion-color': buildCountColorExpr(),
          'fill-extrusion-height': buildHexHeightExpr(),
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.82,
          'fill-extrusion-height-transition': { duration: 1000, delay: 0 },
        },
      });

      map.addLayer({
        id: 'hex-outline',
        type: 'line',
        source: 'hex-bins',
        'source-layer': 'hex-bins',
        layout: { visibility: 'none' },
        paint: {
          'line-color': 'rgba(255,255,255,0.06)',
          'line-width': 0.5,
        },
      });

      // ── Landmark sources & layers ────────────────────────────────────────
      map.addSource('landmarks', { type: 'geojson', data: landmarksGeoJSON() });

      map.addLayer({
        id: 'landmarks-halo',
        type: 'circle',
        source: 'landmarks',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 8, 14, 14, 17, 22],
          'circle-color': 'rgba(212,168,94,0.12)',
          'circle-stroke-color': '#d4a85e',
          'circle-stroke-width': 1.4,
          'circle-stroke-opacity': 0.7,
          'circle-blur': 0.4,
        },
      });

      map.addLayer({
        id: 'landmarks-hit',
        type: 'circle',
        source: 'landmarks',
        paint: {
          'circle-radius': 24,
          'circle-color': 'rgba(0,0,0,0)',
        },
      });

      map.on('mousemove', 'landmarks-hit', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'landmarks-hit', () => { map.getCanvas().style.cursor = ''; });

      if (!playIntro) {
        addLandmarks3D(map);
      }

      // ── Building hover state ─────────────────────────────────────────────
      let hoveredId: string | number | null = null;

      const clearHover = () => {
        if (hoveredId !== null) {
          map.setFeatureState(
            { source: 'all-buildings', sourceLayer: 'buildings', id: hoveredId },
            { hover: false },
          );
          hoveredId = null;
        }
      };

      const handleMouseMove = (e: any) => {
        if (!e.features?.length) return;
        map.getCanvas().style.cursor = 'pointer';
        const feat = e.features[0];
        const id = feat.id;
        if (id !== hoveredId) {
          clearHover();
          if (id !== undefined) {
            map.setFeatureState(
              { source: 'all-buildings', sourceLayer: 'buildings', id },
              { hover: true },
            );
            hoveredId = id;
          }
        }
        setHoverInfo({ x: e.point.x, y: e.point.y, properties: feat.properties as Record<string, unknown> });
      };

      const handleMouseLeave = () => {
        map.getCanvas().style.cursor = '';
        clearHover();
        setHoverInfo(null);
      };

      map.on('mousemove', 'buildings-fill', handleMouseMove);
      map.on('mousemove', 'buildings-3d', handleMouseMove);
      map.on('mouseleave', 'buildings-fill', handleMouseLeave);
      map.on('mouseleave', 'buildings-3d', handleMouseLeave);

      // ── Hex hover ─────────────────────────────────────────────────────────
      map.on('mousemove', 'hex-layer', (e: any) => {
        if (!e.features?.length) return;
        map.getCanvas().style.cursor = 'crosshair';
        const feat = e.features[0];
        setHoverInfo({ x: e.point.x, y: e.point.y, properties: feat.properties as Record<string, unknown> });
      });
      map.on('mouseleave', 'hex-layer', () => {
        map.getCanvas().style.cursor = '';
        setHoverInfo(null);
      });

      // ── Click handler ─────────────────────────────────────────────────────
      const clearTapPreviewState = () => {
        if (opts.tapPreviewIdRef.current !== null) {
          map.setFeatureState(
            { source: 'all-buildings', sourceLayer: 'buildings', id: opts.tapPreviewIdRef.current },
            { hover: false },
          );
          opts.tapPreviewIdRef.current = null;
        }
        setTapPreview(null);
        opts.onTapPreview(null);
      };

      const selectBuilding = (feat: maplibregl.MapGeoJSONFeature) => {
        if (opts.selectedBuildingIdRef.current !== null) {
          map.setFeatureState(
            { source: 'all-buildings', sourceLayer: 'buildings', id: opts.selectedBuildingIdRef.current },
            { selected: false },
          );
        }
        if (feat.id !== undefined) {
          map.setFeatureState(
            { source: 'all-buildings', sourceLayer: 'buildings', id: feat.id },
            { selected: true },
          );
          opts.selectedBuildingIdRef.current = feat.id;
        }
        opts.onSelectBuilding(feat.properties as Record<string, unknown>);
      };

      map.on('click', (e) => {
        const graffitiFeatures = map.getLayer('graffiti-layer')
          ? map.queryRenderedFeatures(e.point, { layers: ['graffiti-layer'] })
          : [];
        if (graffitiFeatures.length) {
          opts.onSelectGraffiti(graffitiFeatures[0].properties as Record<string, unknown>);
          clearTapPreviewState();
          return;
        }

        const landmarkFeatures = map.queryRenderedFeatures(e.point, { layers: ['landmarks-hit'] });
        if (landmarkFeatures.length) {
          const lm = LANDMARKS.find((l) => l.id === landmarkFeatures[0].properties?.id);
          if (lm) {
            opts.onSelectLandmark(lm);
            clearTapPreviewState();
            return;
          }
        }

        const features = map.queryRenderedFeatures(e.point, {
          layers: ['buildings-fill', 'buildings-3d'],
        });

        if (features.length) {
          const feat = features[0];
          if (IS_TOUCH_DEVICE) {
            if (feat.id !== undefined && feat.id === opts.tapPreviewIdRef.current) {
              clearTapPreviewState();
              selectBuilding(feat);
            } else {
              if (opts.tapPreviewIdRef.current !== null) {
                map.setFeatureState(
                  { source: 'all-buildings', sourceLayer: 'buildings', id: opts.tapPreviewIdRef.current },
                  { hover: false },
                );
              }
              if (feat.id !== undefined) {
                map.setFeatureState(
                  { source: 'all-buildings', sourceLayer: 'buildings', id: feat.id },
                  { hover: true },
                );
                opts.tapPreviewIdRef.current = feat.id;
              }
              const props = feat.properties as Record<string, unknown>;
              setTapPreview(props);
              opts.onTapPreview(props);
            }
            return;
          }
          selectBuilding(feat);
        } else {
          opts.onClearSelections();
          clearTapPreviewState();
          if (opts.selectedBuildingIdRef.current !== null) {
            map.setFeatureState(
              { source: 'all-buildings', sourceLayer: 'buildings', id: opts.selectedBuildingIdRef.current },
              { selected: false },
            );
            opts.selectedBuildingIdRef.current = null;
          }
        }
      });

      // ── Histogram / dropdown update ──────────────────────────────────────
      const archStyles = new Set<string>();
      const companies = new Set<string>();
      let currentSliderMax = 2029;
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;

      const updateHistogram = () => {
        if (opts.vizModeRef.current === 'hexagons' || activeTourRef.current || cinemaActiveRef.current) return;

        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const m = mapRef.current;
          if (!m) return;

          const bounds = m.getBounds();
          const boundsStr = bounds.toArray().flat().map((n) => n.toFixed(5)).join(',');
          if (boundsStr === lastBoundsStrRef.current) return;
          lastBoundsStrRef.current = boundsStr;

          const features = m.queryRenderedFeatures(undefined, { layers: ['buildings-hidden'] });
          const counts: Record<number, number> = {};
          const types: Record<string, number> = {};
          const decadeLstRaw: Record<number, number[]> = {};
          let localMax = currentSliderMax;
          let hasUpdates = false;
          const seenIds = new Set<string | number>();

          for (const f of features) {
            if (f.id != null) {
              if (seenIds.has(f.id)) continue;
              seenIds.add(f.id);
            }
            let y = 0;
            const y_int = f.properties.year_int;
            if (y_int != null) {
              y = typeof y_int === 'number' ? y_int : parseInt(String(y_int), 10);
            } else {
              const y_str = f.properties.year_str;
              if (y_str) {
                const str = String(y_str);
                const dashIdx = str.indexOf('-');
                if (dashIdx !== -1) {
                  const start = parseInt(str.slice(0, dashIdx), 10);
                  const end = parseInt(str.slice(dashIdx + 1), 10);
                  if (!isNaN(start) && !isNaN(end)) y = Math.round((start + end) / 2);
                } else {
                  y = parseInt(str, 10);
                }
              }
            }
            if (!isNaN(y) && y >= 1900) {
              counts[y] = (counts[y] || 0) + 1;
              if (y > localMax) { localMax = y; hasUpdates = true; }
              const lstRaw = f.properties.lst_1mean;
              if (lstRaw != null && !isNaN(Number(lstRaw))) {
                const decade = Math.floor(y / 10) * 10;
                if (!decadeLstRaw[decade]) decadeLstRaw[decade] = [];
                decadeLstRaw[decade].push(Number(lstRaw));
              }
            }
            const style = f.properties.arch_style;
            if (style && typeof style === 'string' && style.trim()) archStyles.add(style.trim());
            const company = f.properties.company;
            if (company && typeof company === 'string' && company.trim()) companies.add(company.trim());
            const type = f.properties.type;
            if (type && typeof type === 'string' && type.trim()) types[type.trim()] = (types[type.trim()] || 0) + 1;
          }

          setYearCounts(counts);
          setTypeCounts(types);

          const lstPoints: DecadeLstPoint[] = Object.entries(decadeLstRaw)
            .map(([dec, vals]) => ({
              decade: Number(dec),
              meanLst: vals.reduce((s, v) => s + v, 0) / vals.length,
              count: vals.length,
            }))
            .filter(p => p.count >= 3)
            .sort((a, b) => a.decade - b.decade);
          setDecadeLstData(lstPoints);

          if (hasUpdates) {
            currentSliderMax = localMax;
            opts.setSliderMax(localMax);
            opts.setYearRange(prev => [prev[0], Math.max(prev[1], localMax)]);
          }
          setArchStyleOptions(Array.from(archStyles).sort());
          setCompanyOptions(Array.from(companies).sort());
        }, 150);
      };

      map.on('idle', updateHistogram);
      updateHistogram();
      setMapLoaded(true);

      // ── Cinematic globe intro ──────────────────────────────────────────────
      if (playIntro) {
        window.setTimeout(() => {
          if (!opts.introActiveRef.current) return;
          map.flyTo({
            ...ASTANA_CAMERA,
            pitch: 45,
            bearing: -17,
            duration: 6500,
            curve: 1.42,
            essential: false,
          });
          map.once('moveend', () => {
            if (!opts.introActiveRef.current) return;
            window.setTimeout(() => {
              if (!opts.introActiveRef.current || !map.getStyle()) return;
              opts.introActiveRef.current = false;
              map.setProjection({ type: 'mercator' });
              map.setMinZoom(10);
              addLandmarks3D(map);
              map.easeTo({ pitch: 0, bearing: 0, duration: 1200 });
              opts.setIntroActive(false);
            }, 0);
          });
        }, 700);
      }
    });

    mapRef.current = map;
    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__map = map;
    }

    return () => {
      map.remove();
      maplibregl.removeProtocol('pmtiles');
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    mapRef,
    mapLoaded,
    mapSettled,
    hoverInfo,
    tapPreview,
    yearCounts,
    typeCounts,
    decadeLstData,
    archStyleOptions,
    companyOptions,
    finishIntro,
    // Patchable refs — MapPage sets .current after tour/cinema hooks initialize
    activeTourRef,
    cinemaActiveRef,
  };
}
