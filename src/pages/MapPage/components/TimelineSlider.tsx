import { useMemo, useState } from 'react';
import { Play, Pause, SkipBack, ChevronDown } from 'lucide-react';
import { eraForYear, type EraStop } from '../constants';
import s from '../MapPage.module.scss';

interface Props {
  min: number;
  max: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  data: Record<number, number>;
  eras: EraStop[];
  hoveredEra: string | null;
  onHoveredEraChange: (era: string | null) => void;
  sidebarOpen: boolean;
  buildingOpen: boolean;
  legendOpen: boolean;
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPlayReset: () => void;
}

// Builds a hard-stop CSS gradient so each era reads as a distinct band
// rather than blending into its neighbors.
function buildEraGradient(eras: EraStop[], min: number, max: number): string {
  const span = max - min || 1;
  const stops = eras
    .filter((e) => e.bounds[0] !== -1)
    .slice()
    .sort((a, b) => a.bounds[0] - b.bounds[0])
    .map((e) => {
      const start = Math.max(0, ((Math.max(e.bounds[0], min) - min) / span) * 100);
      const end = Math.min(100, ((Math.min(e.bounds[1], max) - min) / span) * 100);
      return { start, end, color: e.color };
    })
    .filter((seg) => seg.end > seg.start);

  if (stops.length === 0) return 'var(--tint-bar)';

  const parts: string[] = [];
  stops.forEach((seg) => {
    parts.push(`${seg.color} ${seg.start}%`, `${seg.color} ${seg.end}%`);
  });
  return `linear-gradient(to right, ${parts.join(', ')})`;
}

export function TimelineSlider({
  min, max, value, onChange, data, eras, hoveredEra, onHoveredEraChange,
  sidebarOpen, buildingOpen, legendOpen,
  collapsed, onCollapsedChange,
  isPlaying, onTogglePlay, onPlayReset,
}: Props) {
  const [hoveredBar, setHoveredBar] = useState<{ year: number; count: number; era: EraStop; leftPct: number } | null>(null);

  const bins = useMemo(() => {
    let maxCount = 0;
    const result: { year: number; count: number; era: EraStop }[] = [];
    for (let y = min; y <= max; y++) {
      const count = data[y] || 0;
      if (count > maxCount) maxCount = count;
      result.push({ year: y, count, era: eraForYear(y, eras) });
    }
    return { maxCount, bins: result };
  }, [min, max, data, eras]);

  const eraGradient = useMemo(() => buildEraGradient(eras, min, max), [eras, min, max]);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange([Math.min(Number(e.target.value), value[1]), value[1]]);
  };
  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange([value[0], Math.max(Number(e.target.value), value[0])]);
  };

  const step = Math.max(10, Math.floor((max - min) / 5));
  const tickMarks: number[] = [];
  for (let y = Math.ceil(min / 10) * 10; y <= max; y += step) tickMarks.push(y);

  const panelOpen = sidebarOpen || buildingOpen;

  // Slice of the full era gradient shown under the selected range, aligned
  // pixel-for-pixel with the dimmed full-width gradient behind it.
  const rangeLeftPct = ((value[0] - min) / (max - min)) * 100;
  const rangeWidthPct = ((value[1] - value[0]) / (max - min)) * 100;
  const rangeBackgroundSize = rangeWidthPct > 0 ? `${(100 / rangeWidthPct) * 100}% 100%` : '100% 100%';
  const rangeBackgroundPosition = rangeWidthPct > 0 ? `${-(rangeLeftPct / rangeWidthPct) * 100}% 0` : '0 0';

  return (
    <div className={`${s.timelineContainer} ${panelOpen ? s.withSidebar : ''} ${!legendOpen ? s.legendCollapsed : ''}`}>

      {/* Rendered outside the collapsible's clipped box so it can float above the histogram */}
      {!collapsed && hoveredBar && (
        <div
          className={s.timelineTooltip}
          style={{
            left: `${hoveredBar.leftPct}%`,
            top: 0,
            transform: hoveredBar.leftPct > 65
              ? 'translate(-100%, calc(-100% - 8px))'
              : 'translate(-4px, calc(-100% - 8px))',
            borderColor: hoveredBar.era.color,
          }}
        >
          <div className={s.timelineTooltipEra} style={{ color: hoveredBar.era.color }}>
            {hoveredBar.era.shortLabel}
          </div>
          <div className={s.timelineTooltipYear}>{hoveredBar.year}</div>
          <div className={s.timelineTooltipCount}>{hoveredBar.count.toLocaleString()} buildings</div>
        </div>
      )}

      {/* ── Collapsible body: histogram + slider + labels ─────────── */}
      <div
        id="map-timeline-controls"
        className={`${s.timelineCollapsible} ${collapsed ? s.timelineCollapsed : ''}`}
        aria-hidden={collapsed}
      >
        <div className={s.histogram} aria-hidden="true" onMouseLeave={() => setHoveredBar(null)}>
          {bins.bins.map((b, i) => {
            const active = b.year >= value[0] && b.year <= value[1];
            const dimmedByEra = !!hoveredEra && hoveredEra !== b.era.label;
            return (
              <div
                key={b.year}
                className={`${s.bar} ${active ? s.active : ''} ${dimmedByEra ? s.barDimmed : ''}`}
                style={{
                  height: bins.maxCount > 0 ? `${(b.count / bins.maxCount) * 100}%` : '0%',
                  background: b.era.color,
                  opacity: dimmedByEra ? 0.18 : active ? 1 : 0.4,
                  boxShadow: active && !dimmedByEra ? `0 0 6px ${b.era.color}99` : 'none',
                }}
                onClick={() => onChange([b.year, b.year])}
                onMouseEnter={() => {
                  setHoveredBar({ year: b.year, count: b.count, era: b.era, leftPct: ((i + 0.5) / bins.bins.length) * 100 });
                  onHoveredEraChange(b.era.label);
                }}
                onMouseLeave={() => onHoveredEraChange(null)}
              />
            );
          })}
        </div>

        <div className={s.sliders}>
          <div className={s.sliderTrack} style={{ background: eraGradient }}>
            <div className={s.sliderTrackDim} />
          </div>
          <div
            className={s.sliderRange}
            style={{
              left: `${rangeLeftPct}%`,
              width: `${rangeWidthPct}%`,
              backgroundImage: eraGradient,
              backgroundSize: rangeBackgroundSize,
              backgroundPosition: rangeBackgroundPosition,
            }}
          />
          <input
            type="range"
            min={min}
            max={max}
            value={value[0]}
            onChange={handleMinChange}
            className={`${s.thumb} ${s.thumbLeft}`}
            aria-label="Timeline start year"
            aria-valuetext={`${value[0]}`}
            tabIndex={collapsed ? -1 : 0}
          />
          <input
            type="range"
            min={min}
            max={max}
            value={value[1]}
            onChange={handleMaxChange}
            className={`${s.thumb} ${s.thumbRight}`}
            aria-label="Timeline end year"
            aria-valuetext={`${value[1]}`}
            tabIndex={collapsed ? -1 : 0}
          />
        </div>

        <div className={s.labels} style={{ position: 'relative', height: '16px' }}>
          {tickMarks.map((t) => (
            <span
              key={t}
              style={{
                position: 'absolute',
                left: `${((t - min) / (max - min)) * 100}%`,
                transform: t === tickMarks[0] ? 'none' : 'translateX(-50%)',
                color: eraForYear(t, eras).color,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* ── Play controls (always visible) ───────────────────────── */}
      <div className={`${s.playRow} ${collapsed ? s.playRowCollapsed : ''}`}>
        <button className={s.playReset} onClick={onPlayReset} title="Reset to full range" aria-label="Reset timeline">
          <SkipBack size={13} />
        </button>

        <button
          className={`${s.playMain} ${isPlaying ? s.playing : ''}`}
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Pause animation' : 'Play time-lapse'}
        >
          {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
        </button>

        <output className={s.playYear} aria-live="polite">
          {isPlaying ? value[1] : `${value[0]} – ${value[1]}`}
        </output>

        {/* Collapse / expand toggle */}
        <button
          className={s.timelineCollapseBtn}
          onClick={() => onCollapsedChange(!collapsed)}
          aria-label={collapsed ? 'Expand timeline' : 'Collapse timeline'}
          aria-expanded={!collapsed}
          aria-controls="map-timeline-controls"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <ChevronDown size={14} className={`${s.timelineCollapseIcon} ${collapsed ? s.timelineCollapseIconUp : ''}`} />
        </button>
      </div>
    </div>
  );
}
