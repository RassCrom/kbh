import s from './RouteLoader.module.scss';

export default function RouteLoader() {
  return (
    <div className={s.loader} role="status" aria-live="polite">
      <span className={s.ring} aria-hidden="true" />
      <span className={s.label}>Loading atlas…</span>
    </div>
  );
}
