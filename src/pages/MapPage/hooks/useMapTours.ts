import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { TOURS, type Tour } from '../tours';
import { PREFERS_REDUCED_MOTION } from './useMapInit';

// Tour route/marker accent
const TOUR_ACCENT = '#d4a85e';
const TOUR_ACCENT_VISITED = 'rgba(212, 168, 94, 0.55)';
const SCROLL_DISTANCE_PER_STOP = 360;
const LINE_FOLLOW_RATE = 0.16;
const CAMERA_FOLLOW_RATE = 0.055;

function getTourPosition(tour: Tour, step: number, progress: number): [number, number] {
  const isReturning = progress < 0 && step > 0;
  const fromIndex = isReturning ? step - 1 : step;
  const toIndex = isReturning ? step : Math.min(step + 1, tour.stops.length - 1);
  const amount = isReturning ? 1 + progress : progress;
  const from = tour.stops[fromIndex].camera.center;
  const to = tour.stops[toIndex].camera.center;
  return [
    from[0] + (to[0] - from[0]) * amount,
    from[1] + (to[1] - from[1]) * amount,
  ];
}

function getTourRouteData(tour: Tour, step: number, progress: number): GeoJSON.Feature {
  const coords: [number, number][] = [];
  const isReturning = progress < 0 && step > 0;
  const lastCompletedStop = isReturning ? step - 1 : step;
  for (let i = 0; i <= lastCompletedStop; i++) {
    coords.push(tour.stops[i].camera.center as [number, number]);
  }
  if (isReturning) {
    coords.push(getTourPosition(tour, step, progress));
  } else if (step < tour.stops.length - 1 && progress > 0) {
    coords.push(getTourPosition(tour, step, progress));
  }
  if (coords.length === 1) coords.push([...coords[0]]);
  return {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: coords },
    properties: {},
  };
}

function interpolateCamera(from: Tour['stops'][number]['camera'], to: Tour['stops'][number]['camera'], progress: number) {
  const bearingDelta = ((to.bearing - from.bearing + 540) % 360) - 180;
  return {
    center: [
      from.center[0] + (to.center[0] - from.center[0]) * progress,
      from.center[1] + (to.center[1] - from.center[1]) * progress,
    ] as [number, number],
    zoom: from.zoom + (to.zoom - from.zoom) * progress,
    pitch: from.pitch + (to.pitch - from.pitch) * progress,
    bearing: from.bearing + bearingDelta * progress,
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
  const { mapRef, introActiveRef, finishIntro, handleDismissHelpers, onEnterTour } = opts;
  const [activeTour, setActiveTour] = useState<Tour | null>(null);
  const [tourStep, setTourStep] = useState(0);
  const [tourPaused, setTourPaused] = useState(false);
  const activeTourRef = useRef<Tour | null>(null);
  useEffect(() => { activeTourRef.current = activeTour; }, [activeTour]);

  const tourStepRef = useRef(0);
  const driftGuardRef = useRef(0);
  const scrollDrivenStepRef = useRef(false);
  const tourTargetPositionRef = useRef(0);
  const tourLinePositionRef = useRef(0);
  const tourCameraPositionRef = useRef(0);

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
    const shine = map.getSource('tour-route-shine') as maplibregl.GeoJSONSource | undefined;
    if (shine) {
      shine.setData({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: getTourPosition(tour, step, progress) },
        properties: {},
      });
    }
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
    const routeShineData: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: getTourPosition(tour, 0, 0) },
      properties: {},
    };
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

    if (!map.getSource('tour-route-shine')) {
      map.addSource('tour-route-shine', { type: 'geojson', data: routeShineData });
      map.addLayer({
        id: 'tour-route-shine-glow',
        type: 'circle',
        source: 'tour-route-shine',
        paint: {
          'circle-radius': 15,
          'circle-color': '#ffffff',
          'circle-blur': 0.8,
          'circle-opacity': 0.8,
        },
      });
      map.addLayer({
        id: 'tour-route-shine-core',
        type: 'circle',
        source: 'tour-route-shine',
        paint: {
          'circle-radius': 4.5,
          'circle-color': '#ffffff',
          'circle-stroke-color': TOUR_ACCENT,
          'circle-stroke-width': 2,
        },
      });
    } else {
      (map.getSource('tour-route-shine') as maplibregl.GeoJSONSource).setData(routeShineData);
      ['tour-route-shine-glow', 'tour-route-shine-core'].forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'visible');
      });
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
    const map = mapRef.current;
    if (!map || !map.getStyle()) return;
    if (introActiveRef.current) finishIntro();
    handleDismissHelpers();
    onEnterTour();
    setActiveTour(tour);
    setTourPaused(false);
    tourStepRef.current = 0;
    tourTargetPositionRef.current = 0;
    tourLinePositionRef.current = 0;
    tourCameraPositionRef.current = 0;
    setTourStep(0);
    ensureTourLayers(map, tour);
  }, [
    mapRef,
    introActiveRef,
    finishIntro,
    handleDismissHelpers,
    onEnterTour,
    ensureTourLayers,
  ]);

  const handleExitTour = useCallback(() => {
    const map = opts.mapRef.current;
    setActiveTour(null);
    setTourStep(0);
    setTourPaused(false);
    tourTargetPositionRef.current = 0;
    tourLinePositionRef.current = 0;
    tourCameraPositionRef.current = 0;
    stopTourPulse();
    if (map && map.getStyle()) {
      ['tour-route-base-line', 'tour-route-glow', 'tour-route-core',
        'tour-route-shine-glow', 'tour-route-shine-core',
        'tour-pulse', 'tour-stops-points', 'tour-stops-labels'].forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
      });
      map.easeTo({ pitch: 0, duration: 800 });
    }
  }, [opts.mapRef, stopTourPulse]);

  const handleStepChange = useCallback((newStep: number) => {
    if (!activeTour) return;
    const nextStep = Math.max(0, Math.min(activeTour.stops.length - 1, newStep));
    tourStepRef.current = nextStep;
    tourTargetPositionRef.current = nextStep;
    tourLinePositionRef.current = nextStep;
    tourCameraPositionRef.current = nextStep;
    if (opts.mapRef.current && activeTour) {
      updateTourLine(opts.mapRef.current, activeTour, nextStep, 0);
    }
    setTourStep(nextStep);
  }, [activeTour, opts.mapRef, updateTourLine]);

  const handleTourPauseChange = useCallback((paused: boolean) => {
    driftGuardRef.current += 1;
    opts.mapRef.current?.stop();
    setTourPaused(paused);
  }, [opts.mapRef]);

  // ── Fly to each stop ─────────────────────────────────────────────────────
  useEffect(() => {
    const map = opts.mapRef.current;
    if (!map || !activeTour || !map.getStyle()) return;
    if (tourPaused) {
      map.stop();
      return;
    }
    const stop = activeTour.stops[tourStep];
    const guard = ++driftGuardRef.current;
    const scrollDriven = scrollDrivenStepRef.current;
    scrollDrivenStepRef.current = false;

    // Scroll progression already owns the camera. Only explicit controls should start a fly-to.
    if (!scrollDriven) {
      map.stop();
      map.flyTo({
        center: stop.camera.center,
        zoom: stop.camera.zoom,
        pitch: stop.camera.pitch,
        bearing: stop.camera.bearing,
        duration: PREFERS_REDUCED_MOTION ? 0 : 2100,
        curve: 1.42,
        essential: false,
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
  }, [activeTour, tourStep, tourPaused]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll / touch to advance tour ──────────────────────────────────────
  useEffect(() => {
    const map = opts.mapRef.current;
    if (!activeTour || !map || tourPaused) return;

    const scrollZoomWasEnabled = map.scrollZoom.isEnabled();
    const dragPanWasEnabled = map.dragPan.isEnabled();
    const touchZoomWasEnabled = map.touchZoomRotate.isEnabled();
    map.scrollZoom.disable();
    map.dragPan.disable();
    map.touchZoomRotate.disable();

    const maxPosition = activeTour.stops.length - 1;
    let lineFrame: number | null = null;
    let cameraFrame: number | null = null;
    let touchLastY = 0;

    const splitPosition = (position: number) => {
      const clamped = Math.max(0, Math.min(maxPosition, position));
      const step = Math.min(Math.floor(clamped), maxPosition);
      return { step, progress: step === maxPosition ? 0 : clamped - step };
    };

    const renderLinePosition = () => {
      const { step, progress } = splitPosition(tourLinePositionRef.current);
      updateTourLine(map, activeTour, step, progress);
    };

    const renderCameraPosition = () => {
      const { step, progress } = splitPosition(tourCameraPositionRef.current);
      const from = activeTour.stops[step].camera;
      const to = activeTour.stops[Math.min(step + 1, maxPosition)].camera;
      map.jumpTo(interpolateCamera(from, to, progress));
    };

    const commitReachedStop = (direction: number) => {
      const position = tourLinePositionRef.current;
      const reachedStep = direction < 0
        ? Math.max(0, Math.ceil(position - 0.001))
        : Math.min(maxPosition, Math.floor(position + 0.001));
      if (reachedStep !== tourStepRef.current) {
        scrollDrivenStepRef.current = true;
        tourStepRef.current = reachedStep;
        setTourStep(reachedStep);
      }
    };

    const followLine = () => {
      const remaining = tourTargetPositionRef.current - tourLinePositionRef.current;
      const direction = Math.sign(remaining);
      if (Math.abs(remaining) < 0.0005) {
        tourLinePositionRef.current = tourTargetPositionRef.current;
      } else {
        tourLinePositionRef.current += remaining * LINE_FOLLOW_RATE;
      }
      renderLinePosition();
      commitReachedStop(direction);

      if (tourLinePositionRef.current === tourTargetPositionRef.current) {
        lineFrame = null;
      } else {
        lineFrame = requestAnimationFrame(followLine);
      }
    };

    const followCamera = () => {
      const remaining = tourTargetPositionRef.current - tourCameraPositionRef.current;
      if (Math.abs(remaining) < 0.0005) {
        tourCameraPositionRef.current = tourTargetPositionRef.current;
        renderCameraPosition();
        cameraFrame = null;
        return;
      }
      tourCameraPositionRef.current += remaining * CAMERA_FOLLOW_RATE;
      renderCameraPosition();
      cameraFrame = requestAnimationFrame(followCamera);
    };

    const scheduleProgress = (direction: number) => {
      if (PREFERS_REDUCED_MOTION) {
        tourLinePositionRef.current = tourTargetPositionRef.current;
        tourCameraPositionRef.current = tourTargetPositionRef.current;
        renderLinePosition();
        renderCameraPosition();
        commitReachedStop(direction);
        return;
      }
      if (lineFrame === null) lineFrame = requestAnimationFrame(followLine);
      if (cameraFrame === null) cameraFrame = requestAnimationFrame(followCamera);
    };

    const progressTour = (distance: number) => {
      if (!distance) return;
      const previousTarget = tourTargetPositionRef.current;
      const nextTarget = Math.max(
        0,
        Math.min(maxPosition, previousTarget + distance / SCROLL_DISTANCE_PER_STOP),
      );
      if (nextTarget === previousTarget) return;

      // Stop the automatic camera drift once the visitor takes control.
      driftGuardRef.current += 1;
      map.stop();
      tourTargetPositionRef.current = nextTarget;
      scheduleProgress(Math.sign(nextTarget - previousTarget));
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const lineHeight = 18;
      const delta = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? event.deltaY * lineHeight
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? event.deltaY * window.innerHeight
          : event.deltaY;
      // Scroll up advances; scroll down moves back through the same continuous path.
      progressTour(-delta);
    };

    const handleTouchStart = (event: TouchEvent) => {
      touchLastY = event.touches[0]?.clientY ?? 0;
    };
    const handleTouchMove = (event: TouchEvent) => {
      const nextY = event.touches[0]?.clientY ?? touchLastY;
      progressTour(touchLastY - nextY);
      touchLastY = nextY;
      event.preventDefault();
    };
    const handleTouchEnd = () => {
      touchLastY = 0;
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      if (lineFrame !== null) cancelAnimationFrame(lineFrame);
      if (cameraFrame !== null) cancelAnimationFrame(cameraFrame);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      if (scrollZoomWasEnabled) map.scrollZoom.enable();
      if (dragPanWasEnabled) map.dragPan.enable();
      if (touchZoomWasEnabled) map.touchZoomRotate.enable();
    };
  }, [activeTour, tourPaused, opts.mapRef, updateTourLine]);

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
    tourPaused,
    handleStartTour,
    handleExitTour,
    handleStepChange,
    handleTourPauseChange,
    pendingTourRef,
  };
}
