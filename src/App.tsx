import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import Navbar from './components/Navbar/Navbar';
import Hero from './components/Hero/Hero';
import Stats from './components/Stats/Stats';
import Articles from './components/Articles/Articles';
import Tours from './components/Tours/Tours';
import HowItWorks from './components/HowItWorks/HowItWorks';
import Team from './components/Team/Team';
import Footer from './components/Footer/Footer';

// Lazy loaded page components
const MapPage = lazy(() => import('./pages/MapPage/MapPage'));
const StoryPage = lazy(() => import('./pages/StoryPage/StoryPage'));
const BayterekStory = lazy(() => import('./pages/StoryPage/BayterekStory'));
const ArticlesPage = lazy(() => import('./pages/ArticlesPage/ArticlesPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage/NotFoundPage'));

function RouteLoader() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'radial-gradient(circle at center, #111a24 0%, #080d12 100%)',
      color: '#fff',
      fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
    }}>
      {/* Animated Glowing Gold Ring */}
      <div style={{
        position: 'relative',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        border: '2px solid rgba(212, 168, 94, 0.05)',
        borderTopColor: 'var(--color-accent-brand, #d4a85e)',
        animation: 'spin 1s cubic-bezier(0.55, 0.055, 0.675, 0.19) infinite',
        boxShadow: '0 0 15px rgba(212, 168, 94, 0.2)',
      }} />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{
        marginTop: '20px',
        fontSize: '13px',
        fontWeight: '500',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: 'var(--color-text-secondary, rgba(255,255,255,0.6))',
        animation: 'pulse 1.8s ease-in-out infinite',
      }}>
        Loading Atlas...
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.95; }
        }
      `}</style>
    </div>
  );
}

function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <Articles />
        <Tours />
        <HowItWorks />
        <Team />
      </main>
      <Footer />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/articles" element={<ArticlesPage />} />
          <Route path="/stories/soviet-grid" element={<StoryPage />} />
          <Route path="/stories/bayterek" element={<BayterekStory />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;

