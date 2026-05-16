import { Suspense } from 'react';
import { MapPin } from 'lucide-react';
import ModelViewer from './ModelViewer';
import s from './Hero.module.scss';

export default function Hero() {
  return (
    <section className={s.hero} id="hero">
      <div className={s.canvasWrap}>
        <Suspense fallback={null}>
          <ModelViewer />
        </Suspense>
      </div>

      <div className={s.overlay} />

      <div className={s.content}>
        <div className={s.tag}>
          <MapPin size={12} />
          51.12231, 71.435828
        </div>

        <h1 className={s.title}>
          Mapping the
          <span className={s.titleAccent}>Building History</span>
          of a Capital
        </h1>

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

      <div className={s.scrollIndicator}>
        <div className={s.scrollMouse} />
        <span className={s.scrollText}>Scroll</span>
      </div>
    </section>
  );
}
