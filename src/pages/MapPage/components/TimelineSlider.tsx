import { useMemo } from 'react';
import { Play, Pause, SkipBack, ChevronDown } from 'lucide-react';
import s from '../MapPage.module.scss';

interface Props {
  min: number;
  max: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  data: Record<number, number>;
  sidebarOpen: boolean;
  buildingOpen: boolean;
  legendOpen: boolean;
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  isPlaying: boolean;
  playSpeed: 1 | 2 | 4;
  onTogglePlay: () => void;
  onSpeedChange: (speed: 1 | 2 | 4) => void;
  onPlayReset: () => void;
}

const SPEEDS: (1 | 2 | 4)[] = [1, 2, 4];

export function TimelineSlider({
  min, max, value, onChange, data,
  sidebarOpen, buildingOpen, legendOpen,
  collapsed, onCollapsedChange,
  isPlaying, playSpeed, onTogglePlay, onSpeedChange, onPlayReset,
}: Props) {
  const bins = useMemo(() => {
    let maxCount = 0;
    const result: { year: number; count: number }[] = [];
    for (let y = min; y <= max; y++) {
      const count = data[y] || 0;
      if (count > maxCount) maxCount = count;
      result.push({ year: y, count });
    }
    return { maxCount, bins: result };
  }, [min, max, data]);

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

  return (
    <div className={`${s.timelineContainer} ${panelOpen ? s.withSidebar : ''} ${!legendOpen ? s.legendCollapsed : ''}`}>

      {/* ── Collapsible body: histogram + slider + labels ─────────── */}
      <div className={`${s.timelineCollapsible} ${collapsed ? s.timelineCollapsed : ''}`}>
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
            <div
              className={s.sliderRange}
              style={{
                left: `${((value[0] - min) / (max - min)) * 100}%`,
                width: `${((value[1] - value[0]) / (max - min)) * 100}%`,
              }}
            />
          </div>
          <input type="range" min={min} max={max} value={value[0]} onChange={handleMinChange} className={`${s.thumb} ${s.thumbLeft}`} />
          <input type="range" min={min} max={max} value={value[1]} onChange={handleMaxChange} className={`${s.thumb} ${s.thumbRight}`} />
        </div>

        <div className={s.labels} style={{ position: 'relative', height: '16px', marginTop: '4px' }}>
          {tickMarks.map((t) => (
            <span key={t} style={{ position: 'absolute', left: `${((t - min) / (max - min)) * 100}%`, transform: 'translateX(-50%)' }}>
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

        <span className={s.playYear}>
          {isPlaying ? value[1] : `${value[0]} – ${value[1]}`}
        </span>

        {/* Collapse / expand toggle */}
        <button
          className={s.timelineCollapseBtn}
          onClick={() => onCollapsedChange(!collapsed)}
          aria-label={collapsed ? 'Expand timeline' : 'Collapse timeline'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <ChevronDown size={14} className={`${s.timelineCollapseIcon} ${collapsed ? s.timelineCollapseIconUp : ''}`} />
        </button>
      </div>
    </div>
  );
}
