import { useState, useMemo, memo } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft, X, Search, Sun, Moon, Layers, Thermometer, Mountain, Building2, Flame } from 'lucide-react';
import s from '../MapPage.module.scss';
import { TYPE_OPTIONS, DISTRICT_OPTIONS, ERA_CONFIG, DISTRICT_TOTAL_COUNTS } from '../constants';
import { type MapTheme } from '../mapTheme';
import { type ColorMode, type DecadeLstPoint, ELEVATION_STEPS, LST_STEPS, TYPE_LEGEND, UHI_MATRIX } from '../mapHelpers';

// One distinct colour per district for the comparison chart
const DISTRICT_COLORS: Record<string, string> = {
  'Nura':      '#00AFCA',
  'Yesil':     '#4A7BAA',
  'Almaty':    '#5E9E6A',
  'Sa':        '#C47A24',   // Saryarka
  'B':         '#7B4D9E',   // Baikonur
  'Saraishik': '#D32F2F',
};

// Static district chart data — computed once at module load from DISTRICT_TOTAL_COUNTS constants
const DISTRICT_CHART_ROWS = DISTRICT_OPTIONS
  .map(opt => ({
    label: opt.label,
    value: opt.value,
    count: DISTRICT_TOTAL_COUNTS[opt.value] ?? 0,
    color: DISTRICT_COLORS[opt.value] ?? '#6d7d94',
  }))
  .filter(r => r.count > 0)
  .sort((a, b) => b.count - a.count);

const DISTRICT_CHART_TOTAL = DISTRICT_CHART_ROWS.reduce((s, r) => s + r.count, 0);

// ── Short display names for type codes ──────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  rc: 'Residential', bc: 'Business', ec: 'Entertainment',
  sc: 'Shopping', sf: 'Sport', mosque: 'Mosque', church: 'Church',
  healthcare: 'Healthcare', hospital: 'Hospital', clinic: 'Clinic',
  utility: 'Utility', 'cultural site': 'Cultural', admin: 'Admin',
  airport: 'Airport', 'train station': 'Train Stn', school: 'School',
  kindergarten: 'Kindergarten', university: 'University', house: 'House',
};

// ── Sub-components ───────────────────────────────────────────────────────────

function FilterChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button className={`${s.filterChip} ${selected ? s.selected : ''}`} onClick={onClick} type="button">
      {label}
    </button>
  );
}

interface AccordionHeaderProps {
  title: string; expanded: boolean; onToggle: () => void; activeCount: number; onClear?: () => void;
}
function AccordionHeader({ title, expanded, onToggle, activeCount, onClear }: AccordionHeaderProps) {
  return (
    <div className={s.sectionHeader} onClick={onToggle}>
      <div className={s.sectionTitleContainer}>
        <span className={s.filterSectionTitle}>{title}</span>
        {activeCount > 0 && <span className={s.activeDot} title={`${activeCount} active filters`} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
        {activeCount > 0 && onClear && (
          <button className={s.sectionClearBtn} onClick={onClear}>Clear</button>
        )}
        <button
          style={{ background: 'transparent', border: 'none', padding: 0, display: 'flex', cursor: 'pointer' }}
          onClick={onToggle}
          aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}
        >
          <ChevronDown size={14} className={`${s.sectionChevron} ${expanded ? s.expanded : ''}`} />
        </button>
      </div>
    </div>
  );
}

// ── Charts sub-components ────────────────────────────────────────────────────

function HBar({ label, count, total, color }: { label: string; count: number; total: number; color?: string }) {
  const pct = total > 0 ? Math.max((count / total) * 100, count > 0 ? 2 : 0) : 0;
  return (
    <div className={s.hBarRow}>
      <span className={s.hBarLabel}>{label}</span>
      <div className={s.hBarTrack}>
        <div
          className={s.hBarFill}
          style={{ width: `${pct}%`, background: color ?? 'var(--color-accent-gold)' }}
        />
      </div>
      <span className={s.hBarCount}>{count.toLocaleString()}</span>
    </div>
  );
}

// ── Scatter chart helpers ────────────────────────────────────────────────────

function getEraColor(decade: number): string {
  const mid = decade + 5;
  const era = ERA_CONFIG.find(e => e.bounds[0] !== -1 && mid >= e.bounds[0] && mid <= e.bounds[1]);
  return era?.color ?? '#4a4a5a';
}

function linReg(pts: DecadeLstPoint[]): { slope: number; intercept: number } | null {
  if (pts.length < 3) return null;
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p.decade, 0) / n;
  const my = pts.reduce((s, p) => s + p.meanLst, 0) / n;
  const num = pts.reduce((s, p) => s + (p.decade - mx) * (p.meanLst - my), 0);
  const den = pts.reduce((s, p) => s + (p.decade - mx) ** 2, 0);
  if (den === 0) return null;
  const slope = num / den;
  return { slope, intercept: my - slope * mx };
}

function LstScatterChart({ data }: { data: DecadeLstPoint[] }) {
  const [hov, setHov] = useState<{ pt: DecadeLstPoint; sx: number; sy: number } | null>(null);

  const W = 252, H = 148;
  const PAD = { top: 8, right: 6, bottom: 26, left: 30 };
  const CW = W - PAD.left - PAD.right;
  const CH = H - PAD.top - PAD.bottom;

  const lsts = data.map(d => d.meanLst);
  const rawMin = lsts.length ? Math.min(...lsts) : 33;
  const rawMax = lsts.length ? Math.max(...lsts) : 48;
  const pad = Math.max(1, (rawMax - rawMin) * 0.12);
  const yMin = rawMin - pad;
  const yMax = rawMax + pad;

  const scX = (d: number) => PAD.left + ((d - 1900) / 120) * CW;
  const scY = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * CH;

  const reg = useMemo(() => linReg(data), [data]);

  // Y axis ticks — 4-5 evenly spaced
  const yRange = yMax - yMin;
  const yStep = yRange <= 6 ? 1 : yRange <= 12 ? 2 : yRange <= 20 ? 4 : 5;
  const yTicks: number[] = [];
  for (let v = Math.ceil(yMin / yStep) * yStep; v <= yMax; v += yStep) yTicks.push(v);

  const xTicks = [1900, 1920, 1940, 1960, 1980, 2000, 2020];

  const insightText = reg
    ? reg.slope > 0.02
      ? '↑ Newer decades trend warmer'
      : reg.slope < -0.02
        ? '↓ Older decades trend warmer'
        : '≈ No clear age–heat trend'
    : null;

  if (data.length === 0) {
    return <div className={s.chartEmpty}>No LST data — zoom in to load buildings</div>;
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setHov(null)}
      >
        {/* Horizontal grid lines */}
        {yTicks.map(v => (
          <line key={v} x1={PAD.left} y1={scY(v)} x2={PAD.left + CW} y2={scY(v)}
            stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
        ))}
        {/* Axes */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + CH}
          stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
        <line x1={PAD.left} y1={PAD.top + CH} x2={PAD.left + CW} y2={PAD.top + CH}
          stroke="rgba(255,255,255,0.10)" strokeWidth={1} />

        {/* Y ticks + labels */}
        {yTicks.map(v => (
          <g key={v}>
            <line x1={PAD.left - 3} y1={scY(v)} x2={PAD.left} y2={scY(v)}
              stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
            <text x={PAD.left - 5} y={scY(v) + 3.5} fontSize={7} fill="#6d7d94" textAnchor="end"
              fontFamily="var(--font-mono)">{v}°</text>
          </g>
        ))}

        {/* X ticks + labels */}
        {xTicks.map(d => (
          <g key={d}>
            <line x1={scX(d)} y1={PAD.top + CH} x2={scX(d)} y2={PAD.top + CH + 3}
              stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
            <text x={scX(d)} y={PAD.top + CH + 12} fontSize={7} fill="#6d7d94" textAnchor="middle"
              fontFamily="var(--font-mono)">
              {d === 1900 ? '1900' : `'${String(d).slice(2)}`}
            </text>
          </g>
        ))}

        {/* Trend line */}
        {reg && (() => {
          const x1 = 1900, x2 = 2020;
          const y1 = reg.slope * x1 + reg.intercept;
          const y2 = reg.slope * x2 + reg.intercept;
          return (
            <line x1={scX(x1)} y1={scY(y1)} x2={scX(x2)} y2={scY(y2)}
              stroke="rgba(212,168,94,0.40)" strokeWidth={1.5} strokeDasharray="5,3" />
          );
        })()}

        {/* Data points */}
        {data.map(pt => {
          const cx = scX(pt.decade);
          const cy = scY(pt.meanLst);
          const r = Math.max(4, Math.min(11, Math.sqrt(pt.count) * 0.55));
          const col = getEraColor(pt.decade);
          return (
            <circle key={pt.decade} cx={cx} cy={cy} r={r}
              fill={`${col}bb`} stroke={col} strokeWidth={1.5}
              style={{ cursor: 'default' }}
              onMouseEnter={() => setHov({ pt, sx: cx, sy: cy })}
            />
          );
        })}
      </svg>

      {/* Axis labels */}
      <div style={{
        position: 'absolute', left: 0, top: '50%', transform: 'rotate(-90deg) translateX(-50%)',
        transformOrigin: '0 0', fontSize: 7, color: '#6d7d94',
        fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}>LST °C</div>

      {/* Hover tooltip */}
      {hov && (
        <div style={{
          position: 'absolute',
          left: `${(hov.sx / W) * 100}%`,
          top: `${(hov.sy / H) * 100}%`,
          transform: hov.sx > W * 0.65 ? 'translate(-100%,-110%)' : 'translate(4px,-110%)',
          background: 'rgba(14,21,33,0.96)',
          border: '1px solid rgba(30,42,56,0.9)',
          borderRadius: 6,
          padding: '5px 8px',
          pointerEvents: 'none',
          zIndex: 20,
          whiteSpace: 'nowrap',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: getEraColor(hov.pt.decade), fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {hov.pt.decade}s
          </div>
          <div style={{ fontSize: 9, color: '#dfe0e4', fontFamily: 'var(--font-mono)', marginTop: 1 }}>
            LST <strong style={{ color: '#fdae61' }}>{hov.pt.meanLst.toFixed(1)} °C</strong>
          </div>
          <div style={{ fontSize: 9, color: '#6d7d94', fontFamily: 'var(--font-mono)' }}>
            {hov.pt.count.toLocaleString()} buildings
          </div>
        </div>
      )}

      {/* Trend insight */}
      {insightText && (
        <div style={{ fontSize: 8, color: reg && Math.abs(reg.slope) > 0.02 ? 'rgba(212,168,94,0.65)' : '#6d7d94', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', marginTop: 4, textAlign: 'center' }}>
          {insightText}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface FilterSidebarProps {
  open: boolean; onClose: () => void; onToggle: () => void;
  selectedTypes: string[]; onTypeToggle: (val: string) => void; onClearTypes: () => void;
  selectedDistricts: string[]; onDistrictToggle: (val: string) => void; onClearDistricts: () => void;
  selectedArchStyle: string; onArchStyleChange: (val: string) => void;
  selectedCompany: string; onCompanyChange: (val: string) => void;
  archStyleOptions: string[]; companyOptions: string[];
  onReset: () => void; activeCount: number;
  yearCounts: Record<number, number>;
  typeCounts: Record<string, number>;
  mapTheme: MapTheme;
  onThemeToggle: () => void;
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
  decadeLstData: DecadeLstPoint[];
}

export const FilterSidebar = memo(function FilterSidebar({
  open, onClose, onToggle,
  selectedTypes, onTypeToggle, onClearTypes,
  selectedDistricts, onDistrictToggle, onClearDistricts,
  selectedArchStyle, onArchStyleChange,
  selectedCompany, onCompanyChange,
  archStyleOptions, companyOptions,
  onReset, activeCount,
  yearCounts, typeCounts,
  mapTheme,
  onThemeToggle,
  colorMode,
  onColorModeChange,
  decadeLstData,
}: FilterSidebarProps) {
  const [tab, setTab] = useState<'filters' | 'charts' | 'layers'>('filters');
  const [typesExpanded, setTypesExpanded] = useState(true);
  const [districtsExpanded, setDistrictsExpanded] = useState(true);
  const [archExpanded, setArchExpanded] = useState(true);
  const [companyExpanded, setCompanyExpanded] = useState(true);
  const [typeSearch, setTypeSearch] = useState('');
  const [showAllTypes, setShowAllTypes] = useState(false);

  const filteredTypes = useMemo(() => {
    if (!typeSearch.trim()) return TYPE_OPTIONS;
    return TYPE_OPTIONS.filter(opt => opt.label.toLowerCase().includes(typeSearch.toLowerCase()));
  }, [typeSearch]);

  const visibleTypes = useMemo(() => {
    if (typeSearch.trim() || showAllTypes) return filteredTypes;
    return filteredTypes.slice(0, 8);
  }, [filteredTypes, typeSearch, showAllTypes]);

  const safeCompanyOptions = useMemo(() => {
    if (selectedCompany && !companyOptions.includes(selectedCompany))
      return [...companyOptions, selectedCompany].sort();
    return companyOptions;
  }, [companyOptions, selectedCompany]);

  const safeArchStyleOptions = useMemo(() => {
    if (selectedArchStyle && !archStyleOptions.includes(selectedArchStyle))
      return [...archStyleOptions, selectedArchStyle].sort();
    return archStyleOptions;
  }, [archStyleOptions, selectedArchStyle]);

  // ── Chart data computations ────────────────────────────────────────────────

  // 1. Era distribution — bucket yearCounts into ERA_CONFIG eras
  const eraData = useMemo(() => {
    const rows = ERA_CONFIG
      .filter(e => e.bounds[0] !== -1)
      .map(e => {
        let count = 0;
        for (let y = e.bounds[0]; y <= Math.min(e.bounds[1], 2100); y++) {
          count += yearCounts[y] ?? 0;
        }
        const shortLabel = e.label.split(' (')[0].split(' / ')[0];
        return { label: shortLabel, color: e.color, count };
      })
      .filter(r => r.count > 0)
      .sort((a, b) => b.count - a.count);
    const total = rows.reduce((s, r) => s + r.count, 0);
    return { rows, total };
  }, [yearCounts]);

  // 2. Decade activity — vertical bar chart, each decade colored by its era
  const decadeData = useMemo(() => {
    const bars = [];
    for (let d = 1900; d <= 2020; d += 10) {
      let count = 0;
      for (let y = d; y < d + 10; y++) count += yearCounts[y] ?? 0;
      const mid = d + 5;
      const era = ERA_CONFIG.find(e => e.bounds[0] !== -1 && mid >= e.bounds[0] && mid <= e.bounds[1])
        ?? ERA_CONFIG[ERA_CONFIG.length - 1];
      bars.push({ decade: d, label: `${String(d).slice(2)}s`, count, color: era.color });
    }
    const maxCount = Math.max(...bars.map(b => b.count), 1);
    return { bars, maxCount };
  }, [yearCounts]);

  // 3. Type breakdown
  const typeData = useMemo(() => {
    const rows = Object.entries(typeCounts)
      .map(([type, count]) => ({ label: TYPE_LABELS[type] ?? type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    const total = rows.reduce((s, r) => s + r.count, 0);
    return { rows, total };
  }, [typeCounts]);

  const totalVisible = eraData.total;

  return (
    <aside className={`${s.filterSidebar} ${open ? s.open : ''}`} aria-label="Map filters">
      {/* Edge tab toggle */}
      <button
        className={s.toggleHandle}
        onClick={onToggle}
        aria-label={open ? 'Collapse panel' : 'Expand panel'}
      >
        {open ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        {!open && activeCount > 0 && (
          <span className={s.handleBadge}>{activeCount}</span>
        )}
      </button>

      {/* ── Header with tab switcher ───────────────────────────────────────── */}
      <div className={s.filterHeader}>
        <div className={s.tabRow}>
          <button
            className={`${s.tabBtn} ${tab === 'filters' ? s.tabActive : ''}`}
            onClick={() => setTab('filters')}
          >
            Filters
            {activeCount > 0 && <span className={s.tabBadge}>{activeCount}</span>}
          </button>
          <button
            className={`${s.tabBtn} ${tab === 'charts' ? s.tabActive : ''}`}
            onClick={() => setTab('charts')}
          >
            Charts
          </button>
          <button
            className={`${s.tabBtn} ${tab === 'layers' ? s.tabActive : ''}`}
            onClick={() => setTab('layers')}
          >
            Layers
            {colorMode !== 'year' && <span className={s.tabDot} />}
          </button>
        </div>
        <div className={s.headerActions}>
          <button
            className={s.sidebarThemeToggle}
            onClick={onThemeToggle}
            aria-label={mapTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={mapTheme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {mapTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className={s.filterClose} onClick={onClose} aria-label="Close panel">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── Filters tab ───────────────────────────────────────────────────── */}
      {tab === 'filters' && (
        <div className={s.filterBody}>
          <div className={s.filterSection}>
            <AccordionHeader
              title="Building Type" expanded={typesExpanded}
              onToggle={() => setTypesExpanded(v => !v)}
              activeCount={selectedTypes.length} onClear={onClearTypes}
            />
            {typesExpanded && (
              <div className={s.sectionContent}>
                <div className={s.searchInputWrapper}>
                  <input
                    type="text" placeholder="Search building types..."
                    className={s.searchInput} value={typeSearch}
                    onChange={(e) => setTypeSearch(e.target.value)}
                  />
                  <Search size={12} className={s.searchIcon} />
                  {typeSearch && (
                    <button
                      onClick={() => setTypeSearch('')}
                      style={{ position: 'absolute', right: '28px', background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      aria-label="Clear search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                {visibleTypes.length > 0 ? (
                  <div className={s.chipGrid}>
                    {visibleTypes.map(opt => (
                      <FilterChip key={opt.value} label={opt.label}
                        selected={selectedTypes.includes(opt.value)}
                        onClick={() => onTypeToggle(opt.value)}
                      />
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontStyle: 'italic', padding: '4px 0' }}>
                    No matching building types
                  </div>
                )}
                {!typeSearch && filteredTypes.length > 8 && (
                  <button className={s.showMoreBtn} onClick={() => setShowAllTypes(v => !v)}>
                    {showAllTypes ? 'Show less' : `Show all (+${filteredTypes.length - 8})`}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className={s.filterSection}>
            <AccordionHeader
              title="District" expanded={districtsExpanded}
              onToggle={() => setDistrictsExpanded(v => !v)}
              activeCount={selectedDistricts.length} onClear={onClearDistricts}
            />
            {districtsExpanded && (
              <div className={s.sectionContent}>
                <div className={s.chipGrid}>
                  {DISTRICT_OPTIONS.map(opt => (
                    <FilterChip key={opt.value} label={opt.label}
                      selected={selectedDistricts.includes(opt.value)}
                      onClick={() => onDistrictToggle(opt.value)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={s.filterSection}>
            <AccordionHeader
              title="Arch Style" expanded={archExpanded}
              onToggle={() => setArchExpanded(v => !v)}
              activeCount={selectedArchStyle ? 1 : 0}
              onClear={() => onArchStyleChange('')}
            />
            {archExpanded && (
              <div className={s.sectionContent}>
                <select className={s.filterSelect} value={selectedArchStyle}
                  onChange={(e) => onArchStyleChange(e.target.value)}>
                  <option value="">All styles</option>
                  {safeArchStyleOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className={s.filterSection}>
            <AccordionHeader
              title="Construction Company" expanded={companyExpanded}
              onToggle={() => setCompanyExpanded(v => !v)}
              activeCount={selectedCompany ? 1 : 0}
              onClear={() => onCompanyChange('')}
            />
            {companyExpanded && (
              <div className={s.sectionContent}>
                <select className={s.filterSelect} value={selectedCompany}
                  onChange={(e) => onCompanyChange(e.target.value)}>
                  <option value="">All companies</option>
                  {safeCompanyOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Charts tab ────────────────────────────────────────────────────── */}
      {tab === 'charts' && (
        <div className={s.chartBody}>

          {/* Live indicator */}
          <div className={s.chartLiveRow}>
            <span className={s.chartLiveDot} />
            <span className={s.chartLiveLabel}>
              {totalVisible > 0
                ? `${totalVisible.toLocaleString()} buildings · current viewport`
                : 'Pan the map to load data'}
            </span>
          </div>

          {/* Chart 1 — Era distribution */}
          <div className={s.chartCard}>
            <div className={s.chartCardHeader}>
              <span className={s.chartCardTitle}>Era Distribution</span>
              <span className={s.chartCardMeta}>by construction period</span>
            </div>
            {eraData.rows.length > 0 ? (
              <div className={s.hBarList}>
                {eraData.rows.map(r => (
                  <HBar key={r.label} label={r.label} count={r.count} total={eraData.total} color={r.color} />
                ))}
              </div>
            ) : (
              <div className={s.chartEmpty}>Zoom in to load buildings</div>
            )}
          </div>

          {/* Chart 2 — Decade activity */}
          <div className={s.chartCard}>
            <div className={s.chartCardHeader}>
              <span className={s.chartCardTitle}>Decade Activity</span>
              <span className={s.chartCardMeta}>buildings by decade</span>
            </div>
            <div className={s.decadeChart}>
              <div className={s.decadeBars}>
                {decadeData.bars.map(b => (
                  <div key={b.decade} className={s.decadeCol}>
                    <div className={s.decadeBarWrap} title={`${b.decade}s: ${b.count.toLocaleString()}`}>
                      <div
                        className={s.decadeBar}
                        style={{
                          height: `${Math.max((b.count / decadeData.maxCount) * 100, b.count > 0 ? 4 : 0)}%`,
                          background: b.count > 0 ? b.color : 'rgba(255,255,255,0.06)',
                          opacity: b.count > 0 ? 0.85 : 1,
                        }}
                      />
                    </div>
                    <span className={s.decadeLabel}>{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chart 3 — Building type breakdown */}
          <div className={s.chartCard}>
            <div className={s.chartCardHeader}>
              <span className={s.chartCardTitle}>Building Types</span>
              <span className={s.chartCardMeta}>top 8 by count</span>
            </div>
            {typeData.rows.length > 0 ? (
              <div className={s.hBarList}>
                {typeData.rows.map((r, i) => (
                  <HBar
                    key={r.label} label={r.label} count={r.count} total={typeData.total}
                    color={`rgba(212, 168, 94, ${0.85 - i * 0.08})`}
                  />
                ))}
              </div>
            ) : (
              <div className={s.chartEmpty}>No type data in viewport</div>
            )}
          </div>

          {/* Chart 4 — District comparison (static totals) */}
          <div className={s.chartCard}>
            <div className={s.chartCardHeader}>
              <span className={s.chartCardTitle}>Districts</span>
              <span className={s.chartCardMeta}>total buildings per district</span>
            </div>
            <div className={s.hBarList}>
              {DISTRICT_CHART_ROWS.map(r => (
                <HBar key={r.value} label={r.label} count={r.count} total={DISTRICT_CHART_TOTAL} color={r.color} />
              ))}
            </div>
          </div>

          {/* Chart 5 — Era × Summer Heat scatter */}
          <div className={s.chartCard}>
            <div className={s.chartCardHeader}>
              <span className={s.chartCardTitle}>Era × Summer Heat</span>
              <span className={s.chartCardMeta}>mean LST by decade</span>
            </div>
            <LstScatterChart data={decadeLstData} />
          </div>

        </div>
      )}

      {/* ── Layers tab ────────────────────────────────────────────────── */}
      {tab === 'layers' && (
        <div className={s.layersBody}>
          <div className={s.layersIntro}>
            <span className={s.layersIntroLabel}>Visualization Layer</span>
            <span className={s.layersIntroMeta}>Color buildings by data attribute</span>
          </div>

          <div className={s.vizOptionList}>

            {/* Year Built */}
            <button
              className={`${s.vizOption} ${colorMode === 'year' ? s.vizOptionActive : ''}`}
              onClick={() => onColorModeChange('year')}
              type="button"
            >
              <div className={s.vizOptionHeader}>
                <div className={s.vizOptionTitleRow}>
                  <Layers size={13} className={s.vizOptionIcon} />
                  <span className={s.vizOptionName}>Year Built</span>
                </div>
                {colorMode === 'year' && <span className={s.vizOptionBadge}>Active</span>}
              </div>
              <p className={s.vizOptionDesc}>Construction era · historical periods 1900 – present</p>
              <div className={s.vizGradientDiscrete}>
                {ERA_CONFIG.filter(e => e.bounds[0] !== -1).map(e => (
                  <div
                    key={e.label}
                    className={s.vizGradientSwatch}
                    style={{ background: e.color }}
                    title={e.label}
                  />
                ))}
              </div>
              <div className={s.vizGradientLabels}>
                <span>Pre-1917</span>
                <span>2019+</span>
              </div>
            </button>

            {/* Elevation */}
            <button
              className={`${s.vizOption} ${colorMode === 'elevation' ? s.vizOptionActive : ''}`}
              onClick={() => onColorModeChange('elevation')}
              type="button"
            >
              <div className={s.vizOptionHeader}>
                <div className={s.vizOptionTitleRow}>
                  <Mountain size={13} className={s.vizOptionIcon} />
                  <span className={s.vizOptionName}>Elevation</span>
                </div>
                {colorMode === 'elevation' && <span className={s.vizOptionBadgeElevation}>Active</span>}
              </div>
              <p className={s.vizOptionDesc}>Ground elevation · DTM FABDEM · dem_mean (m asl)</p>
              <div className={s.vizGradientDiscrete}>
                {ELEVATION_STEPS.map(step => (
                  <div
                    key={step.min}
                    className={s.vizGradientSwatch}
                    style={{ background: step.color }}
                    title={`≥ ${step.min} m`}
                  />
                ))}
              </div>
              <div className={s.vizGradientLabels}>
                <span>335 m</span>
                <span>417 m</span>
              </div>
            </button>

            {/* Summer Heat (LST) */}
            <button
              className={`${s.vizOption} ${colorMode === 'lst' ? s.vizOptionActive : ''}`}
              onClick={() => onColorModeChange('lst')}
              type="button"
            >
              <div className={s.vizOptionHeader}>
                <div className={s.vizOptionTitleRow}>
                  <Thermometer size={13} className={s.vizOptionIcon} />
                  <span className={s.vizOptionName}>Summer Heat (LST)</span>
                </div>
                {colorMode === 'lst' && <span className={s.vizOptionBadgeLst}>Active</span>}
              </div>
              <p className={s.vizOptionDesc}>Mean land surface temp · summer 2015–2025 · lst_1mean (°C)</p>
              <div className={s.vizGradientDiscrete}>
                {LST_STEPS.map(step => (
                  <div
                    key={step.min}
                    className={s.vizGradientSwatch}
                    style={{ background: step.color }}
                    title={`≥ ${step.min} °C`}
                  />
                ))}
              </div>
              <div className={s.vizGradientLabels}>
                <span>33 °C</span>
                <span>48 °C</span>
              </div>
            </button>

            {/* Building Use */}
            <button
              className={`${s.vizOption} ${colorMode === 'type' ? s.vizOptionActive : ''}`}
              onClick={() => onColorModeChange('type')}
              type="button"
            >
              <div className={s.vizOptionHeader}>
                <div className={s.vizOptionTitleRow}>
                  <Building2 size={13} className={s.vizOptionIcon} />
                  <span className={s.vizOptionName}>Building Use</span>
                </div>
                {colorMode === 'type' && <span className={s.vizOptionBadgeType}>Active</span>}
              </div>
              <p className={s.vizOptionDesc}>Functional category · occupancy and primary building usage</p>
              <div className={s.vizGradientDiscrete}>
                {TYPE_LEGEND.map(item => (
                  <div
                    key={item.label}
                    className={s.vizGradientSwatch}
                    style={{ background: item.color }}
                    title={item.label}
                  />
                ))}
              </div>
              <div className={s.vizGradientLabels}>
                <span>Residential</span>
                <span>Infrastructure</span>
              </div>
            </button>

            {/* Urban Heat Island (bivariate) */}
            <button
              className={`${s.vizOption} ${colorMode === 'uhi' ? s.vizOptionActive : ''}`}
              onClick={() => onColorModeChange('uhi')}
              type="button"
            >
              <div className={s.vizOptionHeader}>
                <div className={s.vizOptionTitleRow}>
                  <Flame size={13} className={s.vizOptionIcon} />
                  <span className={s.vizOptionName}>Heat × Age (UHI)</span>
                </div>
                {colorMode === 'uhi' && <span className={s.vizOptionBadgeUhi}>Active</span>}
              </div>
              <p className={s.vizOptionDesc}>Bivariate 3×3 · building age crossed with summer surface temp</p>
              <div className={s.vizGradientDiscrete}>
                {UHI_MATRIX[2].map((color, i) => (
                  <div key={`h${i}`} className={s.vizGradientSwatch} style={{ background: color }} title="Hot" />
                ))}
                {UHI_MATRIX[0].map((color, i) => (
                  <div key={`c${i}`} className={s.vizGradientSwatch} style={{ background: color }} title="Cool" />
                ))}
              </div>
              <div className={s.vizGradientLabels}>
                <span>Hot + Old</span>
                <span>Cool + New</span>
              </div>
            </button>

          </div>
        </div>
      )}

      {/* Footer — only on filters tab */}
      {tab === 'filters' && activeCount > 0 && (
        <div className={s.filterFooter}>
          <button className={s.filterReset} onClick={onReset}>Clear all filters</button>
        </div>
      )}
    </aside>
  );
});
