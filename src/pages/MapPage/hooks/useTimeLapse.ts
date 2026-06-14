import { useState, useEffect, useRef, useCallback } from 'react';

const MS_PER_YEAR = 80;

interface Options {
  /** Called synchronously on each animation tick with the new year value.
   *  Use this to drive the map filter directly, bypassing React state lag. */
  onTick?: (year: number) => void;
}

export function useTimeLapse(initialMin: number, initialMax: number, { onTick }: Options = {}) {
  const [sliderMax, setSliderMax] = useState<number>(initialMax);
  const [yearRange, setYearRange] = useState<[number, number]>([initialMin, initialMax]);
  const [isPlaying, setIsPlaying] = useState(false);

  const sliderMaxRef = useRef(sliderMax);
  const onTickRef = useRef(onTick);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const currentYearRef = useRef<number>(initialMax);

  useEffect(() => { sliderMaxRef.current = sliderMax; }, [sliderMax]);
  useEffect(() => { onTickRef.current = onTick; }, [onTick]);

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTimeRef.current = null;
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      stopRaf();
      return;
    }

    const tick = (now: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = now;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const elapsed = now - lastTimeRef.current;
      const steps = Math.floor(elapsed / MS_PER_YEAR);

      if (steps > 0) {
        lastTimeRef.current += steps * MS_PER_YEAR;
        const nextYear = Math.min(currentYearRef.current + steps, sliderMaxRef.current);
        currentYearRef.current = nextYear;

        // Update the map immediately — no React state hop
        onTickRef.current?.(nextYear);

        // Update React state for UI display (slider, label, histogram)
        setYearRange((prev) => [prev[0], nextYear]);

        if (nextYear >= sliderMaxRef.current) {
          setIsPlaying(false);
          stopRaf();
          return;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return stopRaf;
  }, [isPlaying, stopRaf]);

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      currentYearRef.current = initialMin;
      setYearRange([initialMin, initialMin]);
      setIsPlaying(true);
    }
  }, [isPlaying, initialMin]);

  const handlePlayReset = useCallback(() => {
    setIsPlaying(false);
    setYearRange([initialMin, sliderMaxRef.current]);
  }, [initialMin]);

  return {
    sliderMax,
    setSliderMax,
    yearRange,
    setYearRange,
    isPlaying,
    setIsPlaying,
    handleTogglePlay,
    handlePlayReset,
  };
}
