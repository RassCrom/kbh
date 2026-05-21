import { Grid2x2, Building2, Loader } from 'lucide-react';
import type { HexMetric } from '../hexUtils';
import s from '../MapPage.module.scss';

interface HexControlsProps {
  vizMode: 'buildings' | 'hexagons';
  onVizModeChange: (mode: 'buildings' | 'hexagons') => void;
  hexMetric: HexMetric;
  onHexMetricChange: (metric: HexMetric) => void;
  hexLoading: boolean;
}

export function HexControls({
  vizMode, onVizModeChange,
  hexMetric, onHexMetricChange,
  hexLoading,
}: HexControlsProps) {
  return (
    <div className={s.vizToggleGroup}>
      {/* Mode toggle */}
      <div className={s.vizToggleRow}>
        <button
          className={`${s.vizBtn} ${vizMode === 'buildings' ? s.vizBtnActive : ''}`}
          onClick={() => onVizModeChange('buildings')}
          title="Building footprints coloured by era"
        >
          <Building2 size={13} />
          <span>Buildings</span>
        </button>
        <button
          className={`${s.vizBtn} ${vizMode === 'hexagons' ? s.vizBtnActive : ''}`}
          onClick={() => onVizModeChange('hexagons')}
          title="Hexagonal density / era grid"
        >
          {hexLoading && vizMode !== 'hexagons'
            ? <Loader size={13} className={s.vizSpinner} />
            : <Grid2x2 size={13} />}
          <span>Hexagons</span>
        </button>
      </div>

      {/* Metric selector — only when hexagons active */}
      {vizMode === 'hexagons' && !hexLoading && (
        <div className={s.vizMetricRow}>
          <button
            className={`${s.vizMetricBtn} ${hexMetric === 'count' ? s.vizMetricActive : ''}`}
            onClick={() => onHexMetricChange('count')}
          >
            Density
          </button>
          <button
            className={`${s.vizMetricBtn} ${hexMetric === 'year' ? s.vizMetricActive : ''}`}
            onClick={() => onHexMetricChange('year')}
          >
            Avg Era
          </button>
        </div>
      )}

      {vizMode === 'hexagons' && hexLoading && (
        <div className={s.vizLoadingRow}>
          <Loader size={11} className={s.vizSpinner} />
          <span>Loading hexagons…</span>
        </div>
      )}
    </div>
  );
}
