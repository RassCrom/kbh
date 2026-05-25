import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import { ArrowLeft, Layers, Info, X, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import s from './MapPage.module.scss';
import { useIsMobile, IS_TOUCH_DEVICE } from './useIsMobile';

import { ERA_CONFIG, DISTRICT_BOUNDS } from './constants';
import { buildYearColorExpr, buildElevationColorExpr, buildLstColorExpr, buildTypeColorExpr, buildUhiColorExpr, TYPE_LEGEND, UHI_MATRIX, UHI_AGE_BINS, UHI_LST_BINS, buildCombinedFilter, type ColorMode, type DecadeLstPoint, ELEVATION_STEPS, LST_STEPS } from './mapHelpers';
import { darkDramaticStyle } from './darkDramaticStyle';
import { TimelineSlider } from './components/TimelineSlider';
import { FilterSidebar } from './components/FilterSidebar';
import { BuildingPanel } from './components/BuildingPanel';
import { HexControls } from './components/HexControls';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  loadCentroidsGz, buildHexBins,
  buildCountColorExpr, buildYearAvgColorExpr, buildHexHeightExpr,
  type HexMetric,
} from './hexUtils';
import { applyMapTheme, type MapTheme } from './mapTheme';

const TYPE_LABELS: Record<string, string> = {
  rc: 'Residential Complex',
  bc: 'Business Center',
  ec: 'Entertainment Center',
  sc: 'Shopping Center',
  sf: 'Sport Facility',
  mosque: 'Mosque',
  church: 'Church',
  healthcare: 'Healthcare Facility',
  hospital: 'Hospital',
  clinic: 'Clinic',
  utility: 'Utility Infrastructure',
  'cultural site': 'Cultural Site',
  admin: 'Administrative Building',
  airport: 'Airport',
  'train station': 'Train Station',
  school: 'School',
  kdgd: 'Kindergarten',
  uni: 'University',
  house: 'Private House',
};

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

  const [sliderMax, setSliderMax] = useState<number>(2029);
  const [yearRange, setYearRange] = useState<[number, number]>([1900, 2029]);
  const [yearCounts, setYearCounts] = useState<Record<number, number>>({});
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const [decadeLstData, setDecadeLstData] = useState<DecadeLstPoint[]>([]);
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

  // Dark / light map theme
  const [mapTheme, setMapTheme] = useState<MapTheme>('dark');

  // Building color visualization mode
  const [colorMode, setColorMode] = useState<ColorMode>('year');
  const [selectedUhiCells, setSelectedUhiCells] = useState<string[]>([]);

  // Hexagon visualization state
  const [vizMode, setVizMode] = useState<'buildings' | 'hexagons'>('buildings');

  const handleColorModeChange = (mode: ColorMode) => {
    setColorMode(mode);
    if (vizMode === 'hexagons') {
      setVizMode('buildings');
    }
  };
  const [hexMetric, setHexMetric] = useState<HexMetric>('count');
  const [hexLoading, setHexLoading] = useState(false);
  const hexLoadedRef = useRef(false);

  // Timeline collapsed state (lifted up so MapPage can control it)
  const [timelineCollapsed, setTimelineCollapsed] = useState(false);

  // Snapshot of UI open-states before entering hexagon mode — restored on exit
  const preHexStateRef = useRef<{ legend: boolean; sidebar: boolean; timeline: boolean } | null>(null);

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
        colorMode === 'lst'       ? buildLstColorExpr() :
        colorMode === 'type'      ? buildTypeColorExpr() :
        colorMode === 'uhi'       ? buildUhiColorExpr() :
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

  const activeCount = useMemo(
    () =>
      selectedTypes.length +
      selectedDistricts.length +
      (selectedArchStyle ? 1 : 0) +
      (selectedCompany ? 1 : 0),
    [selectedTypes, selectedDistricts, selectedArchStyle, selectedCompany],
  );

  const handleTypeToggle = useCallback((val: string) => {
    setSelectedTypes((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  }, []);

  const handleDistrictToggle = useCallback((val: string) => {
    setSelectedDistricts((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  }, []);

  const handleTypeLegendClick = useCallback((groupLabel: string) => {
    let vals: string[] = [];
    switch (groupLabel) {
      case 'Residential': vals = ['rc', 'house']; break;
      case 'Commercial & Leisure': vals = ['bc', 'sc', 'ec']; break;
      case 'Education & Research': vals = ['school', 'kdgd', 'uni']; break;
      case 'Religious Landmarks': vals = ['mosque', 'church']; break;
      case 'Culture & Sport': vals = ['cultural site', 'sf']; break;
      case 'Healthcare': vals = ['healthcare', 'hospital', 'clinic']; break;
      case 'Infrastructure & Admin': vals = ['admin', 'utility', 'airport', 'train station']; break;
      default: return;
    }
    setSelectedTypes((prev) => {
      const allSelected = vals.every((v) => prev.includes(v));
      if (allSelected) {
        return prev.filter((v) => !vals.includes(v));
      } else {
        return [...new Set([...prev, ...vals])];
      }
    });
  }, []);

  const isTypeGroupActive = useCallback((groupLabel: string) => {
    if (selectedTypes.length === 0) return true;
    let vals: string[] = [];
    switch (groupLabel) {
      case 'Residential': vals = ['rc', 'house']; break;
      case 'Commercial & Leisure': vals = ['bc', 'sc', 'ec']; break;
      case 'Education & Research': vals = ['school', 'kdgd', 'uni']; break;
      case 'Religious Landmarks': vals = ['mosque', 'church']; break;
      case 'Culture & Sport': vals = ['cultural site', 'sf']; break;
      case 'Healthcare': vals = ['healthcare', 'hospital', 'clinic']; break;
      case 'Infrastructure & Admin': vals = ['admin', 'utility', 'airport', 'train station']; break;
      default: return false;
    }
    return vals.some((v) => selectedTypes.includes(v));
  }, [selectedTypes]);

  const handleReset = useCallback(() => {
    setSelectedTypes([]);
    setSelectedDistricts([]);
    setSelectedArchStyle('');
    setSelectedCompany('');
    setSelectedUhiCells([]);
  }, []);

  // Stable sidebar/theme callbacks — prevent FilterSidebar re-renders on unrelated MapPage state changes
  const handleSidebarClose   = useCallback(() => setSidebarOpen(false), []);
  const handleSidebarToggle  = useCallback(() => setSidebarOpen((v) => !v), []);
  const handleClearTypes     = useCallback(() => setSelectedTypes([]), []);
  const handleClearDistricts = useCallback(() => setSelectedDistricts([]), []);
  const handleThemeToggle    = useCallback(
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
      maxZoom: 19,
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

      // Hexagon source + layers
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

      // Kabanbay Batyr 3D model — placed on Kabanbay Batyr Avenue in central Astana
      const KABANBAY_COORDS: [number, number] = [71.4069, 51.1284];
      const kMercator = maplibregl.MercatorCoordinate.fromLngLat(KABANBAY_COORDS, 0);
      const kXform = {
        tx: kMercator.x,
        ty: kMercator.y,
        scale: kMercator.meterInMercatorCoordinateUnits(),
        tz: kMercator.z ?? 0,
      };

      let kScene: THREE.Scene | null = null;
      let kCamera: THREE.Camera | null = null;
      let kRenderer: THREE.WebGLRenderer | null = null;
      // Pre-allocated matrices: kL4 is constant (world transform), kM4 is scratch
      let kL4: THREE.Matrix4 | null = null;
      let kM4: THREE.Matrix4 | null = null;

      const kabanbayLayer = {
        id: 'kabanbay-model',
        type: 'custom' as const,
        renderingMode: '3d' as const,
        onAdd(m: maplibregl.Map, gl: WebGL2RenderingContext) {
          kCamera = new THREE.Camera();
          kScene = new THREE.Scene();

          // Ambient and directional lighting
          kScene.add(new THREE.AmbientLight(0xffffff, 5));
          const addSun = (x: number, y: number, z: number, intensity: number) => {
            const l = new THREE.DirectionalLight(0xffffff, intensity);
            l.position.set(x, y, z);
            kScene!.add(l);
          };
          addSun(1, 1, 2, 4);
          addSun(-1, 1, 2, 3);
          addSun(0, -1, 2, 3);
          addSun(0, 0, -1, 2);

          new GLTFLoader().load(
            '/kabanbay.glb',
            (gltf) => {
              // Center the model locally
              const box = new THREE.Box3().setFromObject(gltf.scene);
              const center = box.getCenter(new THREE.Vector3());
              gltf.scene.position.sub(center);

              // Normalize materials
              gltf.scene.traverse((obj) => {
                obj.frustumCulled = false;
                if ((obj as THREE.Mesh).isMesh) {
                  const mesh = obj as THREE.Mesh;
                  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                  mats.forEach((mat) => {
                    if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
                      mat.roughness = 0.4;
                      mat.metalness = 0.1;
                      mat.needsUpdate = true;
                    }
                  });
                }
              });
              gltf.scene.scale.set(100, 100, 100);
              kScene!.add(gltf.scene);
            },
            undefined,
            (err) => console.error('[Kabanbay] GLB load error:', err),
          );



          kRenderer = new THREE.WebGLRenderer({ canvas: m.getCanvas(), context: gl, antialias: true });
          kRenderer.autoClear = false;
          kRenderer.toneMapping = THREE.NoToneMapping;
          kRenderer.outputColorSpace = THREE.SRGBColorSpace;

          // Pre-compute constant world transform once — avoids 3× Matrix4 + 1× Vector3 alloc per frame
          const _rotX = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);
          kL4 = new THREE.Matrix4()
            .makeTranslation(kXform.tx, kXform.ty, kXform.tz)
            .scale(new THREE.Vector3(kXform.scale, -kXform.scale, kXform.scale))
            .multiply(_rotX);
          kM4 = new THREE.Matrix4(); // reused projection scratch buffer
        },
        render(_gl: WebGL2RenderingContext, matrix: number[]) {
          if (!kScene || !kCamera || !kRenderer || !kL4 || !kM4) return;
          const { width, height } = map.getCanvas();
          // kM4 = MapLibre MVP matrix; multiply by constant world transform in-place
          kCamera.projectionMatrix = kM4.fromArray(matrix).multiply(kL4);
          kRenderer.resetState();
          kRenderer.setViewport(0, 0, width, height);
          kRenderer.render(kScene, kCamera);
          map.triggerRepaint();
        },
      };
      map.addLayer(kabanbayLayer as unknown as maplibregl.CustomLayerInterface);

      // Hit-target element for tooltips
      const kabanbayEl = document.createElement('div');
      kabanbayEl.style.cssText = 'width:60px;height:80px;cursor:pointer;';
      new maplibregl.Marker({ element: kabanbayEl, anchor: 'bottom' })
        .setLngLat(KABANBAY_COORDS)
        .addTo(map);

      kabanbayEl.addEventListener('mousemove', (e: MouseEvent) => {
        const rect = map.getCanvas().getBoundingClientRect();
        setHoverInfo({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          properties: { isKabanbayModel: true, name: 'Kabanbay Batyr' },
        });
      });
      kabanbayEl.addEventListener('mouseleave', () => setHoverInfo(null));


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
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const features = map.queryRenderedFeatures(undefined, { layers: ['buildings-hidden'] });
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
        hexLoading={hexLoading}
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
            {colorMode === 'year' && (
              <>
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
              </>
            )}

            {colorMode === 'elevation' && (
              <>
                <h3 className={s.legendTitle}>Elevation (m asl)</h3>
                <ul className={s.legendList}>
                  {[...ELEVATION_STEPS].reverse().map((step, i, arr) => {
                    const nextStep = arr[i - 1];
                    const label = nextStep
                      ? `${step.min} – ${nextStep.min - 1} m`
                      : `≥ ${step.min} m`;
                    return (
                      <li key={step.min} className={s.legendItem}>
                        <span className={s.legendSwatch} style={{ background: step.color }} />
                        <span className={s.legendLabel}>{label}</span>
                      </li>
                    );
                  })}
                </ul>
                <div className={s.legendGradientSource}>DTM FABDEM · dem_mean</div>
              </>
            )}

            {colorMode === 'lst' && (
              <>
                <h3 className={s.legendTitle}>Summer LST (°C)</h3>
                <ul className={s.legendList}>
                  {[...LST_STEPS].reverse().map((step, i, arr) => {
                    const nextStep = arr[i - 1];
                    const label = nextStep
                      ? `${step.min} – ${nextStep.min - 1} °C`
                      : `≥ ${step.min} °C`;
                    return (
                      <li key={step.min} className={s.legendItem}>
                        <span className={s.legendSwatch} style={{ background: step.color }} />
                        <span className={s.legendLabel}>{label}</span>
                      </li>
                    );
                  })}
                </ul>
                <div className={s.legendGradientSource}>Mean summer · 2015–2025</div>
              </>
            )}

            {colorMode === 'type' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 className={s.legendTitle} style={{ margin: 0 }}>Building Use</h3>
                  {selectedTypes.length > 0 && (
                    <button
                      onClick={() => setSelectedTypes([])}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-accent-gold)',
                        fontSize: '11px',
                        cursor: 'pointer',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontFamily: 'var(--font-heading)',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212, 168, 94, 0.08)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
                <ul className={s.legendList}>
                  {TYPE_LEGEND.map((item) => {
                    const active = isTypeGroupActive(item.label);
                    const dimmed = selectedTypes.length > 0 && !active;
                    return (
                      <li
                        key={item.label}
                        className={`${s.legendItem} ${dimmed ? s.legendItemDimmed : ''}`}
                        onClick={() => handleTypeLegendClick(item.label)}
                        style={{
                          cursor: 'pointer',
                          opacity: dimmed ? 0.35 : 1,
                          transition: 'all 0.2s ease',
                          transform: active && selectedTypes.length > 0 ? 'translateX(4px)' : 'none',
                        }}
                      >
                        <span
                          className={s.legendSwatch}
                          style={{
                            background: item.color,
                            boxShadow: active && selectedTypes.length > 0 ? `0 0 8px ${item.color}` : 'none',
                            border: active && selectedTypes.length > 0 ? '1px solid #fff' : '1px solid rgba(255, 255, 255, 0.08)',
                          }}
                        />
                        <div className={s.legendTextGroup}>
                          <span
                            className={s.legendLabel}
                            style={{
                              color: active && selectedTypes.length > 0 ? 'var(--color-accent-gold)' : 'var(--color-text-primary)',
                              fontWeight: active && selectedTypes.length > 0 ? '700' : '600',
                            }}
                          >
                            {item.label}
                          </span>
                          <span className={s.legendDesc}>{item.desc}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {colorMode === 'uhi' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 className={s.legendTitle} style={{ margin: 0 }}>Urban Heat Island</h3>
                  {selectedUhiCells.length > 0 && (
                    <button
                      onClick={() => setSelectedUhiCells([])}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-accent-gold)',
                        fontSize: '11px',
                        cursor: 'pointer',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontFamily: 'var(--font-heading)',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212, 168, 94, 0.08)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
                <p className={s.legendDesc} style={{ margin: '0 0 10px', lineHeight: 1.4 }}>
                  Building age × summer surface temperature. Click cells below to filter map.
                </p>
                <div className={s.uhiGrid}>
                  {/* Y-axis label */}
                  <div className={s.uhiYLabel}>
                    <span>Hot</span>
                    <span>Cool</span>
                  </div>
                  {/* 3×3 cells — rows go from hot (top) to cool (bottom) */}
                  <div className={s.uhiCells}>
                    {[...UHI_MATRIX].reverse().map((row, ri) => {
                      const r = 2 - ri;
                      return (
                        <div key={ri} className={s.uhiRow}>
                          {row.map((color, ci) => {
                            const cellId = `${r}-${ci}`;
                            const isSelected = selectedUhiCells.includes(cellId);
                            const isAnySelected = selectedUhiCells.length > 0;
                            const isDimmed = isAnySelected && !isSelected;

                            return (
                              <div
                                key={ci}
                                className={`${s.uhiCell} ${isSelected ? s.active : ''} ${isDimmed ? s.dimmed : ''}`}
                                style={{ background: color }}
                                title={`${UHI_AGE_BINS[ci].label} · ${UHI_LST_BINS[r].label}`}
                                onClick={() => {
                                  setSelectedUhiCells((prev) =>
                                    prev.includes(cellId)
                                      ? prev.filter((x) => x !== cellId)
                                      : [...prev, cellId]
                                  );
                                }}
                              />
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                  {/* X-axis label */}
                  <div className={s.uhiXLabel}>
                    <span>Old</span>
                    <span>New</span>
                  </div>
                </div>
                <div className={s.uhiAxes}>
                  <span>↕ Surface Temp (LST)</span>
                  <span>↔ Building Age</span>
                </div>
                <div className={s.legendGradientSource}>Bivariate · year_int × lst_1mean</div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Hover tooltip — hidden while a building is selected, suppressed on touch */}
      {hoverInfo && !selectedBuilding && !IS_TOUCH_DEVICE && (() => {
        const p = hoverInfo.properties;

        if (p.isKabanbayModel) {
          return (
            <div className={s.tooltip} style={{ left: hoverInfo.x + 14, top: hoverInfo.y - 14 }}>
              <div className={s.tooltipName}>{String(p.name)}</div>
              <div className={s.tooltipHint}>Kabanbay Batyr Monument · 3D model</div>
            </div>
          );
        }

        const isHex = p.count !== undefined;

        // ── Hex tooltip ──────────────────────────────────────────────────
        if (isHex) {
          const count = Number(p.count);
          const avgYear = Number(p.avgYear);
          const avgH = Number(p.avgHeight);
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
        const demVal = p.dem_mean != null ? Number(p.dem_mean).toFixed(1) : null;
        const lstVal = p.lst_1mean != null ? Number(p.lst_1mean).toFixed(1) : null;
        const rawType = p.type ? String(p.type) : null;
        const typeLabel = rawType ? (TYPE_LABELS[rawType] || rawType) : null;
        const hasData = name || year || demVal || lstVal || typeLabel;
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
                {colorMode === 'elevation' && demVal && (
                  <div className={s.tooltipRow}>
                    <span className={s.tooltipKey}>Elevation</span>
                    <span className={s.tooltipVal} style={{ color: '#27ae60' }}>{demVal} m</span>
                  </div>
                )}
                {colorMode === 'lst' && lstVal && (
                  <div className={s.tooltipRow}>
                    <span className={s.tooltipKey}>Summer LST</span>
                    <span className={s.tooltipVal} style={{ color: '#fdae61' }}>{lstVal} °C</span>
                  </div>
                )}
                {colorMode === 'type' && typeLabel && (
                  <div className={s.tooltipRow}>
                    <span className={s.tooltipKey}>Use</span>
                    <span className={s.tooltipVal} style={{ color: '#a78bfa' }}>{typeLabel}</span>
                  </div>
                )}
                {colorMode === 'uhi' && (
                  <>
                    {year && (
                      <div className={s.tooltipRow}>
                        <span className={s.tooltipKey}>Age</span>
                        <span className={s.tooltipVal} style={{ color: '#64ACBE' }}>{2026 - Number(year)} yr</span>
                      </div>
                    )}
                    {lstVal && (
                      <div className={s.tooltipRow}>
                        <span className={s.tooltipKey}>LST</span>
                        <span className={s.tooltipVal} style={{ color: '#C8705A' }}>{lstVal} °C</span>
                      </div>
                    )}
                  </>
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
        collapsed={timelineCollapsed}
        onCollapsedChange={setTimelineCollapsed}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onPlayReset={handlePlayReset}
      />
    </div>
  );
}
