import { useRef } from 'react';
import { X, ImageOff } from 'lucide-react';
import s from './GraffitiPanel.module.scss';

const STYLE_CONFIG: Record<string, { label: string; color: string }> = {
  mural:     { label: 'Mural',    color: '#CAFF00' },
  stencil:   { label: 'Stencil',  color: '#00EAFF' },
  'throw-up': { label: 'Throw-up', color: '#FF6B35' },
  tag:       { label: 'Tag',      color: '#FF3CAC' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active:  { label: 'Active',   color: '#4ade80' },
  faded:   { label: 'Faded',    color: '#facc15' },
  removed: { label: 'Removed',  color: '#f87171' },
};

const SIZE_LABELS: Record<string, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

function val(v: unknown): string {
  if (v == null || v === '' || v === 'null') return '—';
  return String(v);
}

interface Props {
  properties: Record<string, unknown> | null;
  onClose: () => void;
}

export function GraffitiPanel({ properties, onClose }: Props) {
  const lastProps = useRef<Record<string, unknown> | null>(null);
  if (properties) lastProps.current = properties;
  const p = properties ?? lastProps.current;

  const styleKey = p ? String(p.style ?? '') : '';
  const styleInfo = STYLE_CONFIG[styleKey] ?? { label: styleKey || 'Unknown', color: '#888' };

  const statusKey = p ? String(p.status ?? 'active') : 'active';
  const statusInfo = STATUS_CONFIG[statusKey] ?? { label: statusKey, color: '#888' };

  const title = p ? val(p.title) : '';
  const hasPhoto = !!p?.photo && String(p.photo).trim() !== '';

  return (
    <aside className={`${s.panel} ${properties ? s.open : ''}`} aria-label="Graffiti details">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className={s.header}>
        <div
          className={s.styleBadge}
          style={{
            borderColor: `${styleInfo.color}50`,
            background: `${styleInfo.color}18`,
          }}
        >
          <span className={s.styleDot} style={{ background: styleInfo.color }} />
          <span className={s.styleLabel} style={{ color: styleInfo.color }}>
            {styleInfo.label}
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
            <span className={s.name}>{title !== '—' ? title : 'Graffiti'}</span>
            <span className={s.locationText}>{val(p.location)}</span>
          </div>

          {/* ── Photo ──────────────────────────────────────────── */}
          <div className={s.photoWrap}>
            {hasPhoto ? (
              <>
                <img
                  src={String(p.photo)}
                  alt={title}
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
              </>
            ) : (
              <div className={s.photoPlaceholder}>
                <ImageOff size={28} />
                <span>No photo yet</span>
              </div>
            )}
          </div>

          {/* ── Details ─────────────────────────────────────────── */}
          <div className={s.section}>
            <span className={s.sectionLabel}>Details</span>
            <div className={s.grid}>
              {p.year != null && p.year !== '' && (
                <div className={s.field}>
                  <span className={s.fieldLabel}>Year</span>
                  <span className={s.fieldValue}>{val(p.year)}</span>
                </div>
              )}
              <div className={s.field}>
                <span className={s.fieldLabel}>Size</span>
                <span className={s.fieldValue}>{SIZE_LABELS[String(p.size)] ?? val(p.size)}</span>
              </div>
              <div className={s.field}>
                <span className={s.fieldLabel}>Status</span>
                <span className={s.fieldValue} style={{ color: statusInfo.color }}>
                  {statusInfo.label}
                </span>
              </div>
              {val(p.artist) !== '—' && (
                <div className={`${s.field} ${s.fieldFull}`}>
                  <span className={s.fieldLabel}>Artist</span>
                  <span className={s.fieldValue}>{val(p.artist)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
