import { useRef } from 'react';
import { X, ImageOff } from 'lucide-react';
import { ERA_CONFIG } from '../constants';
import {
  formatBuildingType,
  formatDistrict,
  getThemeDetails,
  parseBuildingYear,
} from '../buildingDisplay';
import type { ColorMode } from '../mapHelpers';
import s from './BuildingPanel.module.scss';

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
  colorMode: ColorMode;
  onClose: () => void;
}

export function BuildingPanel({ properties, colorMode, onClose }: Props) {
  // Keep last known props so content stays visible during exit slide
  const lastProps = useRef<Record<string, unknown> | null>(null);
  if (properties) lastProps.current = properties;
  const p = properties ?? lastProps.current;

  const year = p ? parseBuildingYear(p) : 0;
  const era = getEra(year);
  const typeLabel = p ? formatBuildingType(p.type) : '—';
  const height = p?.b_height ? `${p.b_height} m` : '—';
  const themeDetails = p ? getThemeDetails(p, colorMode) : null;
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
                <span className={s.fieldValue}>{formatDistrict(p.district)}</span>
              </div>
              <div className={s.field}>
                <span className={s.fieldLabel}>Wall</span>
                <span className={s.fieldValue}>{val(p.wall_m)}</span>
              </div>
            </div>
          </div>

          {!!themeDetails && (
            <div className={s.section}>
              <span className={s.sectionLabel}>Active layer · {themeDetails.label}</span>
              <div className={s.grid}>
                {themeDetails.attributes.map((attribute) => (
                  <div className={s.field} key={attribute.label}>
                    <span className={s.fieldLabel}>{attribute.label}</span>
                    <span className={s.fieldValue}>{attribute.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
