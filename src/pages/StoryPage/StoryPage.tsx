import { useEffect, useRef, useState } from 'react';
import { Clock, ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import s from './StoryPage.module.scss';
import { ScrollyMap, type ChapterConfig } from './ScrollyMap';

/**
 * Scrollytelling story: the sticky map behind the text flies between camera
 * poses and lights up the buildings of each era as the reader scrolls.
 */

interface Chapter extends ChapterConfig {
  kicker?: string;
  heading: string;
  align: 'left' | 'right';
  body: React.ReactNode;
}

const CHAPTERS: Chapter[] = [
  {
    id: 'intro',
    heading: 'Look at the Right Bank',
    align: 'left',
    kicker: 'The Grid',
    camera: { center: [71.428, 51.155], zoom: 11.8 },
    yearRange: [1900, 2100],
    body: (
      <>
        <p>
          Take a map of Astana and look at the old right bank of the Ishim.
          See how the streets run in a near-perfect grid? That is not an
          accident. That is a Soviet plan, now more than 60 years old.
        </p>
        <p className={s.chapterHint}>
          Every glowing footprint below is a real building, colored by the
          era it was built in. Keep scrolling — the map will follow the story.
        </p>
      </>
    ),
  },
  {
    id: 'fortress',
    heading: 'A Small Fortress on the Edge of the Steppe',
    align: 'right',
    kicker: '1830',
    camera: { center: [71.415, 51.165], zoom: 13.6, bearing: 15 },
    yearRange: [1900, 1916],
    body: (
      <>
        <p>
          It all started in 1830. The Russian Empire placed a military outpost
          here — Akmolinsk. The site was chosen not for its beauty but for its
          utility: flat steppe, a river, trade routes.
        </p>
        <p>
          The town was modest and in no hurry to grow. That continued for more
          than a hundred years — only a scatter of tsarist-era brick survives
          on today's map, highlighted around you now.
        </p>
      </>
    ),
  },
  {
    id: 'virgin-lands',
    heading: '1954. Khrushchev Looks at the Map',
    align: 'left',
    kicker: 'Virgin Lands',
    camera: { center: [71.418, 51.175], zoom: 13.2, bearing: -10 },
    animateYears: [1939, 1979],
    body: (
      <>
        <p>
          In 1954, Nikita Khrushchev launched the Virgin Lands Campaign: plough
          millions of hectares of Kazakh steppe and feed the Soviet Union.
          Akmolinsk found itself at the very center of the experiment. In 1961
          it was renamed Tselinograd — "City of the Virgin Lands."
        </p>
        <div className={s.statGrid}>
          <div className={s.statItem}>
            <span className={s.statYear}>1939</span>
            <span className={s.statValue}>~12,000</span>
            <span className={s.statLabel}>people</span>
          </div>
          <div className={s.statItem}>
            <span className={s.statYear}>1959</span>
            <span className={s.statValue}>~65,000</span>
            <span className={s.statLabel}>people</span>
          </div>
          <div className={s.statItem}>
            <span className={s.statYear}>1979</span>
            <span className={s.statValue}>~210,000</span>
            <span className={s.statLabel}>people</span>
          </div>
        </div>
        <p className={s.chapterHint}>
          Watch the map: the city is growing year by year, 1939 → 1979.
        </p>
      </>
    ),
  },
  {
    id: 'mikrorayon',
    heading: 'The Mikrorayon Machine',
    align: 'right',
    kicker: '1964 – 1984',
    camera: { center: [71.4225, 51.168], zoom: 15.0, pitch: 48, bearing: 220 },
    yearRange: [1964, 1984],
    extrude: true,
    body: (
      <>
        <p>
          Soviet planners had a precise instrument: the <em>mikrorayon</em> — a
          residential district for 6,000–12,000 people. Panel apartments, a
          school, a kindergarten, a shop — everything within walking distance.
          No private yards, no fences. Everything communal.
        </p>
        <p>
          Series 1-464 or 1-335 panels — and the same buildings stood in
          Novosibirsk, Kyiv, and Baku. Economical. Fast. Identical.
        </p>
      </>
    ),
  },
  {
    id: 'remains',
    heading: 'What Remains Today',
    align: 'left',
    kicker: 'Beibitshilik St.',
    camera: { center: [71.4135, 51.1755], zoom: 15.6, pitch: 55, bearing: 185 },
    yearRange: [1953, 1990],
    extrude: true,
    body: (
      <>
        <p>
          Walk along Beibitshilik or Respubliki streets in the old part of the
          city. You can still see that grid. Five-storey panel blocks stand
          beside new shopping centres.
        </p>
        <p>
          This is not a museum. It is a living neighbourhood where people work
          and raise children — in buildings that are already 50–60 years old.
        </p>
      </>
    ),
  },
  {
    id: 'two-cities',
    heading: 'Two Cities in One',
    align: 'right',
    kicker: '1997 →',
    camera: { center: [71.424, 51.128], zoom: 13.4, pitch: 45, bearing: -15 },
    yearRange: [1997, 2100],
    extrude: true,
    body: (
      <>
        <p>
          In 1997 the capital moved here from Almaty, and Japanese architect
          Kisho Kurokawa drew a plan that is the complete opposite of the
          Soviet grid: radial boulevards, circular squares, a symbolic
          north–south axis. The left bank was built almost from scratch.
        </p>
        <p>
          Today the two banks face each other across the river. One belongs to
          the Soviet past. The other to an ambitious future.
        </p>
      </>
    ),
  },
  {
    id: 'reflection',
    heading: 'What Soviet Planning Tells Us',
    align: 'left',
    kicker: 'The Lesson',
    camera: { center: [71.425, 51.152], zoom: 12.4, pitch: 30, bearing: 5 },
    yearRange: [1953, 1990],
    body: (
      <>
        <p>
          The Soviet grid pursued a clear social goal: provide apartments,
          nearby schools and reliable transport at remarkable speed. Its
          trade-off was repetition: standard plans and prefabricated buildings
          often left limited room for local architectural expression.
        </p>
        <blockquote className={s.pullQuoteText}>
          "The Soviet city was a machine for living. Astana is an experiment
          in restarting it."
        </blockquote>
      </>
    ),
  },
  {
    id: 'echo',
    heading: 'An Echo in Today\'s Streets',
    align: 'right',
    kicker: 'Explore',
    camera: { center: [71.417, 51.17], zoom: 13.8, bearing: 0 },
    yearRange: [1955, 1980],
    body: (
      <>
        <p>
          Most buildings in the old part of the city date from 1955–1980. That
          is Tselinograd. Alive, concrete, measurable — and waiting on the
          interactive map.
        </p>
        <div className={s.ctaBlock}>
          <Link to="/map?years=1955-1980" className={s.ctaBtn}>
            Open the map — buildings from that era <ArrowRight size={14} />
          </Link>
        </div>
      </>
    ),
  },
];

export default function StoryPage() {
  const [activeIdx, setActiveIdx] = useState(0);
  const chapterRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.idx);
            if (!Number.isNaN(idx)) setActiveIdx(idx);
          }
        }
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: 0 },
    );
    chapterRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className={s.page}>
      <Link to="/" className={s.backBtn} aria-label="Back to Home">
        <ArrowLeft size={16} />
        <span>Back</span>
      </Link>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className={s.header}>
        <div className={s.headerInner}>
          <div className={s.meta}>
            <span className={s.eraTag}>1960s</span>
            <span className={s.readTime}>
              <Clock size={12} /> 8 min read
            </span>
          </div>
          <h1 className={s.title}>The Soviet Grid: How Tselinograd Was Planned</h1>
          <p className={s.lead}>
            Before becoming Astana, this city was Tselinograd — a Soviet agricultural hub laid
            out with a ruler. Scroll down and the map itself will walk you through that grid,
            era by era.
          </p>
          <span className={s.scrollHint}>
            <ChevronDown size={16} />
            Scroll to begin
          </span>
        </div>
      </header>

      {/* ── Scrollytelling body ───────────────────────────────────────────── */}
      <div className={s.scrollyWrap}>
        <div className={s.mapSticky}>
          <ScrollyMap chapter={CHAPTERS[activeIdx]} />
          <div className={s.mapVignette} aria-hidden="true" />
        </div>

        {/* Progress rail */}
        <nav className={s.progressRail} aria-label="Story chapters">
          {CHAPTERS.map((ch, i) => (
            <button
              key={ch.id}
              className={`${s.progressDot} ${i === activeIdx ? s.progressDotActive : ''}`}
              aria-label={`Chapter ${i + 1}: ${ch.heading}`}
              aria-current={i === activeIdx}
              onClick={() =>
                chapterRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }
            />
          ))}
        </nav>

        <div className={s.chapters}>
          {CHAPTERS.map((ch, i) => (
            <section
              key={ch.id}
              ref={(el) => { chapterRefs.current[i] = el; }}
              data-idx={i}
              className={`${s.chapter} ${ch.align === 'right' ? s.chapterRight : ''}`}
            >
              <div className={`${s.chapterCard} ${i === activeIdx ? s.chapterCardActive : ''}`}>
                {ch.kicker && <span className={s.chapterKicker}>{ch.kicker}</span>}
                <h2 className={s.chapterHeading}>{ch.heading}</h2>
                <div className={s.chapterBody}>{ch.body}</div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
