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
import MapPage from './pages/MapPage/MapPage';
import StoryPage from './pages/StoryPage/StoryPage';
import BayterekStory from './pages/StoryPage/BayterekStory';

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
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/stories/soviet-grid" element={<StoryPage />} />
        <Route path="/stories/bayterek" element={<BayterekStory />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
