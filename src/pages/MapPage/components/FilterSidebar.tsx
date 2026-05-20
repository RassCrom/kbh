import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft, X, Search } from 'lucide-react';
import s from '../MapPage.module.scss';
import { TYPE_OPTIONS, DISTRICT_OPTIONS, ERA_CONFIG } from '../constants';

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
}

export function FilterSidebar({
  open, onClose, onToggle,
  selectedTypes, onTypeToggle, onClearTypes,
  selectedDistricts, onDistrictToggle, onClearDistricts,
  selectedArchStyle, onArchStyleChange,
  selectedCompany, onCompanyChange,
  archStyleOptions, companyOptions,
  onReset, activeCount,
  yearCounts, typeCounts,
}: FilterSidebarProps) {
  const [tab, setTab] = useState<'filters' | 'charts'>('filters');
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
        </div>
        <button className={s.filterClose} onClick={onClose} aria-label="Close panel">
          <X size={16} />
        </button>
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
}
