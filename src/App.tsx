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
import RouteLoader from './components/RouteLoader/RouteLoader';

// Lazy loaded page components
const MapPage = lazy(() => import('./pages/MapPage/MapPage'));
const StoryPage = lazy(() => import('./pages/StoryPage/StoryPage'));
const BayterekStory = lazy(() => import('./pages/StoryPage/BayterekStory'));
const ArticlesPage = lazy(() => import('./pages/ArticlesPage/ArticlesPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage/NotFoundPage'));

function HomePage() {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Navbar />
      <main id="main-content">
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
