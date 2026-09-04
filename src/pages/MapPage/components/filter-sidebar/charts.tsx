import { useState, useMemo } from 'react';
import s from '../../MapPage.module.scss';
import { DISTRICT_OPTIONS, DISTRICT_TOTAL_COUNTS, ERA_CONFIG } from '../../constants';
import { type DecadeLstPoint } from '../../mapHelpers';

// Chart primitives and the static district dataset behind the Charts tab.

// One distinct colour per district for the comparison chart
const DISTRICT_COLORS: Record<string, string> = {
  'Nura':      '#00AFCA',
  'Yesil':     '#4A7BAA',
  'Almaty':    '#5E9E6A',
  'Sa':        '#C47A24',   // Saryarka
  'B':         '#7B4D9E',   // Baikonur
  'Saraishik': '#D32F2F',
};

// Static district chart data — computed once at module load from DISTRICT_TOTAL_COUNTS constants
const DISTRICT_CHART_ROWS = DISTRICT_OPTIONS
  .map(opt => ({
    label: opt.label,
    value: opt.value,
    count: DISTRICT_TOTAL_COUNTS[opt.value] ?? 0,
    color: DISTRICT_COLORS[opt.value] ?? '#6d7d94',
  }))
  .filter(r => r.count > 0)
  .sort((a, b) => b.count - a.count);

const DISTRICT_CHART_TOTAL = DISTRICT_CHART_ROWS.reduce((s, r) => s + r.count, 0);


function HBar({ label, count, total, color }: { label: string; count: number; total: number; color?: string }) {
  const pct = total > 0 ? Math.max((count / total) * 100, count > 0 ? 2 : 0) : 0;
  return (
    <div className={s.hBarRow}>
      <span className={s.hBarLabel}>{label}</span>
      <div className={s.hBarTrack}>
        <div
          className={s.hBarFill}
          style={{ width: `${pct}%`, background: color ?? 'var(--color-accent-brand)' }}
        />
      </div>
      <span className={s.hBarCount}>{count.toLocaleString()}</span>
    </div>
  );
}

// ── Scatter chart helpers ────────────────────────────────────────────────────

function getEraColor(decade: number): string {
  const mid = decade + 5;
  const era = ERA_CONFIG.find(e => e.bounds[0] !== -1 && mid >= e.bounds[0] && mid <= e.bounds[1]);
  return era?.color ?? '#4a4a5a';
}

function linReg(pts: DecadeLstPoint[]): { slope: number; intercept: number } | null {
  if (pts.length < 3) return null;
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p.decade, 0) / n;
  const my = pts.reduce((s, p) => s + p.meanLst, 0) / n;
  const num = pts.reduce((s, p) => s + (p.decade - mx) * (p.meanLst - my), 0);
  const den = pts.reduce((s, p) => s + (p.decade - mx) ** 2, 0);
  if (den === 0) return null;
  const slope = num / den;
  return { slope, intercept: my - slope * mx };
}

function LstScatterChart({ data }: { data: DecadeLstPoint[] }) {
  const [hov, setHov] = useState<{ pt: DecadeLstPoint; sx: number; sy: number } | null>(null);

  const W = 252, H = 148;
  const PAD = { top: 8, right: 6, bottom: 26, left: 30 };
  const CW = W - PAD.left - PAD.right;
  const CH = H - PAD.top - PAD.bottom;

  const lsts = data.map(d => d.meanLst);
  const rawMin = lsts.length ? Math.min(...lsts) : 33;
  const rawMax = lsts.length ? Math.max(...lsts) : 48;
  const pad = Math.max(1, (rawMax - rawMin) * 0.12);
  const yMin = rawMin - pad;
  const yMax = rawMax + pad;

  const scX = (d: number) => PAD.left + ((d - 1900) / 120) * CW;
  const scY = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * CH;

  const reg = useMemo(() => linReg(data), [data]);

  // Y axis ticks — 4-5 evenly spaced
  const yRange = yMax - yMin;
  const yStep = yRange <= 6 ? 1 : yRange <= 12 ? 2 : yRange <= 20 ? 4 : 5;
  const yTicks: number[] = [];
  for (let v = Math.ceil(yMin / yStep) * yStep; v <= yMax; v += yStep) yTicks.push(v);

  const xTicks = [1900, 1920, 1940, 1960, 1980, 2000, 2020];

  const insightText = reg
    ? reg.slope > 0.02
      ? '↑ Newer decades trend warmer'
      : reg.slope < -0.02
        ? '↓ Older decades trend warmer'
        : '≈ No clear age–heat trend'
    : null;

  if (data.length === 0) {
    return <div className={s.chartEmpty}>No LST data — zoom in to load buildings</div>;
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setHov(null)}
      >
        {/* Horizontal grid lines */}
        {yTicks.map(v => (
          <line key={v} x1={PAD.left} y1={scY(v)} x2={PAD.left + CW} y2={scY(v)}
            stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
        ))}
        {/* Axes */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + CH}
          stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
        <line x1={PAD.left} y1={PAD.top + CH} x2={PAD.left + CW} y2={PAD.top + CH}
          stroke="rgba(255,255,255,0.10)" strokeWidth={1} />

        {/* Y ticks + labels */}
        {yTicks.map(v => (
          <g key={v}>
            <line x1={PAD.left - 3} y1={scY(v)} x2={PAD.left} y2={scY(v)}
              stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
            <text x={PAD.left - 5} y={scY(v) + 3.5} fontSize={9} fill="#6d7d94" textAnchor="end"
              fontFamily="var(--font-mono)">{v}°</text>
          </g>
        ))}

        {/* X ticks + labels */}
        {xTicks.map(d => (
          <g key={d}>
            <line x1={scX(d)} y1={PAD.top + CH} x2={scX(d)} y2={PAD.top + CH + 3}
              stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
            <text x={scX(d)} y={PAD.top + CH + 12} fontSize={9} fill="#6d7d94" textAnchor="middle"
              fontFamily="var(--font-mono)">
              {d === 1900 ? '1900' : `'${String(d).slice(2)}`}
            </text>
          </g>
        ))}

        {/* Trend line */}
        {reg && (() => {
          const x1 = 1900, x2 = 2020;
          const y1 = reg.slope * x1 + reg.intercept;
          const y2 = reg.slope * x2 + reg.intercept;
          return (
            <line x1={scX(x1)} y1={scY(y1)} x2={scX(x2)} y2={scY(y2)}
              stroke="rgba(212,168,94,0.40)" strokeWidth={1.5} strokeDasharray="5,3" />
          );
        })()}

        {/* Data points */}
        {data.map(pt => {
          const cx = scX(pt.decade);
          const cy = scY(pt.meanLst);
          const r = Math.max(4, Math.min(11, Math.sqrt(pt.count) * 0.55));
          const col = getEraColor(pt.decade);
          return (
            <circle key={pt.decade} cx={cx} cy={cy} r={r}
              fill={`${col}bb`} stroke={col} strokeWidth={1.5}
              style={{ cursor: 'default' }}
              onMouseEnter={() => setHov({ pt, sx: cx, sy: cy })}
            />
          );
        })}
      </svg>

      {/* Axis labels */}
      <div style={{
        position: 'absolute', left: 0, top: '50%', transform: 'rotate(-90deg) translateX(-50%)',
        transformOrigin: '0 0', fontSize: 10, color: '#6d7d94',
        fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}>LST °C</div>

      {/* Hover tooltip */}
      {hov && (
        <div style={{
          position: 'absolute',
          left: `${(hov.sx / W) * 100}%`,
          top: `${(hov.sy / H) * 100}%`,
          transform: hov.sx > W * 0.65 ? 'translate(-100%,-110%)' : 'translate(4px,-110%)',
          background: 'rgba(14,21,33,0.96)',
          border: '1px solid rgba(30,42,56,0.9)',
          borderRadius: 6,
          padding: '5px 8px',
          pointerEvents: 'none',
          zIndex: 20,
          whiteSpace: 'nowrap',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: getEraColor(hov.pt.decade), fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {hov.pt.decade}s
          </div>
          <div style={{ fontSize: 11, color: '#dfe0e4', fontFamily: 'var(--font-mono)', marginTop: 1 }}>
            LST <strong style={{ color: '#fdae61' }}>{hov.pt.meanLst.toFixed(1)} °C</strong>
          </div>
          <div style={{ fontSize: 11, color: '#6d7d94', fontFamily: 'var(--font-mono)' }}>
            {hov.pt.count.toLocaleString()} buildings
          </div>
        </div>
      )}

      {/* Trend insight */}
      {insightText && (
        <div style={{ fontSize: 10, color: reg && Math.abs(reg.slope) > 0.02 ? 'rgba(212,168,94,0.65)' : '#6d7d94', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', marginTop: 4, textAlign: 'center' }}>
          {insightText}
        </div>
      )}
    </div>
  );
}

export { HBar, LstScatterChart, DISTRICT_CHART_ROWS, DISTRICT_CHART_TOTAL, DISTRICT_COLORS };
