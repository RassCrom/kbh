import { useEffect, useRef, useState } from 'react';
import {
  Route, X, ChevronLeft, ChevronRight, MapPin, Clock, Flag,
  Volume2, VolumeX, Play, Pause, MonitorSpeaker, Compass, ArrowUp,
} from 'lucide-react';
import { TOURS, type Tour } from '../tours';
import { formatTourDistance } from '../../../data/tourDistances';
import { useTourNarration } from '../hooks/useTourNarration';
import s from '../MapPage.module.scss';

const AUTO_ADVANCE_MS = 12000; // silent-autoplay dwell time per stop

interface TourPanelProps {
  activeTour: Tour | null;
  tourStep: number;
  tourPaused: boolean;
  onStartTour: (tour: Tour) => void;
  onStepChange: (step: number) => void;
  onPauseChange: (paused: boolean) => void;
  onExitTour: () => void;
}

/**
 * Two states: a launcher button opening the tour catalogue, and — once a
 * tour is running — a bottom narrative card with prev/next stop controls,
 * voice narration (ElevenLabs MP3s with Web Speech fallback) and autoplay.
 */
export function TourPanel({
  activeTour, tourStep, tourPaused, onStartTour, onStepChange, onPauseChange, onExitTour,
}: TourPanelProps) {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [autoplayOn, setAutoplayOn] = useState(false);

  const isLast = activeTour ? tourStep === activeTour.stops.length - 1 : false;

  // Refs so narration/timer callbacks see current values without re-subscribing
  const stateRef = useRef({ tourStep, isLast, autoplayOn, tourPaused });
  stateRef.current = { tourStep, isLast, autoplayOn, tourPaused };

  const narration = useTourNarration({
    tour: activeTour,
    step: tourStep,
    enabled: !!activeTour && voiceOn && !tourPaused,
    onEnded: () => {
      const cur = stateRef.current;
      if (cur.autoplayOn && !cur.isLast && !cur.tourPaused) {
        // Small breath between stops, then move on
        window.setTimeout(() => {
          const latest = stateRef.current;
          if (latest.autoplayOn && !latest.isLast && !latest.tourPaused) {
            onStepChange(latest.tourStep + 1);
          }
        }, 1400);
      }
    },
  });

  // Silent autoplay: when voice is off, advance on a fixed timer
  useEffect(() => {
    if (!activeTour || !autoplayOn || voiceOn || isLast || tourPaused) return;
    const t = window.setTimeout(() => onStepChange(tourStep + 1), AUTO_ADVANCE_MS);
    return () => window.clearTimeout(t);
  }, [activeTour, autoplayOn, voiceOn, isLast, tourStep, tourPaused, onStepChange]);

  // Keyboard navigation while a tour runs
  useEffect(() => {
    if (!activeTour) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') {
        onExitTour();
        return;
      }
      if (stateRef.current.tourPaused) return;
      if ((e.key === 'ArrowRight' || e.key === 'ArrowUp') && !stateRef.current.isLast) {
        e.preventDefault();
        onStepChange(stateRef.current.tourStep + 1);
      } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowDown') && stateRef.current.tourStep > 0) {
        e.preventDefault();
        onStepChange(stateRef.current.tourStep - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeTour, onStepChange, onExitTour]);

  // Reset playback prefs whenever a tour starts/ends
  useEffect(() => {
    setAutoplayOn(false);
  }, [activeTour]);

  // ── Active tour: narrative card ─────────────────────────────────────────
  if (activeTour) {
    const stop = activeTour.stops[tourStep];
    const isFirst = tourStep === 0;
    // Key change re-triggers the card entrance animation on every stop
    const animKey = `${activeTour.id}-${tourStep}`;

    // data-tour-card lets useMapTours measure this card and offset the map
    // centre above it, so the route never runs underneath the narration.
    return (
      <div className={s.tourCard} data-tour-card key={animKey} role="region" aria-label="Guided tour">
        {/* Silent-autoplay countdown rail */}
        {autoplayOn && !voiceOn && !isLast && (
          <span
            className={s.tourAutoTimer}
            style={{ background: activeTour.color, animationDuration: `${AUTO_ADVANCE_MS}ms` }}
            aria-hidden="true"
          />
        )}

        <div className={s.tourCardTop}>
          <span className={s.tourCardTourName} style={{ color: activeTour.color }}>
            <Route size={11} />
            {activeTour.title}
          </span>

          <div className={s.tourCardControls}>
            <button
              className={`${s.tourCtrlBtn} ${tourPaused ? s.tourCtrlBtnActive : ''}`}
              onClick={() => onPauseChange(!tourPaused)}
              title={tourPaused ? 'Resume guided camera' : 'Pause and explore the map'}
              aria-label={tourPaused ? 'Resume guided tour' : 'Pause tour and enter explorer mode'}
              aria-pressed={tourPaused}
            >
              {tourPaused ? <Play size={13} /> : <Compass size={13} />}
              <span className={s.tourCtrlLabel}>{tourPaused ? 'Resume' : 'Explore'}</span>
            </button>

            {/* Voice narration toggle */}
            <button
              className={`${s.tourCtrlBtn} ${voiceOn ? s.tourCtrlBtnActive : ''}`}
              onClick={() => setVoiceOn((v) => !v)}
              title={voiceOn ? 'Mute narration' : 'Narrate stops aloud'}
              aria-label={voiceOn ? 'Mute narration' : 'Enable voice narration'}
              aria-pressed={voiceOn}
            >
              {voiceOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
            </button>

            {/* Pause / resume narration — only meaningful while voice is on */}
            {voiceOn && (
              <button
                className={s.tourCtrlBtn}
                onClick={narration.toggle}
                title={narration.status === 'playing' ? 'Pause narration' : 'Play narration'}
                aria-label={narration.status === 'playing' ? 'Pause narration' : 'Play narration'}
              >
                {narration.status === 'playing' ? <Pause size={13} /> : <Play size={13} />}
              </button>
            )}

            {/* Autoplay tour toggle */}
            <button
              className={`${s.tourCtrlBtn} ${autoplayOn ? s.tourCtrlBtnActive : ''}`}
              onClick={() => setAutoplayOn((v) => !v)}
              title={autoplayOn ? 'Stop auto-advancing' : 'Auto-advance through stops'}
              aria-label={autoplayOn ? 'Disable autoplay' : 'Enable autoplay'}
              aria-pressed={autoplayOn}
            >
              <MonitorSpeaker size={13} />
              <span className={s.tourCtrlLabel}>Auto</span>
            </button>

            <button className={s.tourExitBtn} onClick={onExitTour} aria-label="Exit tour (Esc)">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Browser-voice fallback notice */}
        {voiceOn && narration.usingFallback && (
          <span className={s.tourFallbackNote}>
            Using browser voice — studio narration not generated yet
          </span>
        )}

        {/* Progress dots */}
        <div className={s.tourProgress} aria-label={`Stop ${tourStep + 1} of ${activeTour.stops.length}`}>
          {activeTour.stops.map((st, i) => (
            <button
              key={st.id}
              className={`${s.tourDot} ${i === tourStep ? s.tourDotActive : ''} ${i < tourStep ? s.tourDotDone : ''}`}
              style={i <= tourStep ? { background: activeTour.color } : undefined}
              onClick={() => onStepChange(i)}
              aria-label={`Go to stop ${i + 1}: ${st.name}`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <div className={s.tourStopHeader}>
          <span className={s.tourStopIndex} style={{ color: activeTour.color }}>
            {String(tourStep + 1).padStart(2, '0')}
          </span>
          <div className={s.tourStopTitleWrap}>
            <h3 className={s.tourStopName}>{stop.name}</h3>
            <span className={s.tourStopYear}>{stop.year}</span>
          </div>
        </div>

        <p className={s.tourStopText}>
          {voiceOn && !narration.usingFallback
            ? stop.text.split(/\s+/).map((word, i) => (
                <span
                  key={i}
                  className={narration.activeWordIndex === i ? s.tourWordActive : undefined}
                >
                  {word}{' '}
                </span>
              ))
            : stop.text}
        </p>

        <div className={`${s.tourGestureHint} ${tourPaused ? s.tourGestureHintPaused : ''}`}>
          {tourPaused ? (
            <><Compass size={13} /> Explorer mode — map gestures are available</>
          ) : isLast ? (
            <><Flag size={13} /> Tour complete — finish or revisit a step</>
          ) : (
            <><ArrowUp size={13} /> Scroll or swipe up for the next point</>
          )}
        </div>

        <div className={s.tourNav}>
          <button
            className={s.tourNavBtn}
            onClick={() => onStepChange(tourStep - 1)}
            disabled={isFirst}
            aria-label="Previous stop (left arrow)"
          >
            <ChevronLeft size={15} />
            <span>Back</span>
          </button>
          <span className={s.tourNavCount}>
            {tourStep + 1} / {activeTour.stops.length}
          </span>
          {isLast ? (
            <button
              className={`${s.tourNavBtn} ${s.tourNavBtnPrimary}`}
              onClick={onExitTour}
              style={{ borderColor: activeTour.color, color: activeTour.color }}
            >
              <Flag size={13} />
              <span>Finish</span>
            </button>
          ) : (
            <button
              className={`${s.tourNavBtn} ${s.tourNavBtnPrimary}`}
              onClick={() => onStepChange(tourStep + 1)}
              style={{ borderColor: activeTour.color, color: activeTour.color }}
              aria-label="Next stop (right arrow)"
            >
              <span>Next</span>
              <ChevronRight size={15} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Idle: launcher + catalogue ──────────────────────────────────────────
  return (
    <>
      <button
        className={`${s.tourLauncherBtn} ${catalogOpen ? s.tourLauncherBtnActive : ''}`}
        onClick={() => setCatalogOpen((v) => !v)}
        title="Guided building tours"
        aria-label="Open guided tours"
        aria-expanded={catalogOpen}
      >
        <Route size={13} />
        <span>Tours</span>
      </button>

      {catalogOpen && (
        <div className={s.tourCatalog} role="dialog" aria-label="Tour catalogue">
          <div className={s.tourCatalogHeader}>
            <h3 className={s.tourCatalogTitle}>Guided Tours</h3>
            <button
              className={s.tourExitBtn}
              onClick={() => setCatalogOpen(false)}
              aria-label="Close tour list"
            >
              <X size={14} />
            </button>
          </div>
          <p className={s.tourCatalogSub}>
            Cinematic fly-throughs with optional voice narration
          </p>
          <div className={s.tourList}>
            {TOURS.map((tour) => (
              <button
                key={tour.id}
                className={s.tourListItem}
                onClick={() => {
                  setCatalogOpen(false);
                  onStartTour(tour);
                }}
              >
                <span className={s.tourListStrip} style={{ background: tour.color }} />
                <span className={s.tourListBody}>
                  <span className={s.tourListTitle}>{tour.title}</span>
                  <span className={s.tourListTagline}>{tour.tagline}</span>
                  <span className={s.tourListMeta}>
                    <span><MapPin size={10} /> {tour.stops.length} stops</span>
                    <span><Clock size={10} /> {tour.duration}</span>
                    {formatTourDistance(tour.id) && (
                      <span><Route size={10} /> {formatTourDistance(tour.id)}</span>
                    )}
                    <span className={s.tourListEra} style={{ color: tour.color }}>{tour.era}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
