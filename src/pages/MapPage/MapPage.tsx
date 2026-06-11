import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import {
  ArrowLeft, Layers, SlidersHorizontal, HelpCircle, X,
  Map as MapIcon, Compass, Grid2x2, Film, Building2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import s from './MapPage.module.scss';
import { useIsMobile, IS_TOUCH_DEVICE } from './useIsMobile';

import { ERA_CONFIG, DISTRICT_BOUNDS } from './constants';
import {
  buildYearColorExpr, buildElevationColorExpr, buildLstColorExpr, buildTypeColorExpr,
  buildUhiColorExpr, buildCombinedFilter, buildHeightExtrusionExpr, buildAgeExtrusionExpr,
  type ColorMode, type DecadeLstPoint, type ExtrudeMode,
} from './mapHelpers';
import { darkDramaticStyle } from './darkDramaticStyle';
import { TimelineSlider } from './components/TimelineSlider';
import { FilterSidebar } from './components/FilterSidebar';
import { BuildingPanel } from './components/BuildingPanel';
import { GraffitiPanel } from './components/GraffitiPanel';
import { HexControls } from './components/HexControls';
import {
  buildCountColorExpr, buildYearAvgColorExpr, buildHexHeightExpr,
  buildHexCinemaHeightExpr, type HexMetric,
} from './hexUtils';
import { applyMapTheme, type MapTheme } from './mapTheme';

// Custom Hooks
import { useTimeLapse } from './hooks/useTimeLapse';
import { useMapFilters } from './hooks/useMapFilters';

// Subcomponents
import { LegendPanel } from './components/LegendPanel';
import { HoverTooltip } from './components/HoverTooltip';
import { TapPreviewCard } from './components/TapPreviewCard';
import { TourPanel } from './components/TourPanel';
import { LandmarkPanel } from './components/LandmarkPanel';

// Overlays
import { createGraffitiPinImage, loadGraffitiPhotoMarkers, type GraffitiGeoJSON } from './overlays/graffiti';
import { setOverlayVisible } from './overlays/overlayLayers';
import { landmarksGeoJSON, LANDMARKS, type Landmark } from './overlays/landmarksData';
import { TOURS, type Tour } from './tours';

/**
 * Backport of maplibre-gl#7117 (fixes maplibre-gl#6093): when a render-task
 * callback throws (e.g. during a globe↔mercator projection transition), the
 * queue's _currentlyRunning flag is never reset and every subsequent frame
 * fails with "Attempting to run(), but is already running." — freezing the
 * map. Wrapping run() in try/finally lets it recover. Remove once the
 * upstream fix ships in a stable maplibre-gl release (currently 6.x-pre).
 */
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

/** Lazily attach the three.js landmark layer — keeps three out of the main chunk. */
function addLandmarks3D(map: maplibregl.Map): void {
  import('./overlays/landmarks3d')
    .then((m) => {
      if (map.getStyle() && !map.getLayer('landmarks-3d')) {
        map.addLayer(m.createLandmarksLayer());
      }
    })
    .catch((err) => console.error('Failed to load 3D landmarks module:', err));
}

function getTourRouteData(tour: Tour, step: number, progress: number): GeoJSON.Feature {
  const coords: [number, number][] = [];
  for (let i = 0; i <= step; i++) {
    coords.push(tour.stops[i].camera.center as [number, number]);
  }
  if (step < tour.stops.length - 1 && progress > 0) {
    const current = tour.stops[step].camera.center as [number, number];
    const next = tour.stops[step + 1].camera.center as [number, number];
    coords.push([
      current[0] + (next[0] - current[0]) * progress,
      current[1] + (next[1] - current[1]) * progress
    ]);
  }
  if (coords.length === 1) {
    coords.push([...coords[0]]);
  }
  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: coords,
    },
    properties: {},
  };
}

// Tour route/marker accent — single gold accent shared with the rest of the UI
const TOUR_ACCENT = '#d4a85e';
const TOUR_ACCENT_VISITED = 'rgba(212, 168, 94, 0.55)';

/** Parses a shareable #zoom/lat/lng[/pitch[/bearing]] camera hash. */
function parseCameraHash(): {
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

const COLOR_MODES: ColorMode[] = ['year', 'elevation', 'lst', 'type', 'uhi'];

const PREFERS_REDUCED_MOTION =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const ASTANA_CAMERA = { center: [71.4306, 51.1282] as [number, number], zoom: 12 };

export default function MapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const isMobile = useIsMobile();
  const [legendOpen, setLegendOpen] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    properties: Record<string, unknown>;
  } | null>(null);

  // Custom Hooks for separated state management
  const {
    sliderMax,
    setSliderMax,
    yearRange,
    setYearRange,
    isPlaying,
    handleTogglePlay,
    handlePlayReset,
  } = useTimeLapse(1900, 2029);

  const {
    selectedTypes,
    setSelectedTypes,
    selectedDistricts,
    setSelectedDistricts,
    selectedArchStyle,
    setSelectedArchStyle,
    selectedCompany,
    setSelectedCompany,
    selectedUhiCells,
    setSelectedUhiCells,
    handleTypeToggle,
    handleDistrictToggle,
    handleReset,
    activeCount,
  } = useMapFilters();

  const [yearCounts, setYearCounts] = useState<Record<number, number>>({});
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const [decadeLstData, setDecadeLstData] = useState<DecadeLstPoint[]>([]);
  const [hoveredEra, setHoveredEra] = useState<string | null>(null);

  // Filter sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [archStyleOptions, setArchStyleOptions] = useState<string[]>([]);
  const [companyOptions, setCompanyOptions] = useState<string[]>([]);

  // Building detail panel state
  const [selectedBuilding, setSelectedBuilding] = useState<Record<string, unknown> | null>(null);

  // Touch tap-to-preview state (first tap = preview, second tap = full panel)
  const [tapPreview, setTapPreview] = useState<Record<string, unknown> | null>(null);
  const tapPreviewIdRef = useRef<string | number | null>(null);

  // Graffiti layer state
  const [selectedGraffiti, setSelectedGraffiti] = useState<Record<string, unknown> | null>(null);
  const [graffitiVisible, setGraffitiVisible] = useState(false);
  const graffitiDataRef = useRef<GraffitiGeoJSON | null>(null);
  const graffitiPhotosLoadedRef = useRef(false);

  // Thematic overlays (lazy-loaded on first toggle)
  const [crimeVisible, setCrimeVisible] = useState(false);
  const [greenVisible, setGreenVisible] = useState(false);
  const [districtsVisible, setDistrictsVisible] = useState(false);

  // 3D landmark popup
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);

  // Guided tours
  const [activeTour, setActiveTour] = useState<Tour | null>(null);
  const [tourStep, setTourStep] = useState(0);
  const activeTourRef = useRef<Tour | null>(null);
  useEffect(() => {
    activeTourRef.current = activeTour;
  }, [activeTour]);
  const tourStepRef = useRef(0);
  const tourProgressRef = useRef(0);
  const absoluteCurrentRef = useRef(0);
  const absoluteTargetRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const pendingTourRef = useRef<Tour | null>(
    (() => {
      if (typeof window === 'undefined') return null;
      const id = new URLSearchParams(window.location.search).get('tour');
      return TOURS.find((t) => t.id === id) ?? null;
    })(),
  );

  // Shared camera from the URL hash — when present, the intro is skipped
  const hashCameraRef = useRef(parseCameraHash());

  // Cinematic globe → city intro — plays on every fresh open of the map;
  // skipped only for shared #camera links, ?tour deep links and reduced motion
  const [introActive, setIntroActive] = useState(() =>
    !PREFERS_REDUCED_MOTION &&
    !pendingTourRef.current &&
    !hashCameraRef.current,
  );
  const introActiveRef = useRef(introActive);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Onboarding helpers state
  const [showHelpers, setShowHelpers] = useState(() => {
    return localStorage.getItem('kbh-map-onboarding-dismissed') !== 'true';
  });

  const handleDismissHelpers = useCallback(() => {
    setShowHelpers(false);
    localStorage.setItem('kbh-map-onboarding-dismissed', 'true');
  }, []);

  const handleOpenHelpers = useCallback(() => {
    setShowHelpers(true);
    localStorage.removeItem('kbh-map-onboarding-dismissed');
  }, []);

  // Cinematic time-lapse ("Cinema") mode
  const [cinemaActive, setCinemaActive] = useState(false);
  const [cinemaYear, setCinemaYear] = useState(1900);
  const cinemaActiveRef = useRef(false);
  useEffect(() => {
    cinemaActiveRef.current = cinemaActive;
  }, [cinemaActive]);

  // Dark / light map theme
  const [mapTheme, setMapTheme] = useState<MapTheme>('dark');

  // Building color visualization mode — restored from ?mode= when present
  const [colorMode, setColorMode] = useState<ColorMode>(() => {
    if (typeof window === 'undefined') return 'year';
    const m = new URLSearchParams(window.location.search).get('mode');
    return COLOR_MODES.includes(m as ColorMode) ? (m as ColorMode) : 'year';
  });

  // Keep ?mode= in the URL so the current view is shareable
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (colorMode === 'year') params.delete('mode');
    else params.set('mode', colorMode);
    const qs = params.toString();
    window.history.replaceState(
      null, '',
      window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash,
    );
  }, [colorMode]);

  // True once the map has finished its first full render
  const [mapSettled, setMapSettled] = useState(false);

  const handleColorModeChange = (mode: ColorMode) => {
    setColorMode(mode);
    if (vizMode === 'hexagons') {
      setVizMode('buildings');
    }
  };

  // 3D extrusion mode — real height vs building age
  const [extrudeMode, setExtrudeMode] = useState<ExtrudeMode>('height');

  // Hexagon visualization state
  const [vizMode, setVizMode] = useState<'buildings' | 'hexagons'>('buildings');
  const [hexMetric, setHexMetric] = useState<HexMetric>('count');

  // Refs for closure capturing & viewport boundaries caching to prevent redundant calculations
  const vizModeRef = useRef(vizMode);
  useEffect(() => {
    vizModeRef.current = vizMode;
  }, [vizMode]);

  const lastBoundsStrRef = useRef<string>('');

  // Timeline collapsed state (lifted up so MapPage can control it)
  const [timelineCollapsed, setTimelineCollapsed] = useState(false);

  // Snapshot of UI open-states before entering hexagon mode — restored on exit
  const preHexStateRef = useRef<{ legend: boolean; sidebar: boolean; timeline: boolean } | null>(null);

  // Track selected building outline via feature-state
  const selectedBuildingIdRef = useRef<string | number | null>(null);

  // Apply dark/light theme to <html> data-theme + basemap paint properties
  useEffect(() => {
    document.documentElement.dataset.theme = mapTheme;
    const map = mapRef.current;
    if (!map) return;
    const apply = () => applyMapTheme(map, mapTheme);
    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [mapTheme]);

  // Apply building color expression when colorMode or mapTheme changes
  useEffect(() => {
    setSelectedUhiCells([]);
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const colorExpr =
        colorMode === 'elevation' ? buildElevationColorExpr() :
          colorMode === 'lst' ? buildLstColorExpr() :
            colorMode === 'type' ? buildTypeColorExpr() :
              colorMode === 'uhi' ? buildUhiColorExpr() :
                buildYearColorExpr();
      if (map.getLayer('buildings-fill'))
        map.setPaintProperty('buildings-fill', 'fill-color', colorExpr);
      if (map.getLayer('buildings-3d'))
        map.setPaintProperty('buildings-3d', 'fill-extrusion-color', colorExpr);
    };
    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [colorMode, mapTheme]);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setTimelineCollapsed(true);  // save vertical space on mobile
    }
  }, []);

  // Deep link: /map?years=1955-1980 pre-filters the timeline
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('years');
    const m = param?.match(/^(\d{4})-(\d{4})$/);
    if (m) {
      const from = Math.max(1900, Number(m[1]));
      const to = Math.min(2100, Number(m[2]));
      if (from <= to) setYearRange([from, to]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stable sidebar/theme callbacks — prevent FilterSidebar re-renders on unrelated MapPage state changes
  const handleSidebarClose = useCallback(() => setSidebarOpen(false), []);
  const handleSidebarToggle = useCallback(() => setSidebarOpen((v) => !v), []);
  const handleClearTypes = useCallback(() => setSelectedTypes([]), [setSelectedTypes]);
  const handleClearDistricts = useCallback(() => setSelectedDistricts([]), [setSelectedDistricts]);
  const handleThemeToggle = useCallback(
    () => setMapTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    [],
  );
  const handleGraffitiToggle = useCallback(() => setGraffitiVisible((v) => !v), []);
  const handleCrimeToggle = useCallback(() => setCrimeVisible((v) => !v), []);
  const handleGreenToggle = useCallback(() => setGreenVisible((v) => !v), []);
  const handleDistrictsToggle = useCallback(() => setDistrictsVisible((v) => !v), []);
  const handleExtrudeModeChange = useCallback((m: ExtrudeMode) => setExtrudeMode(m), []);

  const clearSelectedBuildingState = useCallback(() => {
    const map = mapRef.current;
    if (map && selectedBuildingIdRef.current !== null) {
      map.setFeatureState(
        { source: 'all-buildings', sourceLayer: 'buildings', id: selectedBuildingIdRef.current },
        { selected: false },
      );
      selectedBuildingIdRef.current = null;
    }
  }, []);

  const closeBuildingPanel = useCallback(() => {
    setSelectedBuilding(null);
    clearSelectedBuildingState();
  }, [clearSelectedBuildingState]);

  // Finalize the globe intro: settle camera, switch to mercator, unlock UI
  const finishIntro = useCallback(() => {
    const map = mapRef.current;
    if (!map || !introActiveRef.current) return;
    introActiveRef.current = false;
    map.stop();
    map.setProjection({ type: 'mercator' });
    map.setMinZoom(10);
    map.jumpTo({ ...ASTANA_CAMERA, pitch: 0, bearing: 0 });
    setIntroActive(false);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);

    const playIntro = introActiveRef.current;
    const hashCam = hashCameraRef.current;

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

    // Keep a shareable #zoom/lat/lng/pitch/bearing hash in sync with the camera
    let hashTimer: number | null = null;
    map.on('moveend', () => {
      if (introActiveRef.current) return;
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

      // 2D hover fill
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

      // 3D hover extrusion
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

      // Selected building outline — lit via feature-state from the click handler
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
        paint: {
          'fill-color': 'transparent',
        },
      });

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

      // ── 3D landmark models + clickable halo markers ────────────────────────
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

      // Generous invisible hit target (≥44px touch comfort)
      map.addLayer({
        id: 'landmarks-hit',
        type: 'circle',
        source: 'landmarks',
        paint: {
          'circle-radius': 24,
          'circle-color': 'rgba(0,0,0,0)',
        },
      });

      map.on('mousemove', 'landmarks-hit', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'landmarks-hit', () => {
        map.getCanvas().style.cursor = '';
      });

      // Custom three.js layer — loaded async; when the intro is playing it is
      // deferred until the projection settles back to mercator.
      if (!playIntro) {
        addLandmarks3D(map);
      }

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
        setHoverInfo({
          x: e.point.x,
          y: e.point.y,
          properties: feat.properties as Record<string, unknown>,
        });
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

      // Hex hover
      const handleHexMouseMove = (e: any) => {
        if (!e.features?.length) return;
        map.getCanvas().style.cursor = 'crosshair';
        const feat = e.features[0];
        setHoverInfo({
          x: e.point.x,
          y: e.point.y,
          properties: feat.properties as Record<string, unknown>,
        });
      };

      const handleHexMouseLeave = () => {
        map.getCanvas().style.cursor = '';
        setHoverInfo(null);
      };

      map.on('mousemove', 'hex-layer', handleHexMouseMove);
      map.on('mouseleave', 'hex-layer', handleHexMouseLeave);

      const clearTapPreviewState = () => {
        if (tapPreviewIdRef.current !== null) {
          map.setFeatureState(
            { source: 'all-buildings', sourceLayer: 'buildings', id: tapPreviewIdRef.current },
            { hover: false },
          );
          tapPreviewIdRef.current = null;
        }
        setTapPreview(null);
      };

      const selectBuilding = (feat: maplibregl.MapGeoJSONFeature) => {
        // Clear previous selected outline, set new one
        if (selectedBuildingIdRef.current !== null) {
          map.setFeatureState(
            { source: 'all-buildings', sourceLayer: 'buildings', id: selectedBuildingIdRef.current },
            { selected: false },
          );
        }
        if (feat.id !== undefined) {
          map.setFeatureState(
            { source: 'all-buildings', sourceLayer: 'buildings', id: feat.id },
            { selected: true },
          );
          selectedBuildingIdRef.current = feat.id;
        }
        setSelectedBuilding(feat.properties as Record<string, unknown>);
        setSelectedGraffiti(null);
        setSelectedLandmark(null);
        setSidebarOpen(false);
        if (window.innerWidth < 768) {
          setLegendOpen(false);
          setTimelineCollapsed(true);
        }
      };

      // Click priority: graffiti pins → 3D landmarks → buildings
      map.on('click', (e) => {
        const graffitiFeatures = map.getLayer('graffiti-layer')
          ? map.queryRenderedFeatures(e.point, { layers: ['graffiti-layer'] })
          : [];
        if (graffitiFeatures.length) {
          setSelectedGraffiti(graffitiFeatures[0].properties as Record<string, unknown>);
          setSelectedBuilding(null);
          setSelectedLandmark(null);
          setSidebarOpen(false);
          clearTapPreviewState();
          return;
        }

        const landmarkFeatures = map.queryRenderedFeatures(e.point, { layers: ['landmarks-hit'] });
        if (landmarkFeatures.length) {
          const lm = LANDMARKS.find((l) => l.id === landmarkFeatures[0].properties?.id);
          if (lm) {
            setSelectedLandmark(lm);
            setSelectedBuilding(null);
            setSelectedGraffiti(null);
            setSidebarOpen(false);
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
            // First tap previews; tapping the same building again opens details
            if (feat.id !== undefined && feat.id === tapPreviewIdRef.current) {
              clearTapPreviewState();
              selectBuilding(feat);
            } else {
              if (tapPreviewIdRef.current !== null) {
                map.setFeatureState(
                  { source: 'all-buildings', sourceLayer: 'buildings', id: tapPreviewIdRef.current },
                  { hover: false },
                );
              }
              if (feat.id !== undefined) {
                map.setFeatureState(
                  { source: 'all-buildings', sourceLayer: 'buildings', id: feat.id },
                  { hover: true },
                );
                tapPreviewIdRef.current = feat.id;
              }
              setTapPreview(feat.properties as Record<string, unknown>);
              setSelectedBuilding(null);
            }
            return;
          }

          selectBuilding(feat);
        } else {
          setSelectedBuilding(null);
          setSelectedGraffiti(null);
          setSelectedLandmark(null);
          clearTapPreviewState();
          if (selectedBuildingIdRef.current !== null) {
            map.setFeatureState(
              { source: 'all-buildings', sourceLayer: 'buildings', id: selectedBuildingIdRef.current },
              { selected: false },
            );
            selectedBuildingIdRef.current = null;
          }
        }
      });

      const archStyles = new Set<string>();
      const companies = new Set<string>();
      let currentSliderMax = 2029;

      let debounceTimer: ReturnType<typeof setTimeout> | null = null;

      const updateHistogram = () => {
        // Skip entirely when building layers are hidden (hexagon mode) or the
        // camera is being animated by a tour / cinema sweep — the heavy
        // queryRenderedFeatures pass would just burn frames there.
        if (vizModeRef.current === 'hexagons' || activeTourRef.current || cinemaActiveRef.current) {
          return;
        }

        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const m = mapRef.current;
          if (!m) return;

          // Viewport bounds check to skip redundant updates on identical bounds
          const bounds = m.getBounds();
          const boundsStr = bounds.toArray().flat().map((n) => n.toFixed(5)).join(',');
          if (boundsStr === lastBoundsStrRef.current) {
            return;
          }
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
              if (y > localMax) {
                localMax = y;
                hasUpdates = true;
              }

              // Collect LST per decade
              const lstRaw = f.properties.lst_1mean;
              if (lstRaw != null && !isNaN(Number(lstRaw))) {
                const decade = Math.floor(y / 10) * 10;
                if (!decadeLstRaw[decade]) decadeLstRaw[decade] = [];
                decadeLstRaw[decade].push(Number(lstRaw));
              }
            }

            // Collect dynamic dropdown options
            const style = f.properties.arch_style;
            if (style && typeof style === 'string' && style.trim()) {
              archStyles.add(style.trim());
            }
            const company = f.properties.company;
            if (company && typeof company === 'string' && company.trim()) {
              companies.add(company.trim());
            }

            // Type counts for charts tab
            const type = f.properties.type;
            if (type && typeof type === 'string' && type.trim()) {
              types[type.trim()] = (types[type.trim()] || 0) + 1;
            }

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
            setSliderMax(localMax);
            setYearRange(prev => [prev[0], Math.max(prev[1], localMax)]);
          }

          setArchStyleOptions(Array.from(archStyles).sort());
          setCompanyOptions(Array.from(companies).sort());
        }, 150);
      };

      map.on('idle', updateHistogram);
      updateHistogram();

      setMapLoaded(true);

      // ── Cinematic intro: globe → dive into Astana ────────────────────────
      if (playIntro) {
        window.setTimeout(() => {
          if (!introActiveRef.current) return;
          map.flyTo({
            ...ASTANA_CAMERA,
            pitch: 45,
            bearing: -17,
            duration: 6500,
            curve: 1.42,
            essential: false,
          });
          map.once('moveend', () => {
            if (!introActiveRef.current) return;
            // Deferred: moveend fires from inside the render task queue, and
            // switching projection there can throw mid-frame (maplibre-gl#6093).
            window.setTimeout(() => {
              if (!introActiveRef.current || !map.getStyle()) return;
              introActiveRef.current = false;
              map.setProjection({ type: 'mercator' });
              map.setMinZoom(10);
              addLandmarks3D(map);
              map.easeTo({ pitch: 0, bearing: 0, duration: 1200 });
              setIntroActive(false);
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

  // When the intro is skipped manually, attach the deferred landmarks layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || introActive || !mapLoaded) return;
    if (!map.getLayer('landmarks-3d') && map.isStyleLoaded()) {
      addLandmarks3D(map);
    }
  }, [introActive, mapLoaded]);

  // Combined filter effect — year range + all sidebar filters
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (!map.getStyle()) return;

    const filterExpr = buildCombinedFilter(
      yearRange,
      selectedTypes,
      selectedDistricts,
      selectedArchStyle,
      selectedCompany,
      colorMode === 'uhi' ? selectedUhiCells : []
    ) as maplibregl.FilterSpecification;

    if (map.getLayer('buildings-fill')) map.setFilter('buildings-fill', filterExpr);
    if (map.getLayer('buildings-outline')) map.setFilter('buildings-outline', filterExpr);
    if (map.getLayer('buildings-3d')) map.setFilter('buildings-3d', filterExpr);
  }, [yearRange, selectedTypes, selectedDistricts, selectedArchStyle, selectedCompany, selectedUhiCells, colorMode]);

  // Fly to fit selected districts — only when the district selection itself changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getStyle() || selectedDistricts.length === 0) return;
    const boxes = selectedDistricts.map((d) => DISTRICT_BOUNDS[d]).filter(Boolean);
    if (boxes.length > 0) {
      const west = Math.min(...boxes.map((b) => b[0]));
      const south = Math.min(...boxes.map((b) => b[1]));
      const east = Math.max(...boxes.map((b) => b[2]));
      const north = Math.max(...boxes.map((b) => b[3]));
      map.fitBounds([west, south, east, north], { padding: 60, duration: 1000 });
    }
  }, [selectedDistricts]);

  // Era hover highlight — only active in 'year' color mode
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (!map.getStyle() || !map.getLayer('buildings-fill')) return;

    let opacityExpr: any = [
      'interpolate', ['linear'], ['zoom'],
      12, 0.7,
      14, 0.85,
      14.5, 0,
    ];
    let opacity3dExpr: any = 0.85;

    if (colorMode === 'year' && hoveredEra) {
      const era = ERA_CONFIG.find(e => e.label === hoveredEra);
      if (era) {
        const parsedYear = ['coalesce', ['get', 'year_int'], 0];
        let inEraExpr: any;
        if (era.label === 'Unknown') {
          inEraExpr = ['==', parsedYear, 0];
        } else {
          inEraExpr = ['all',
            ['>=', parsedYear, era.bounds[0]],
            ['<=', parsedYear, era.bounds[1]],
            ['!=', parsedYear, 0]
          ];
        }
        opacityExpr = ['case', inEraExpr, opacityExpr, 0.1];
        opacity3dExpr = ['case', inEraExpr, opacity3dExpr, 0.1];
      }
    }

    map.setPaintProperty('buildings-fill', 'fill-opacity', opacityExpr);
    if (map.getLayer('buildings-3d')) {
      map.setPaintProperty('buildings-3d', 'fill-extrusion-opacity', opacity3dExpr);
    }
  }, [hoveredEra, colorMode]);

  // ── Extrusion mode — height vs age ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getStyle()) return;
    const apply = () => {
      const expr = extrudeMode === 'age' ? buildAgeExtrusionExpr() : buildHeightExtrusionExpr();
      if (map.getLayer('buildings-3d'))
        map.setPaintProperty('buildings-3d', 'fill-extrusion-height', expr);
      if (map.getLayer('buildings-3d-hover'))
        map.setPaintProperty('buildings-3d-hover', 'fill-extrusion-height', expr);
    };
    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [extrudeMode]);

  // ── Viz mode toggle — show/hide building vs hex layers ─────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getStyle()) return;

    const buildingVis: maplibregl.VisibilitySpecification = vizMode === 'buildings' ? 'visible' : 'none';
    const hexVis: maplibregl.VisibilitySpecification = vizMode === 'hexagons' ? 'visible' : 'none';

    const buildingLayers = ['buildings-fill', 'buildings-outline', 'buildings-3d',
      'buildings-hover', 'buildings-3d-hover', 'buildings-selected', 'buildings-hidden'];
    const hexLayers = ['hex-layer', 'hex-outline'];

    buildingLayers.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', buildingVis); });
    hexLayers.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', hexVis); });

    // ── Collapse / restore UI panels ────────────────────────────────────────
    if (vizMode === 'hexagons') {
      // Save current open state before collapsing
      preHexStateRef.current = {
        legend: legendOpen,
        sidebar: sidebarOpen,
        timeline: timelineCollapsed,
      };
      setLegendOpen(false);
      setSidebarOpen(false);
      setTimelineCollapsed(true);
    } else if (preHexStateRef.current !== null) {
      // Restore previous state when switching back to buildings
      const prev = preHexStateRef.current;
      preHexStateRef.current = null;
      setLegendOpen(prev.legend);
      setSidebarOpen(prev.sidebar);
      setTimelineCollapsed(prev.timeline);
    }
  }, [vizMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Hex metric switch — update colour paint property ───────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getStyle() || !map.getLayer('hex-layer')) return;

    const colorExpr = hexMetric === 'count' ? buildCountColorExpr() : buildYearAvgColorExpr();
    map.setPaintProperty('hex-layer', 'fill-extrusion-color', colorExpr);
  }, [hexMetric]);

  // ── Cinema × hexagons — cells rise as the sweep passes their avg year ──────
  const hexCinemaActiveRef = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getStyle() || !map.getLayer('hex-layer')) return;

    if (cinemaActive && vizMode === 'hexagons') {
      hexCinemaActiveRef.current = true;
      map.setPaintProperty('hex-layer', 'fill-extrusion-height', buildHexCinemaHeightExpr(cinemaYear));
    } else if (hexCinemaActiveRef.current) {
      hexCinemaActiveRef.current = false;
      map.setPaintProperty('hex-layer', 'fill-extrusion-height', buildHexHeightExpr());
    }
  }, [cinemaActive, vizMode, cinemaYear]);

  // ── Graffiti layer — everything (geojson, pin image, layers, photos) is
  //    loaded lazily the first time the toggle turns on ─────────────────────
  const graffitiInitRef = useRef(false);
  const graffitiVisibleRef = useRef(false);

  const ensureGraffitiLayer = useCallback((map: maplibregl.Map) => {
    if (graffitiInitRef.current) return;
    graffitiInitRef.current = true;
    createGraffitiPinImage(map);

    fetch('/graffiti-astana.geojson')
      .then((res) => res.json())
      .then((geojson: GraffitiGeoJSON) => {
        if (!geojson?.features || !map.getStyle()) return;
        graffitiDataRef.current = geojson;
        const vis: maplibregl.VisibilitySpecification =
          graffitiVisibleRef.current ? 'visible' : 'none';

        map.addSource('graffiti', { type: 'geojson', data: geojson });

        map.addLayer({
          id: 'graffiti-layer',
          type: 'symbol',
          source: 'graffiti',
          layout: {
            'icon-image': ['coalesce', ['image', ['get', 'photo']], 'graffiti-pin'],
            'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.55, 14, 0.9, 18, 1.1],
            'icon-allow-overlap': true,
            'icon-anchor': 'center',
            'visibility': vis,
          },
          paint: {
            'icon-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 1.0, 0.88],
          },
        });

        map.addLayer({
          id: 'graffiti-label',
          type: 'symbol',
          source: 'graffiti',
          minzoom: 15,
          layout: {
            'text-field': ['get', 'title'],
            'text-size': 11,
            'text-anchor': 'top',
            'text-offset': [0, 1.0],
            'text-allow-overlap': false,
            'visibility': vis,
          },
          paint: {
            'text-color': '#CAFF00',
            'text-halo-color': 'rgba(0,0,0,0.8)',
            'text-halo-width': 1.5,
          },
        });

        // Graffiti hover
        let hoveredGraffitiId: string | number | null = null;

        map.on('mousemove', 'graffiti-layer', (e) => {
          if (!e.features?.length) return;
          map.getCanvas().style.cursor = 'pointer';
          const feat = e.features[0];
          if (feat.id !== hoveredGraffitiId) {
            if (hoveredGraffitiId !== null) {
              map.setFeatureState({ source: 'graffiti', id: hoveredGraffitiId }, { hover: false });
            }
            hoveredGraffitiId = feat.id ?? null;
            if (hoveredGraffitiId !== null) {
              map.setFeatureState({ source: 'graffiti', id: hoveredGraffitiId }, { hover: true });
            }
          }
          setHoverInfo({
            x: e.point.x,
            y: e.point.y,
            properties: { ...(feat.properties as Record<string, unknown>), _source: 'graffiti' },
          });
        });

        map.on('mouseleave', 'graffiti-layer', () => {
          map.getCanvas().style.cursor = '';
          if (hoveredGraffitiId !== null) {
            map.setFeatureState({ source: 'graffiti', id: hoveredGraffitiId }, { hover: false });
            hoveredGraffitiId = null;
          }
          setHoverInfo(null);
        });

        // Photo markers download only while the layer is actually visible
        if (graffitiVisibleRef.current && !graffitiPhotosLoadedRef.current) {
          graffitiPhotosLoadedRef.current = true;
          loadGraffitiPhotoMarkers(map, geojson);
        }
      })
      .catch((err) => console.error('Error loading graffiti layer:', err));
  }, []);

  useEffect(() => {
    graffitiVisibleRef.current = graffitiVisible;
    const map = mapRef.current;
    if (!map || !mapLoaded || !map.getStyle()) return;
    if (graffitiVisible) ensureGraffitiLayer(map);
    const vis: maplibregl.VisibilitySpecification = graffitiVisible ? 'visible' : 'none';
    if (map.getLayer('graffiti-layer')) map.setLayoutProperty('graffiti-layer', 'visibility', vis);
    if (map.getLayer('graffiti-label')) map.setLayoutProperty('graffiti-label', 'visibility', vis);
    if (graffitiVisible && !graffitiPhotosLoadedRef.current && graffitiDataRef.current) {
      graffitiPhotosLoadedRef.current = true;
      loadGraffitiPhotoMarkers(map, graffitiDataRef.current);
    }
  }, [graffitiVisible, mapLoaded, ensureGraffitiLayer]);

  // ── Thematic overlays (lazy add on first toggle) ──────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !map.getStyle()) return;
    setOverlayVisible(map, 'crime', crimeVisible);
  }, [crimeVisible, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !map.getStyle()) return;
    setOverlayVisible(map, 'green', greenVisible);
  }, [greenVisible, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !map.getStyle()) return;
    setOverlayVisible(map, 'districts', districtsVisible);
  }, [districtsVisible, mapLoaded]);

  // ── Guided tours ────────────────────────────────────────────────────────────
  const tourPulseRafRef = useRef<number | null>(null);

  const stopTourPulse = useCallback(() => {
    if (tourPulseRafRef.current !== null) {
      cancelAnimationFrame(tourPulseRafRef.current);
      tourPulseRafRef.current = null;
    }
  }, []);

  /** Sonar pulse on the current stop — runs only while a tour is active. */
  const startTourPulse = useCallback((map: maplibregl.Map) => {
    stopTourPulse();
    if (PREFERS_REDUCED_MOTION) return;
    const t0 = performance.now();
    const frame = (now: number) => {
      if (!map.getStyle() || !map.getLayer('tour-pulse')) {
        tourPulseRafRef.current = null;
        return;
      }
      const phase = ((now - t0) % 2200) / 2200; // 0..1 every 2.2 s
      map.setPaintProperty('tour-pulse', 'circle-radius', 10 + phase * 26);
      map.setPaintProperty('tour-pulse', 'circle-opacity', 0.4 * (1 - phase));
      map.setPaintProperty('tour-pulse', 'circle-stroke-opacity', 0.7 * (1 - phase));
      tourPulseRafRef.current = requestAnimationFrame(frame);
    };
    tourPulseRafRef.current = requestAnimationFrame(frame);
  }, [stopTourPulse]);

  const updateTourLine = useCallback((map: maplibregl.Map, tour: Tour, step: number, progress: number) => {
    const src = map.getSource('tour-route') as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(getTourRouteData(tour, step, progress));
    }
  }, []);

  const ensureTourLayers = useCallback((map: maplibregl.Map, tour: Tour) => {
    const baseRouteData: GeoJSON.Feature = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: tour.stops.map((st) => st.camera.center),
      },
      properties: {},
    };

    if (!map.getSource('tour-route-base')) {
      map.addSource('tour-route-base', { type: 'geojson', data: baseRouteData });
      map.addLayer({
        id: 'tour-route-base-line',
        type: 'line',
        source: 'tour-route-base',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': TOUR_ACCENT,
          'line-width': 2,
          'line-dasharray': [1, 2],
          'line-opacity': 0.3,
        },
      });
    } else {
      (map.getSource('tour-route-base') as maplibregl.GeoJSONSource).setData(baseRouteData);
      if (map.getLayer('tour-route-base-line')) {
        map.setPaintProperty('tour-route-base-line', 'line-color', TOUR_ACCENT);
        map.setLayoutProperty('tour-route-base-line', 'visibility', 'visible');
      }
    }

    const routeData = getTourRouteData(tour, 0, 0);
    if (!map.getSource('tour-route')) {
      map.addSource('tour-route', { type: 'geojson', data: routeData });
      map.addLayer({
        id: 'tour-route-glow',
        type: 'line',
        source: 'tour-route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': TOUR_ACCENT,
          'line-width': 10,
          'line-blur': 8,
          'line-opacity': 0.8,
        },
      });
      map.addLayer({
        id: 'tour-route-core',
        type: 'line',
        source: 'tour-route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#ffffff',
          'line-width': 2.5,
          'line-opacity': 1,
        },
      });
    } else {
      (map.getSource('tour-route') as maplibregl.GeoJSONSource).setData(routeData);
      if (map.getLayer('tour-route-glow')) {
        map.setPaintProperty('tour-route-glow', 'line-color', TOUR_ACCENT);
        map.setLayoutProperty('tour-route-glow', 'visibility', 'visible');
      }
      if (map.getLayer('tour-route-core')) {
        map.setLayoutProperty('tour-route-core', 'visibility', 'visible');
      }
    }

    const stopData = (i: number): GeoJSON.FeatureCollection => ({
      type: 'FeatureCollection',
      features: tour.stops.map((st, idx) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: st.camera.center },
        properties: { current: idx === i, visited: idx < i, index: idx + 1 },
      })),
    });
    if (!map.getSource('tour-stops')) {
      map.addSource('tour-stops', { type: 'geojson', data: stopData(0) });
      // Sonar pulse under the current stop (radius/opacity animated via rAF)
      map.addLayer({
        id: 'tour-pulse',
        type: 'circle',
        source: 'tour-stops',
        filter: ['get', 'current'],
        paint: {
          'circle-radius': 10,
          'circle-color': TOUR_ACCENT,
          'circle-opacity': 0.35,
          'circle-stroke-color': TOUR_ACCENT,
          'circle-stroke-width': 1.5,
          'circle-stroke-opacity': 0.6,
        },
      });
      map.addLayer({
        id: 'tour-stops-points',
        type: 'circle',
        source: 'tour-stops',
        paint: {
          'circle-radius': ['case', ['get', 'current'], 9, 6],
          'circle-color': [
            'case',
            ['get', 'current'], TOUR_ACCENT,
            ['get', 'visited'], TOUR_ACCENT_VISITED,
            'rgba(20,26,36,0.85)',
          ],
          'circle-stroke-color': ['case', ['get', 'current'], '#ffffff', TOUR_ACCENT],
          'circle-stroke-width': ['case', ['get', 'current'], 2, 1.2],
        },
      });
      // Stop numbers on the markers
      map.addLayer({
        id: 'tour-stops-labels',
        type: 'symbol',
        source: 'tour-stops',
        layout: {
          'text-field': ['to-string', ['get', 'index']],
          'text-font': ['Noto Sans Bold'],
          'text-size': 9,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': [
            'case',
            ['any', ['get', 'current'], ['get', 'visited']], '#06131a',
            '#8ba0bc',
          ],
        },
      });
    } else {
      (map.getSource('tour-stops') as maplibregl.GeoJSONSource).setData(stopData(0));
      ['tour-pulse', 'tour-stops-points', 'tour-stops-labels'].forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'visible');
      });
    }

    startTourPulse(map);
  }, [startTourPulse]);

  const handleStartTour = useCallback((tour: Tour) => {
    const map = mapRef.current;
    if (!map || !map.getStyle()) return;
    if (introActiveRef.current) finishIntro();
    setCinemaActive(false);
    handleDismissHelpers(); // the guide overlay must never resurface over a running/finished tour
    setActiveTour(tour);
    tourStepRef.current = 0;
    tourProgressRef.current = 0;
    absoluteCurrentRef.current = 0;
    absoluteTargetRef.current = 0;
    cancelAnimationFrame(animFrameRef.current);
    setTourStep(0);
    setSidebarOpen(false);
    setLegendOpen(false);
    setTimelineCollapsed(true);
    setSelectedBuilding(null);
    setSelectedGraffiti(null);
    setSelectedLandmark(null);
    ensureTourLayers(map, tour);
  }, [ensureTourLayers, finishIntro, handleDismissHelpers]);

  const handleExitTour = useCallback(() => {
    const map = mapRef.current;
    setActiveTour(null);
    setTourStep(0);
    stopTourPulse();
    cancelAnimationFrame(animFrameRef.current);
    if (map && map.getStyle()) {
      ['tour-route-base-line', 'tour-route-glow', 'tour-route-core',
        'tour-pulse', 'tour-stops-points', 'tour-stops-labels'].forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
      });
      map.easeTo({ pitch: 0, duration: 800 });
    }
  }, [stopTourPulse]);

  // ── Cinema mode — orbiting 3D time-lapse of the city's growth ─────────────
  const handleStartCinema = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.getStyle()) return;
    if (introActiveRef.current) finishIntro();
    setSidebarOpen(false);
    setLegendOpen(false);
    setTimelineCollapsed(true);
    setSelectedBuilding(null);
    setSelectedGraffiti(null);
    setSelectedLandmark(null);
    setTapPreview(null);
    clearSelectedBuildingState();
    setCinemaActive(true);
  }, [finishIntro, clearSelectedBuildingState]);

  const handleExitCinema = useCallback(() => setCinemaActive(false), []);

  useEffect(() => {
    const map = mapRef.current;
    if (!cinemaActive || !map || !map.getStyle()) return;

    const START_YEAR = 1900;
    const endYear = sliderMax;
    const SWEEP_MS = 45000; // 1900 → today in 45 s

    // Glide into a tilted 3D view over the city core
    map.easeTo({
      center: ASTANA_CAMERA.center,
      zoom: 13.9,
      pitch: 57,
      bearing: -20,
      duration: PREFERS_REDUCED_MOTION ? 0 : 2600,
      essential: true,
    });

    setCinemaYear(START_YEAR);
    setYearRange([START_YEAR, START_YEAR]);

    let raf = 0;
    let startTs: number | null = null;
    let lastYear = START_YEAR;
    let orbit = !PREFERS_REDUCED_MOTION;
    let doneTimer: number | null = null;

    // Any user gesture hands camera control back, the year sweep continues
    const stopOrbit = () => { orbit = false; };
    const stopOrbitIfUser = (e: { originalEvent?: unknown }) => {
      if (e.originalEvent) orbit = false;
    };
    map.on('dragstart', stopOrbit);
    map.on('zoomstart', stopOrbitIfUser);
    map.on('rotatestart', stopOrbitIfUser);

    const frame = (now: number) => {
      if (startTs === null) startTs = now;
      const elapsed = now - startTs;
      const t = PREFERS_REDUCED_MOTION ? 1 : Math.min(1, elapsed / SWEEP_MS);
      const year = Math.round(START_YEAR + t * (endYear - START_YEAR));
      if (year !== lastYear) {
        lastYear = year;
        setCinemaYear(year);
        setYearRange([START_YEAR, year]);
      }
      // Slow orbital drift once the entry flight has landed
      if (orbit && elapsed > 2800) {
        map.setBearing(-20 + (elapsed - 2800) * 0.0028);
      }
      if (t >= 1 && doneTimer === null) {
        // Hold the finished skyline for a beat, then leave cinema
        doneTimer = window.setTimeout(() => setCinemaActive(false), 2600);
      }
      if (t < 1 || orbit) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCinemaActive(false);
    };
    window.addEventListener('keydown', onKey);

    return () => {
      cancelAnimationFrame(raf);
      if (doneTimer !== null) window.clearTimeout(doneTimer);
      window.removeEventListener('keydown', onKey);
      map.off('dragstart', stopOrbit);
      map.off('zoomstart', stopOrbitIfUser);
      map.off('rotatestart', stopOrbitIfUser);
      if (map.getStyle()) {
        map.stop();
        map.easeTo({ pitch: 0, duration: PREFERS_REDUCED_MOTION ? 0 : 900 });
      }
      handlePlayReset(); // restore the full year range
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cinemaActive]);

  // Fly the camera + move the active stop marker on every step change
  const driftGuardRef = useRef(0);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activeTour || !map.getStyle()) return;
    const stop = activeTour.stops[tourStep];
    const guard = ++driftGuardRef.current;

    map.flyTo({
      center: stop.camera.center,
      zoom: stop.camera.zoom,
      pitch: stop.camera.pitch,
      bearing: stop.camera.bearing,
      duration: PREFERS_REDUCED_MOTION ? 0 : 2600,
      curve: 1.5,
      essential: true,
    });

    // After arriving, drift the bearing slowly so the stop feels alive.
    // Any user interaction or step change interrupts it naturally.
    if (!PREFERS_REDUCED_MOTION) {
      map.once('moveend', () => {
        // Deferred out of the render task queue — see maplibre-gl#6093
        window.setTimeout(() => {
          if (driftGuardRef.current !== guard || !map.getStyle()) return;
          map.easeTo({
            bearing: stop.camera.bearing + 16,
            duration: 20000,
            easing: (t) => t,
            essential: false,
          });
        }, 0);
      });
    }

    const src = map.getSource('tour-stops') as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData({
        type: 'FeatureCollection',
        features: activeTour.stops.map((st, idx) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: st.camera.center },
          properties: { current: idx === tourStep, visited: idx < tourStep, index: idx + 1 },
        })),
      });
    }
  }, [activeTour, tourStep]);

  const handleStepChange = useCallback((newStep: number) => {
    tourStepRef.current = newStep;
    tourProgressRef.current = 0;
    absoluteCurrentRef.current = newStep;
    absoluteTargetRef.current = newStep;
    cancelAnimationFrame(animFrameRef.current);
    if (mapRef.current && activeTour) {
      updateTourLine(mapRef.current, activeTour, newStep, 0);
    }
    setTourStep(newStep);
  }, [activeTour, updateTourLine]);

  // Wheel / Touch scrolling to advance tour
  useEffect(() => {
    const map = mapRef.current;
    if (!activeTour || !map) return;

    map.scrollZoom.disable();

    let touchLastY = 0;
    const MAX_ABS = activeTour.stops.length - 1;

    const animate = () => {
      const diff = absoluteTargetRef.current - absoluteCurrentRef.current;
      
      if (Math.abs(diff) < 0.001) {
        absoluteCurrentRef.current = absoluteTargetRef.current;
      } else {
        absoluteCurrentRef.current += diff * 0.15; // smooth ease-out
      }

      let currentAbs = absoluteCurrentRef.current;
      let newStep = Math.floor(currentAbs);
      let newProgress = currentAbs - newStep;

      if (newStep >= MAX_ABS) {
        newStep = MAX_ABS;
        newProgress = 0;
      }

      updateTourLine(map, activeTour, newStep, newProgress);

      if (newStep !== tourStepRef.current) {
         tourStepRef.current = newStep;
         setTourStep(newStep);
      }

      if (Math.abs(diff) >= 0.001) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    const processScroll = (deltaY: number) => {
      const SCROLL_SPEED = 0.0015; 
      let newTarget = absoluteTargetRef.current + deltaY * SCROLL_SPEED;
      absoluteTargetRef.current = Math.max(0, Math.min(MAX_ABS, newTarget));

      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    const handleWheel = (e: WheelEvent) => {
      processScroll(e.deltaY);
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchLastY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      // Inverted vs. wheel: dragging the finger down advances to the next stop
      const deltaY = touchY - touchLastY;
      touchLastY = touchY;
      processScroll(deltaY * 2);
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      if (map) {
        map.scrollZoom.enable();
      }
    };
  }, [activeTour, updateTourLine]);

  // Deep link: /map?tour=<id> starts a tour once the map is ready
  useEffect(() => {
    if (!mapLoaded || !pendingTourRef.current) return;
    const tour = pendingTourRef.current;
    pendingTourRef.current = null;
    handleStartTour(tour);
  }, [mapLoaded, handleStartTour]);

  const handleLandmarkFlyTo = useCallback((lm: Landmark) => {
    mapRef.current?.flyTo({
      center: lm.lngLat,
      zoom: 16.4,
      pitch: 62,
      bearing: 40,
      duration: PREFERS_REDUCED_MOTION ? 0 : 2200,
      essential: true,
    });
  }, []);

  const handleOpenTapDetails = useCallback(() => {
    if (!tapPreview) return;
    const map = mapRef.current;
    if (map && tapPreviewIdRef.current !== null) {
      map.setFeatureState(
        { source: 'all-buildings', sourceLayer: 'buildings', id: tapPreviewIdRef.current },
        { hover: false },
      );
      // Promote the preview highlight to the selected outline
      map.setFeatureState(
        { source: 'all-buildings', sourceLayer: 'buildings', id: tapPreviewIdRef.current },
        { selected: true },
      );
      selectedBuildingIdRef.current = tapPreviewIdRef.current;
      tapPreviewIdRef.current = null;
    }
    setSelectedBuilding(tapPreview);
    setTapPreview(null);
    setSidebarOpen(false);
    setLegendOpen(false);
    setTimelineCollapsed(true);
  }, [tapPreview]);

  const handleDismissTapPreview = useCallback(() => {
    const map = mapRef.current;
    if (map && tapPreviewIdRef.current !== null) {
      map.setFeatureState(
        { source: 'all-buildings', sourceLayer: 'buildings', id: tapPreviewIdRef.current },
        { hover: false },
      );
      tapPreviewIdRef.current = null;
    }
    setTapPreview(null);
  }, []);

  const uiHidden = introActive;

  const cinemaEra = cinemaActive
    ? ERA_CONFIG.find(
        (e) => e.label !== 'Unknown' && cinemaYear >= e.bounds[0] && cinemaYear <= e.bounds[1],
      )
    : null;

  return (
    <div className={s.mapPage}>
      <div ref={containerRef} className={s.mapContainer} />

      {/* ── Cinematic intro overlay ──────────────────────────────────── */}
      {introActive && (
        <div className={s.introOverlay}>
          <div className={s.introTitleBlock}>
            <span className={s.introKicker}>Architectural Atlas</span>
            <h1 className={s.introTitle}>Astana</h1>
            <span className={s.introSub}>125 years of building history</span>
          </div>
          <button className={s.introSkipBtn} onClick={finishIntro}>
            Skip intro
          </button>
        </div>
      )}

      {/* First-load indicator — until tiles finish their first render */}
      {!mapSettled && !introActive && (
        <div className={s.mapLoadingChip} role="status" aria-live="polite">
          <span className={s.mapLoadingDot} />
          Loading buildings…
        </div>
      )}

      {/* Mobile backdrop — shown behind open sidebar for tap-to-close */}
      {isMobile && sidebarOpen && (
        <div
          className={s.sidebarBackdrop}
          onClick={handleSidebarClose}
          aria-hidden="true"
        />
      )}

      {!uiHidden && (
        <>
          {/* Back button */}
          <Link to="/" className={s.backBtn} aria-label="Back to Home">
            <ArrowLeft size={20} />
            <span>Back</span>
          </Link>

          {/* Viz mode toggle */}
          {!activeTour && !cinemaActive && (
            <HexControls
              vizMode={vizMode}
              onVizModeChange={setVizMode}
              hexMetric={hexMetric}
              onHexMetricChange={setHexMetric}
              hexLoading={false}
            />
          )}

          {/* Tours + Cinema launchers — standalone, below back button */}
          {!activeTour && !cinemaActive && (
            <div className={`${s.tourLauncher} ${vizMode === 'hexagons' ? s.tourLauncherLow : ''}`}>
              <TourPanel
                activeTour={activeTour}
                tourStep={tourStep}
                onStartTour={handleStartTour}
                onStepChange={handleStepChange}
                onExitTour={handleExitTour}
              />
              <button
                className={s.tourLauncherBtn}
                onClick={handleStartCinema}
                title="Cinematic time-lapse — watch the city grow from 1900"
                aria-label="Play cinematic time-lapse"
              >
                <Film size={13} />
                <span>Cinema</span>
              </button>
            </div>
          )}

          {/* Page title chip */}
          {!cinemaActive && (
            <div className={s.titleChip}>
              <Layers size={16} />
              <span>Astana</span>
            </div>
          )}

          {/* Filter toggle (top-right, hidden when sidebar is open) */}
          {!sidebarOpen && !activeTour && !cinemaActive && (
            <button
              className={s.filterToggle}
              onClick={handleSidebarToggle}
              aria-label="Open filters"
            >
              <SlidersHorizontal size={18} />
              {activeCount > 0 && <span className={s.filterToggleBadge}>{activeCount}</span>}
            </button>
          )}

          {/* Filter sidebar */}
          <FilterSidebar
            open={sidebarOpen}
            onClose={handleSidebarClose}
            onToggle={handleSidebarToggle}
            selectedTypes={selectedTypes}
            onTypeToggle={handleTypeToggle}
            onClearTypes={handleClearTypes}
            selectedDistricts={selectedDistricts}
            onDistrictToggle={handleDistrictToggle}
            onClearDistricts={handleClearDistricts}
            selectedArchStyle={selectedArchStyle}
            onArchStyleChange={setSelectedArchStyle}
            selectedCompany={selectedCompany}
            onCompanyChange={setSelectedCompany}
            archStyleOptions={archStyleOptions}
            companyOptions={companyOptions}
            onReset={handleReset}
            activeCount={activeCount}
            yearCounts={yearCounts}
            typeCounts={typeCounts}
            decadeLstData={decadeLstData}
            mapTheme={mapTheme}
            onThemeToggle={handleThemeToggle}
            colorMode={colorMode}
            onColorModeChange={handleColorModeChange}
            extrudeMode={extrudeMode}
            onExtrudeModeChange={handleExtrudeModeChange}
            graffitiVisible={graffitiVisible}
            onGraffitiToggle={handleGraffitiToggle}
            crimeVisible={crimeVisible}
            onCrimeToggle={handleCrimeToggle}
            greenVisible={greenVisible}
            onGreenToggle={handleGreenToggle}
            districtsVisible={districtsVisible}
            onDistrictsToggle={handleDistrictsToggle}
          />

          {/* Legend panel */}
          {!activeTour && !cinemaActive && (
            <LegendPanel
              colorMode={colorMode}
              legendOpen={legendOpen}
              onLegendOpenChange={setLegendOpen}
              hoveredEra={hoveredEra}
              onHoveredEraChange={setHoveredEra}
              onYearRangeChange={setYearRange}
              sliderMax={sliderMax}
              selectedTypes={selectedTypes}
              onSelectedTypesChange={setSelectedTypes}
              selectedUhiCells={selectedUhiCells}
              onSelectedUhiCellsChange={setSelectedUhiCells}
            />
          )}

          {/* Hover tooltip */}
          <HoverTooltip
            hoverInfo={hoverInfo}
            selectedBuilding={selectedBuilding}
            colorMode={colorMode}
          />

          {/* Touch tap-to-preview card */}
          {IS_TOUCH_DEVICE && !selectedBuilding && (
            <TapPreviewCard
              properties={tapPreview}
              onOpenDetails={handleOpenTapDetails}
              onDismiss={handleDismissTapPreview}
            />
          )}

          {/* Building detail panel */}
          <BuildingPanel
            properties={selectedBuilding}
            onClose={closeBuildingPanel}
          />

          {/* Graffiti detail panel */}
          <GraffitiPanel
            properties={selectedGraffiti}
            onClose={() => setSelectedGraffiti(null)}
          />

          {/* 3D landmark popup */}
          <LandmarkPanel
            landmark={selectedLandmark}
            onClose={() => setSelectedLandmark(null)}
            onFlyTo={handleLandmarkFlyTo}
          />

          {/* Tour narrative card (rendered when a tour is active) */}
          {activeTour && (
            <TourPanel
              activeTour={activeTour}
              tourStep={tourStep}
              onStartTour={handleStartTour}
              onStepChange={handleStepChange}
              onExitTour={handleExitTour}
            />
          )}

          {/* Cinema mode overlay — big year counter + era + progress */}
          {cinemaActive && (
            <div className={s.cinemaOverlay} role="region" aria-label="City growth time-lapse">
              <span className={s.cinemaYear}>{cinemaYear}</span>
              {cinemaEra && (
                <span className={s.cinemaEra} style={{ color: cinemaEra.color }}>
                  {cinemaEra.label}
                </span>
              )}
              <div className={s.cinemaProgress} aria-hidden="true">
                <span
                  style={{
                    width: `${((cinemaYear - 1900) / Math.max(1, sliderMax - 1900)) * 100}%`,
                  }}
                />
              </div>
              <div className={s.cinemaControls}>
                <div className={s.cinemaChipRow} role="group" aria-label="Time-lapse layer">
                  <button
                    className={`${s.cinemaChip} ${vizMode === 'buildings' ? s.cinemaChipActive : ''}`}
                    onClick={() => setVizMode('buildings')}
                  >
                    <Building2 size={12} />
                    <span>Buildings</span>
                  </button>
                  <button
                    className={`${s.cinemaChip} ${vizMode === 'hexagons' ? s.cinemaChipActive : ''}`}
                    onClick={() => setVizMode('hexagons')}
                  >
                    <Grid2x2 size={12} />
                    <span>Hexagons</span>
                  </button>
                </div>
                {vizMode === 'hexagons' && (
                  <div className={s.cinemaChipRow} role="group" aria-label="Hexagon metric">
                    <button
                      className={`${s.cinemaChip} ${hexMetric === 'count' ? s.cinemaChipActive : ''}`}
                      onClick={() => setHexMetric('count')}
                    >
                      Density
                    </button>
                    <button
                      className={`${s.cinemaChip} ${hexMetric === 'year' ? s.cinemaChipActive : ''}`}
                      onClick={() => setHexMetric('year')}
                    >
                      Avg Era
                    </button>
                  </div>
                )}
                <button className={s.cinemaExitBtn} onClick={handleExitCinema}>
                  Exit cinema
                </button>
              </div>
            </div>
          )}

          {/* Timeline Slider with play controls */}
          {!activeTour && !cinemaActive && (
            <TimelineSlider
              min={1900}
              max={sliderMax}
              value={yearRange}
              onChange={setYearRange}
              data={yearCounts}
              sidebarOpen={sidebarOpen}
              buildingOpen={!!selectedBuilding}
              legendOpen={legendOpen}
              collapsed={timelineCollapsed}
              onCollapsedChange={setTimelineCollapsed}
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
              onPlayReset={handlePlayReset}
            />
          )}

          {/* Map guide — one compact card, the map stays fully interactive */}
          {showHelpers && !activeTour && !cinemaActive && (
            <div className={s.guideCard} role="dialog" aria-label="Astana map guide">
              <div className={s.guideHeader}>
                <h4 className={s.guideTitle}>
                  <MapIcon size={14} />
                  Astana Map Guide
                </h4>
                <button className={s.guideClose} onClick={handleDismissHelpers} aria-label="Close guide">
                  <X size={14} />
                </button>
              </div>
              <ul className={s.guideList}>
                <li>
                  <span className={s.guideIco}><Compass size={13} /></span>
                  <span>
                    <b>Tours & Cinema</b> — guided fly-throughs and a city time-lapse
                    <i>top left</i>
                  </span>
                </li>
                <li>
                  <span className={s.guideIco}><Grid2x2 size={13} /></span>
                  <span>
                    <b>Hexagons</b> — building density & age heatmaps
                    <i>top center</i>
                  </span>
                </li>
                <li>
                  <span className={s.guideIco}><SlidersHorizontal size={13} /></span>
                  <span>
                    <b>Filters</b> — era, style, type & thematic overlays
                    <i>top right</i>
                  </span>
                </li>
                <li>
                  <span className={s.guideIco}><Layers size={13} /></span>
                  <span>
                    <b>Legend</b> — tap an era to highlight its buildings
                    <i>bottom left</i>
                  </span>
                </li>
              </ul>
              <button className={s.onboardingBtn} onClick={handleDismissHelpers}>
                Explore the map
              </button>
            </div>
          )}

          {/* Floating Help Trigger button to re-trigger onboarding */}
          {!showHelpers && !activeTour && !cinemaActive && (
            <button
              className={s.helpGuideBtn}
              onClick={handleOpenHelpers}
              title="Show map controls guide"
              aria-label="Show guide"
            >
              <HelpCircle size={15} />
            </button>
          )}
        </>
      )}
    </div>
  );
}
