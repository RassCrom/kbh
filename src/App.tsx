import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import Hero from './components/Hero/Hero';
import Stats from './components/Stats/Stats';
import Articles from './components/Articles/Articles';
import Tours from './components/Tours/Tours';
import HowItWorks from './components/HowItWorks/HowItWorks';
import Team from './components/Team/Team';
import Footer from './components/Footer/Footer';
import MapPage from './pages/MapPage/MapPage';

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
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/map" element={<MapPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
