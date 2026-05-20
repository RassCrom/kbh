import { useMemo } from 'react';
import s from '../MapPage.module.scss';

export function TimelineSlider({ min, max, value, onChange, data, sidebarOpen }: {
  min: number, max: number, value: [number, number], onChange: (v: [number, number]) => void,
  data: Record<number, number>, sidebarOpen: boolean
}) {
  const bins = useMemo(() => {
    let maxCount = 0;
    const result: { year: number, count: number }[] = [];
    for (let y = min; y <= max; y++) {
      const count = data[y] || 0;
      if (count > maxCount) maxCount = count;
      result.push({ year: y, count });
    }
    return { maxCount, bins: result };
  }, [min, max, data]);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(Number(e.target.value), value[1]);
    onChange([val, value[1]]);
  };
  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(Number(e.target.value), value[0]);
    onChange([value[0], val]);
  };

  const step = Math.max(10, Math.floor((max - min) / 5));
  const tickMarks = [];
  for (let y = Math.ceil(min / 10) * 10; y <= max; y += step) {
    tickMarks.push(y);
  }

  return (
    <div className={`${s.timelineContainer} ${sidebarOpen ? s.withSidebar : ''}`}>
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
          <div className={s.sliderRange} style={{ left: `${((value[0] - min) / (max - min)) * 100}%`, width: `${((value[1] - value[0]) / (max - min)) * 100}%` }} />
        </div>
        <input type="range" min={min} max={max} value={value[0]} onChange={handleMinChange} className={`${s.thumb} ${s.thumbLeft}`} />
        <input type="range" min={min} max={max} value={value[1]} onChange={handleMaxChange} className={`${s.thumb} ${s.thumbRight}`} />
      </div>
      <div className={s.labels} style={{ position: 'relative', height: '16px', marginTop: '4px' }}>
        {tickMarks.map(t => (
          <span key={t} style={{ position: 'absolute', left: `${((t - min) / (max - min)) * 100}%`, transform: 'translateX(-50%)' }}>{t}</span>
        ))}
      </div>
    </div>
  );
}
