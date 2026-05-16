import { useEffect, useRef } from 'react';
import { Clock, ArrowRight, ChevronRight, FileText } from 'lucide-react';
import s from './Articles.module.scss';

const ARTICLES = [
  {
    id: 'article-soviet-grid',
    era: '1960s',
    date: 'Mar 2026',
    title: 'The Soviet Grid: How Tselinograd Was Planned',
    excerpt:
      'Before becoming Astana, the city was Tselinograd — a Soviet agricultural hub laid out in rigid blocks. We trace the original masterplan and its echoes in today\'s street grid.',
    readTime: '8 min',
  },
  {
    id: 'article-bayterek',
    era: '2000s',
    title: 'Rise of Bayterek: Symbolism in Steel and Glass',
    date: 'Jan 2026',
    excerpt:
      'The Bayterek tower became the city\'s icon overnight. This deep-dive explores how Nazarbayev\'s vision materialized through Japanese engineering and Kazakh mythology.',
    readTime: '12 min',
  },
  {
    id: 'article-expo',
    era: '2017+',
    title: 'After Expo 2017: What Happened to the Future?',
    date: 'Dec 2025',
    excerpt:
      'The Expo district promised a sustainable future. Five years later, we map what thrives, what stands empty, and what the data reveals about post-event urbanism.',
    readTime: '10 min',
  },
];

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
          <a href="#" className={s.viewAll}>
            All Articles <ChevronRight size={16} />
          </a>
        </div>

        <div className={s.grid}>
          {ARTICLES.map((article, i) => (
            <div
              className={s.card}
              key={article.id}
              id={article.id}
              ref={(el) => { cardsRef.current[i] = el; }}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              <div className={s.cardImagePlaceholder}>
                <FileText size={40} strokeWidth={1} />
              </div>
              <div className={s.cardBody}>
                <div className={s.cardMeta}>
                  <span className={s.cardEra}>{article.era}</span>
                  <span className={s.cardDate}>{article.date}</span>
                </div>
                <h3 className={s.cardTitle}>{article.title}</h3>
                <p className={s.cardExcerpt}>{article.excerpt}</p>
                <div className={s.cardFooter}>
                  <span className={s.readTime}>
                    <Clock size={12} /> {article.readTime}
                  </span>
                  <a href="#" className={s.readMore}>
                    Read <ArrowRight size={12} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
