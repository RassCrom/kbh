import { useEffect, useRef } from 'react';
import { ChevronRight, Clock, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import s from './Articles.module.scss';

const STORIES = [
  {
    id: 'soviet-grid',
    route: '/stories/soviet-grid',
    era: '1960s',
    readTime: '8 min read',
    title: 'The Soviet Grid: How Tselinograd Was Planned',
    excerpt:
      "Before becoming Astana, this city was Tselinograd — a Soviet agricultural hub laid out with a ruler. Scroll the map through its grid, era by era.",
  },
  {
    id: 'bayterek',
    route: '/stories/bayterek',
    era: '2000s',
    readTime: '12 min read',
    title: 'Rise of Bayterek: Symbolism in Steel and Glass',
    excerpt:
      "A 105-metre monument at the heart of Astana is less a building than a declaration. How a Kazakh creation myth became Central Asia's most recognisable silhouette.",
  },
];

export default function Articles() {
  const cardsRef = useRef<(HTMLAnchorElement | null)[]>([]);

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
          {STORIES.map((story, i) => (
            <Link
              to={story.route}
              key={story.id}
              className={s.card}
              ref={(el) => { cardsRef.current[i] = el; }}
            >
              <div className={s.cardImagePlaceholder}>
                <FileText size={40} strokeWidth={1} />
              </div>
              <div className={s.cardBody}>
                <div className={s.cardMeta}>
                  <span className={s.cardEra}>{story.era}</span>
                </div>
                <h3 className={s.cardTitle}>{story.title}</h3>
                <p className={s.cardExcerpt}>{story.excerpt}</p>
                <div className={s.cardFooter}>
                  <span className={s.readTime}>
                    <Clock size={12} />
                    {story.readTime}
                  </span>
                  <span className={s.readMore}>
                    Read Story <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
