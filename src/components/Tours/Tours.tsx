import { Map, Building, Clock, ArrowRight } from 'lucide-react';
import s from './Tours.module.scss';

const TOURS = [
  {
    id: 'tour-soviet',
    title: 'Soviet Foundations',
    desc: 'Walk through the grid of Tselinograd — blocky Khrushchyovkas, Palace of Soviets, and the original rail station district.',
    eraColor: 'var(--building-era-3)',
    buildings: 340,
    duration: '15 min',
    era: '1960s',
  },
  {
    id: 'tour-independence',
    title: 'Capital Declaration',
    desc: 'The bold pivot of 1997 — early governmental buildings, the first master plan by Kisho Kurokawa, and Left Bank genesis.',
    eraColor: 'var(--building-era-5)',
    buildings: 180,
    duration: '12 min',
    era: '1991–2000',
  },
  {
    id: 'tour-golden',
    title: 'The Golden Boom',
    desc: 'Bayterek, Khan Shatyr, Palace of Peace — the signature buildings that defined a nation\'s ambition in glass and gold.',
    eraColor: 'var(--building-era-7)',
    buildings: 520,
    duration: '20 min',
    era: '2000s–2010s',
  },
  {
    id: 'tour-expo',
    title: 'Expo & Beyond',
    desc: 'The Nur-Sultan sphere, AIFC, and the emerging smart-city district — where futurism meets reality.',
    eraColor: 'var(--building-era-8)',
    buildings: 290,
    duration: '18 min',
    era: '2017+',
  },
];

export default function Tours() {
  return (
    <section className={s.tours} id="tours">
      <div className={s.inner}>
        <span className={s.tag}>04 · Story Tours</span>
        <h2 className={s.heading}>Guided Building Tours</h2>

        <div className={s.scroll}>
          {TOURS.map((tour) => (
            <div className={s.card} key={tour.id} id={tour.id}>
              <div className={s.eraStrip} style={{ background: tour.eraColor }} />
              <div className={s.cardContent}>
                <div className={s.cardIcon}>
                  <Map size={20} />
                </div>
                <h3 className={s.cardTitle}>{tour.title}</h3>
                <p className={s.cardDesc}>{tour.desc}</p>
                <div className={s.cardMeta}>
                  <span className={s.metaItem}>
                    <Building size={12} /> {tour.buildings} buildings
                  </span>
                  <span className={s.metaItem}>
                    <Clock size={12} /> {tour.duration}
                  </span>
                </div>
                <a href="#" className={s.startBtn}>
                  Start Tour <ArrowRight size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
