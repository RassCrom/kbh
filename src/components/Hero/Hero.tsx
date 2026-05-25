import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import s from './Hero.module.scss';

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

      {/* ── Centered content ────────────────────────────────────────── */}
      <div className={s.leftCol}>
        {/* Headline */}
        <h1 className={s.title}>
          <span className={s.titleAccent}>Building History</span>
          of a Capital
        </h1>

        <p className={s.subtitle}>
          Explore how Astana transformed from a Soviet-era outpost into a
          futuristic capital — one building at a time. Interactive maps,
          data stories, and architectural timelines.
        </p>

        <div className={s.ctas}>
          <Link to="/map" className={s.ctaPrimary} id="cta-explore">
            Explore the Map
          </Link>
        </div>
      </div>

    </section>
  );
}
