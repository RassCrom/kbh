import { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import { ArrowLeft, Layers, Info, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import s from './MapPage.module.scss';

/* ------------------------------------------------------------------ */
/*  Building era helpers                                               */
/* ------------------------------------------------------------------ */

const ERA_CONFIG = [
  { label: 'Russian Empire (< 1917)', color: '#4d7a8a', bounds: [0, 1916] },
  { label: 'Soviet era (1917-1936)', color: '#6a8a6e', bounds: [1917, 1935] },
  { label: 'Kazakh SSR (1936-1991)', color: '#7a8a5e', bounds: [1936, 1990] },
  { label: 'Independence / Nazarbayev era (1991-2019)', color: '#c8954a', bounds: [1991, 2018] },
  { label: 'Tokayev era (2019+)', color: '#b87a30', bounds: [2019, 2100] },
  { label: 'Unknown', color: '#242424', bounds: [-1, -1] },
];

function buildParsedYearExpr(): any[] {
  return [
    'let',
    'y_int', ['get', 'year_int'],
    'y_str', ['coalesce', ['get', 'year_str'], ''],
    [
      'let',
      'dash_idx', ['index-of', '-', ['var', 'y_str']],
      [
        'case',
        ['!=', ['var', 'y_int'], null],
          ['to-number', ['var', 'y_int'], 0],
        
        ['!=', ['var', 'y_str'], ''],
          [
            'case',
            ['!=', ['var', 'dash_idx'], -1],
              [
                '/', 
                [
                  '+', 
                  ['to-number', ['slice', ['var', 'y_str'], 0, ['var', 'dash_idx']], 0],
                  ['to-number', ['slice', ['var', 'y_str'], ['+', ['var', 'dash_idx'], 1]], 0]
                ],
                2
              ],
            ['to-number', ['var', 'y_str'], 0]
          ],
        0
      ]
    ]
  ];
}

function buildYearColorExpr(): maplibregl.ExpressionSpecification {
  const parsedYear = buildParsedYearExpr();
  
  return [
    'case',
    ['!=', parsedYear, 0],
    [
      'step',
      parsedYear,
      '#4d7a8a',       // < 1917 — Russian Empire
      1917, '#6a8a6e', // Soviet era
      1936, '#7a8a5e', // Kazakh SSR
      1991, '#c8954a', // Independence / Nazarbayev era
      2019, '#b87a30', // Tokayev era
    ],
    '#242424',         // 0 → unknown
  ] as unknown as maplibregl.ExpressionSpecification;
}

/* ------------------------------------------------------------------ */
/*  Timeline Slider Component                                          */
/* ------------------------------------------------------------------ */

function TimelineSlider({ min, max, value, onChange, data }: { 
  min: number, max: number, value: [number, number], onChange: (v: [number, number]) => void,
  data: Record<number, number>
}) {
  const bins = useMemo(() => {
    let maxCount = 0;
    const result: {year: number, count: number}[] = [];
    // Group into bins of 2 years for the histogram to avoid 200 tiny bars if width is small
    // Actually, simple year-by-year is fine for 1865-2029 (165 bars)
    for (let y = min; y <= max; y++) {
      const count = data[y] || 0;
      if (count > maxCount) maxCount = count;
      result.push({ year: y, count });
    }
    return { maxCount, bins: result };
  }, [min, max, data]);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(Number(e.target.value), value[1]);
    onChange([val, value[1]]);
  };
  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(Number(e.target.value), value[0]);
    onChange([value[0], val]);
  };

  const step = Math.max(10, Math.floor((max - min) / 5));
  const tickMarks = [];
  for (let y = Math.ceil(min / 10) * 10; y <= max; y += step) {
    tickMarks.push(y);
  }

  return (
    <div className={s.timelineContainer}>
      <div className={s.histogram}>
        {bins.bins.map((b) => (
          <div 
            key={b.year} 
            className={`${s.bar} ${b.year >= value[0] && b.year <= value[1] ? s.active : ''}`}
            style={{ height: bins.maxCount > 0 ? `${(b.count / bins.maxCount) * 100}%` : '0%' }}
            title={`${b.year}: ${b.count} buildings`}
            onClick={() => onChange([b.year, b.year])}
          />
        ))}
      </div>
      <div className={s.sliders}>
        <div className={s.sliderTrack}>
          <div className={s.sliderRange} style={{ left: `${((value[0] - min)/(max - min))*100}%`, width: `${((value[1] - value[0])/(max - min))*100}%` }} />
        </div>
        <input type="range" min={min} max={max} value={value[0]} onChange={handleMinChange} className={`${s.thumb} ${s.thumbLeft}`} />
        <input type="range" min={min} max={max} value={value[1]} onChange={handleMaxChange} className={`${s.thumb} ${s.thumbRight}`} />
      </div>
      <div className={s.labels} style={{ position: 'relative', height: '16px', marginTop: '4px' }}>
        {tickMarks.map(t => (
          <span key={t} style={{ position: 'absolute', left: `${((t - min)/(max - min))*100}%`, transform: 'translateX(-50%)' }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

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


  useEffect(() => {
    if (!containerRef.current) return;

    /* ---- PMTiles protocol ---- */
    const protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);

    /* ---- Map ---- */
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        name: 'Almaty Buildings',
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {
          'osm-raster': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
          },
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm-raster',
            minzoom: 0,
            maxzoom: 20,
          },
        ],
      },
      center: [71.4306, 51.1282],  // Astana centre
      zoom: 13,
      minZoom: 10,
      maxZoom: 19,
      attributionControl: true,
    });

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

  map.on('load', () => {
    map.addSource('all-buildings', {
      type: 'vector',
      url: 'pmtiles:///test_all_b.pmtiles',
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
          12, 0.7,
          16, 0.85,
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
          17, 1,
        ],
      },
    });

    map.addLayer({
      id: 'buildings-hover',
      type: 'fill',
      source: 'all-buildings',
      'source-layer': 'buildings',
      paint: {
        'fill-color': '#d4a85e',
        'fill-opacity': 0.35,
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

    map.on('mousemove', 'buildings-fill', (e) => {
      if (!e.features?.length) return;

      map.getCanvas().style.cursor = 'pointer';

      const feat = e.features[0];
      const id = feat.id;

      if (hoveredId !== null && hoveredId !== id) {
        map.setFilter('buildings-hover', ['==', ['id'], '']);
      }

      hoveredId = id ?? null;

      if (id !== undefined) {
        map.setFilter('buildings-hover', ['==', ['id'], id]);
      }

      setHoverInfo({
        x: e.point.x,
        y: e.point.y,
        properties: feat.properties as Record<string, unknown>,
      });
    });

    map.on('mouseleave', 'buildings-fill', () => {
      map.getCanvas().style.cursor = '';

      if (hoveredId !== null) {
        map.setFilter('buildings-hover', ['==', ['id'], '']);
      }

      hoveredId = null;
      setHoverInfo(null);
    });

    const updateHistogram = () => {
      // Use queryRenderedFeatures on our hidden layer so we only get features currently in the viewport
      const features = map.queryRenderedFeatures(undefined, { layers: ['buildings-hidden'] });
      const counts: Record<number, number> = {};
      let localMax = sliderMax;
      let hasUpdates = false;

      for (const f of features) {
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
      }
      setYearCounts(counts);
      if (hasUpdates) {
        setSliderMax(localMax);
        setYearRange(prev => [prev[0], Math.max(prev[1], localMax)]);
      }
    };

    map.on('idle', updateHistogram);
    map.on('moveend', updateHistogram);
  });


    mapRef.current = map;

    return () => {
      map.remove();
      maplibregl.removeProtocol('pmtiles');
    };
  }, []);

  // Update layer filters when yearRange changes
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (!map.getStyle()) return;

    const parsedYear = buildParsedYearExpr();

    const filterExpr: any = [
      'any',
      ['==', parsedYear, 0],
      ['all',
        ['>=', parsedYear, yearRange[0]],
        ['<=', parsedYear, yearRange[1]]
      ]
    ];

    if (map.getLayer('buildings-fill')) map.setFilter('buildings-fill', filterExpr);
    if (map.getLayer('buildings-outline')) map.setFilter('buildings-outline', filterExpr);
    if (map.getLayer('buildings-hover')) map.setFilter('buildings-hover', ['all', filterExpr, ['==', ['id'], '']]);
  }, [yearRange]);

  // Handle hover effect over legend
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (!map.getStyle() || !map.getLayer('buildings-fill')) return;

    let opacityExpr: any = [
      'interpolate', ['linear'], ['zoom'],
      12, 0.7,
      16, 0.85,
    ];

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

        opacityExpr = [
          'case',
          inEraExpr,
          opacityExpr, // Keep normal opacity
          0.1          // Muted opacity
        ];
      }
    }

    map.setPaintProperty('buildings-fill', 'fill-opacity', opacityExpr);
  }, [hoveredEra]);

  return (
    <div className={s.mapPage}>
      {/* Map container */}
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
                    opacity: hoveredEra && hoveredEra !== era.label ? 0.4 : 1,
                    transition: 'opacity 0.2s'
                  }}
                >
                  <span
                    className={s.legendSwatch}
                    style={{ background: era.color }}
                  />
                  <span className={s.legendLabel}>{era.label}</span>
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
      />
    </div>
  );
}
