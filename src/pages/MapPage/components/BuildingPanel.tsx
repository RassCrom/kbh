import { useRef } from 'react';
import { X, ImageOff } from 'lucide-react';
import { ERA_CONFIG } from '../constants';
import s from './BuildingPanel.module.scss';

const TYPE_LABELS: Record<string, string> = {
  rc: 'Residential', bc: 'Business', ec: 'Entertainment',
  sc: 'Shopping', sf: 'Sport', mosque: 'Mosque', church: 'Church',
  healthcare: 'Healthcare', hospital: 'Hospital', clinic: 'Clinic',
  utility: 'Utility', 'cultural site': 'Cultural', admin: 'Administrative',
  airport: 'Airport', 'train station': 'Train Station', school: 'School',
  kindergarten: 'Kindergarten', university: 'University', house: 'House',
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

function formatYear(props: Record<string, unknown>): string {
  if (props.year_int) return String(props.year_int);
  if (props.year_str) return String(props.year_str);
  return '—';
}

function getEra(year: number) {
  if (!year) return ERA_CONFIG[ERA_CONFIG.length - 1];
  return (
    ERA_CONFIG.find(e => e.bounds[0] !== -1 && year >= e.bounds[0] && year <= e.bounds[1]) ??
    ERA_CONFIG[ERA_CONFIG.length - 1]
  );
}

function val(v: unknown): string {
  if (v == null || v === '') return '—';
  return String(v);
}

interface Props {
  properties: Record<string, unknown> | null;
  onClose: () => void;
}

export function BuildingPanel({ properties, onClose }: Props) {
  // Keep last known props so content stays visible during exit slide
  const lastProps = useRef<Record<string, unknown> | null>(null);
  if (properties) lastProps.current = properties;
  const p = properties ?? lastProps.current;

  const year = p ? parseYear(p) : 0;
  const era = getEra(year);
  const typeLabel = p ? (TYPE_LABELS[String(p.type)] ?? val(p.type)) : '—';
  const height = p?.b_height ? `${p.b_height} m` : '—';
  const displayName = p
    ? val(p.name) !== '—'
      ? val(p.name)
      : typeLabel !== '—'
      ? typeLabel
      : 'Building'
    : '';

  return (
    <aside className={`${s.panel} ${properties ? s.open : ''}`} aria-label="Building details">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className={s.header}>
        <div
          className={s.eraBadge}
          style={{
            borderColor: `${era.color}50`,
            background: `${era.color}18`,
          }}
        >
          <span className={s.eraDot} style={{ background: era.color }} />
          <span className={s.eraLabel} style={{ color: era.color }}>
            {era.label}
          </span>
        </div>
        <button className={s.closeBtn} onClick={onClose} aria-label="Close panel">
          <X size={15} />
        </button>
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      {!!p && (
        <div className={s.body}>
          <div className={s.nameBlock}>
            <span className={s.name}>{displayName}</span>
            <span className={s.eraDesc}>{era.description}</span>
          </div>

          {/* ── Photo header ───────────────────────────────────── */}
          {p.photo && typeof p.photo === 'string' && p.photo.trim() ? (
            <div className={s.photoWrap}>
              <img
                src={p.photo as string}
                alt={displayName}
                className={s.photoImg}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                  (e.currentTarget.nextElementSibling as HTMLElement | null)?.removeAttribute('hidden');
                }}
              />
              <div className={s.photoPlaceholder} hidden>
                <ImageOff size={28} />
                <span>Photo unavailable</span>
              </div>
            </div>
          ) : (
            <div className={s.photoWrap}>
              <div className={s.photoPlaceholder}>
                <ImageOff size={28} />
                <span>No photo</span>
              </div>
            </div>
          )}

          <div className={s.section}>
            <span className={s.sectionLabel}>Construction</span>
            <div className={s.grid}>
              <div className={s.field}>
                <span className={s.fieldLabel}>Year</span>
                <span className={s.fieldValue}>{formatYear(p)}</span>
              </div>
              <div className={s.field}>
                <span className={s.fieldLabel}>Type</span>
                <span className={s.fieldValue}>{typeLabel}</span>
              </div>
              <div className={s.field}>
                <span className={s.fieldLabel}>Height</span>
                <span className={s.fieldValue}>{height}</span>
              </div>
              <div className={s.field}>
                <span className={s.fieldLabel}>District</span>
                <span className={s.fieldValue}>{val(p.district)}</span>
              </div>
              <div className={s.field}>
                <span className={s.fieldLabel}>Wall</span>
                <span className={s.fieldValue}>{val(p.wall_m)}</span>
              </div>
            </div>
          </div>

          {!!(p.arch_style || p.construction_company) && (
            <div className={s.section}>
              <span className={s.sectionLabel}>Architecture</span>
              <div className={s.grid}>
                {!!p.arch_style && (
                  <div className={`${s.field} ${s.fieldFull}`}>
                    <span className={s.fieldLabel}>Style</span>
                    <span className={s.fieldValue}>{val(p.arch_style)}</span>
                  </div>
                )}
                {!!p.construction_company && (
                  <div className={`${s.field} ${s.fieldFull}`}>
                    <span className={s.fieldLabel}>Builder</span>
                    <span className={s.fieldValue}>{val(p.construction_company)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
