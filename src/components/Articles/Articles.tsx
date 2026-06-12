import { useEffect, useRef } from 'react';
import { ChevronRight, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import s from './Articles.module.scss';

export default function Articles() {
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(s.visible);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    );

    cardsRef.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section className={s.articles} id="articles">
      <div className={s.inner}>
        <span className={s.tag}>03 · Scrollytelling</span>
        <div className={s.header}>
          <h2 className={s.heading}>Stories from the Steppe</h2>
          <Link to="/articles" className={s.viewAll}>
            All Articles <ChevronRight size={16} />
          </Link>
        </div>

        <div className={s.grid}>
          <div
            className={s.card}
            ref={(el) => { cardsRef.current[0] = el; }}
          >
            <div className={s.cardImagePlaceholder}>
              <FileText size={40} strokeWidth={1} />
            </div>
            <div className={s.cardBody}>
              <div className={s.cardMeta}>
                <span className={s.cardEra}>Coming soon</span>
              </div>
              <h3 className={s.cardTitle}>Stories coming soon</h3>
              <p className={s.cardExcerpt}>
                New stories about Kazakhstan's architecture, cities, and history
                are currently in production.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
