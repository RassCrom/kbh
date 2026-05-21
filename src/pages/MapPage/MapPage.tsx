import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import { ArrowLeft, Layers, Info, X, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import s from './MapPage.module.scss';

import { ERA_CONFIG, DISTRICT_BOUNDS } from './constants';
import { buildParsedYearExpr, buildYearColorExpr, buildCombinedFilter } from './mapHelpers';
import { darkDramaticStyle } from './darkDramaticStyle';
import { TimelineSlider } from './components/TimelineSlider';
import { FilterSidebar } from './components/FilterSidebar';
import { BuildingPanel } from './components/BuildingPanel';
import { HexControls } from './components/HexControls';
import {
  loadCentroidsGz, buildHexBins,
  buildCountColorExpr, buildYearAvgColorExpr, buildHexHeightExpr,
  type HexMetric,
} from './hexUtils';

export default function MapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [legendOpen, setLegendOpen] = useState(true);
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    properties: Record<string, unknown>;
  } | null>(null);

  const [sliderMax, setSliderMax] = useState<number>(2029);
  const [yearRange, setYearRange] = useState<[number, number]>([1900, 2029]);
  const [yearCounts, setYearCounts] = useState<Record<number, number>>({});
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const [hoveredEra, setHoveredEra] = useState<string | null>(null);

  // Filter sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [selectedArchStyle, setSelectedArchStyle] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [archStyleOptions, setArchStyleOptions] = useState<string[]>([]);
  const [companyOptions, setCompanyOptions] = useState<string[]>([]);

  // Building detail panel state
  const [selectedBuilding, setSelectedBuilding] = useState<Record<string, unknown> | null>(null);

  // Hexagon visualization state
  const [vizMode, setVizMode] = useState<'buildings' | 'hexagons'>('buildings');
  const [hexMetric, setHexMetric] = useState<HexMetric>('count');
  const [hexLoading, setHexLoading] = useState(false);
  const hexLoadedRef = useRef(false);

  // Time-lapse state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<1 | 2 | 4>(1);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sliderMaxRef = useRef(sliderMax);
  const playSpeedRef = useRef(playSpeed);

  useEffect(() => { sliderMaxRef.current = sliderMax; }, [sliderMax]);
  useEffect(() => { playSpeedRef.current = playSpeed; }, [playSpeed]);

  // Start / restart interval whenever isPlaying or playSpeed changes
  useEffect(() => {
    if (!isPlaying) {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
      return;
    }
    playIntervalRef.current = setInterval(() => {
      setYearRange(prev => {
        const next = prev[1] + playSpeedRef.current;
        if (next >= sliderMaxRef.current) {
          clearInterval(playIntervalRef.current!);
          playIntervalRef.current = null;
          setIsPlaying(false);
          return [prev[0], sliderMaxRef.current];
        }
        return [prev[0], next];
      });
    }, 80);
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, playSpeed]);

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setYearRange([1900, 1900]);
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handlePlayReset = useCallback(() => {
    setIsPlaying(false);
    setYearRange([1900, sliderMaxRef.current]);
  }, []);

  useEffect(() => {
    if (window.innerWidth > 1024) setSidebarOpen(true);
    if (window.innerWidth < 768)  setLegendOpen(false);
  }, []);

  const activeCount =
    selectedTypes.length +
    selectedDistricts.length +
    (selectedArchStyle ? 1 : 0) +
    (selectedCompany ? 1 : 0);

  const handleTypeToggle = (val: string) => {
    setSelectedTypes((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  const handleDistrictToggle = (val: string) => {
    setSelectedDistricts((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  const handleReset = () => {
    setSelectedTypes([]);
    setSelectedDistricts([]);
    setSelectedArchStyle('');
    setSelectedCompany('');
  };

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
      maxZoom: 19,
    });

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    map.on('load', () => {
      map.addSource('all-buildings', {
        type: 'vector',
        url: 'pmtiles:///buildings-ast-v42.pmtiles',
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
            13, 0.3,
            14, 1,
            15.5, 0,
          ],
        },
      });

      map.addLayer({
        id: 'buildings-3d',
        type: 'fill-extrusion',
        source: 'all-buildings',
        'source-layer': 'buildings',
        minzoom: 15.5,
        paint: {
          'fill-extrusion-color': buildYearColorExpr(),
          'fill-extrusion-height': [
            'interpolate', ['linear'], ['zoom'],
            15.5, 0,
            16, ['to-number', ['coalesce', ['get', 'b_height'], 10], 10]
          ],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.85,
        },
      });

      // 2-D hover fill — maxzoom keeps it below 15.5 where 3-D takes over;
      // flat opacity avoids the "zoom inside case" restriction.
      map.addLayer({
        id: 'buildings-hover',
        type: 'fill',
        source: 'all-buildings',
        'source-layer': 'buildings',
        maxzoom: 15.5,
        paint: {
          'fill-color': '#d4a85e',
          'fill-opacity': [
            'case', ['boolean', ['feature-state', 'hover'], false], 0.45, 0,
          ],
        },
      });

      // 3-D hover — fill-extrusion-opacity doesn't support data expressions;
      // encode hover via color alpha: hovered = gold, non-hovered = transparent.
      map.addLayer({
        id: 'buildings-3d-hover',
        type: 'fill-extrusion',
        source: 'all-buildings',
        'source-layer': 'buildings',
        minzoom: 15.5,
        paint: {
          'fill-extrusion-color': [
            'case', ['boolean', ['feature-state', 'hover'], false],
            'rgba(212,168,94,1)',
            'rgba(0,0,0,0)',
          ],
          'fill-extrusion-height': [
            'interpolate', ['linear'], ['zoom'],
            15.5, 0,
            16, ['to-number', ['coalesce', ['get', 'b_height'], 10], 10]
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

      // ── Hexagon source + layers (hidden by default) ──────────────────
      map.addSource('hex-bins', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'hex-layer',
        type: 'fill-extrusion',
        source: 'hex-bins',
        layout: { visibility: 'none' },
        paint: {
          'fill-extrusion-color': buildCountColorExpr(),
          'fill-extrusion-height': buildHexHeightExpr(),
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.82,
        },
      });

      map.addLayer({
        id: 'hex-outline',
        type: 'line',
        source: 'hex-bins',
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
      map.on('mousemove', 'hex-layer', (e) => {
        if (!e.features?.length) return;
        map.getCanvas().style.cursor = 'crosshair';
        const feat = e.features[0];
        setHoverInfo({
          x: e.point.x,
          y: e.point.y,
          properties: feat.properties as Record<string, unknown>,
        });
      });
      map.on('mouseleave', 'hex-layer', () => {
        map.getCanvas().style.cursor = '';
        setHoverInfo(null);
      });

      // Building click — open detail panel, close filter sidebar
      map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['buildings-fill', 'buildings-3d'],
        });
        if (features.length) {
          setSelectedBuilding(features[0].properties as Record<string, unknown>);
          setSidebarOpen(false);
        } else {
          setSelectedBuilding(null);
        }
      });

      const archStyles = new Set<string>();
      const companies = new Set<string>();
      let currentSliderMax = 2029;

      let debounceTimer: ReturnType<typeof setTimeout> | null = null;

      const updateHistogram = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const features = map.queryRenderedFeatures(undefined, { layers: ['buildings-hidden'] });
          const counts: Record<number, number> = {};
          const types: Record<string, number> = {};
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
            }

            // Collect dynamic dropdown options
            const style = f.properties.arch_style;
            if (style && typeof style === 'string' && style.trim()) {
              archStyles.add(style.trim());
            }
            const company = f.properties.construction_company;
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
      selectedCompany
    ) as maplibregl.FilterSpecification;

    if (map.getLayer('buildings-fill')) map.setFilter('buildings-fill', filterExpr);
    if (map.getLayer('buildings-outline')) map.setFilter('buildings-outline', filterExpr);
    if (map.getLayer('buildings-3d')) map.setFilter('buildings-3d', filterExpr);

    // Fly to fit selected districts
    if (selectedDistricts.length > 0) {
      const boxes = selectedDistricts.map((d) => DISTRICT_BOUNDS[d]).filter(Boolean);
      if (boxes.length > 0) {
        const west  = Math.min(...boxes.map((b) => b[0]));
        const south = Math.min(...boxes.map((b) => b[1]));
        const east  = Math.max(...boxes.map((b) => b[2]));
        const north = Math.max(...boxes.map((b) => b[3]));
        map.fitBounds([west, south, east, north], { padding: 60, duration: 1000 });
      }
    }
  }, [yearRange, selectedTypes, selectedDistricts, selectedArchStyle, selectedCompany]);

  // Era hover highlight
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

    if (hoveredEra) {
      const era = ERA_CONFIG.find(e => e.label === hoveredEra);
      if (era) {
        const parsedYear = buildParsedYearExpr();
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
  }, [hoveredEra]);

  // ── Viz mode toggle — show/hide building vs hex layers ─────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getStyle()) return;

    const buildingVis: maplibregl.VisibilitySpecification = vizMode === 'buildings' ? 'visible' : 'none';
    const hexVis: maplibregl.VisibilitySpecification     = vizMode === 'hexagons'  ? 'visible' : 'none';

    const buildingLayers = ['buildings-fill', 'buildings-outline', 'buildings-3d',
                            'buildings-hover', 'buildings-3d-hover', 'buildings-hidden'];
    const hexLayers      = ['hex-layer', 'hex-outline'];

    buildingLayers.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', buildingVis); });
    hexLayers.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', hexVis); });

    // Lazy-load hexagon data on first switch to hexagons mode
    if (vizMode === 'hexagons' && !hexLoadedRef.current) {
      hexLoadedRef.current = true;
      setHexLoading(true);
      loadCentroidsGz('/data/centroids-b-ast-v412.geojson')
        .then(points => {
          const geojson = buildHexBins(points);
          if (map.getSource('hex-bins')) {
            (map.getSource('hex-bins') as maplibregl.GeoJSONSource).setData(geojson);
          }
        })
        .catch(err => console.error('Hexagon load failed:', err))
        .finally(() => setHexLoading(false));
    }
  }, [vizMode]);

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
        hexLoading={hexLoading}
      />

      {/* Page title chip */}
      <div className={s.titleChip}>
        <Layers size={16} />
        <span>Astana · all District</span>
      </div>

      {/* Filter toggle button */}
      <button
        className={`${s.filterToggle} ${sidebarOpen ? s.active : ''}`}
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label="Toggle filters"
        title="Filters"
      >
        <SlidersHorizontal size={16} />
        {activeCount > 0 && (
          <span className={s.filterToggleBadge}>{activeCount}</span>
        )}
      </button>

      {/* Filter sidebar */}
      <FilterSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onToggle={() => setSidebarOpen((v) => !v)}
        selectedTypes={selectedTypes}
        onTypeToggle={handleTypeToggle}
        onClearTypes={() => setSelectedTypes([])}
        selectedDistricts={selectedDistricts}
        onDistrictToggle={handleDistrictToggle}
        onClearDistricts={() => setSelectedDistricts([])}
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
      />

      {/* Legend panel */}
      <div className={`${s.legend} ${legendOpen ? s.open : ''}`}>
        <button
          className={s.legendToggle}
          onClick={() => setLegendOpen((v) => !v)}
          aria-label={legendOpen ? 'Close legend' : 'Open legend'}
        >
          {legendOpen ? <X size={16} /> : <Info size={16} />}
        </button>

        {legendOpen && (
          <div className={s.legendBody}>
            <h3 className={s.legendTitle}>Building Era</h3>
            <ul className={s.legendList}>
              {ERA_CONFIG.map((era) => (
                <li
                  key={era.label}
                  className={s.legendItem}
                  onMouseEnter={() => setHoveredEra(era.label)}
                  onMouseLeave={() => setHoveredEra(null)}
                  onClick={() => {
                    if (era.bounds[0] !== -1) {
                      setYearRange([Math.max(1900, era.bounds[0]), Math.min(sliderMax, era.bounds[1])]);
                    }
                  }}
                  style={{
                    cursor: era.bounds[0] !== -1 ? 'pointer' : 'default',
                    opacity: hoveredEra && hoveredEra !== era.label ? 0.35 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <span className={s.legendSwatch} style={{ background: era.color }} />
                  <div className={s.legendTextGroup}>
                    <span className={s.legendLabel}>{era.label}</span>
                    <span className={s.legendDesc}>{era.description}</span>
                  </div>
                </li>
              ))}
            </ul>
            <button
              className={s.resetButton}
              onClick={() => setYearRange([1900, sliderMax])}
              aria-label="Reset timeline filter"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Hover tooltip — hidden while a building is selected */}
      {hoverInfo && !selectedBuilding && (() => {
        const p = hoverInfo.properties;
        const isHex = p.count !== undefined;

        // ── Hex tooltip ──────────────────────────────────────────────────
        if (isHex) {
          const count    = Number(p.count);
          const avgYear  = Number(p.avgYear);
          const avgH     = Number(p.avgHeight);
          return (
            <div className={s.tooltip} style={{ left: hoverInfo.x + 14, top: hoverInfo.y - 14 }}>
              <div className={s.tooltipName}>Hexagon</div>
              <div className={s.tooltipRow}>
                <span className={s.tooltipKey}>Buildings</span>
                <span className={s.tooltipVal}>{count.toLocaleString()}</span>
              </div>
              {avgYear > 0 && (
                <div className={s.tooltipRow}>
                  <span className={s.tooltipKey}>Avg year</span>
                  <span className={s.tooltipVal}>{avgYear}</span>
                </div>
              )}
              {avgH > 0 && (
                <div className={s.tooltipRow}>
                  <span className={s.tooltipKey}>Avg height</span>
                  <span className={s.tooltipVal}>{avgH} m</span>
                </div>
              )}
            </div>
          );
        }

        // ── Building tooltip ──────────────────────────────────────────────
        const name = p.name ? String(p.name) : null;
        const year = p.year_int ?? p.year_str;
        const hasData = name || year;
        return (
          <div className={s.tooltip} style={{ left: hoverInfo.x + 14, top: hoverInfo.y - 14 }}>
            {hasData ? (
              <>
                {name && <div className={s.tooltipName}>{name}</div>}
                {year && (
                  <div className={s.tooltipRow}>
                    <span className={s.tooltipKey}>Year</span>
                    <span className={s.tooltipVal}>{String(year)}</span>
                  </div>
                )}
                <div className={s.tooltipHint}>Click for more info</div>
              </>
            ) : (
              <div className={s.tooltipHintOnly}>Click to see building info</div>
            )}
          </div>
        );
      })()}

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
        isPlaying={isPlaying}
        playSpeed={playSpeed}
        onTogglePlay={handleTogglePlay}
        onSpeedChange={setPlaySpeed}
        onPlayReset={handlePlayReset}
      />
    </div>
  );
}
