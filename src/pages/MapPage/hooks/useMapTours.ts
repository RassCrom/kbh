import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { TOURS, type Tour } from '../tours';
import { PREFERS_REDUCED_MOTION } from './useMapInit';

// Tour route/marker accent
const TOUR_ACCENT = '#d4a85e';
const TOUR_ACCENT_VISITED = 'rgba(212, 168, 94, 0.55)';

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
      current[1] + (next[1] - current[1]) * progress,
    ]);
  }
  if (coords.length === 1) coords.push([...coords[0]]);
  return {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: coords },
    properties: {},
  };
}

interface UseMapToursOptions {
  mapRef: React.MutableRefObject<maplibregl.Map | null>;
  mapLoaded: boolean;
  introActiveRef: React.MutableRefObject<boolean>;
  finishIntro: () => void;
  handleDismissHelpers: () => void;
  onEnterTour: () => void; // collapses UI panels
}

export function useMapTours(opts: UseMapToursOptions) {
  const [activeTour, setActiveTour] = useState<Tour | null>(null);
  const [tourStep, setTourStep] = useState(0);
  const activeTourRef = useRef<Tour | null>(null);
  useEffect(() => { activeTourRef.current = activeTour; }, [activeTour]);

  const tourStepRef = useRef(0);
  const tourProgressRef = useRef(0);
  const absoluteCurrentRef = useRef(0);
  const absoluteTargetRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const driftGuardRef = useRef(0);

  const pendingTourRef = useRef<Tour | null>(
    (() => {
      if (typeof window === 'undefined') return null;
      const id = new URLSearchParams(window.location.search).get('tour');
      return TOURS.find((t) => t.id === id) ?? null;
    })(),
  );

  // ── Sonar pulse ──────────────────────────────────────────────────────────
  const tourPulseRafRef = useRef<number | null>(null);

  const stopTourPulse = useCallback(() => {
    if (tourPulseRafRef.current !== null) {
      cancelAnimationFrame(tourPulseRafRef.current);
      tourPulseRafRef.current = null;
    }
  }, []);

  const startTourPulse = useCallback((map: maplibregl.Map) => {
    stopTourPulse();
    if (PREFERS_REDUCED_MOTION) return;
    const t0 = performance.now();
    const frame = (now: number) => {
      if (!map.getStyle() || !map.getLayer('tour-pulse')) {
        tourPulseRafRef.current = null;
        return;
      }
      const phase = ((now - t0) % 2200) / 2200;
      map.setPaintProperty('tour-pulse', 'circle-radius', 10 + phase * 26);
      map.setPaintProperty('tour-pulse', 'circle-opacity', 0.4 * (1 - phase));
      map.setPaintProperty('tour-pulse', 'circle-stroke-opacity', 0.7 * (1 - phase));
      tourPulseRafRef.current = requestAnimationFrame(frame);
    };
    tourPulseRafRef.current = requestAnimationFrame(frame);
  }, [stopTourPulse]);

  // ── Tour layers ──────────────────────────────────────────────────────────
  const updateTourLine = useCallback((map: maplibregl.Map, tour: Tour, step: number, progress: number) => {
    const src = map.getSource('tour-route') as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(getTourRouteData(tour, step, progress));
  }, []);

  const ensureTourLayers = useCallback((map: maplibregl.Map, tour: Tour) => {
    const baseRouteData: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: tour.stops.map((st) => st.camera.center) },
      properties: {},
    };

    if (!map.getSource('tour-route-base')) {
      map.addSource('tour-route-base', { type: 'geojson', data: baseRouteData });
      map.addLayer({
        id: 'tour-route-base-line',
        type: 'line',
        source: 'tour-route-base',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': TOUR_ACCENT, 'line-width': 2, 'line-dasharray': [1, 2], 'line-opacity': 0.3 },
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
        paint: { 'line-color': TOUR_ACCENT, 'line-width': 10, 'line-blur': 8, 'line-opacity': 0.8 },
      });
      map.addLayer({
        id: 'tour-route-core',
        type: 'line',
        source: 'tour-route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 2.5, 'line-opacity': 1 },
      });
    } else {
      (map.getSource('tour-route') as maplibregl.GeoJSONSource).setData(routeData);
      if (map.getLayer('tour-route-glow')) {
        map.setPaintProperty('tour-route-glow', 'line-color', TOUR_ACCENT);
        map.setLayoutProperty('tour-route-glow', 'visibility', 'visible');
      }
      if (map.getLayer('tour-route-core')) map.setLayoutProperty('tour-route-core', 'visibility', 'visible');
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

  // ── Public handlers ──────────────────────────────────────────────────────
  const handleStartTour = useCallback((tour: Tour) => {
    const map = opts.mapRef.current;
    if (!map || !map.getStyle()) return;
    if (opts.introActiveRef.current) opts.finishIntro();
    opts.handleDismissHelpers();
    opts.onEnterTour();
    setActiveTour(tour);
    tourStepRef.current = 0;
    tourProgressRef.current = 0;
    absoluteCurrentRef.current = 0;
    absoluteTargetRef.current = 0;
    cancelAnimationFrame(animFrameRef.current);
    setTourStep(0);
    ensureTourLayers(map, tour);
  }, [opts, ensureTourLayers]);

  const handleExitTour = useCallback(() => {
    const map = opts.mapRef.current;
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
  }, [opts.mapRef, stopTourPulse]);

  const handleStepChange = useCallback((newStep: number) => {
    tourStepRef.current = newStep;
    tourProgressRef.current = 0;
    absoluteCurrentRef.current = newStep;
    absoluteTargetRef.current = newStep;
    cancelAnimationFrame(animFrameRef.current);
    if (opts.mapRef.current && activeTour) {
      updateTourLine(opts.mapRef.current, activeTour, newStep, 0);
    }
    setTourStep(newStep);
  }, [activeTour, opts.mapRef, updateTourLine]);

  // ── Fly to each stop ─────────────────────────────────────────────────────
  useEffect(() => {
    const map = opts.mapRef.current;
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

    if (!PREFERS_REDUCED_MOTION) {
      map.once('moveend', () => {
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
  }, [activeTour, tourStep]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll / touch to advance tour ──────────────────────────────────────
  useEffect(() => {
    const map = opts.mapRef.current;
    if (!activeTour || !map) return;

    map.scrollZoom.disable();
    let touchLastY = 0;
    const MAX_ABS = activeTour.stops.length - 1;

    const animate = () => {
      const diff = absoluteTargetRef.current - absoluteCurrentRef.current;
      if (Math.abs(diff) < 0.001) {
        absoluteCurrentRef.current = absoluteTargetRef.current;
      } else {
        absoluteCurrentRef.current += diff * 0.15;
      }
      const currentAbs = absoluteCurrentRef.current;
      let newStep = Math.floor(currentAbs);
      let newProgress = currentAbs - newStep;
      if (newStep >= MAX_ABS) { newStep = MAX_ABS; newProgress = 0; }
      updateTourLine(map, activeTour, newStep, newProgress);
      if (newStep !== tourStepRef.current) { tourStepRef.current = newStep; setTourStep(newStep); }
      if (Math.abs(diff) >= 0.001) animFrameRef.current = requestAnimationFrame(animate);
    };

    const processScroll = (deltaY: number) => {
      absoluteTargetRef.current = Math.max(0, Math.min(MAX_ABS, absoluteTargetRef.current + deltaY * 0.0015));
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    const handleWheel = (e: WheelEvent) => processScroll(e.deltaY);
    const handleTouchStart = (e: TouchEvent) => { touchLastY = e.touches[0].clientY; };
    const handleTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      processScroll((touchY - touchLastY) * 2);
      touchLastY = touchY;
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      if (map) map.scrollZoom.enable();
    };
  }, [activeTour, updateTourLine]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Deep link: ?tour=<id> ────────────────────────────────────────────────
  useEffect(() => {
    if (!opts.mapLoaded || !pendingTourRef.current) return;
    const tour = pendingTourRef.current;
    pendingTourRef.current = null;
    handleStartTour(tour);
  }, [opts.mapLoaded, handleStartTour]);

  return {
    activeTour,
    activeTourRef,
    tourStep,
    handleStartTour,
    handleExitTour,
    handleStepChange,
    pendingTourRef,
  };
}
