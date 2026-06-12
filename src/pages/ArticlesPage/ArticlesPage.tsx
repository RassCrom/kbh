import { useState, useMemo } from 'react';
import { Clock, ArrowLeft, ArrowRight, Search, Calendar, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import s from './ArticlesPage.module.scss';

type Article = {
  id: string;
  era: string;
  date: string;
  title: string;
  excerpt: string;
  readTime: string;
  image: string;
  route?: string;
};

const ARTICLES: Article[] = [];

const ALL_ERAS = ['All'];

export default function ArticlesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEra, setSelectedEra] = useState('All');

  const filteredArticles = useMemo(() => {
    return ARTICLES.filter((article) => {
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
        {/* Search & Filter Toolbar */}
        <div className={s.toolbar}>
          <div className={s.searchBox}>
            <Search className={s.searchIcon} size={16} />
            <input
              type="text"
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
              >
                {era}
              </button>
            ))}
          </div>
        </div>

        {/* Articles Grid */}
        {filteredArticles.length > 0 ? (
          <div className={s.grid}>
            {filteredArticles.map((article) => (
              <div key={article.id} className={s.card}>
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

                <div className={s.cardBody}>
                  <div className={s.cardMeta}>
                    <span className={s.cardDate}>
                      <Calendar size={12} />
                      {article.date}
                    </span>
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
            <p>No stories found matching your criteria.</p>
            <button 
              className={s.resetBtn} 
              onClick={() => { setSearchQuery(''); setSelectedEra('All'); }}
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
