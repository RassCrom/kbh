import { Send } from 'lucide-react';
import s from './Newsletter.module.scss';

export default function Newsletter() {
  return (
    <section className={s.newsletter} id="newsletter">
      <div className={s.bgGlow} />
      <div className={s.inner}>
        <div>
          <span className={s.tag}>07 · Stay Connected</span>
          <h2 className={s.heading}>Get Updates & Contribute</h2>
          <p className={s.desc}>
            New stories, data releases, and map features — delivered monthly. 
            No spam, just urban history.
          </p>
        </div>

        <form className={s.form} onSubmit={(e) => e.preventDefault()} id="newsletter-form">
          <div className={s.inputGroup}>
            <input
              type="email"
              placeholder="your@email.com"
              className={s.input}
              id="newsletter-email"
              aria-label="Email address"
            />
            <button type="submit" className={s.submit} id="newsletter-submit">
              <Send size={14} style={{ marginRight: 8, display: 'inline' }} />
              Subscribe
            </button>
          </div>
          <div className={s.options}>
            <label className={s.option}>
              <input type="checkbox" defaultChecked />
              Monthly digest
            </label>
            <label className={s.option}>
              <input type="checkbox" />
              Data releases
            </label>
          </div>
          <p className={s.privacy}>
            We respect your privacy. Unsubscribe anytime.
          </p>
        </form>
      </div>
    </section>
  );
}
