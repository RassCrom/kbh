import { ChevronDown, Info } from 'lucide-react';
import s from '../../MapPage.module.scss';

// Small presentational pieces shared by the sidebar's tabs.


// Toggle-switch row for thematic overlay layers (Layers tab)
interface OverlayRowProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  active: boolean;
  onToggle: () => void;
  infoOpen: boolean;
  onInfoToggle: (e: React.MouseEvent) => void;
  children?: React.ReactNode; // expanded info / legend content
  badge?: string;
}
function OverlayRow({ icon, title, desc, active, onToggle, infoOpen, onInfoToggle, children, badge }: OverlayRowProps) {
  return (
    <div className={`${s.overlayRow} ${active ? s.overlayRowActive : ''}`}>
      <div className={s.overlayRowMain}>
        <span className={s.overlayRowIcon}>{icon}</span>
        <div className={s.overlayRowText}>
          <span className={s.overlayRowTitle}>
            {title}
            {badge && <span className={s.overlayRowBadge}>{badge}</span>}
          </span>
          <span className={s.overlayRowDesc}>{desc}</span>
        </div>
        <button
          type="button"
          className={`${s.infoBtn} ${infoOpen ? s.infoBtnActive : ''}`}
          onClick={onInfoToggle}
          aria-label={`About ${title}`}
        >
          <Info size={11} />
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          aria-label={`Toggle ${title} layer`}
          className={`${s.overlaySwitch} ${active ? s.overlaySwitchOn : ''}`}
          onClick={onToggle}
        >
          <span className={s.overlaySwitchKnob} />
        </button>
      </div>
      {infoOpen && <div className={s.overlayRowInfo}>{children}</div>}
    </div>
  );
}

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

export { OverlayRow, FilterChip, AccordionHeader };
