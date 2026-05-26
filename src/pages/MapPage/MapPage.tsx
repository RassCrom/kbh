import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import { ArrowLeft, Layers, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import s from './MapPage.module.scss';
import { useIsMobile } from './useIsMobile';

import { ERA_CONFIG, DISTRICT_BOUNDS } from './constants';
import { buildYearColorExpr, buildElevationColorExpr, buildLstColorExpr, buildTypeColorExpr, buildUhiColorExpr, buildCombinedFilter, type ColorMode, type DecadeLstPoint } from './mapHelpers';
import { darkDramaticStyle } from './darkDramaticStyle';
import { TimelineSlider } from './components/TimelineSlider';
import { FilterSidebar } from './components/FilterSidebar';
import { BuildingPanel } from './components/BuildingPanel';
import { HexControls } from './components/HexControls';
import { buildCountColorExpr, buildYearAvgColorExpr, buildHexHeightExpr, type HexMetric } from './hexUtils';
import { applyMapTheme, type MapTheme } from './mapTheme';

// Custom Hooks
import { useTimeLapse } from './hooks/useTimeLapse';
import { useMapFilters } from './hooks/useMapFilters';

// Subcomponents
import { LegendPanel } from './components/LegendPanel';
import { HoverTooltip } from './components/HoverTooltip';


export default function MapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const isMobile = useIsMobile();
  const [legendOpen, setLegendOpen] = useState(true);
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

  // Dark / light map theme
  const [mapTheme, setMapTheme] = useState<MapTheme>('dark');

  // Building color visualization mode
  const [colorMode, setColorMode] = useState<ColorMode>('year');

  const handleColorModeChange = (mode: ColorMode) => {
    setColorMode(mode);
    if (vizMode === 'hexagons') {
      setVizMode('buildings');
    }
  };

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
    if (window.innerWidth > 1024) setSidebarOpen(true);
    if (window.innerWidth < 768) {
      setLegendOpen(false);
      setTimelineCollapsed(true);  // save vertical space on mobile
    }
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

  useEffect(() => {
    if (!containerRef.current) return;

    const protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: darkDramaticStyle,
      center: [71.4306, 51.1282],
      zoom: 12,
      minZoom: 10,
      maxZoom: 23,
    });

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

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
          'fill-extrusion-height': [
            'interpolate', ['linear'], ['zoom'],
            13, 0,
            13.5, ['to-number', ['coalesce', ['get', 'b_height'], 10], 10]
          ],
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
          'fill-extrusion-height': [
            'interpolate', ['linear'], ['zoom'],
            13, 0,
            13.5, ['to-number', ['coalesce', ['get', 'b_height'], 10], 10]
          ],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.55,
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

      // Building click / tap — open detail panel, close filter sidebar
      map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['buildings-fill', 'buildings-3d'],
        });
        if (features.length) {
          setSelectedBuilding(features[0].properties as Record<string, unknown>);
          setSidebarOpen(false);
          // On mobile, also collapse the legend and timeline to maximise map
          if (window.innerWidth < 768) {
            setLegendOpen(false);
            setTimelineCollapsed(true);
          }
        } else {
          setSelectedBuilding(null);
        }
      });

      const archStyles = new Set<string>();
      const companies = new Set<string>();
      let currentSliderMax = 2029;

      let debounceTimer: ReturnType<typeof setTimeout> | null = null;

      const updateHistogram = () => {
        // Hexagons mode check - building layers are hidden, skip calculations completely
        if (vizModeRef.current === 'hexagons') {
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
    });

    mapRef.current = map;

    return () => {
      map.remove();
      maplibregl.removeProtocol('pmtiles');
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

    // Fly to fit selected districts
    if (selectedDistricts.length > 0) {
      const boxes = selectedDistricts.map((d) => DISTRICT_BOUNDS[d]).filter(Boolean);
      if (boxes.length > 0) {
        const west = Math.min(...boxes.map((b) => b[0]));
        const south = Math.min(...boxes.map((b) => b[1]));
        const east = Math.max(...boxes.map((b) => b[2]));
        const north = Math.max(...boxes.map((b) => b[3]));
        map.fitBounds([west, south, east, north], { padding: 60, duration: 1000 });
      }
    }
  }, [yearRange, selectedTypes, selectedDistricts, selectedArchStyle, selectedCompany, selectedUhiCells, colorMode]);

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

  // ── Viz mode toggle — show/hide building vs hex layers ─────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getStyle()) return;

    const buildingVis: maplibregl.VisibilitySpecification = vizMode === 'buildings' ? 'visible' : 'none';
    const hexVis: maplibregl.VisibilitySpecification = vizMode === 'hexagons' ? 'visible' : 'none';

    const buildingLayers = ['buildings-fill', 'buildings-outline', 'buildings-3d',
      'buildings-hover', 'buildings-3d-hover', 'buildings-hidden'];
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

  return (
    <div className={s.mapPage}>
      <div ref={containerRef} className={s.mapContainer} />

      {/* Mobile backdrop — shown behind open sidebar for tap-to-close */}
      {isMobile && sidebarOpen && (
        <div
          className={s.sidebarBackdrop}
          onClick={handleSidebarClose}
          aria-hidden="true"
        />
      )}

      {/* Back button */}
      <Link to="/" className={s.backBtn} aria-label="Back to Home">
        <ArrowLeft size={20} />
        <span>Back</span>
      </Link>

      {/* Viz mode toggle */}
      <HexControls
        vizMode={vizMode}
        onVizModeChange={setVizMode}
        hexMetric={hexMetric}
        onHexMetricChange={setHexMetric}
        hexLoading={false}
      />

      {/* Page title chip */}
      <div className={s.titleChip}>
        <Layers size={16} />
        <span>Astana</span>
      </div>

      {/* Filter toggle (top-right, hidden when sidebar is open) */}
      {!sidebarOpen && (
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
      />

      {/* Legend panel */}
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

      {/* Hover tooltip */}
      <HoverTooltip
        hoverInfo={hoverInfo}
        selectedBuilding={selectedBuilding}
        colorMode={colorMode}
      />

      {/* Building detail panel */}
      <BuildingPanel
        properties={selectedBuilding}
        onClose={() => setSelectedBuilding(null)}
      />

      {/* Timeline Slider with play controls */}
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
    </div>
  );
}
