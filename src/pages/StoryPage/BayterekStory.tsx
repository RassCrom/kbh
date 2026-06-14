import { Clock, ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import s from './StoryPage.module.scss';

export default function BayterekStory() {
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
            <span className={s.eraTag}>2000s</span>
            <span className={s.readTime}>
              <Clock size={12} /> 12 min read
            </span>
          </div>
          <h1 className={s.title}>Rise of Bayterek: Symbolism in Steel and Glass</h1>
          <p className={s.lead}>
            At the heart of Astana stands a monument about 105 metres tall that is
            less a building than a declaration. We trace how a Kazakh creation myth
            became the most recognisable silhouette in Central Asia — and what its
            carefully chosen dimensions were designed to say.
          </p>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className={s.content}>

        {/* Section 1 — The Myth */}
        <section className={s.section}>
          <h2 className={s.sectionHeading}>A Bird, a Tree, and a Golden Egg</h2>
          <p className={s.body}>
            In Kazakh cosmology, the universe is held in balance by a single tree.
            Its roots reach into the underworld; its crown touches the sky. The tree
            is called <em>Bayterek</em> — the tall poplar, the axis of existence.
            Every year, a sacred firebird named Samruk flies to its highest branch
            and lays a single golden egg. The egg is not merely an egg. It is the
            sun, the harvest, the coming year, the nation's fate condensed into one
            luminous sphere.
          </p>
          <p className={s.body}>
            And every year, from the roots below, a great serpent named Aydahar
            climbs the trunk to devour what Samruk has left behind. The struggle
            between them is not incidental — it is the world's engine. Without the
            tension between light above and darkness below, without the cycle of
            creation and threat, there is no motion and no time. The egg may be lost
            or saved, but the contest must go on.
          </p>
          <p className={s.body}>
            This is the story that a newly independent Kazakhstan chose to cast in
            steel and glass on the bare steppe of its new capital in the late 1990s.
            The choice was not accidental. It was, in almost every dimension,
            deliberate.
          </p>

          <div className={s.placeholder}>
            <span className={s.placeholderLabel}>Infographic · Myth diagram</span>
            <p className={s.placeholderDesc}>
              Illustrated cross-section of the Bayterek cosmological myth: Samruk at
              the crown, the World Tree trunk, Aydahar at the roots, and the golden
              egg in the sphere — annotated with the corresponding architectural
              elements of the actual tower.
            </p>
          </div>
        </section>

        {/* Section 2 — The Decision */}
        <section className={s.section}>
          <h2 className={s.sectionHeading}>1994: The Decision No One Expected</h2>
          <p className={s.body}>
            In July 1994, President Nursultan Nazarbayev announced to the Kazakh
            parliament that the capital of the country would be moved. Not improved,
            not supplemented — moved. From Almaty, the established southern
            metropolis nestled against the Tian Shan mountains, to Akmola: a
            mid-sized industrial city on the northern steppe, known mainly for its
            grain elevator and its brutal winters.
          </p>
          <p className={s.body}>
            The reasons given were practical. Almaty sat in an active seismic zone.
            It was hemmed in by mountains, offering no room to expand. The northern
            regions of the country, where the majority of Kazakhstan's
            Russian-speaking population lived, felt distant from the southern seat
            of power. A new capital in the geographic centre would, the argument
            went, bind the nation together.
          </p>
          <p className={s.body}>
            But the deeper logic was symbolic. Kazakhstan had gained independence in
            1991 after the Soviet Union's dissolution. It was a country of 16 million
            people, the ninth-largest in the world by area, sitting atop enormous
            hydrocarbon reserves — and it had inherited a Soviet city as its capital,
            a city built to other purposes for a different power. A new capital was
            not just infrastructure. It was a statement of intent: that Kazakhstan
            would define itself on its own terms, from scratch, on land no one had
            claimed before.
          </p>

          <div className={s.placeholder}>
            <span className={s.placeholderLabel}>Photo · Archive</span>
            <p className={s.placeholderDesc}>
              Aerial photograph of Akmola, circa 1995 — the flat northern steppe
              before construction, showing the Ishim River bend and the sparse
              Soviet-era industrial town that would become the nucleus of the new
              capital. Source: National Archive of Kazakhstan.
            </p>
          </div>

          <div className={s.callout}>
            <span className={s.calloutLabel}>Context</span>
            <p className={s.calloutText}>
              On December 10, 1997, the capital was officially transferred from
              Almaty to Akmola. Five months later, on May 6, 1998, the city was
              renamed Astana — simply "capital" in Kazakh. The name was not chosen
              for poetry; it was chosen for clarity. The city would become whatever
              was built there.
            </p>
          </div>
        </section>

        {/* Section 3 — The Sketch */}
        <section className={s.section}>
          <h2 className={s.sectionHeading}>The Sketch and the Brief</h2>
          <p className={s.body}>
            The story most often told about Bayterek is that its design originated
            on a piece of paper in Nazarbayev's hand — a rough sketch of a tree
            with a sphere at the top, drawn as an explanation of what he wanted
            the city's centrepiece to be. Whether or not the origin was quite that
            theatrical, the concept bears the mark of a single, clear symbolic
            intention rather than the more diffuse results of an open architectural
            competition.
          </p>
          <p className={s.body}>
            The brief that reached architects was unusual in its specificity. The
            tower had to read immediately as the Bayterek myth — not allude to it,
            not reference it obliquely, but embody it so completely that any Kazakh
            person would recognise the story at a glance. The trunk had to suggest
            the world tree. The sphere had to be the golden egg. The height had to
            carry a date.
          </p>
          <p className={s.body}>
            That last constraint shaped the visitor experience. The observation
            deck was placed at the symbolic 97-metre mark, encoding the year the
            capital was transferred — 1997 — into the building. The full structure
            rises to about 105 metres. Architecture becomes a calendar without
            confusing the symbolic level with the monument's total height.
          </p>

          <div className={s.placeholder}>
            <span className={s.placeholderLabel}>Photo · Archive</span>
            <p className={s.placeholderDesc}>
              Early design sketches and architect's drawings for the Bayterek
              monument, showing the evolution from the initial tree-and-sphere
              concept to the engineered structure. If available: the original
              hand-drawn concept attributed to Nazarbayev.
            </p>
          </div>
        </section>

        {/* Section 4 — Construction */}
        <section className={s.section}>
          <h2 className={s.sectionHeading}>Building on Nothing</h2>
          <p className={s.body}>
            Construction began in 1996, before the capital transfer was even
            formalised. The site chosen was on the left bank of the Ishim River —
            the side of the city that was, at the time, almost entirely empty.
            While the existing city of Akmola sat on the right bank, accumulated
            over decades of Soviet planning, the left bank was open steppe. A
            blank slate, waiting for intention.
          </p>
          <p className={s.body}>
            The Japanese architect Kisho Kurokawa would later design the masterplan
            for the entire Left Bank district, a radial boulevard system that placed
            Bayterek at the visual terminus of the main axis — the point to which
            all roads and sightlines would eventually lead. But Bayterek preceded
            the masterplan. It was the anchor installed before the fabric was woven
            around it.
          </p>
          <p className={s.body}>
            The engineering challenge was significant. The sphere — 22 metres in
            diameter, housing an observation deck and a restaurant — had to be
            raised to the top of a tapered reinforced-concrete trunk and secured
            against the formidable steppe winds. The trunk itself was not a simple
            column but a flared, ribbed structure, designed to evoke both organic
            form and structural efficiency. Workers contended with temperature
            swings of more than 70 degrees Celsius between construction summers
            and winters.
          </p>

          <div className={s.placeholder}>
            <span className={s.placeholderLabel}>Photo · Construction sequence</span>
            <p className={s.placeholderDesc}>
              Three-image construction progress series: the bare concrete trunk
              rising from the Left Bank steppe (1998); the steel armature of the
              sphere being assembled at height (2000); the completed golden sphere
              with Astana's emerging skyline behind it (2002).
            </p>
          </div>

          <div className={s.placeholder}>
            <span className={s.placeholderLabel}>Interactive map · Left Bank masterplan</span>
            <p className={s.placeholderDesc}>
              Kurokawa's award-winning 1998 masterplan for the Left Bank overlaid on current
              satellite imagery. Bayterek's position highlighted as the visual
              terminus of Nurzhol Boulevard. Toggle between the 1998 plan and the
              built result to compare intention and execution. Built with MapLibre GL.
            </p>
          </div>
        </section>

        {/* Section 5 — Anatomy */}
        <section className={s.section}>
          <h2 className={s.sectionHeading}>Anatomy of a Symbol: Every Number Chosen</h2>
          <p className={s.body}>
            In most buildings, dimensions are the result of programme and
            engineering. In Bayterek, they were reverse-engineered from meaning.
            The symbolic 97-metre observation level shaped the structural and
            spatial programme within a monument whose total height is about
            105 metres. The restaurant occupies the lower half of the sphere. The
            sphere's diameter of 22 metres was chosen to read as visually dominant
            from the boulevard below — large enough to project weight and presence
            across several hundred metres of open space.
          </p>

          <div className={s.statGrid}>
            <div className={s.statItem}>
              <span className={s.statYear}>Height</span>
              <span className={s.statValue}>~105 m</span>
              <span className={s.statLabel}>total height; observation level at 97 m</span>
            </div>
            <div className={s.statItem}>
              <span className={s.statYear}>Sphere</span>
              <span className={s.statValue}>22 m</span>
              <span className={s.statLabel}>diameter of the golden egg</span>
            </div>
            <div className={s.statItem}>
              <span className={s.statYear}>Opened</span>
              <span className={s.statValue}>2002</span>
              <span className={s.statLabel}>five years after capital transfer</span>
            </div>
          </div>

          <p className={s.body}>
            The material palette reinforced the myth's logic. The trunk is white
            concrete — bleached, austere, reaching upward with a quality that
            suggests both wood grain and structural force. The sphere is clad in
            golden glass, tinted to catch the light at different hours of the day.
            At noon, in the intense northern steppe sun, it glows. At sunset it
            deepens to amber. At night, it is illuminated from within, a lantern
            suspended above the boulevard. The egg is always there, always
            visible, always holding its colour against the sky.
          </p>

          <div className={s.placeholder}>
            <span className={s.placeholderLabel}>Infographic · Tower cross-section</span>
            <p className={s.placeholderDesc}>
              Detailed architectural cross-section of Bayterek: labelled levels
              (entrance, trunk structure, restaurant floor, observation deck),
              key dimensions, material callouts (reinforced concrete trunk, steel
              armature, brand-tinted glass sphere), and annotations mapping each
              element to its mythological equivalent.
            </p>
          </div>
        </section>

        {/* Section 6 — The Handprint */}
        <section className={s.section}>
          <h2 className={s.sectionHeading}>The Handprint at the Top of the World</h2>
          <p className={s.body}>
            Inside the observation deck at the symbolic 97-metre level, behind glass, sits one of
            the more quietly charged objects in the country: a gilded cast of
            Nursultan Nazarbayev's right hand, embedded in a white marble plinth.
            Visitors are invited to press their own palm against it and make a wish.
            The gesture is simple, almost childlike. Its implications are not.
          </p>
          <p className={s.body}>
            A handprint is the oldest form of human mark-making. Ochre hands on
            cave walls in France and Spain are among the earliest evidence of
            conscious self-expression — the human animal saying <em>I was here</em>.
            Placing the founder's hand at the summit of the national symbol repeats
            that gesture at civilisational scale. The state, in this reading, is an
            extension of a single person's body — and the person is still living,
            still present, still defining the space you stand in.
          </p>
          <p className={s.body}>
            Whether one reads this as grandeur or hubris depends on where one
            stands. What is not in doubt is that the handprint works on visitors.
            Queues form for it. Photographs are taken. The wish is made silently
            and kept private, as wishes should be. The building has engineered a
            moment of intimacy at its highest point.
          </p>

          <div className={s.placeholder}>
            <span className={s.placeholderLabel}>Photo · Observation deck</span>
            <p className={s.placeholderDesc}>
              The golden handprint of Nursultan Nazarbayev set in the white marble
              plinth at the 97-metre observation level. A visitor's hand pressed
              against it in the foreground, Astana's Left Bank skyline visible
              through the curved glass behind.
            </p>
          </div>

          <div className={s.pullQuote}>
            <p className={s.pullQuoteText}>
              "Kazakhstan was born in 1991 with Soviet infrastructure and no national
              architecture. Bayterek was built to give the country an image of itself
              it had never had before."
            </p>
          </div>
        </section>

        {/* Section 7 — Opening & Reception */}
        <section className={s.section}>
          <h2 className={s.sectionHeading}>2002: A City Looks at Itself</h2>
          <p className={s.body}>
            When Bayterek opened in 2002, Astana was still largely a construction
            site. The Left Bank masterplan was underway, cranes were visible from
            the observation deck in almost every direction, and the new government
            quarter was incomplete. The tower opened into a city that had not yet
            fully materialised around it.
          </p>
          <p className={s.body}>
            That timing mattered. Bayterek was not the conclusion of the capital
            project — it was its announcement. The tower said: here is what this
            place is about. Everything else that follows will be in conversation
            with this image. And in the years after its opening, as Norman Foster's
            Palace of Peace and Accord, the Khan Shatyr entertainment centre, and
            dozens of starchitect-designed towers rose along Nurzhol Boulevard, the
            conversation Bayterek had started continued on an increasingly ambitious
            register.
          </p>
          <p className={s.body}>
            For Kazakhs from the regions, visiting the capital and ascending
            Bayterek became a ritual of national participation. You went to see
            your country from above. You looked out over a city being built in
            real time and understood, perhaps for the first time, that the project
            was serious — that this was not a temporary decision, not a political
            whim that would be reversed, but a permanent bet on an invented future.
          </p>

          <div className={s.placeholder}>
            <span className={s.placeholderLabel}>Photo · Aerial view</span>
            <p className={s.placeholderDesc}>
              Split aerial image: Bayterek's opening year (2002) showing the tower
              surrounded by open steppe and early construction alongside the same
              vantage point today, with the fully built Left Bank skyline, Nurzhol
              Boulevard, and Khan Shatyr visible. Caption: "Twenty years apart."
            </p>
          </div>

          <div className={s.placeholder}>
            <span className={s.placeholderLabel}>Chart · Visitor data</span>
            <p className={s.placeholderDesc}>
              Bar chart showing annual visitor numbers to Bayterek from 2002 to
              present, with notable years annotated: 2010 (Shanghai Expo brand
              recognition spike), 2017 (EXPO year, peak tourism), 2020 (pandemic
              closure), and post-2022 recovery. Y-axis: visitors per year.
              Source: Bayterek monument administration data.
            </p>
          </div>
        </section>

        {/* Section 8 — What It Tells Us */}
        <section className={s.section}>
          <h2 className={s.sectionHeading}>Architecture as Argument</h2>
          <p className={s.body}>
            Buildings make arguments. They are slow arguments, made in material
            rather than words, and they persist long after the circumstances that
            produced them have changed. The Eiffel Tower was despised at its
            opening; it is now France's most visited monument. The Twin Towers
            were criticised as brutalist excess; their absence became the most
            eloquent statement about what they had meant.
          </p>
          <p className={s.body}>
            Bayterek's argument is not yet finished. The city around it is still
            young, still accumulating the stories that give a place depth. The
            tower itself has accrued meaning steadily — from state symbol to tourist
            fixture to an object of genuine affection that appears on wedding
            photographs and school notebooks and the occasional tattoo. It has
            crossed the threshold from official monument to popular image, which is
            a journey that not all such buildings complete.
          </p>
          <p className={s.body}>
            What it argues, at its most generous reading, is that a nation can invent
            its own visual language without borrowing someone else's. The myth of
            Samruk and the World Tree is not a universal symbol — it is specific,
            local, rooted in the oral tradition of the Kazakh steppe. To encode it
            in steel at the centre of a new capital is to say: our stories are worth
            building with. That is a quieter and more lasting claim than any
            particular claim about power or dynasty.
          </p>
          <p className={s.body}>
            Whether the building fully achieves what it sets out to do is a
            question visitors settle for themselves at the 97-metre observation level, looking out over
            a city that is itself still, in many ways, an argument in progress.
          </p>

          <div className={s.placeholder}>
            <span className={s.placeholderLabel}>Video · Observation deck</span>
            <p className={s.placeholderDesc}>
              360° timelapse from the observation deck at the 97-metre level: dawn over the
              steppe to the east, the Ishim River bending south, Nurzhol Boulevard
              running west toward the Palace of Peace, and the full Left Bank skyline
              emerging in morning light. Duration: 90 seconds.
            </p>
          </div>

          <div className={s.placeholder}>
            <span className={s.placeholderLabel}>Photo · Night illumination</span>
            <p className={s.placeholderDesc}>
              Long-exposure night photograph of Bayterek with its golden sphere
              fully illuminated against a deep blue sky. Nurzhol Boulevard's
              symmetrical lighting recedes into the distance below. The sphere
              reflected in the Ishim River in the foreground.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className={s.section}>
          <h2 className={s.sectionHeading}>See It in the Data</h2>
          <p className={s.body}>
            Bayterek sits in a district built almost entirely between 1997 and 2010 —
            the Capital Founding and Capital Boom eras in our dataset. Open the map,
            zoom into the Left Bank, and you can read the construction wave: a burst
            of teal and cyan buildings radiating outward from the boulevard axis,
            each one placed according to Kurokawa's plan, each one in conversation
            with the gold sphere that preceded them all.
          </p>

          <div className={s.ctaBlock}>
            <Link to="/map" className={s.ctaBtn}>
              Explore the Left Bank on the map <ArrowRight size={14} />
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
