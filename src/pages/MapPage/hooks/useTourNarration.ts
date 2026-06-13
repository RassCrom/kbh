import { useCallback, useEffect, useRef, useState } from 'react';
import type { Tour } from '../tours';

export type NarrationStatus = 'idle' | 'playing' | 'paused' | 'unavailable';

export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

interface Options {
  tour: Tour | null;
  step: number;
  /** Master switch — when false nothing ever plays. */
  enabled: boolean;
  /** Fired when the narration for the current stop finishes. */
  onEnded?: () => void;
}

/**
 * Voice narration for guided tours with word-level karaoke highlighting.
 *
 * Primary source: pre-generated ElevenLabs MP3s + timing JSONs from
 *   /audio/tours/<tourId>/<stopId>.mp3
 *   /audio/tours/<tourId>/<stopId>.json
 * (created by `scratch/generate-tour-audio.mjs` — see that file for setup).
 *
 * Fallback: if the MP3 is missing, the stop text is spoken through the
 * browser's Web Speech API (no word highlighting in fallback mode).
 */
export function useTourNarration({ tour, step, enabled, onEnded }: Options) {
  const [status, setStatus] = useState<NarrationStatus>('idle');
  const [usingFallback, setUsingFallback] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wordsRef = useRef<WordTiming[]>([]);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  // Token guards against stale async callbacks after rapid step changes
  const playTokenRef = useRef(0);

  const stopAll = useCallback(() => {
    playTokenRef.current += 1;
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute('src');
      a.load();
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    wordsRef.current = [];
    setStatus('idle');
    setActiveWordIndex(-1);
  }, []);

  const speakFallback = useCallback((text: string, token: number) => {
    if (!('speechSynthesis' in window)) {
      setStatus('unavailable');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.96;
    utterance.pitch = 0.95;
    const preferred = window.speechSynthesis
      .getVoices()
      .find((v) => v.lang.startsWith('en') && /natural|neural|online/i.test(v.name));
    if (preferred) utterance.voice = preferred;
    utterance.onend = () => {
      if (playTokenRef.current !== token) return;
      setStatus('idle');
      setActiveWordIndex(-1);
      onEndedRef.current?.();
    };
    utterance.onerror = () => {
      if (playTokenRef.current !== token) return;
      setStatus('unavailable');
    };
    setUsingFallback(true);
    setStatus('playing');
    window.speechSynthesis.speak(utterance);
  }, []);

  const play = useCallback(() => {
    if (!tour) return;
    const stop = tour.stops[step];
    if (!stop) return;

    playTokenRef.current += 1;
    const token = playTokenRef.current;

    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    wordsRef.current = [];
    setActiveWordIndex(-1);

    // Load word timings in parallel — silently ignore if not generated yet
    fetch(`/audio/tours/${tour.id}/${stop.id}.json`)
      .then((r) => (r.ok ? r.json() : []))
      .then((words: WordTiming[]) => {
        if (playTokenRef.current === token) wordsRef.current = words;
      })
      .catch(() => {});

    audio.src = `/audio/tours/${tour.id}/${stop.id}.mp3`;

    audio.ontimeupdate = () => {
      const t = audio.currentTime;
      const words = wordsRef.current;
      if (!words.length) return;
      // Find the word currently being spoken
      let idx = -1;
      for (let i = 0; i < words.length; i++) {
        if (t >= words[i].start && t <= words[i].end) {
          idx = i;
          break;
        }
      }
      setActiveWordIndex(idx);
    };

    audio.onended = () => {
      if (playTokenRef.current !== token) return;
      setStatus('idle');
      setActiveWordIndex(-1);
      onEndedRef.current?.();
    };
    audio.onerror = () => {
      // MP3 not generated (or fetch failed) — fall back to speech synthesis
      if (playTokenRef.current !== token) return;
      wordsRef.current = [];
      speakFallback(stop.text, token);
    };
    setUsingFallback(false);
    audio
      .play()
      .then(() => {
        if (playTokenRef.current === token) setStatus('playing');
      })
      .catch(() => {
        if (playTokenRef.current === token) speakFallback(stop.text, token);
      });
  }, [tour, step, speakFallback]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
    setStatus('paused');
  }, []);

  const resume = useCallback(() => {
    if (usingFallback && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
      setStatus('playing');
      return;
    }
    audioRef.current
      ?.play()
      .then(() => setStatus('playing'))
      .catch(() => setStatus('unavailable'));
  }, [usingFallback]);

  const toggle = useCallback(() => {
    if (status === 'playing') pause();
    else if (status === 'paused') resume();
    else play();
  }, [status, pause, resume, play]);

  // Auto-start narration on stop change while enabled; stop when disabled
  useEffect(() => {
    if (!tour || !enabled) {
      stopAll();
      return;
    }
    play();
    return stopAll;
  }, [tour, step, enabled, play, stopAll]);

  // Full teardown on unmount
  useEffect(() => () => stopAll(), [stopAll]);

  return { status, usingFallback, activeWordIndex, toggle, stop: stopAll };
}
