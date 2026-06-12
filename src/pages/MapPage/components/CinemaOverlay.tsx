import { Building2, Grid2x2 } from 'lucide-react';
import s from '../MapPage.module.scss';
import { ERA_CONFIG } from '../constants';
import type { HexMetric } from '../hexUtils';

interface CinemaOverlayProps {
  cinemaYear: number;
  sliderMax: number;
  vizMode: 'buildings' | 'hexagons';
  hexMetric: HexMetric;
  onSetVizMode: (mode: 'buildings' | 'hexagons') => void;
  onSetHexMetric: (metric: HexMetric) => void;
  onExit: () => void;
}

export function CinemaOverlay({
  cinemaYear,
  sliderMax,
  vizMode,
  hexMetric,
  onSetVizMode,
  onSetHexMetric,
  onExit,
}: CinemaOverlayProps) {
  const cinemaEra = ERA_CONFIG.find(
    (e) => e.label !== 'Unknown' && cinemaYear >= e.bounds[0] && cinemaYear <= e.bounds[1],
  );

  return (
    <div className={s.cinemaOverlay} role="region" aria-label="City growth time-lapse">
      <span className={s.cinemaYear}>{cinemaYear}</span>
      {cinemaEra && (
        <span className={s.cinemaEra} style={{ color: cinemaEra.color }}>
          {cinemaEra.label}
        </span>
      )}
      <div className={s.cinemaProgress} aria-hidden="true">
        <span
          style={{
            width: `${((cinemaYear - 1900) / Math.max(1, sliderMax - 1900)) * 100}%`,
          }}
        />
      </div>
      <div className={s.cinemaControls}>
        <div className={s.cinemaChipRow} role="group" aria-label="Time-lapse layer">
          <button
            className={`${s.cinemaChip} ${vizMode === 'buildings' ? s.cinemaChipActive : ''}`}
            onClick={() => onSetVizMode('buildings')}
          >
            <Building2 size={12} />
            <span>Buildings</span>
          </button>
          <button
            className={`${s.cinemaChip} ${vizMode === 'hexagons' ? s.cinemaChipActive : ''}`}
            onClick={() => onSetVizMode('hexagons')}
          >
            <Grid2x2 size={12} />
            <span>Hexagons</span>
          </button>
        </div>
        {vizMode === 'hexagons' && (
          <div className={s.cinemaChipRow} role="group" aria-label="Hexagon metric">
            <button
              className={`${s.cinemaChip} ${hexMetric === 'count' ? s.cinemaChipActive : ''}`}
              onClick={() => onSetHexMetric('count')}
            >
              Density
            </button>
            <button
              className={`${s.cinemaChip} ${hexMetric === 'year' ? s.cinemaChipActive : ''}`}
              onClick={() => onSetHexMetric('year')}
            >
              Avg Era
            </button>
          </div>
        )}
        <button className={s.cinemaExitBtn} onClick={onExit}>
          Exit cinema
        </button>
      </div>
    </div>
  );
}
