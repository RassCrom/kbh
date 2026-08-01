import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ArrowLeft, Columns2, Film, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import s from './MapPage.module.scss';
import { useIsMobile, IS_TOUCH_DEVICE } from './useIsMobile';

import { ERA_CONFIG, DISTRICT_BOUNDS } from './constants';
import {
  buildYearColorExpr, buildElevationColorExpr, buildLstColorExpr, buildTypeColorExpr,
  buildUhiColorExpr, buildCombinedFilter, buildHeightExtrusionExpr, buildAgeExtrusionExpr,
  type ColorMode, type ExtrudeMode,
} from './mapHelpers';
import { TimelineSlider } from './components/TimelineSlider';
import { FilterSidebar } from './components/FilterSidebar';
import { BuildingPanel } from './components/BuildingPanel';
import { GraffitiPanel } from './components/GraffitiPanel';
import { CrimePanel } from './components/CrimePanel';
import { HexControls } from './components/HexControls';
import { buildCountColorExpr, buildYearAvgColorExpr, buildHexHeightExpr, buildHexCinemaHeightExpr, type HexMetric } from './hexUtils';
import { applyMapTheme, type MapTheme } from './mapTheme';
import { LegendPanel } from './components/LegendPanel';
import { HoverTooltip } from './components/HoverTooltip';
import { TapPreviewCard } from './components/TapPreviewCard';
import { TourPanel } from './components/TourPanel';
import { LandmarkPanel } from './components/LandmarkPanel';
import { IntroOverlay } from './components/IntroOverlay';
import { CinemaOverlay } from './components/CinemaOverlay';
import { HistoricalCompare } from './components/HistoricalCompare';
import { MapGuideCard, HelpTrigger } from './components/MapGuideCard';
import { MapNavigationControls } from './components/MapNavigationControls';
import type { Landmark } from './overlays/landmarksData';

// Custom hooks
import { useTimeLapse } from './hooks/useTimeLapse';
import { useMapFilters } from './hooks/useMapFilters';
import { useMapInit, parseCameraHash, PREFERS_REDUCED_MOTION, addLandmarks3D } from './hooks/useMapInit';
import { useMapTours } from './hooks/useMapTours';
import { useCinemaMode } from './hooks/useCinemaMode';
import { useMapOverlays } from './hooks/useMapOverlays';

const COLOR_MODES: ColorMode[] = ['year', 'elevation', 'lst', 'type', 'uhi'];
const INTRO_SESSION_KEY = 'kbh-map-intro-seen';

export default function MapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const playbackMapRef = useRef<maplibregl.Map | null>(null);
  const isMobile = useIsMobile();

  // ── Ref that always holds the latest filter state for the play tick ──────
  // Allows onPlayTick to read current values without stale closures
  const filterStateRef = useRef({
    yearRangeMin: 1900,
    selectedTypes: [] as string[],
    selectedDistricts: [] as string[],
    selectedArchStyle: '',
    selectedCompany: '',
    selectedUhiCells: [] as string[],
    colorMode: 'year' as ColorMode,
  });

  // ── Timeline / play state ─────────────────────────────────────────────────
  const onPlayTick = useCallback((year: number) => {
    const map = playbackMapRef.current;
    if (!map || !map.getStyle()) return;
    const f = filterStateRef.current;
    const filterExpr = buildCombinedFilter(
      [f.yearRangeMin, year],
      f.selectedTypes,
      f.selectedDistricts,
      f.selectedArchStyle,
      f.selectedCompany,
      f.colorMode === 'uhi' ? f.selectedUhiCells : [],
    ) as maplibregl.FilterSpecification;
    if (map.getLayer('buildings-fill')) map.setFilter('buildings-fill', filterExpr);
    if (map.getLayer('buildings-outline')) map.setFilter('buildings-outline', filterExpr);
    if (map.getLayer('buildings-3d')) map.setFilter('buildings-3d', filterExpr);
  }, []);

  const {
    sliderMax,
    setSliderMax,
    yearRange,
    setYearRange,
    isPlaying,
    handleTogglePlay,
    handlePlayReset,
  } = useTimeLapse(1900, 2029, { onTick: onPlayTick });

  // ── Sidebar filter state ──────────────────────────────────────────────────
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

  // ── UI panel states ───────────────────────────────────────────────────────
  const [legendOpen, setLegendOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [compareActive, setCompareActive] = useState(false);
  const [timelineCollapsed, setTimelineCollapsed] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768,
  );
  const [hoveredEra, setHoveredEra] = useState<string | null>(null);

  // ── Selection states ──────────────────────────────────────────────────────
  const [selectedBuilding, setSelectedBuilding] = useState<Record<string, unknown> | null>(null);
  const [tapPreview, setTapPreview] = useState<Record<string, unknown> | null>(null);
  const tapPreviewIdRef = useRef<string | number | null>(null);
  const selectedBuildingIdRef = useRef<string | number | null>(null);
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);

  // ── Onboarding ────────────────────────────────────────────────────────────
  const [showHelpers, setShowHelpers] = useState(() =>
    localStorage.getItem('kbh-map-onboarding-dismissed') !== 'true',
  );
  const handleDismissHelpers = useCallback(() => {
    setShowHelpers(false);
    localStorage.setItem('kbh-map-onboarding-dismissed', 'true');
  }, []);
  const handleOpenHelpers = useCallback(() => {
    setShowHelpers(true);
    localStorage.removeItem('kbh-map-onboarding-dismissed');
  }, []);

  // ── Map color / viz mode ──────────────────────────────────────────────────
  const [mapTheme, setMapTheme] = useState<MapTheme>('dark');
  const [colorMode, setColorMode] = useState<ColorMode>(() => {
    if (typeof window === 'undefined') return 'year';
    const m = new URLSearchParams(window.location.search).get('mode');
    return COLOR_MODES.includes(m as ColorMode) ? (m as ColorMode) : 'year';
  });
  const [extrudeMode, setExtrudeMode] = useState<ExtrudeMode>('height');
  const [vizMode, setVizMode] = useState<'buildings' | 'hexagons'>('buildings');
  const [hexMetric, setHexMetric] = useState<HexMetric>('count');

  const vizModeRef = useRef(vizMode);
  useEffect(() => { vizModeRef.current = vizMode; }, [vizMode]);

  // ── Intro state ───────────────────────────────────────────────────────────
  const [pendingHashCamera] = useState(parseCameraHash);
  const pendingTourDeepLinkId = new URLSearchParams(
    typeof window !== 'undefined' ? window.location.search : '',
  ).get('tour');

  const [introActive, setIntroActive] = useState(() =>
    !PREFERS_REDUCED_MOTION &&
    !pendingTourDeepLinkId &&
    parseCameraHash() === null &&
    sessionStorage.getItem(INTRO_SESSION_KEY) !== 'true',
  );
  const introActiveRef = useRef(introActive);

  useEffect(() => {
    if (introActive) sessionStorage.setItem(INTRO_SESSION_KEY, 'true');
  }, [introActive]);

  // ── Shared UI snapshot for hexagon mode ──────────────────────────────────
  const preHexStateRef = useRef<{ legend: boolean; sidebar: boolean; timeline: boolean } | null>(null);

  const collapseForTourOrCinema = useCallback(() => {
    setSidebarOpen(false);
    setLegendOpen(false);
    setTimelineCollapsed(true);
    setSelectedBuilding(null);
    setSelectedLandmark(null);
    setTapPreview(null);
  }, []);

  // ── Map init hook ─────────────────────────────────────────────────────────
  const {
    mapRef,
    mapLoaded,
    mapSettled,
    hoverInfo,
    yearCounts,
    typeCounts,
    decadeLstData,
    archStyleOptions,
    companyOptions,
    finishIntro,
    activeTourRef: mapActiveTourRef,
    cinemaActiveRef: mapCinemaActiveRef,
  } = useMapInit(containerRef, {
    introActiveRef,
    setIntroActive,
    setSliderMax,
    setYearRange: (fn: (prev: [number, number]) => [number, number]) => setYearRange(fn),
    vizModeRef,
    tapPreviewIdRef,
    selectedBuildingIdRef,
    onSelectBuilding: (props) => {
      setSelectedBuilding(props);
      setSelectedLandmark(null);
      setSidebarOpen(false);
      if (window.innerWidth < 768) {
        setLegendOpen(false);
        setTimelineCollapsed(true);
      }
    },
    onTapPreview: (props) => setTapPreview(props),
    onSelectGraffiti: (props) => {
      overlays.setSelectedGraffiti(props);
      setSelectedBuilding(null);
      setSelectedLandmark(null);
      setSidebarOpen(false);
    },
    onSelectLandmark: (lm) => {
      setSelectedLandmark(lm);
      setSelectedBuilding(null);
      overlays.setSelectedGraffiti(null);
      setSidebarOpen(false);
    },
    onClearSelections: () => {
      setSelectedBuilding(null);
      setSelectedLandmark(null);
    },
    pendingHashCamera,
  });

  useEffect(() => {
    playbackMapRef.current = mapRef.current;
  }, [mapLoaded, mapRef]);

  // ── Tour hook ─────────────────────────────────────────────────────────────
  const tours = useMapTours({
    mapRef,
    mapLoaded,
    introActiveRef,
    finishIntro,
    handleDismissHelpers,
    onEnterTour: () => {
      collapseForTourOrCinema();
      overlays.setSelectedGraffiti(null);
    },
  });

  // ── Cinema hook ───────────────────────────────────────────────────────────
  const cinema = useCinemaMode({
    mapRef,
    introActiveRef,
    finishIntro,
    sliderMax,
    handlePlayReset,
    setYearRange,
    onEnterCinema: () => {
      collapseForTourOrCinema();
      overlays.setSelectedGraffiti(null);
    },
  });

  // ── Overlay hook ──────────────────────────────────────────────────────────
  const overlays = useMapOverlays({ mapRef, mapLoaded });

  // ── Sync real tour/cinema refs into the histogram gate inside useMapInit ─
  useEffect(() => {
    mapActiveTourRef.current = tours.activeTour;
  }, [tours.activeTour]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mapCinemaActiveRef.current = cinema.cinemaActive;
  }, [cinema.cinemaActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Deferred: attach 3D landmarks after intro skipped ────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || introActive || !mapLoaded) return;
    if (!map.getLayer('landmarks-3d') && map.isStyleLoaded()) {
      addLandmarks3D(map);
    }
  }, [introActive, mapLoaded, mapRef]);

  // ── Keep ?mode= in URL ────────────────────────────────────────────────────
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


  // ── Deep link: ?years=1955-1980 ──────────────────────────────────────────
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('years');
    const m = param?.match(/^(\d{4})-(\d{4})$/);
    if (m) {
      const from = Math.max(1900, Number(m[1]));
      const to = Math.min(2100, Number(m[2]));
      if (from <= to) setYearRange([from, to]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Dark/light theme ─────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.dataset.theme = mapTheme;
    const map = mapRef.current;
    if (!map) return;
    const apply = () => applyMapTheme(map, mapTheme);
    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [mapTheme, mapRef]);

  // ── Building color expression ─────────────────────────────────────────────
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
      if (map.getLayer('buildings-fill')) map.setPaintProperty('buildings-fill', 'fill-color', colorExpr);
      if (map.getLayer('buildings-3d')) map.setPaintProperty('buildings-3d', 'fill-extrusion-color', colorExpr);
    };
    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [colorMode, mapTheme, mapRef]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keep filterStateRef current so onPlayTick reads fresh values ─────────
  useEffect(() => {
    filterStateRef.current = {
      yearRangeMin: yearRange[0],
      selectedTypes,
      selectedDistricts,
      selectedArchStyle,
      selectedCompany,
      selectedUhiCells,
      colorMode,
    };
  }, [yearRange, selectedTypes, selectedDistricts, selectedArchStyle, selectedCompany, selectedUhiCells, colorMode]);

  // ── Combined filter ───────────────────────────────────────────────────────
  // During play, onPlayTick drives the map filter directly (same rAF frame).
  // Skipping here prevents the async useEffect from overwriting it with a
  // stale yearRange value from the React batch.
  useEffect(() => {
    if (isPlaying) return;
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (!map.getStyle()) return;
    const filterExpr = buildCombinedFilter(
      yearRange,
      selectedTypes,
      selectedDistricts,
      selectedArchStyle,
      selectedCompany,
      colorMode === 'uhi' ? selectedUhiCells : [],
    ) as maplibregl.FilterSpecification;
    if (map.getLayer('buildings-fill')) map.setFilter('buildings-fill', filterExpr);
    if (map.getLayer('buildings-outline')) map.setFilter('buildings-outline', filterExpr);
    if (map.getLayer('buildings-3d')) map.setFilter('buildings-3d', filterExpr);
  }, [isPlaying, yearRange, selectedTypes, selectedDistricts, selectedArchStyle, selectedCompany, selectedUhiCells, colorMode, mapRef]);

  // ── Fly to selected districts ─────────────────────────────────────────────
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
  }, [selectedDistricts, mapRef]);

  // ── Era hover highlight ───────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (!map.getStyle() || !map.getLayer('buildings-fill')) return;
    let opacityExpr: any = ['interpolate', ['linear'], ['zoom'], 12, 0.7, 14, 0.85, 14.5, 0];
    let opacity3dExpr: any = 0.85;
    if (colorMode === 'year' && hoveredEra) {
      const era = ERA_CONFIG.find(e => e.label === hoveredEra);
      if (era) {
        const parsedYear = ['coalesce', ['get', 'year_int'], 0];
        let inEraExpr: any;
        if (era.label === 'Unknown') {
          inEraExpr = ['==', parsedYear, 0];
        } else {
          inEraExpr = ['all', ['>=', parsedYear, era.bounds[0]], ['<=', parsedYear, era.bounds[1]], ['!=', parsedYear, 0]];
        }
        opacityExpr = ['case', inEraExpr, opacityExpr, 0.1];
        opacity3dExpr = ['case', inEraExpr, opacity3dExpr, 0.1];
      }
    }
    map.setPaintProperty('buildings-fill', 'fill-opacity', opacityExpr);
    if (map.getLayer('buildings-3d')) map.setPaintProperty('buildings-3d', 'fill-extrusion-opacity', opacity3dExpr);
  }, [hoveredEra, colorMode, mapRef]);

  // ── Extrusion mode ────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getStyle()) return;
    const apply = () => {
      const expr = extrudeMode === 'age' ? buildAgeExtrusionExpr() : buildHeightExtrusionExpr();
      if (map.getLayer('buildings-3d')) map.setPaintProperty('buildings-3d', 'fill-extrusion-height', expr);
      if (map.getLayer('buildings-3d-hover')) map.setPaintProperty('buildings-3d-hover', 'fill-extrusion-height', expr);
    };
    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [extrudeMode, mapRef]);

  // ── Viz mode toggle ───────────────────────────────────────────────────────
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

    if (vizMode === 'hexagons') {
      preHexStateRef.current = { legend: legendOpen, sidebar: sidebarOpen, timeline: timelineCollapsed };
      setLegendOpen(false);
      setSidebarOpen(false);
      setTimelineCollapsed(true);
    } else if (preHexStateRef.current !== null) {
      const prev = preHexStateRef.current;
      preHexStateRef.current = null;
      setLegendOpen(prev.legend);
      setSidebarOpen(prev.sidebar);
      setTimelineCollapsed(prev.timeline);
    }
  }, [vizMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Hex metric ────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getStyle() || !map.getLayer('hex-layer')) return;
    const colorExpr = hexMetric === 'count' ? buildCountColorExpr() : buildYearAvgColorExpr();
    map.setPaintProperty('hex-layer', 'fill-extrusion-color', colorExpr);
  }, [hexMetric, mapRef]);

  // ── Cinema × hexagons ─────────────────────────────────────────────────────
  const hexCinemaActiveRef = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getStyle() || !map.getLayer('hex-layer')) return;
    if (cinema.cinemaActive && vizMode === 'hexagons') {
      hexCinemaActiveRef.current = true;
      map.setPaintProperty('hex-layer', 'fill-extrusion-height', buildHexCinemaHeightExpr(cinema.cinemaYear));
    } else if (hexCinemaActiveRef.current) {
      hexCinemaActiveRef.current = false;
      map.setPaintProperty('hex-layer', 'fill-extrusion-height', buildHexHeightExpr());
    }
  }, [cinema.cinemaActive, vizMode, cinema.cinemaYear, mapRef]);

  // ── Callbacks ─────────────────────────────────────────────────────────────
  const handleSidebarClose = useCallback(() => setSidebarOpen(false), []);
  const handleSidebarToggle = useCallback(() => setSidebarOpen((v) => !v), []);
  const handleClearTypes = useCallback(() => setSelectedTypes([]), [setSelectedTypes]);
  const handleClearDistricts = useCallback(() => setSelectedDistricts([]), [setSelectedDistricts]);
  const handleThemeToggle = useCallback(() => setMapTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  const handleExtrudeModeChange = useCallback((m: ExtrudeMode) => setExtrudeMode(m), []);
  const handleCompareToggle = useCallback(() => {
    if (!compareActive) {
      setVizMode('buildings');
      setColorMode('year');
      setYearRange([1900, sliderMax]);
      setSidebarOpen(false);
      setLegendOpen(false);
      setTimelineCollapsed(true);
      setSelectedBuilding(null);
      setSelectedLandmark(null);
      setTapPreview(null);
      overlays.setSelectedGraffiti(null);
      handleDismissHelpers();
    }
    setCompareActive((active) => !active);
  }, [compareActive, handleDismissHelpers, overlays, setYearRange, sliderMax]);

  const handleColorModeChange = useCallback((mode: ColorMode) => {
    setColorMode(mode);
    if (vizMode === 'hexagons') setVizMode('buildings');
  }, [vizMode]);

  const clearSelectedBuildingState = useCallback(() => {
    const map = mapRef.current;
    if (map && selectedBuildingIdRef.current !== null) {
      map.setFeatureState(
        { source: 'all-buildings', sourceLayer: 'buildings', id: selectedBuildingIdRef.current },
        { selected: false },
      );
      selectedBuildingIdRef.current = null;
    }
  }, [mapRef]);

  const closeBuildingPanel = useCallback(() => {
    setSelectedBuilding(null);
    clearSelectedBuildingState();
  }, [clearSelectedBuildingState]);

  const handleLandmarkFlyTo = useCallback((lm: Landmark) => {
    mapRef.current?.flyTo({
      center: lm.lngLat,
      zoom: 16.4,
      pitch: 62,
      bearing: 40,
      duration: PREFERS_REDUCED_MOTION ? 0 : 2200,
      essential: true,
    });
  }, [mapRef]);

  const handleOpenTapDetails = useCallback(() => {
    if (!tapPreview) return;
    const map = mapRef.current;
    if (map && tapPreviewIdRef.current !== null) {
      map.setFeatureState(
        { source: 'all-buildings', sourceLayer: 'buildings', id: tapPreviewIdRef.current },
        { hover: false },
      );
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
  }, [tapPreview, mapRef]);

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
  }, [mapRef]);

  useEffect(() => {
    if (!overlays.selectedCrime) return;
    setSelectedBuilding(null);
    setSelectedLandmark(null);
    setTapPreview(null);
    overlays.setSelectedGraffiti(null);
    clearSelectedBuildingState();
  }, [overlays.selectedCrime, clearSelectedBuildingState]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedBuilding || overlays.selectedGraffiti || selectedLandmark) {
      overlays.setSelectedCrime(null);
    }
  }, [selectedBuilding, overlays.selectedGraffiti, selectedLandmark]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tours.activeTour || cinema.cinemaActive || compareActive) {
      overlays.setSelectedCrime(null);
    }
  }, [tours.activeTour, cinema.cinemaActive, compareActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ────────────────────────────────────────────────────────────────
  const uiHidden = introActive;

  return (
    <div className={s.mapPage}>
      <div ref={containerRef} className={s.mapContainer} />
      {compareActive && mapLoaded && (
        <HistoricalCompare mainMapRef={mapRef} mapTheme={mapTheme} />
      )}

      {/* Cinematic intro overlay */}
      {introActive && <IntroOverlay onSkip={finishIntro} />}

      {/* First-load indicator */}
      {!mapSettled && !introActive && (
        <div className={s.mapLoadingChip} role="status" aria-live="polite">
          <span className={s.mapLoadingDot} />
          Loading buildings…
        </div>
      )}

      {/* Mobile backdrop for sidebar */}
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
          {!tours.activeTour && !cinema.cinemaActive && !compareActive && (
            <HexControls
              vizMode={vizMode}
              onVizModeChange={setVizMode}
              hexMetric={hexMetric}
              onHexMetricChange={setHexMetric}
              hexLoading={false}
            />
          )}

          {/* Tours + Cinema launchers */}
          {!tours.activeTour && !cinema.cinemaActive && (
            <div className={s.tourLauncher}>
              {!compareActive && (
                <>
                  <TourPanel
                    activeTour={tours.activeTour}
                    tourStep={tours.tourStep}
                    tourPaused={tours.tourPaused}
                    onStartTour={tours.handleStartTour}
                    onStepChange={tours.handleStepChange}
                    onPauseChange={tours.handleTourPauseChange}
                    onExitTour={tours.handleExitTour}
                  />
                  <button
                    className={s.tourLauncherBtn}
                    onClick={cinema.handleStartCinema}
                    title="Cinematic time-lapse — watch the city grow from 1900"
                    aria-label="Play cinematic time-lapse"
                  >
                    <Film size={13} />
                    <span>Cinema</span>
                  </button>
                </>
              )}
              <button
                className={`${s.tourLauncherBtn} ${compareActive ? s.tourLauncherBtnActive : ''}`}
                onClick={handleCompareToggle}
                title="Compare reconstructed 1990 map with the modern city"
                aria-label={compareActive ? 'Exit map comparison' : 'Compare historical and modern maps'}
                aria-pressed={compareActive}
              >
                <Columns2 size={13} />
                <span>{compareActive ? 'Exit compare' : 'Compare'}</span>
              </button>
            </div>
          )}

          {/* Filter toggle */}
          {!sidebarOpen && !tours.activeTour && !cinema.cinemaActive && !compareActive && (
            <button
              className={s.filterToggle}
              onClick={handleSidebarToggle}
              aria-label="Open filters"
            >
              <SlidersHorizontal size={18} />
              {activeCount > 0 && <span className={s.filterToggleBadge}>{activeCount}</span>}
            </button>
          )}

          {/* Progressive camera controls stay tucked behind one labelled trigger. */}
          {!tours.activeTour && !cinema.cinemaActive && !compareActive && mapLoaded && (
            <MapNavigationControls mapRef={mapRef} />
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
            districtsVisible={overlays.districtsVisible}
            onDistrictsToggle={overlays.handleDistrictsToggle}
          />

          {/* Legend panel */}
          {!tours.activeTour && !cinema.cinemaActive && !compareActive && (
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

          {/* Touch tap-to-preview */}
          {IS_TOUCH_DEVICE && !selectedBuilding && (
            <TapPreviewCard
              properties={tapPreview}
              colorMode={colorMode}
              onOpenDetails={handleOpenTapDetails}
              onDismiss={handleDismissTapPreview}
            />
          )}

          {/* Building detail panel */}
          <BuildingPanel
            properties={selectedBuilding}
            colorMode={colorMode}
            onClose={closeBuildingPanel}
          />

          {/* Graffiti detail panel */}
          <GraffitiPanel
            properties={overlays.selectedGraffiti}
            onClose={() => overlays.setSelectedGraffiti(null)}
          />

          {/* Historical crime record detail panel */}
          <CrimePanel
            properties={overlays.selectedCrime}
            onClose={() => overlays.setSelectedCrime(null)}
          />

          {/* 3D landmark popup */}
          <LandmarkPanel
            landmark={selectedLandmark}
            onClose={() => setSelectedLandmark(null)}
            onFlyTo={handleLandmarkFlyTo}
          />

          {/* Tour narrative card */}
          {tours.activeTour && (
            <TourPanel
              activeTour={tours.activeTour}
              tourStep={tours.tourStep}
              tourPaused={tours.tourPaused}
              onStartTour={tours.handleStartTour}
              onStepChange={tours.handleStepChange}
              onPauseChange={tours.handleTourPauseChange}
              onExitTour={tours.handleExitTour}
            />
          )}

          {/* Cinema mode overlay */}
          {cinema.cinemaActive && (
            <CinemaOverlay
              cinemaYear={cinema.cinemaYear}
              sliderMax={sliderMax}
              vizMode={vizMode}
              hexMetric={hexMetric}
              onSetVizMode={setVizMode}
              onSetHexMetric={setHexMetric}
              onExit={cinema.handleExitCinema}
            />
          )}

          {/* Timeline slider */}
          {!tours.activeTour && !cinema.cinemaActive && !compareActive && (
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

          {/* Map guide */}
          {showHelpers && !tours.activeTour && !cinema.cinemaActive && !compareActive && (
            <MapGuideCard onDismiss={handleDismissHelpers} />
          )}

          {/* Help trigger */}
          {!showHelpers && !tours.activeTour && !cinema.cinemaActive && !compareActive && (
            <HelpTrigger onOpen={handleOpenHelpers} />
          )}
        </>
      )}
    </div>
  );
}
