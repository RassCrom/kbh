import { useState } from 'react';
import { Grid2x2, Building2, Loader, Info } from 'lucide-react';
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
  const [showInfo, setShowInfo] = useState(false);
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
        <div className={s.vizMetricWrap}>
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

          <button
            className={`${s.vizInfoBtn} ${showInfo ? s.vizInfoBtnActive : ''}`}
            onClick={() => setShowInfo((prev) => !prev)}
            title="What is this visualization?"
            type="button"
          >
            <Info size={13} />
          </button>
        </div>
      )}

      {vizMode === 'hexagons' && hexLoading && (
        <div className={s.vizLoadingRow}>
          <Loader size={11} className={s.vizSpinner} />
          <span>Loading hexagons…</span>
        </div>
      )}

      {/* Contextual glassmorphism explanation popover */}
      {vizMode === 'hexagons' && showInfo && (
        <div className={s.hexInfoPopover}>
          <h4 className={s.hexInfoTitle}>Hexagonal Analysis</h4>
          <p className={s.hexInfoText}>
            {hexMetric === 'count'
              ? 'Aggregates building footprint densities into H3 grid cells. Tall, glowing cells highlight areas of extremely dense development.'
              : 'Computes the mathematical average construction year for all buildings in each cell. Allows visual detection of historical urban centers and rapid expansion zones.'}
          </p>
          <div className={s.hexInfoFooter}>
            <span>Spatial Scale: H3 Resolution 9 (~100m spacing)</span>
          </div>
        </div>
      )}
    </div>
  );
}
