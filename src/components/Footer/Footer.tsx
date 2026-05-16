import { Building2, Code2, Mail } from 'lucide-react';
import s from './Footer.module.scss';

const socialLinks = [
  {
    href: 'https://github.com/rasscrom',
    ariaLabel: 'GitHub',
    icon: Code2,
  },
  {
    href: 'mailto:karasu.ab490@gmail.com',
    ariaLabel: 'Email',
    icon: Mail,
  },
];

export default function Footer() {
  return (
    <footer className={s.footer} id="footer">
      <div className={s.inner}>
        <div className={s.brand}>
          <div className={s.logoRow}>
            <Building2 size={20} />
            <span className={s.logoText}>Astana Buildings</span>
          </div>
          <p className={s.brandDesc}>
            Open-source project mapping the architectural evolution of Kazakhstan's capital 
            from Tselinograd to modern Astana.
          </p>
          <ul className={s.socialLinks}>
            {socialLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={s.socialLink}
                  aria-label={link.ariaLabel}
                  id={`social-${link.ariaLabel.toLowerCase()}`}
                >
                  <link.icon size={16} />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className={s.colTitle}>Explore</h4>
          <ul className={s.links}>
            <li><a href="#hero" className={s.link}>Home</a></li>
            <li><a href="#articles" className={s.link}>Stories</a></li>
            <li><a href="#tours" className={s.link}>Tours</a></li>
            <li><a href="#how-it-works" className={s.link}>Methodology</a></li>
          </ul>
        </div>

        <div>
          <h4 className={s.colTitle}>Project</h4>
          <ul className={s.links}>
            <li><a href="#team" className={s.link}>About Us</a></li>
            <li><a href="#" className={s.link}>Open Data</a></li>
            {/* <li><a href="#newsletter" className={s.link}>Newsletter</a></li> */}
          </ul>
        </div>
      </div>

      <div className={s.divider}>
        <span className={s.copyright}>
          © {new Date().getFullYear()} Astana Buildings Heritage.
        </span>
      </div>
    </footer>
  );
}
