import { useState, useMemo, memo, useRef } from 'react';
import { ChevronRight, ChevronLeft, X, Search, Sun, Moon } from 'lucide-react';
import s from '../MapPage.module.scss';
import { FilterChip, AccordionHeader } from './filter-sidebar/controls';
import { HBar, LstScatterChart, DISTRICT_CHART_ROWS, DISTRICT_CHART_TOTAL } from './filter-sidebar/charts';
import { LayersTab } from './filter-sidebar/LayersTab';
import { TYPE_OPTIONS, DISTRICT_OPTIONS, ERA_CONFIG } from '../constants';
import { type MapTheme } from '../mapTheme';
import { buildingTypeLabel } from '../buildingDisplay';
import { type ColorMode, type DecadeLstPoint, type ExtrudeMode } from '../mapHelpers';
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
  extrudeMode: ExtrudeMode;
  onExtrudeModeChange: (mode: ExtrudeMode) => void;
  districtsVisible: boolean;
  onDistrictsToggle: () => void;
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
  extrudeMode,
  onExtrudeModeChange,
  districtsVisible,
  onDistrictsToggle,
}: FilterSidebarProps) {
  const [tab, setTab] = useState<'filters' | 'charts' | 'layers'>('filters');
  const [expandedInfo, setExpandedInfo] = useState<Record<string, boolean>>({});
  const toggleInfo = (layer: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedInfo(prev => ({ ...prev, [layer]: !prev[layer] }));
  };
  
  // Touch drag-to-dismiss logic for mobile bottom sheet
  const touchStartRef = useRef<number | null>(null);
  const touchCurrentRef = useRef<number | null>(null);
  const [translateY, setTranslateY] = useState(0);
  const [activeDragging, setActiveDragging] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.innerWidth >= 768) return;
    const touch = e.touches[0];
    touchStartRef.current = touch.clientY;
    touchCurrentRef.current = touch.clientY;
    setActiveDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const touch = e.touches[0];
    touchCurrentRef.current = touch.clientY;
    const diff = touch.clientY - touchStartRef.current;
    
    // Only allow dragging downwards
    if (diff > 0) {
      setTranslateY(diff);
    } else {
      setTranslateY(0);
    }
  };

  const handleTouchEnd = () => {
    if (touchStartRef.current === null || touchCurrentRef.current === null) {
      touchStartRef.current = null;
      touchCurrentRef.current = null;
      setActiveDragging(false);
      return;
    }
    const diff = touchCurrentRef.current - touchStartRef.current;
    touchStartRef.current = null;
    touchCurrentRef.current = null;
    setActiveDragging(false);

    // If dragged down > 100px, close sidebar. Otherwise snap back.
    if (diff > 100) {
      onClose();
    }
    setTranslateY(0);
  };

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
      .map(([type, count]) => ({ label: buildingTypeLabel(type), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    const total = rows.reduce((s, r) => s + r.count, 0);
    return { rows, total };
  }, [typeCounts]);

  const totalVisible = eraData.total;

  return (
    <aside
      className={`${s.filterSidebar} ${open ? s.open : ''}`}
      aria-label="Map filters"
      style={
        open && window.innerWidth < 768
          ? {
              transform: `translateY(${translateY}px)`,
              transition: activeDragging ? 'none' : 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            }
          : undefined
      }
    >
      {/* Invisible overlay for the very top drag handle area on mobile */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '24px',
          cursor: 'grab',
          zIndex: 10,
        }}
      />

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
      <div
        className={s.filterHeader}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
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
        <LayersTab
          colorMode={colorMode}
          onColorModeChange={onColorModeChange}
          extrudeMode={extrudeMode}
          onExtrudeModeChange={onExtrudeModeChange}
          districtsVisible={districtsVisible}
          onDistrictsToggle={onDistrictsToggle}
          expandedInfo={expandedInfo}
          toggleInfo={toggleInfo}
        />
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
