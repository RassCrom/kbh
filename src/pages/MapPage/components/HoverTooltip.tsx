import { IS_TOUCH_DEVICE } from '../useIsMobile';
import { type ColorMode } from '../mapHelpers';
import s from '../MapPage.module.scss';

const TYPE_LABELS: Record<string, string> = {
  rc: 'Residential Complex',
  bc: 'Business Center',
  ec: 'Entertainment Center',
  sc: 'Shopping Center',
  sf: 'Sport Facility',
  mosque: 'Mosque',
  church: 'Church',
  healthcare: 'Healthcare Facility',
  hospital: 'Hospital',
  clinic: 'Clinic',
  utility: 'Utility Infrastructure',
  'cultural site': 'Cultural Site',
  admin: 'Administrative Building',
  airport: 'Airport',
  'train station': 'Train Station',
  school: 'School',
  kdgd: 'Kindergarten',
  uni: 'University',
  house: 'Private House',
};

// Helper to resolve an era label + color based on average year
const getEraInfo = (yr: number): { label: string; color: string } => {
  if (yr <= 0) return { label: 'Unknown', color: '#555' };
  if (yr < 1917) return { label: 'Pre-Soviet', color: '#8B2635' };
  if (yr < 1936) return { label: 'Early Soviet', color: '#D32F2F' };
  if (yr < 1953) return { label: 'Stalinist', color: '#C47A24' };
  if (yr < 1964) return { label: 'Khrushchev', color: '#5E9E6A' };
  if (yr < 1985) return { label: 'Brezhnev', color: '#4A7BAA' };
  if (yr < 1991) return { label: 'Late Soviet', color: '#7B4D9E' };
  if (yr < 1997) return { label: 'Post-Soviet', color: '#A07840' };
  if (yr < 2007) return { label: 'Early Astana', color: '#007A9A' };
  if (yr < 2019) return { label: 'Boom Era', color: '#00AFCA' };
  return { label: 'Contemporary', color: '#F5B82E' };
};

interface HoverTooltipProps {
  hoverInfo: {
    x: number;
    y: number;
    properties: Record<string, unknown>;
  } | null;
  selectedBuilding: Record<string, unknown> | null;
  colorMode: ColorMode;
}

const GRAFFITI_STYLE_COLORS: Record<string, string> = {
  mural: '#CAFF00',
  stencil: '#00EAFF',
  'throw-up': '#FF6B35',
  tag: '#FF3CAC',
};

export function HoverTooltip({
  hoverInfo,
  selectedBuilding,
  colorMode,
}: HoverTooltipProps) {
  if (!hoverInfo || selectedBuilding || IS_TOUCH_DEVICE) return null;

  const p = hoverInfo.properties;

  // ── Graffiti point tooltip ─────────────────────────────────────
  if (p._source === 'graffiti') {
    const styleKey = String(p.style ?? '');
    const color = GRAFFITI_STYLE_COLORS[styleKey] ?? '#CAFF00';
    const title = p.title ? String(p.title) : 'Graffiti';
    const styleLabel = styleKey.charAt(0).toUpperCase() + styleKey.slice(1) || 'Unknown';
    return (
      <div className={s.tooltip} style={{ left: hoverInfo.x + 14, top: hoverInfo.y - 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{
            display: 'inline-block', width: 8, height: 8,
            borderRadius: '50%', background: color,
            boxShadow: `0 0 6px ${color}`,
            flexShrink: 0,
          }} />
          <span className={s.tooltipName} style={{ margin: 0 }}>{title}</span>
        </div>
        <div className={s.tooltipRow}>
          <span className={s.tooltipKey}>Style</span>
          <span className={s.tooltipVal} style={{ color }}>{styleLabel}</span>
        </div>
        {!!p.location && (
          <div className={s.tooltipRow}>
            <span className={s.tooltipKey}>Location</span>
            <span className={s.tooltipVal}>{String(p.location)}</span>
          </div>
        )}
        <div className={s.tooltipHint}>Click for details</div>
      </div>
    );
  }

  // A cell is a hexagon if it contains NUMPOINTS or year_mean or height_mean_2
  const isHex = p.NUMPOINTS !== undefined || p.year_mean !== undefined || p.height_mean_2 !== undefined;

  // ── Hexagon (PMTiles vector tile cell) tooltip ──────────────────────
  if (isHex) {
    const count = Number(p.NUMPOINTS ?? 0);
    const avgYear = typeof p.year_mean === 'number' ? Math.round(p.year_mean) : 0;
    const avgH = typeof p.height_mean_2 === 'number' ? Math.round(p.height_mean_2) : 0;

    const densityPct = Math.min(100, (count / 200) * 100);
    const densityLabel = count < 10 ? 'Sparse' : count < 50 ? 'Moderate' : count < 120 ? 'Dense' : 'Very Dense';
    const era = getEraInfo(avgYear);

    return (
      <div className={s.tooltip} style={{ left: hoverInfo.x + 14, top: hoverInfo.y - 14, minWidth: 200 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{
            display: 'inline-block', width: 8, height: 8,
            borderRadius: '50%', background: era.color,
            boxShadow: `0 0 6px ${era.color}`,
            flexShrink: 0,
          }} />
          <span className={s.tooltipName} style={{ margin: 0 }}>Urban Cell</span>
        </div>

        {/* Building count + density progress bar */}
        <div className={s.tooltipRow} style={{ flexDirection: 'column', gap: 4, alignItems: 'stretch' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className={s.tooltipKey}>Buildings</span>
            <span className={s.tooltipVal} style={{ color: '#d4a85e', fontWeight: 700 }}>
              {count.toLocaleString()}
              <span style={{ fontSize: 9, fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: 4 }}>
                {densityLabel}
              </span>
            </span>
          </div>
          {/* Mini density bar */}
          <div style={{
            height: 3, borderRadius: 2,
            background: 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', width: `${densityPct}%`,
              borderRadius: 2,
              background: `linear-gradient(90deg, #1a5c7a, #d4a85e ${densityPct}%)`,
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Average construction year */}
        {avgYear > 0 && (
          <div className={s.tooltipRow} style={{ marginTop: 6 }}>
            <span className={s.tooltipKey}>Avg Built</span>
            <span className={s.tooltipVal}>
              {avgYear}
              <span style={{
                marginLeft: 6, fontSize: 9, fontWeight: 600,
                color: era.color, letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}>
                {era.label}
              </span>
            </span>
          </div>
        )}

        {/* Average height */}
        {avgH > 0 && (
          <div className={s.tooltipRow}>
            <span className={s.tooltipKey}>Avg Height</span>
            <span className={s.tooltipVal}>{avgH} m</span>
          </div>
        )}

        <div className={s.tooltipHint} style={{ marginTop: 8 }}>Hover to explore</div>
      </div>
    );
  }

  // ── Building footprint tooltip ─────────────────────────────────────
  const name = p.name ? String(p.name) : null;
  const year = p.year_int ?? p.year_str;
  const demVal = p.dem_mean != null ? Number(p.dem_mean).toFixed(1) : null;
  const lstVal = p.lst_1mean != null ? Number(p.lst_1mean).toFixed(1) : null;
  const rawType = p.type ? String(p.type) : null;
  const typeLabel = rawType ? (TYPE_LABELS[rawType] || rawType) : null;
  const hasData = !!(name || year || demVal || lstVal || typeLabel);

  return (
    <div className={s.tooltip} style={{ left: hoverInfo.x + 14, top: hoverInfo.y - 14 }}>
      {hasData ? (
        <>
          {!!name && <div className={s.tooltipName}>{name}</div>}
          {!!year && (
            <div className={s.tooltipRow}>
              <span className={s.tooltipKey}>Year</span>
              <span className={s.tooltipVal}>{String(year)}</span>
            </div>
          )}
          {colorMode === 'elevation' && !!demVal && (
            <div className={s.tooltipRow}>
              <span className={s.tooltipKey}>Elevation</span>
              <span className={s.tooltipVal} style={{ color: '#27ae60' }}>{demVal} m</span>
            </div>
          )}
          {colorMode === 'lst' && !!lstVal && (
            <div className={s.tooltipRow}>
              <span className={s.tooltipKey}>Summer LST</span>
              <span className={s.tooltipVal} style={{ color: '#fdae61' }}>{lstVal} °C</span>
            </div>
          )}
          {colorMode === 'type' && !!typeLabel && (
            <div className={s.tooltipRow}>
              <span className={s.tooltipKey}>Use</span>
              <span className={s.tooltipVal} style={{ color: '#a78bfa' }}>{typeLabel}</span>
            </div>
          )}
          {colorMode === 'uhi' && (
            <>
              {!!year && (
                <div className={s.tooltipRow}>
                  <span className={s.tooltipKey}>Age</span>
                  <span className={s.tooltipVal} style={{ color: '#64ACBE' }}>{2026 - Number(year)} yr</span>
                </div>
              )}
              {!!lstVal && (
                <div className={s.tooltipRow}>
                  <span className={s.tooltipKey}>LST</span>
                  <span className={s.tooltipVal} style={{ color: '#C8705A' }}>{lstVal} °C</span>
                </div>
              )}
            </>
          )}
          <div className={s.tooltipHint}>Click for more info</div>
        </>
      ) : (
        <div className={s.tooltipHintOnly}>Click to see building info</div>
      )}
    </div>
  );
}
