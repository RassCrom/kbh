import { useState, useEffect } from 'react';
import { Map } from 'lucide-react';
import { Link } from 'react-router-dom';
import s from './Navbar.module.scss';

const NAV_ITEMS = [
  { label: 'Hero', href: '#hero' },
  { label: 'Stats', href: '#stats' },
  { label: 'Stories', href: '#articles' },
  { label: 'Tours', href: '#tours' },
  { label: 'About', href: '#team' },
];

const DESKTOP_BP = 768;

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const sections = document.querySelectorAll('section[id]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-40% 0px -40% 0px' }
    );

    sections.forEach((sec) => observer.observe(sec));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= DESKTOP_BP) setMenuOpen(false);
    };

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const handleNavClick = () => setMenuOpen(false);

  return (
    <nav className={`${s.navbar} ${scrolled ? s.scrolled : ''}`} id="main-nav">
      <a href="#hero" className={s.logo} aria-label="Home">
        <svg
          width="292"
          height="280"
          className={s.logoIcon}
          viewBox="0 0 292 280"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M61.5 23.5L38 0L40.5 23.5L58 49L148.5 116L46.5 54.5L52.5 73.5L67.5 92.5L148.5 140.5L70 108.5L87 133.5L98 140.5L152.5 162L159.5 174L145.5 164H127.5L108.5 167L92.5 175.5L88 182L78.5 215L62 220.5L43.5 257.5H33.5L25.5 279.5L51.5 268.5L72 239L108.5 226.5L136 192.5L133 206L195.5 221L252 201L238 227.5H227.5L219 250L246.5 238L276 193L271 182.5H227.5L219.5 160L235.5 178L247.5 131L242.5 117L253 127L263 129L276 142L288.5 137L291.5 129L262 86L266.5 69L246.5 80.5L226 82L218.5 85L179.5 114L185.5 133L222 96L232 94.5L181.5 147.5L165.5 98L90.5 45L61.5 23.5Z"
            fill="currentColor"
          />
          <path
            d="M146.5 216L130.5 212.5L112.5 230.5L96 237L83 242.5L74.5 258L68.5 258.5L60.5 277.5L80.5 269L96 247L102 243.5L131 233L146.5 216Z"
            fill="currentColor"
          />
          <path
            d="M82.5 164.5H0L25 187.5L54.5 183L40.5 194L56.5 190.5L93 169.5L82.5 164.5Z"
            fill="currentColor"
          />
        </svg>
        <span>Astana Buildings</span>
      </a>

      <ul className={s.nav}>
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              className={`${s.navLink} ${
                activeSection === item.href.slice(1) ? s.active : ''
              }`}
            >
              {item.label}
            </a>
          </li>
        ))}

        <li>
          <Link to="/map" className={s.mapLink}>
            <Map size={15} />
            <span>Map</span>
          </Link>
        </li>
      </ul>

      <button
        className={`${s.hamburger} ${menuOpen ? s.open : ''}`}
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
      >
        <span />
        <span />
        <span />
      </button>

      <ul
        className={`${s.mobileMenu} ${menuOpen ? s.open : ''}`}
        aria-hidden={!menuOpen}
      >
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              className={`${s.navLink} ${
                activeSection === item.href.slice(1) ? s.active : ''
              }`}
              onClick={handleNavClick}
              tabIndex={menuOpen ? 0 : -1}
            >
              {item.label}
            </a>
          </li>
        ))}

        <li>
          <Link
            to="/map"
            className={s.mapLink}
            onClick={handleNavClick}
            tabIndex={menuOpen ? 0 : -1}
          >
            <Map size={18} />
            <span>Map</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}