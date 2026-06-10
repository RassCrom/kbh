import { Link } from 'react-router-dom';
import { ArrowLeft, Map as MapIcon } from 'lucide-react';
import s from './NotFoundPage.module.scss';

/**
 * Animated 404 — "lost coordinates" theme: a drifting map grid, a pulsing
 * search marker, and era-gold accents matching the atlas design language.
 */
export default function NotFoundPage() {
  return (
    <div className={s.page}>
      {/* Drifting map grid backdrop */}
      <div className={s.grid} aria-hidden="true" />
      <div className={s.vignette} aria-hidden="true" />

      {/* Radar rings + marker */}
      <div className={s.radar} aria-hidden="true">
        <span className={s.ring} />
        <span className={`${s.ring} ${s.ringDelay1}`} />
        <span className={`${s.ring} ${s.ringDelay2}`} />
        <svg className={s.pin} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </div>

      <div className={s.content}>
        <span className={s.code} aria-hidden="true">
          <span className={s.digit}>4</span>
          <span className={`${s.digit} ${s.digitMid}`}>0</span>
          <span className={s.digit}>4</span>
        </span>
        <h1 className={s.title}>Coordinates not found</h1>
        <p className={s.text}>
          This address isn't on our map — maybe it was demolished, renamed,
          or never built. The steppe is vast; the atlas covers only Astana.
        </p>
        <div className={s.actions}>
          <Link to="/" className={s.btnPrimary}>
            <ArrowLeft size={15} />
            Back to home
          </Link>
          <Link to="/map" className={s.btnSecondary}>
            <MapIcon size={15} />
            Open the map
          </Link>
        </div>
        <span className={s.coords}>51.1282° N · 71.4306° E — try here instead</span>
      </div>
    </div>
  );
}
