import { useCallback } from 'react';
import { Info, X } from 'lucide-react';
import { ERA_CONFIG, TYPE_GROUP_MAPPING } from '../constants';
import {
  TYPE_LEGEND,
  UHI_MATRIX,
  UHI_AGE_BINS,
  UHI_LST_BINS,
  ELEVATION_STEPS,
  LST_STEPS,
  type ColorMode
} from '../mapHelpers';
import s from '../MapPage.module.scss';

interface LegendPanelProps {
  colorMode: ColorMode;
  legendOpen: boolean;
  onLegendOpenChange: (open: boolean) => void;
  hoveredEra: string | null;
  onHoveredEraChange: (era: string | null) => void;
  onYearRangeChange: (range: [number, number]) => void;
  sliderMax: number;
  selectedTypes: string[];
  onSelectedTypesChange: (types: string[] | ((prev: string[]) => string[])) => void;
  selectedUhiCells: string[];
  onSelectedUhiCellsChange: (cells: string[] | ((prev: string[]) => string[])) => void;
}

export function LegendPanel({
  colorMode,
  legendOpen,
  onLegendOpenChange,
  hoveredEra,
  onHoveredEraChange,
  onYearRangeChange,
  sliderMax,
  selectedTypes,
  onSelectedTypesChange,
  selectedUhiCells,
  onSelectedUhiCellsChange,
}: LegendPanelProps) {

  const handleTypeLegendClick = useCallback((groupLabel: string) => {
    const vals = TYPE_GROUP_MAPPING[groupLabel] || [];
    if (vals.length === 0) return;

    onSelectedTypesChange((prev) => {
      const allSelected = vals.every((v) => prev.includes(v));
      if (allSelected) {
        return prev.filter((v) => !vals.includes(v));
      } else {
        return [...new Set([...prev, ...vals])];
      }
    });
  }, [onSelectedTypesChange]);

  const isTypeGroupActive = useCallback((groupLabel: string) => {
    if (selectedTypes.length === 0) return true;
    const vals = TYPE_GROUP_MAPPING[groupLabel] || [];
    return vals.some((v) => selectedTypes.includes(v));
  }, [selectedTypes]);

  return (
    <div className={`${s.legend} ${legendOpen ? s.open : ''}`}>
      <button
        className={s.legendToggle}
        onClick={() => onLegendOpenChange(!legendOpen)}
        aria-label={legendOpen ? 'Close legend' : 'Open legend'}
      >
        {legendOpen ? <X size={16} /> : <Info size={16} />}
      </button>

      {legendOpen && (
        <div className={s.legendBody}>
          {colorMode === 'year' && (
            <>
              <h3 className={s.legendTitle}>Building Era</h3>
              <ul className={s.legendList}>
                {ERA_CONFIG.map((era) => (
                  <li
                    key={era.label}
                    className={s.legendItem}
                    onMouseEnter={() => onHoveredEraChange(era.label)}
                    onMouseLeave={() => onHoveredEraChange(null)}
                    onClick={() => {
                      if (era.bounds[0] !== -1) {
                        onYearRangeChange([Math.max(1900, era.bounds[0]), Math.min(sliderMax, era.bounds[1])]);
                      }
                    }}
                    style={{
                      cursor: era.bounds[0] !== -1 ? 'pointer' : 'default',
                      opacity: hoveredEra && hoveredEra !== era.label ? 0.35 : 1,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <span className={s.legendSwatch} style={{ background: era.color }} />
                    <div className={s.legendTextGroup}>
                      <span className={s.legendLabel}>{era.label}</span>
                      <span className={s.legendDesc}>{era.description}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <button
                className={s.resetButton}
                onClick={() => onYearRangeChange([1900, sliderMax])}
                aria-label="Reset timeline filter"
              >
                Reset Filters
              </button>
            </>
          )}

          {colorMode === 'elevation' && (
            <>
              <h3 className={s.legendTitle}>Elevation (m asl)</h3>
              <ul className={s.legendList}>
                {[...ELEVATION_STEPS].reverse().map((step, i, arr) => {
                  const nextStep = arr[i - 1];
                  const label = nextStep
                    ? `${step.min} – ${nextStep.min - 1} m`
                    : `≥ ${step.min} m`;
                  return (
                    <li key={step.min} className={s.legendItem}>
                      <span className={s.legendSwatch} style={{ background: step.color }} />
                      <span className={s.legendLabel}>{label}</span>
                    </li>
                  );
                })}
              </ul>
              <div className={s.legendGradientSource}>DTM FABDEM · dem_mean</div>
            </>
          )}

          {colorMode === 'lst' && (
            <>
              <h3 className={s.legendTitle}>Summer LST (°C)</h3>
              <ul className={s.legendList}>
                {[...LST_STEPS].reverse().map((step, i, arr) => {
                  const nextStep = arr[i - 1];
                  const label = nextStep
                    ? `${step.min} – ${nextStep.min - 1} °C`
                    : `≥ ${step.min} °C`;
                  return (
                    <li key={step.min} className={s.legendItem}>
                      <span className={s.legendSwatch} style={{ background: step.color }} />
                      <span className={s.legendLabel}>{label}</span>
                    </li>
                  );
                })}
              </ul>
              <div className={s.legendGradientSource}>Mean summer · 2015–2025</div>
            </>
          )}

          {colorMode === 'type' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 className={s.legendTitle} style={{ margin: 0 }}>Building Use</h3>
                {selectedTypes.length > 0 && (
                  <button
                    onClick={() => onSelectedTypesChange([])}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-accent-brand)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontFamily: 'var(--font-heading)',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212, 168, 94, 0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    Reset Filter
                  </button>
                )}
              </div>
              <ul className={s.legendList}>
                {TYPE_LEGEND.map((item) => {
                  const active = isTypeGroupActive(item.label);
                  const dimmed = selectedTypes.length > 0 && !active;
                  return (
                    <li
                      key={item.label}
                      className={`${s.legendItem} ${dimmed ? s.legendItemDimmed : ''}`}
                      onClick={() => handleTypeLegendClick(item.label)}
                      style={{
                        cursor: 'pointer',
                        opacity: dimmed ? 0.35 : 1,
                        transition: 'all 0.2s ease',
                        transform: active && selectedTypes.length > 0 ? 'translateX(4px)' : 'none',
                      }}
                    >
                      <span
                        className={s.legendSwatch}
                        style={{
                          background: item.color,
                          boxShadow: active && selectedTypes.length > 0 ? `0 0 8px ${item.color}` : 'none',
                          border: active && selectedTypes.length > 0 ? '1px solid #fff' : '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                      />
                      <div className={s.legendTextGroup}>
                        <span
                          className={s.legendLabel}
                          style={{
                            color: active && selectedTypes.length > 0 ? 'var(--color-accent-brand)' : 'var(--color-text-primary)',
                            fontWeight: active && selectedTypes.length > 0 ? '700' : '600',
                          }}
                        >
                          {item.label}
                        </span>
                        <span className={s.legendDesc}>{item.desc}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {colorMode === 'uhi' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 className={s.legendTitle} style={{ margin: 0 }}>Urban Heat Island</h3>
                {selectedUhiCells.length > 0 && (
                  <button
                    onClick={() => onSelectedUhiCellsChange([])}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-accent-brand)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontFamily: 'var(--font-heading)',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212, 168, 94, 0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    Reset Filter
                  </button>
                )}
              </div>
              <p className={s.legendDesc} style={{ margin: '0 0 10px', lineHeight: 1.4 }}>
                Building age × summer surface temperature. Click cells below to filter map.
              </p>
              <div className={s.uhiGrid}>
                {/* Y-axis label */}
                <div className={s.uhiYLabel}>
                  <span>Hot</span>
                  <span>Cool</span>
                </div>
                {/* 3×3 cells — rows go from hot (top) to cool (bottom) */}
                <div className={s.uhiCells}>
                  {[...UHI_MATRIX].reverse().map((row, ri) => {
                    const r = 2 - ri;
                    return (
                      <div key={ri} className={s.uhiRow}>
                        {row.map((color, ci) => {
                          const cellId = `${r}-${ci}`;
                          const isSelected = selectedUhiCells.includes(cellId);
                          const isAnySelected = selectedUhiCells.length > 0;
                          const isDimmed = isAnySelected && !isSelected;

                          return (
                            <div
                              key={ci}
                              className={`${s.uhiCell} ${isSelected ? s.active : ''} ${isDimmed ? s.dimmed : ''}`}
                              style={{ background: color }}
                              title={`${UHI_AGE_BINS[ci].label} · ${UHI_LST_BINS[r].label}`}
                              onClick={() => {
                                onSelectedUhiCellsChange((prev) =>
                                  prev.includes(cellId)
                                    ? prev.filter((x) => x !== cellId)
                                    : [...prev, cellId]
                                );
                              }}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
                {/* X-axis label */}
                <div className={s.uhiXLabel}>
                  <span>Old</span>
                  <span>New</span>
                </div>
              </div>
              <div className={s.uhiAxes}>
                <span>↕ Surface Temp (LST)</span>
                <span>↔ Building Age</span>
              </div>
              <div className={s.legendGradientSource}>Bivariate · year_int × lst_1mean</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
