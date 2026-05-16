import { useEffect, useRef } from 'react';
import { Building, Calendar, Database, BookOpen } from 'lucide-react';
import s from './Stats.module.scss';

const STATS = [
  { icon: Building, value: 13000, suffix: '+', label: 'Buildings Mapped', id: 'stat-buildings' },
  { icon: Calendar, value: 9, suffix: '', label: 'Historical Eras', id: 'stat-eras' },
  { icon: Database, value: 6, suffix: '', label: 'Data Sources', id: 'stat-sources' },
  { icon: BookOpen, value: 0, suffix: '', label: 'Stories Published', id: 'stat-stories' },
];

function animateValue(el: HTMLElement, end: number, suffix: string) {
  const duration = 2000;
  const start = 0;
  const startTime = performance.now();

  function update(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (end - start) * eased);
    el.textContent = current.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

export default function Stats() {
  const sectionRef = useRef<HTMLElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true;
          section.querySelectorAll('[data-count]').forEach((el) => {
            const target = parseInt(el.getAttribute('data-count') || '0', 10);
            const suffix = el.getAttribute('data-suffix') || '';
            animateValue(el as HTMLElement, target, suffix);
          });
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section className={s.stats} id="stats" ref={sectionRef}>
      <div className={s.inner}>
        <span className={s.tag}>02 · Key Numbers</span>
        <h2 className={s.heading}>The Scale of Astana's Transformation</h2>

        <div className={s.grid}>
          {STATS.map((stat) => (
            <div className={s.card} key={stat.id} id={stat.id}>
              <div className={s.icon}>
                <stat.icon size={24} />
              </div>
              <span
                className={s.number}
                data-count={stat.value}
                data-suffix={stat.suffix}
              >
                0
              </span>
              <span className={s.label}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
