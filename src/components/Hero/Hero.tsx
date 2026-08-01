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

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let mouseX = 0;
    let mouseY = 0;
    let scrollY = window.scrollY;
    let frame = 0;
    let visible = true;

    const renderTransform = () => {
      frame = 0;
      if (!visible) return;
      const parallaxY = Math.min(scrollY, hero.offsetHeight) * 0.22;
      hero.style.setProperty('--mx', String(mouseX));
      hero.style.setProperty('--my', String(mouseY));
      img.style.transform = `translate3d(${mouseX * -14}px, ${parallaxY + mouseY * -8}px, 0) scale(1.08)`;
    };

    const scheduleTransform = () => {
      if (frame === 0) frame = requestAnimationFrame(renderTransform);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
      scheduleTransform();
    };

    const handleScroll = () => {
      scrollY = window.scrollY;
      scheduleTransform();
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) scheduleTransform();
    });
    observer.observe(hero);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    scheduleTransform();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
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
