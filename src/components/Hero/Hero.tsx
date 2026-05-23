import { useRef, useEffect } from 'react';
import { MapPin, ArrowRight } from 'lucide-react';
import s from './Hero.module.scss';
import { ERA_CONFIG } from '../../pages/MapPage/constants';

// ── Data for the right-column card ──────────────────────────────────────────

const CARD_STATS = [
  { value: '143K',      label: 'Buildings' },
  { value: '10',        label: 'Eras' },
  { value: '1900–2024', label: 'Timeline' },
  { value: '6',         label: 'Districts' },
];

const ERA_SEGMENTS = ERA_CONFIG.filter(e => e.bounds[0] !== -1);

const TIMELINE_YEARS = ['1960', '1980', '1991', '2000', '2010', '2017', '2024'];

export default function Hero() {
  const heroRef  = useRef<HTMLElement>(null);
  const imgRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    const img  = imgRef.current;
    if (!hero || !img) return;

    const handleMouseMove = (e: MouseEvent) => {
      const mx = (e.clientX / window.innerWidth  - 0.5) * 2;
      const my = (e.clientY / window.innerHeight - 0.5) * 2;
      hero.style.setProperty('--mx', String(mx));
      hero.style.setProperty('--my', String(my));
      img.style.transform = `translate(${mx * -18}px, ${my * -10}px) scale(1.08)`;
    };

    const handleScroll = () => {
      img.style.transform = `translateY(${window.scrollY * 0.35}px) scale(1.08)`;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <section className={s.hero} id="hero" ref={heroRef}>

      {/* ── Parallax image layer ─────────────────────────────────────── */}
      <div className={s.imageWrap}>
        <div
          ref={imgRef}
          className={s.image}
          style={{ backgroundImage: 'url(/story-one-bg-photo.png)' }}
          aria-hidden="true"
        />
        <div className={s.imageOverlay} aria-hidden="true" />
      </div>

      {/* ── Left column ──────────────────────────────────────────────── */}
      <div className={s.leftCol}>
        <div className={s.accentLine} aria-hidden="true" />
        <span className={s.chapterNum} aria-hidden="true">01</span>

        {/* Badge */}
        <div className={s.badge}>
          <span className={s.badgePulse} aria-hidden="true" />
          <MapPin size={11} aria-hidden="true" />
          <span>51.1223° N · 71.4358° E</span>
        </div>

        {/* Headline */}
        <h1 className={s.title}>
          Mapping the
          <span className={s.titleAccent}>Building History</span>
          of a Capital
        </h1>

        {/* Era color strip — teases the map's color system */}
        <div className={s.eraStrip} role="presentation" aria-hidden="true">
          {ERA_SEGMENTS.map(e => (
            <span
              key={e.label}
              className={s.eraSegment}
              style={{ background: e.color }}
              title={e.label}
            />
          ))}
        </div>

        <p className={s.subtitle}>
          Explore how Astana transformed from a Soviet-era outpost into a
          futuristic capital — one building at a time. Interactive maps,
          data stories, and architectural timelines.
        </p>

        <div className={s.ctas}>
          <a href="/map" className={s.ctaPrimary} id="cta-explore">
            Explore the Map
            <ArrowRight size={15} className={s.ctaArrow} />
          </a>
          <a href="#articles" className={s.ctaSecondary} id="cta-stories">
            Read Stories
          </a>
        </div>
      </div>

      {/* ── Right column — data card ──────────────────────────────────── */}
      <div className={s.rightCol} aria-hidden="true">
        <div className={s.dataCard}>

          {/* Top bar: live indicator */}
          <div className={s.cardTopBar}>
            <span className={s.liveDot} />
            <span className={s.liveText}>LIVE · MAP DATA</span>
            <span className={s.cardRef}>AST · 2024</span>
          </div>

          {/* 2×2 stat grid */}
          <div className={s.statGrid}>
            {CARD_STATS.map(st => (
              <div key={st.label} className={s.statItem}>
                <span className={s.statValue}>{st.value}</span>
                <span className={s.statLabel}>{st.label}</span>
              </div>
            ))}
          </div>

          {/* Era gradient bar */}
          <div className={s.cardEraBlock}>
            <span className={s.cardEraTitle}>Architecture Eras</span>
            <div className={s.cardEraBar} />
            <div className={s.cardEraYears}>
              <span>1900</span>
              <span>1953</span>
              <span>1991</span>
              <span>2024</span>
            </div>
          </div>

        </div>

        {/* Blueprint dot-grid backdrop for right column */}
        <div className={s.rightGridDecor} aria-hidden="true" />
      </div>

      {/* ── Scroll indicator ─────────────────────────────────────────── */}
      <div className={s.scrollIndicator}>
        <div className={s.scrollMouse} />
        <span className={s.scrollText}>Scroll</span>
      </div>

      {/* ── Timeline strip ───────────────────────────────────────────── */}
      <div className={s.timelineStrip} aria-label="Astana construction timeline">
        <div className={s.timelineEraBar} aria-hidden="true" />
        {TIMELINE_YEARS.map((year) => (
          <span key={year} className={s.timelineYear}>{year}</span>
        ))}
      </div>

    </section>
  );
}
