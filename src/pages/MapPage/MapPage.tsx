import { useEffect, useRef, useState } from 'react';
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
  const [hoveredEra, setHoveredEra] = useState<string | null>(null);

  // Filter sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [selectedArchStyle, setSelectedArchStyle] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [archStyleOptions, setArchStyleOptions] = useState<string[]>([]);
  const [companyOptions, setCompanyOptions] = useState<string[]>([]);

  useEffect(() => {
    if (window.innerWidth > 1024) {
      setSidebarOpen(true);
    }
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
      zoom: 13,
      minZoom: 10,
      maxZoom: 19,
    });

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    map.on('load', () => {
      map.addSource('all-buildings', {
        type: 'vector',
        url: 'pmtiles:///buildings-ast-v4.pmtiles',
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
            15.5, .5,
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

      map.addLayer({
        id: 'buildings-hover',
        type: 'fill',
        source: 'all-buildings',
        'source-layer': 'buildings',
        paint: {
          'fill-color': '#d4a85e',
          'fill-opacity': [
            'interpolate', ['linear'], ['zoom'],
            15.5, 0.35,
            16, 0,
          ],
        },
        filter: ['==', ['id'], ''],
      });

      map.addLayer({
        id: 'buildings-3d-hover',
        type: 'fill-extrusion',
        source: 'all-buildings',
        'source-layer': 'buildings',
        minzoom: 15.5,
        paint: {
          'fill-extrusion-color': '#d4a85e',
          'fill-extrusion-height': [
            'interpolate', ['linear'], ['zoom'],
            15.5, 0,
            16, ['to-number', ['coalesce', ['get', 'b_height'], 10], 10]
          ],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.5,
        },
        filter: ['==', ['id'], ''],
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

      let hoveredId: string | number | null = null;

      const handleMouseMove = (e: any) => {
        if (!e.features?.length) return;
        map.getCanvas().style.cursor = 'pointer';
        const feat = e.features[0];
        const id = feat.id;
        if (hoveredId !== null && hoveredId !== id) {
          if (map.getLayer('buildings-hover')) map.setFilter('buildings-hover', ['==', ['id'], '']);
          if (map.getLayer('buildings-3d-hover')) map.setFilter('buildings-3d-hover', ['==', ['id'], '']);
        }
        hoveredId = id ?? null;
        if (id !== undefined) {
          if (map.getLayer('buildings-hover')) map.setFilter('buildings-hover', ['==', ['id'], id]);
          if (map.getLayer('buildings-3d-hover')) map.setFilter('buildings-3d-hover', ['==', ['id'], id]);
        }
        setHoverInfo({
          x: e.point.x,
          y: e.point.y,
          properties: feat.properties as Record<string, unknown>,
        });
      };

      const handleMouseLeave = () => {
        map.getCanvas().style.cursor = '';
        if (hoveredId !== null) {
          if (map.getLayer('buildings-hover')) map.setFilter('buildings-hover', ['==', ['id'], '']);
          if (map.getLayer('buildings-3d-hover')) map.setFilter('buildings-3d-hover', ['==', ['id'], '']);
        }
        hoveredId = null;
        setHoverInfo(null);
      };

      map.on('mousemove', 'buildings-fill', handleMouseMove);
      map.on('mousemove', 'buildings-3d', handleMouseMove);
      map.on('mouseleave', 'buildings-fill', handleMouseLeave);
      map.on('mouseleave', 'buildings-3d', handleMouseLeave);

      const archStyles = new Set<string>();
      const companies = new Set<string>();
      let currentSliderMax = 2029;

      let debounceTimer: ReturnType<typeof setTimeout> | null = null;

      const updateHistogram = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const features = map.queryRenderedFeatures(undefined, { layers: ['buildings-hidden'] });
          const counts: Record<number, number> = {};
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
          }

          setYearCounts(counts);
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
      map.on('moveend', updateHistogram);
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
    if (map.getLayer('buildings-hover')) {
      map.setFilter('buildings-hover', ['all', filterExpr, ['==', ['id'], '']] as maplibregl.FilterSpecification);
    }
    if (map.getLayer('buildings-3d-hover')) {
      map.setFilter('buildings-3d-hover', ['all', filterExpr, ['==', ['id'], '']] as maplibregl.FilterSpecification);
    }

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

  return (
    <div className={s.mapPage}>
      <div ref={containerRef} className={s.mapContainer} />

      {/* Back button */}
      <Link to="/" className={s.backBtn} aria-label="Back to Home">
        <ArrowLeft size={20} />
        <span>Back</span>
      </Link>

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

      {/* Hover tooltip */}
      {hoverInfo && (
        <div
          className={s.tooltip}
          style={{
            left: hoverInfo.x + 14,
            top: hoverInfo.y - 14,
          }}
        >
          {Object.entries(hoverInfo.properties).map(([key, val]) => (
            <div key={key} className={s.tooltipRow}>
              <span className={s.tooltipKey}>{key}</span>
              <span className={s.tooltipVal}>{String(val ?? '—')}</span>
            </div>
          ))}
        </div>
      )}

      {/* Timeline Slider */}
      <TimelineSlider
        min={1900}
        max={sliderMax}
        value={yearRange}
        onChange={setYearRange}
        data={yearCounts}
        sidebarOpen={sidebarOpen}
      />
    </div>
  );
}
