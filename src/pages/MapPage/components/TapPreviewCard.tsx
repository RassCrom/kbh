import { ChevronRight, X } from 'lucide-react';
import { ERA_CONFIG } from '../constants';
import { formatBuildingType, getThemeDetails, parseBuildingYear } from '../buildingDisplay';
import type { ColorMode } from '../mapHelpers';
import s from '../MapPage.module.scss';

interface Props {
  properties: Record<string, unknown> | null;
  colorMode: ColorMode;
  onOpenDetails: () => void;
  onDismiss: () => void;
}

/**
 * Touch-device preview: first tap on a building shows this compact card,
 * a second tap (or the Full details button) opens the full BuildingPanel.
 */
export function TapPreviewCard({ properties, colorMode, onOpenDetails, onDismiss }: Props) {
  if (!properties) return null;

  const year = parseBuildingYear(properties);
  const era = year
    ? ERA_CONFIG.find((e) => e.bounds[0] !== -1 && year >= e.bounds[0] && year <= e.bounds[1])
      ?? ERA_CONFIG[ERA_CONFIG.length - 1]
    : ERA_CONFIG[ERA_CONFIG.length - 1];
  const typeLabel = properties.type ? formatBuildingType(properties.type) : null;
  const name = properties.name
    ? String(properties.name)
    : typeLabel ?? 'Building';
  const yearLabel = properties.year_int
    ? String(properties.year_int)
    : properties.year_str
      ? String(properties.year_str)
      : null;
  const themeDetails = getThemeDetails(properties, colorMode);

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
        <span className={s.tapPreviewTheme}>
          {themeDetails.attributes.map(({ label, value }) => `${label}: ${value}`).join(' · ')}
        </span>
        <span className={s.tapPreviewHint}>Tap building again or choose Full details</span>
      </button>
      <button className={s.tapPreviewOpen} onClick={onOpenDetails} aria-label="Open building details">
        <span>Full details</span>
        <ChevronRight size={13} />
      </button>
      <button className={s.tapPreviewClose} onClick={onDismiss} aria-label="Dismiss preview">
        <X size={13} />
      </button>
    </div>
  );
}
