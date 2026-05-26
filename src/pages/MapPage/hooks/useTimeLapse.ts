import { useState, useEffect, useRef, useCallback } from 'react';

export function useTimeLapse(initialMin: number, initialMax: number) {
  const [sliderMax, setSliderMax] = useState<number>(initialMax);
  const [yearRange, setYearRange] = useState<[number, number]>([initialMin, initialMax]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed] = useState<1 | 2 | 4>(1);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sliderMaxRef = useRef(sliderMax);
  const playSpeedRef = useRef(playSpeed);

  useEffect(() => {
    sliderMaxRef.current = sliderMax;
  }, [sliderMax]);

  useEffect(() => {
    playSpeedRef.current = playSpeed;
  }, [playSpeed]);

  useEffect(() => {
    if (!isPlaying) {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
      return;
    }

    playIntervalRef.current = setInterval(() => {
      setYearRange((prev) => {
        const next = prev[1] + playSpeedRef.current;
        if (next >= sliderMaxRef.current) {
          if (playIntervalRef.current) clearInterval(playIntervalRef.current);
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
