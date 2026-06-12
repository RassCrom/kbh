import s from '../MapPage.module.scss';

interface IntroOverlayProps {
  onSkip: () => void;
}

export function IntroOverlay({ onSkip }: IntroOverlayProps) {
  return (
    <div className={s.introOverlay}>
      <div className={s.introTitleBlock}>
        <span className={s.introKicker}>Architectural Atlas</span>
        <h1 className={s.introTitle}>Astana</h1>
        <span className={s.introSub}>125 years of building history</span>
      </div>
      <button className={s.introSkipBtn} onClick={onSkip}>
        Skip intro
      </button>
    </div>
  );
}
