import { useState, useMemo } from 'react';
import { Clock, ArrowLeft, ArrowRight, Search, FileText, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import s from './ArticlesPage.module.scss';
import { STORIES } from '../../data/stories';

const ALL_ERAS = ['All', ...new Set(STORIES.map((a) => a.era))];

export default function ArticlesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEra, setSelectedEra] = useState('All');

  const filteredArticles = useMemo(() => {
    return STORIES.filter((article) => {
      const matchesSearch =
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesEra = selectedEra === 'All' || article.era === selectedEra;
      return matchesSearch && matchesEra;
    });
  }, [searchQuery, selectedEra]);

  return (
    <div className={s.page}>
      {/* Back button */}
      <Link to="/" className={s.backBtn} aria-label="Back to Home">
        <ArrowLeft size={16} />
        <span>Back</span>
      </Link>

      <header className={s.header}>
        <div className={s.headerInner}>
          <span className={s.tagline}>Atlas Archives</span>
          <h1 className={s.title}>Stories from the Steppe</h1>
          <p className={s.subtitle}>
            Explore the architectural movements, general plans, and social histories 
            that shaped Astana from a small fortress to a futuristic capital.
          </p>
        </div>
      </header>

      <main className={s.main}>
        {/* Search controls are only useful once the archive has entries. */}
        {STORIES.length > 0 && <div className={s.toolbar}>
          <div className={s.searchBox}>
            <Search className={s.searchIcon} size={16} />
            <input
              type="text"
              aria-label="Search articles"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={s.searchInput}
            />
          </div>

          <div className={s.filterRow}>
            {ALL_ERAS.map((era) => (
              <button
                key={era}
                className={`${s.filterChip} ${selectedEra === era ? s.activeChip : ''}`}
                onClick={() => setSelectedEra(era)}
                aria-pressed={selectedEra === era}
              >
                {era}
              </button>
            ))}
          </div>
        </div>}

        {/* Articles Grid */}
        {filteredArticles.length > 0 ? (
          <div className={s.grid}>
            {filteredArticles.map((article) => (
              <div key={article.id} className={s.card}>
                {article.image ? (
                  <div
                    className={s.cardImage}
                    style={{ backgroundImage: `url(${article.image})` }}
                  >
                    <div className={s.cardOverlay} />
                    <span className={s.cardEra}>
                      <Tag size={10} />
                      {article.era}
                    </span>
                  </div>
                ) : (
                  <div className={s.cardImagePlaceholder}>
                    <FileText size={40} strokeWidth={1} />
                    <span className={s.cardEra}>
                      <Tag size={10} />
                      {article.era}
                    </span>
                  </div>
                )}

                <div className={s.cardBody}>
                  <div className={s.cardMeta}>
                    <span className={s.cardRead}>
                      <Clock size={12} />
                      {article.readTime}
                    </span>
                  </div>

                  <h2 className={s.cardTitle}>{article.title}</h2>
                  <p className={s.cardExcerpt}>{article.excerpt}</p>

                  <div className={s.cardFooter}>
                    {article.route ? (
                      <Link to={article.route} className={s.readBtn}>
                        <span>Read Story</span>
                        <ArrowRight size={14} />
                      </Link>
                    ) : (
                      <span className={s.comingSoon}>Coming Soon</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={s.emptyState}>
            {STORIES.length === 0 ? (
              <>
                <h2>The archive is being prepared</h2>
                <p>Long-form stories are in production. The interactive atlas and guided tours are ready now.</p>
                <Link to="/map" className={s.resetBtn}>Explore the map</Link>
              </>
            ) : (
              <>
                <p>No stories match the current search and era.</p>
                <button
                  className={s.resetBtn}
                  onClick={() => { setSearchQuery(''); setSelectedEra('All'); }}
                >
                  Reset filters
                </button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
