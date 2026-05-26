import { useRef } from 'react';
import { Map, Building, Clock, ArrowRight, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import s from './Tours.module.scss';

const TOURS = [
  {
    id: 'tour-historic-walk',
    title: 'Historic Walk',
    desc: 'An immersive journey tracing the monumental shifts of Astana—from its Tsarist roots and Soviet grid blocks to its modern independence masterpieces.',
    eraColor: 'linear-gradient(135deg, var(--color-accent-gold), var(--color-accent-sky))',
    buildings: 'Coming Soon',
    duration: 'TBD',
    era: 'All Eras',
    isComingSoon: true,
  }
];

export default function Tours() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -340, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 340, behavior: 'smooth' });
    }
  };

  const showNav = TOURS.length > 1;

  return (
    <section className={s.tours} id="tours">
      <div className={s.inner}>
        <span className={s.tag}>04 · Story Tours</span>
        <div className={s.header}>
          <h2 className={s.heading}>Guided Building Tours</h2>
          {showNav && (
            <div className={s.navButtons}>
              <button className={s.navBtn} onClick={scrollLeft} aria-label="Previous slide">
                <ChevronLeft size={20} />
              </button>
              <button className={s.navBtn} onClick={scrollRight} aria-label="Next slide">
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        <div className={s.scroll} ref={scrollRef} style={!showNav ? { justifyContent: 'start' } : {}}>
          {TOURS.map((tour) => (
            <div className={s.card} key={tour.id} id={tour.id}>
              <div className={s.eraStrip} style={{ background: tour.eraColor }} />
              <div className={s.cardContent}>
                <div className={s.cardIcon}>
                  <Map size={20} />
                </div>
                <div className={s.titleRow}>
                  <h3 className={s.cardTitle}>{tour.title}</h3>
                  {tour.isComingSoon && <span className={s.comingSoonBadge}>Coming Soon</span>}
                </div>
                <p className={s.cardDesc}>{tour.desc}</p>
                <div className={s.cardMeta}>
                  <span className={s.metaItem}>
                    <Building size={12} /> {tour.buildings}
                  </span>
                  <span className={s.metaItem}>
                    <Clock size={12} /> {tour.duration}
                  </span>
                </div>
                {tour.isComingSoon ? (
                  <div className={s.comingSoonBtn}>
                    <Lock size={14} /> Coming Soon Tour
                  </div>
                ) : (
                  <a href="#" className={s.startBtn}>
                    Start Tour <ArrowRight size={14} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
