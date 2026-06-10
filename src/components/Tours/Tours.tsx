import { useRef } from 'react';
import { Map, MapPin, Clock, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import s from './Tours.module.scss';

// Mirrors src/pages/MapPage/tours.ts — ids must match for /map?tour=<id> deep links
const TOURS = [
  {
    id: 'nurzhol',
    title: 'Nurzhol Axis — Birth of a Capital',
    desc: 'Fly the ceremonial boulevard of Kisho Kurokawa\'s 1997 masterplan: Khan Shatyr, Bayterek, Ak Orda, the Pyramid and the great mosque-square of Independence.',
    eraColor: 'linear-gradient(135deg, #00AFCA, #007A9A)',
    stops: '6 stops',
    duration: '~6 min',
    era: '1997 – 2017',
  },
  {
    id: 'tselinograd',
    title: 'Tselinograd — The Soviet Grid',
    desc: 'The right bank remembers: the railway station of the Virgin Lands settlers, khrushchyovka quarters, the mikrorayon machine, and the river that splits two ideologies.',
    eraColor: 'linear-gradient(135deg, #4A7BAA, #7B4D9E)',
    stops: '5 stops',
    duration: '~5 min',
    era: '1954 – 1990',
  },
  {
    id: 'sacred',
    title: 'Sacred & Monumental Astana',
    desc: 'Mosques, cathedrals, a pyramid built for every faith, and the museums of a young state writing its own history in marble and glass.',
    eraColor: 'linear-gradient(135deg, #F5B82E, #C47A24)',
    stops: '5 stops',
    duration: '~5 min',
    era: '1990s – 2022',
  },
  {
    id: 'expo',
    title: 'EXPO & the Future City',
    desc: 'The world\'s largest sphere, a kilometre-long mall, a flagship university and Central Asia\'s tallest tower — the city\'s bet on its next chapter.',
    eraColor: 'linear-gradient(135deg, #8B5CF6, #4A7BAA)',
    stops: '5 stops',
    duration: '~5 min',
    era: '2010 – 2024',
  },
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
            <div className={s.card} key={tour.id} id={`tour-${tour.id}`}>
              <div className={s.eraStrip} style={{ background: tour.eraColor }} />
              <div className={s.cardContent}>
                <div className={s.cardIcon}>
                  <Map size={20} />
                </div>
                <div className={s.titleRow}>
                  <h3 className={s.cardTitle}>{tour.title}</h3>
                </div>
                <p className={s.cardDesc}>{tour.desc}</p>
                <div className={s.cardMeta}>
                  <span className={s.metaItem}>
                    <MapPin size={12} /> {tour.stops}
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
