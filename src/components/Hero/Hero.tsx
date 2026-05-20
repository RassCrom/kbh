import { useRef, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import s from './Hero.module.scss';

const TIMELINE_YEARS = ['1960', '1980', '1991', '2000', '2010', '2017', '2024'];

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    const img = imgRef.current;
    if (!hero || !img) return;

    const handleMouseMove = (e: MouseEvent) => {
      const mx = (e.clientX / window.innerWidth - 0.5) * 2;
      const my = (e.clientY / window.innerHeight - 0.5) * 2;
      hero.style.setProperty('--mx', String(mx));
      hero.style.setProperty('--my', String(my));
      // Subtle image translate for mouse parallax (max ±18px)
      img.style.transform = `translate(${mx * -18}px, ${my * -10}px) scale(1.08)`;
    };

    const handleScroll = () => {
      const scrollY = window.scrollY;
      // Scroll parallax: image moves up slower than the page
      img.style.transform = `translateY(${scrollY * 0.35}px) scale(1.08)`;
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

      {/* ── Left column: content ─────────────────────────────────────── */}
      <div className={s.leftCol}>
        <div className={s.accentLine} aria-hidden="true" />
        <span className={s.chapterNum} aria-hidden="true">01</span>

        <div className={s.tag}>
          <MapPin size={12} />
          51.12231, 71.435828
        </div>

        <h1 className={s.title}>
          Mapping the
          <span className={s.titleAccent}>Building History</span>
          of a Capital
        </h1>

        <div className={s.decorRule} aria-hidden="true" />

        <p className={s.subtitle}>
          Explore how Astana transformed from a Soviet-era outpost into a futuristic capital
          — one building at a time. Interactive maps, data stories, and architectural timelines.
        </p>

        <div className={s.ctas}>
          <a href="/map" className={s.ctaPrimary} id="cta-explore">
            Explore the Map
          </a>
          <a href="#articles" className={s.ctaSecondary} id="cta-stories">
            Read Stories
          </a>
        </div>
      </div>

      {/* ── Scroll indicator ────────────────────────────────────────── */}
      <div className={s.scrollIndicator}>
        <div className={s.scrollMouse} />
        <span className={s.scrollText}>Scroll</span>
      </div>

      {/* ── Timeline strip ──────────────────────────────────────────── */}
      <div className={s.timelineStrip} aria-label="Astana construction timeline">
        {TIMELINE_YEARS.map((year) => (
          <span key={year} className={s.timelineYear}>{year}</span>
        ))}
      </div>

    </section>
  );
}
