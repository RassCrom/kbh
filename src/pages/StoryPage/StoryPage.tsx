import { Clock, ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import s from './StoryPage.module.scss';

export default function StoryPage() {
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
            out with a ruler. We walked its old streets and found the traces of that grid right
            beneath our feet.
          </p>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className={s.content}>

        {/* Intro map */}
        <div className={s.placeholder}>
          <span className={s.placeholderLabel}>Map · Satellite view</span>
          <p className={s.placeholderDesc}>
            Satellite image of Astana with two zones highlighted — the Soviet grid on the left
            bank and Kisho Kurokawa's new right bank (1997). Caption: "Two cities in one."
          </p>
        </div>

        {/* Section 1 */}
        <section className={s.section}>
          <h2 className={s.sectionHeading}>A Small Fortress on the Edge of the Steppe</h2>
          <p className={s.body}>
            It all started in 1830. The Russian Empire placed a military outpost here —
            Akmolinsk. The site was chosen not for its beauty but for its utility: flat steppe,
            a river, trade routes. The town was modest and in no hurry to grow.
          </p>
          <p className={s.body}>
            That continued for more than a hundred years.
          </p>

          <div className={s.placeholder}>
            <span className={s.placeholderLabel}>Photo · Archive</span>
            <p className={s.placeholderDesc}>
              Akmolinsk in the early 20th century, view of the main street.
              Source: archival photographs, National Archive of Kazakhstan.
            </p>
          </div>
        </section>

        {/* Section 2 */}
        <section className={s.section}>
          <h2 className={s.sectionHeading}>1954. Khrushchev Looks at the Map</h2>
          <p className={s.body}>
            In 1954, Nikita Khrushchev launched the Virgin Lands Campaign. The idea was simple:
            plough millions of hectares of Kazakh steppe and feed the Soviet Union.
            Akmolinsk found itself at the very centre of this experiment.
          </p>
          <p className={s.body}>
            Within a few years, hundreds of thousands of settlers arrived from Russia, Ukraine,
            and Belarus. The city urgently needed housing, factories, and roads. In 1961 it was
            renamed Tselinograd — literally "City of the Virgin Lands."
          </p>

          <div className={s.placeholder}>
            <span className={s.placeholderLabel}>Infographic · Population growth</span>
            <p className={s.placeholderDesc}>
              Bar or timeline chart showing the city's population growth from 1939 to 1979.
            </p>
          </div>

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
          <p className={s.body} style={{ textAlign: 'center', marginTop: '-8px' }}>
            A 17× increase in 40 years.
          </p>
        </section>

        {/* Section 3 */}
        <section className={s.section}>
          <h2 className={s.sectionHeading}>How the Soviet City Was Built</h2>
          <p className={s.body}>
            Soviet planners had a precise instrument: the <em>mikrorayon</em> — a residential
            district for roughly 6,000–12,000 people. Panel-block apartments, a school, a
            kindergarten, a shop — everything within walking distance. No private yards,
            no fences. Everything communal.
          </p>
          <p className={s.body}>
            Tselinograd was built exactly this way. Streets ran parallel and perpendicular.
            Buildings used standardised series. Façades were identical from Minsk to Alma-Ata.
          </p>

          <div className={s.placeholder}>
            <span className={s.placeholderLabel}>Photo · Archive</span>
            <p className={s.placeholderDesc}>
              A typical residential district of Tselinograd from the 1960s–70s.
              Five-storey panel-block apartments — "Khrushchyovki."
            </p>
          </div>

          <div className={s.placeholder}>
            <span className={s.placeholderLabel}>Map · City plan</span>
            <p className={s.placeholderDesc}>
              Original Tselinograd general plan with the street grid overlaid on
              the current boundaries of Astana.
            </p>
          </div>

          <div className={s.callout}>
            <span className={s.calloutLabel}>Interesting fact</span>
            <p className={s.calloutText}>
              Soviet architects used only a handful of standardised housing series across the
              entire USSR. Series 1-464 or 1-335 — and the same buildings stood in Novosibirsk,
              Kyiv, and Baku. Economical. Fast. Identical.
            </p>
          </div>
        </section>

        {/* Section 4 */}
        <section className={s.section}>
          <h2 className={s.sectionHeading}>What Remains Today</h2>
          <p className={s.body}>
            Walk along Beibitshilik or Respubliki streets in the old part of the city. You can
            still see that grid. Five-storey panel blocks stand beside new shopping centres.
            Soviet-era district names survive in the memory of long-time residents.
          </p>
          <p className={s.body}>
            This is not a museum. It is a living neighbourhood where people work and raise
            children — in buildings that are already 50–60 years old.
          </p>

          <div className={s.placeholder}>
            <span className={s.placeholderLabel}>Interactive · Then & Now slider</span>
            <p className={s.placeholderDesc}>
              Side-by-side or drag-slider comparison: an archival photo of a street and a
              modern shot from the same angle. The user drags a handle to reveal the past.
            </p>
          </div>
        </section>

        {/* Section 5 */}
        <section className={s.section}>
          <h2 className={s.sectionHeading}>Two Cities in One</h2>
          <p className={s.body}>
            In 1997, Nursultan Nazarbayev moved the capital from Almaty here. The former
            Tselinograd changed its name again — becoming Astana.
          </p>
          <p className={s.body}>
            For the new city, Japanese architect Kisho Kurokawa was brought in. His plan is the
            complete opposite of the Soviet grid: radial boulevards, circular squares, a
            symbolic north–south axis. The right bank of the Ishim was built almost from scratch.
          </p>
          <p className={s.body}>
            Today the two banks face each other across the river. One belongs to the Soviet past.
            The other to an ambitious future.
          </p>

          <div className={s.placeholder}>
            <span className={s.placeholderLabel}>Interactive Map · Dual city plans</span>
            <p className={s.placeholderDesc}>
              Two general plans layered on top of each other — Kurokawa's plan and the Soviet
              grid. A toggle button lets the user switch between layers. Built with Mapbox or
              MapLibre.
            </p>
          </div>
        </section>

        {/* Section 6 */}
        <section className={s.section}>
          <h2 className={s.sectionHeading}>What Soviet Planning Tells Us Today</h2>
          <p className={s.body}>
            The Soviet grid was not a bad idea. It was an honest one: give everyone an apartment,
            a school nearby, a bus to work. It worked.
          </p>
          <p className={s.body}>
            The problem lay elsewhere — in sameness. Not a single city without a standard plan.
            Not a single building with character.
          </p>
          <p className={s.body}>
            Tselinograd was exactly that. And that is precisely why it is so interesting: it
            shows how an entire era thought about the city, about the human being, about the
            future.
          </p>

          <div className={s.pullQuote}>
            <p className={s.pullQuoteText}>
              "The Soviet city was a machine for living. Astana is an experiment in restarting it."
            </p>
          </div>
        </section>

        {/* Section 7 — CTA */}
        <section className={s.section}>
          <h2 className={s.sectionHeading}>An Echo in Today's Streets</h2>
          <p className={s.body}>
            Open our web atlas and enable the "year of construction" layer — you will see that
            most buildings in the old part of the city date from 1955–1980. That is Tselinograd.
            Alive, concrete, measurable.
          </p>

          <div className={s.ctaBlock}>
            <Link to="/map" className={s.ctaBtn}>
              Explore the map — buildings from that era <ArrowRight size={14} />
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
