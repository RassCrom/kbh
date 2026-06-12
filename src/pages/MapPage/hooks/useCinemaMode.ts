import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { ASTANA_CAMERA, PREFERS_REDUCED_MOTION } from './useMapInit';

interface UseCinemaModeOptions {
  mapRef: React.MutableRefObject<maplibregl.Map | null>;
  introActiveRef: React.MutableRefObject<boolean>;
  finishIntro: () => void;
  sliderMax: number;
  handlePlayReset: () => void;
  setYearRange: (range: [number, number]) => void;
  onEnterCinema: () => void; // collapses UI panels
}

export function useCinemaMode(opts: UseCinemaModeOptions) {
  const [cinemaActive, setCinemaActive] = useState(false);
  const [cinemaYear, setCinemaYear] = useState(1900);
  const cinemaActiveRef = useRef(false);

  useEffect(() => {
    cinemaActiveRef.current = cinemaActive;
  }, [cinemaActive]);

  const handleStartCinema = useCallback(() => {
    const map = opts.mapRef.current;
    if (!map || !map.getStyle()) return;
    if (opts.introActiveRef.current) opts.finishIntro();
    opts.onEnterCinema();
    setCinemaActive(true);
  }, [opts]);

  const handleExitCinema = useCallback(() => setCinemaActive(false), []);

  useEffect(() => {
    const map = opts.mapRef.current;
    if (!cinemaActive || !map || !map.getStyle()) return;

    const START_YEAR = 1900;
    const endYear = opts.sliderMax;
    const SWEEP_MS = 45000;

    map.easeTo({
      center: ASTANA_CAMERA.center,
      zoom: 13.9,
      pitch: 57,
      bearing: -20,
      duration: PREFERS_REDUCED_MOTION ? 0 : 2600,
      essential: true,
    });

    setCinemaYear(START_YEAR);
    opts.setYearRange([START_YEAR, START_YEAR]);

    let raf = 0;
    let startTs: number | null = null;
    let lastYear = START_YEAR;
    let orbit = !PREFERS_REDUCED_MOTION;
    let doneTimer: number | null = null;

    const stopOrbit = () => { orbit = false; };
    const stopOrbitIfUser = (e: { originalEvent?: unknown }) => { if (e.originalEvent) orbit = false; };
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
        opts.setYearRange([START_YEAR, year]);
      }
      if (orbit && elapsed > 2800) {
        map.setBearing(-20 + (elapsed - 2800) * 0.0028);
      }
      if (t >= 1 && doneTimer === null) {
        doneTimer = window.setTimeout(() => setCinemaActive(false), 2600);
      }
      if (t < 1 || orbit) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setCinemaActive(false); };
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
      opts.handlePlayReset();
    };
  }, [cinemaActive]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    cinemaActive,
    cinemaActiveRef,
    cinemaYear,
    handleStartCinema,
    handleExitCinema,
  };
}
