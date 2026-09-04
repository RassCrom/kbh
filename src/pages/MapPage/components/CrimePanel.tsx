import { useRef } from 'react';
import { Building2, CalendarDays, Hash, ShieldAlert, X } from 'lucide-react';
import type { CrimeProperties } from '../data/crimeData';
import s from './CrimePanel.module.scss';
import { useIsMobile } from '../useIsMobile';
import { useBottomSheet } from '../hooks/useBottomSheet';

const SEVERITY_COLORS: Record<number, string> = {
  1: '#68D5E8',
  2: '#4D8AAD',
  3: '#D4A85E',
  4: '#F06A6A',
};

const WEEKDAYS: Record<number, string> = {
  1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday',
  5: 'Friday', 6: 'Saturday', 7: 'Sunday',
};

function value(input: string | number | null | undefined): string {
  return input == null || input === '' ? 'Not recorded' : String(input);
}

interface CrimePanelProps {
  properties: CrimeProperties | null;
  onClose: () => void;
}

export function CrimePanel({ properties, onClose }: CrimePanelProps) {
  // Mobile sheet: opens fully, swipe or flick down to dismiss.
  const isMobile = useIsMobile();
  const sheet = useBottomSheet({ open: !!properties, onClose, peekRatio: 1, enabled: isMobile });

  const lastProperties = useRef<CrimeProperties | null>(null);
  if (properties) lastProperties.current = properties;
  const incident = properties ?? lastProperties.current;
  const severityColor = incident ? SEVERITY_COLORS[incident.severityCode] ?? '#8BA0BC' : '#8BA0BC';

  return (
    <aside
      ref={sheet.ref as React.RefObject<HTMLElement>}
      className={`${s.panel} ${properties ? s.open : ''}`}
      aria-label="Crime record details"
      aria-hidden={!properties}
      {...sheet.sheetProps}
    >
      <div className={s.sheetGrip} {...sheet.dragHandleProps} />
      <div className={s.header} {...sheet.dragHandleProps}>
        <span className={s.eyebrow}>
          <ShieldAlert size={13} />
          Historical public record
        </span>
        <button className={s.close} onClick={onClose} aria-label="Close crime record">
          <X size={16} />
        </button>
      </div>

      {incident && (
        <div className={s.body}>
          <div className={s.titleBlock}>
            <span className={s.year}>{incident.year}</span>
            <h2>{incident.article ?? `Crime code ${incident.crimeCode ?? 'unknown'}`}</h2>
            <p>
              A reported incident from the historical 2015–2022 dataset. It is
              descriptive source data, not a live safety or risk assessment.
            </p>
          </div>

          <div className={s.severity} style={{ '--severity-color': severityColor } as React.CSSProperties}>
            <span className={s.severityPulse} />
            <span>
              <strong>Severity code {incident.severityCode}</strong>
              <small>Source classification, shown without reinterpretation</small>
            </span>
          </div>

          <dl className={s.details}>
            <div>
              <dt><CalendarDays size={13} /> Date</dt>
              <dd>{value(incident.date)}</dd>
            </div>
            <div>
              <dt><Hash size={13} /> Crime code</dt>
              <dd>{value(incident.crimeCode)}</dd>
            </div>
            <div>
              <dt>Weekday</dt>
              <dd>{incident.weekday ? WEEKDAYS[incident.weekday] ?? incident.weekday : 'Not recorded'}</dd>
            </div>
            <div>
              <dt>Month</dt>
              <dd>{value(incident.month)}</dd>
            </div>
            <div className={s.full}>
              <dt><Building2 size={13} /> Reporting authority</dt>
              <dd>{value(incident.authority)}</dd>
            </div>
            <div className={s.full}>
              <dt>Record ID</dt>
              <dd className={s.recordId}>{value(incident.recordId)}</dd>
            </div>
          </dl>
        </div>
      )}
    </aside>
  );
}
