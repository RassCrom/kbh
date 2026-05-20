import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft, X, Search } from 'lucide-react';
import s from '../MapPage.module.scss';
import { TYPE_OPTIONS, DISTRICT_OPTIONS } from '../constants';

function FilterChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`${s.filterChip} ${selected ? s.selected : ''}`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

interface AccordionHeaderProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  activeCount: number;
  onClear?: () => void;
}

function AccordionHeader({
  title,
  expanded,
  onToggle,
  activeCount,
  onClear,
}: AccordionHeaderProps) {
  return (
    <div className={s.sectionHeader} onClick={onToggle}>
      <div className={s.sectionTitleContainer}>
        <span className={s.filterSectionTitle}>{title}</span>
        {activeCount > 0 && <span className={s.activeDot} title={`${activeCount} active filters`} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
        {activeCount > 0 && onClear && (
          <button className={s.sectionClearBtn} onClick={onClear}>
            Clear
          </button>
        )}
        <button
          style={{ background: 'transparent', border: 'none', padding: 0, display: 'flex', cursor: 'pointer' }}
          onClick={onToggle}
          aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}
        >
          <ChevronDown
            size={14}
            className={`${s.sectionChevron} ${expanded ? s.expanded : ''}`}
          />
        </button>
      </div>
    </div>
  );
}

interface FilterSidebarProps {
  open: boolean;
  onClose: () => void;
  onToggle: () => void;
  selectedTypes: string[];
  onTypeToggle: (val: string) => void;
  onClearTypes: () => void;
  selectedDistricts: string[];
  onDistrictToggle: (val: string) => void;
  onClearDistricts: () => void;
  selectedArchStyle: string;
  onArchStyleChange: (val: string) => void;
  selectedCompany: string;
  onCompanyChange: (val: string) => void;
  archStyleOptions: string[];
  companyOptions: string[];
  onReset: () => void;
  activeCount: number;
}

export function FilterSidebar({
  open,
  onClose,
  onToggle,
  selectedTypes,
  onTypeToggle,
  onClearTypes,
  selectedDistricts,
  onDistrictToggle,
  onClearDistricts,
  selectedArchStyle,
  onArchStyleChange,
  selectedCompany,
  onCompanyChange,
  archStyleOptions,
  companyOptions,
  onReset,
  activeCount,
}: FilterSidebarProps) {
  const [typesExpanded, setTypesExpanded] = useState(true);
  const [districtsExpanded, setDistrictsExpanded] = useState(true);
  const [archExpanded, setArchExpanded] = useState(true);
  const [companyExpanded, setCompanyExpanded] = useState(true);
  const [typeSearch, setTypeSearch] = useState('');
  const [showAllTypes, setShowAllTypes] = useState(false);

  const filteredTypes = useMemo(() => {
    if (!typeSearch.trim()) return TYPE_OPTIONS;
    return TYPE_OPTIONS.filter((opt) =>
      opt.label.toLowerCase().includes(typeSearch.toLowerCase())
    );
  }, [typeSearch]);

  const visibleTypes = useMemo(() => {
    if (typeSearch.trim() || showAllTypes) return filteredTypes;
    return filteredTypes.slice(0, 8);
  }, [filteredTypes, typeSearch, showAllTypes]);

  // Ensure selected options are always visible in dropdowns even if they are outside viewport
  const safeCompanyOptions = useMemo(() => {
    if (selectedCompany && !companyOptions.includes(selectedCompany)) {
      return [...companyOptions, selectedCompany].sort();
    }
    return companyOptions;
  }, [companyOptions, selectedCompany]);

  const safeArchStyleOptions = useMemo(() => {
    if (selectedArchStyle && !archStyleOptions.includes(selectedArchStyle)) {
      return [...archStyleOptions, selectedArchStyle].sort();
    }
    return archStyleOptions;
  }, [archStyleOptions, selectedArchStyle]);

  return (
    <aside className={`${s.filterSidebar} ${open ? s.open : ''}`} aria-label="Map filters">
      {/* Edge tab toggle handle */}
      <button
        className={s.toggleHandle}
        onClick={onToggle}
        aria-label={open ? 'Collapse filters' : 'Expand filters'}
        title={open ? 'Collapse filters' : 'Expand filters'}
      >
        {open ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className={s.filterHeader}>
        <div className={s.filterHeaderLeft}>
          <span className={s.filterHeaderTitle}>Filters</span>
          {activeCount > 0 && (
            <span className={s.filterBadge}>{activeCount}</span>
          )}
        </div>
        <button className={s.filterClose} onClick={onClose} aria-label="Close filters">
          <X size={16} />
        </button>
      </div>

      <div className={s.filterBody}>
        {/* Building Type Section */}
        <div className={s.filterSection}>
          <AccordionHeader
            title="Building Type"
            expanded={typesExpanded}
            onToggle={() => setTypesExpanded(!typesExpanded)}
            activeCount={selectedTypes.length}
            onClear={onClearTypes}
          />
          {typesExpanded && (
            <div className={s.sectionContent}>
              <div className={s.searchInputWrapper}>
                <input
                  type="text"
                  placeholder="Search building types..."
                  className={s.searchInput}
                  value={typeSearch}
                  onChange={(e) => setTypeSearch(e.target.value)}
                />
                <Search size={12} className={s.searchIcon} />
                {typeSearch && (
                  <button
                    onClick={() => setTypeSearch('')}
                    style={{
                      position: 'absolute',
                      right: '28px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    aria-label="Clear search"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {visibleTypes.length > 0 ? (
                <div className={s.chipGrid}>
                  {visibleTypes.map((opt) => (
                    <FilterChip
                      key={opt.value}
                      label={opt.label}
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
                <button
                  className={s.showMoreBtn}
                  onClick={() => setShowAllTypes(!showAllTypes)}
                >
                  {showAllTypes ? 'Show less' : `Show all (+${filteredTypes.length - 8})`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* District Section */}
        <div className={s.filterSection}>
          <AccordionHeader
            title="District"
            expanded={districtsExpanded}
            onToggle={() => setDistrictsExpanded(!districtsExpanded)}
            activeCount={selectedDistricts.length}
            onClear={onClearDistricts}
          />
          {districtsExpanded && (
            <div className={s.sectionContent}>
              <div className={s.chipGrid}>
                {DISTRICT_OPTIONS.map((opt) => (
                  <FilterChip
                    key={opt.value}
                    label={opt.label}
                    selected={selectedDistricts.includes(opt.value)}
                    onClick={() => onDistrictToggle(opt.value)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Arch Style Section */}
        <div className={s.filterSection}>
          <AccordionHeader
            title="Arch Style"
            expanded={archExpanded}
            onToggle={() => setArchExpanded(!archExpanded)}
            activeCount={selectedArchStyle ? 1 : 0}
            onClear={() => onArchStyleChange('')}
          />
          {archExpanded && (
            <div className={s.sectionContent}>
              <select
                className={s.filterSelect}
                value={selectedArchStyle}
                onChange={(e) => onArchStyleChange(e.target.value)}
              >
                <option value="">All styles</option>
                {safeArchStyleOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Construction Company Section */}
        <div className={s.filterSection}>
          <AccordionHeader
            title="Construction Company"
            expanded={companyExpanded}
            onToggle={() => setCompanyExpanded(!companyExpanded)}
            activeCount={selectedCompany ? 1 : 0}
            onClear={() => onCompanyChange('')}
          />
          {companyExpanded && (
            <div className={s.sectionContent}>
              <select
                className={s.filterSelect}
                value={selectedCompany}
                onChange={(e) => onCompanyChange(e.target.value)}
              >
                <option value="">All companies</option>
                {safeCompanyOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {activeCount > 0 && (
        <div className={s.filterFooter}>
          <button className={s.filterReset} onClick={onReset}>
            Clear all filters
          </button>
        </div>
      )}
    </aside>
  );
}
