import { useRef } from 'react';
import { Map, MapPin, Clock, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import s from './Tours.module.scss';
import { TOUR_META } from '../../data/tourMeta';

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

  const showNav = TOUR_META.length > 1;

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
          {TOUR_META.map((tour) => (
            <div className={s.card} key={tour.id} id={`tour-${tour.id}`}>
              <div className={s.eraStrip} style={{ background: tour.gradient }} />
              <div className={s.cardContent}>
                <div className={s.cardIcon}>
                  <Map size={20} />
                </div>
                <div className={s.titleRow}>
                  <h3 className={s.cardTitle}>{tour.title}</h3>
                </div>
                <p className={s.cardDesc}>{tour.blurb}</p>
                <div className={s.cardMeta}>
                  <span className={s.metaItem}>
                    <MapPin size={12} /> {tour.stopCount} stops
                  </span>
                  <span className={s.metaItem}>
                    <Clock size={12} /> {tour.duration}
                  </span>
                  <span className={s.metaItem}>{tour.era}</span>
                </div>
                <Link to={`/map?tour=${tour.id}`} className={s.startBtn}>
                  Start Tour <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
