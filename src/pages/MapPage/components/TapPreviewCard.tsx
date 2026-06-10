import { ChevronRight, X } from 'lucide-react';
import { ERA_CONFIG } from '../constants';
import s from '../MapPage.module.scss';

const TYPE_LABELS: Record<string, string> = {
  rc: 'Residential', bc: 'Business', ec: 'Entertainment',
  sc: 'Shopping', sf: 'Sport', mosque: 'Mosque', church: 'Church',
  healthcare: 'Healthcare', hospital: 'Hospital', clinic: 'Clinic',
  utility: 'Utility', 'cultural site': 'Cultural', admin: 'Administrative',
  airport: 'Airport', 'train station': 'Train Station', school: 'School',
  kdgd: 'Kindergarten', uni: 'University', house: 'House',
};

function parseYear(props: Record<string, unknown>): number {
  const yi = props.year_int;
  if (yi != null && !isNaN(Number(yi))) return Number(yi);
  const ys = props.year_str;
  if (ys) {
    const str = String(ys);
    const d = str.indexOf('-');
    if (d > 0) return Math.round((parseInt(str.slice(0, d)) + parseInt(str.slice(d + 1))) / 2);
    return parseInt(str) || 0;
  }
  return 0;
}

interface Props {
  properties: Record<string, unknown> | null;
  onOpenDetails: () => void;
  onDismiss: () => void;
}

/**
 * Touch-device preview: first tap on a building shows this compact card,
 * a second tap (or the Details button) opens the full BuildingPanel.
 */
export function TapPreviewCard({ properties, onOpenDetails, onDismiss }: Props) {
  if (!properties) return null;

  const year = parseYear(properties);
  const era = year
    ? ERA_CONFIG.find((e) => e.bounds[0] !== -1 && year >= e.bounds[0] && year <= e.bounds[1])
      ?? ERA_CONFIG[ERA_CONFIG.length - 1]
    : ERA_CONFIG[ERA_CONFIG.length - 1];
  const typeLabel = properties.type ? (TYPE_LABELS[String(properties.type)] ?? String(properties.type)) : null;
  const name = properties.name
    ? String(properties.name)
    : typeLabel ?? 'Building';
  const yearLabel = properties.year_int
    ? String(properties.year_int)
    : properties.year_str
      ? String(properties.year_str)
      : null;

  return (
    <div className={s.tapPreview} role="status" aria-label={`Building preview: ${name}`}>
      <span className={s.tapPreviewDot} style={{ background: era.color }} />
      <button className={s.tapPreviewBody} onClick={onOpenDetails}>
        <span className={s.tapPreviewName}>{name}</span>
        <span className={s.tapPreviewMeta}>
          {yearLabel && <span style={{ color: era.color }}>{yearLabel}</span>}
          {yearLabel && typeLabel && <span className={s.tapPreviewSep}>·</span>}
          {typeLabel && <span>{typeLabel}</span>}
        </span>
      </button>
      <button className={s.tapPreviewOpen} onClick={onOpenDetails} aria-label="Open building details">
        <span>Details</span>
        <ChevronRight size={13} />
      </button>
      <button className={s.tapPreviewClose} onClick={onDismiss} aria-label="Dismiss preview">
        <X size={13} />
      </button>
    </div>
  );
}
