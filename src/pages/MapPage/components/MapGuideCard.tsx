import { Compass, Grid2x2, HelpCircle, Layers, Map as MapIcon, SlidersHorizontal, X } from 'lucide-react';
import s from '../MapPage.module.scss';

interface MapGuideCardProps {
  onDismiss: () => void;
}

interface HelpTriggerProps {
  onOpen: () => void;
}

export function MapGuideCard({ onDismiss }: MapGuideCardProps) {
  return (
    <div className={s.guideCard} role="dialog" aria-label="Astana map guide">
      <div className={s.guideHeader}>
        <h4 className={s.guideTitle}>
          <MapIcon size={14} />
          Astana Map Guide
        </h4>
        <button className={s.guideClose} onClick={onDismiss} aria-label="Close guide">
          <X size={14} />
        </button>
      </div>
      <ul className={s.guideList}>
        <li>
          <span className={s.guideIco}><Compass size={13} /></span>
          <span>
            <b>Tours &amp; Cinema</b> — guided fly-throughs and a city time-lapse
            <i>top left</i>
          </span>
        </li>
        <li>
          <span className={s.guideIco}><Grid2x2 size={13} /></span>
          <span>
            <b>Hexagons</b> — building density &amp; age heatmaps
            <i>top center</i>
          </span>
        </li>
        <li>
          <span className={s.guideIco}><SlidersHorizontal size={13} /></span>
          <span>
            <b>Filters</b> — era, style, type &amp; thematic overlays
            <i>top right</i>
          </span>
        </li>
        <li>
          <span className={s.guideIco}><Layers size={13} /></span>
          <span>
            <b>Legend</b> — tap an era to highlight its buildings
            <i>bottom left</i>
          </span>
        </li>
      </ul>
      <button className={s.onboardingBtn} onClick={onDismiss}>
        Explore the map
      </button>
    </div>
  );
}

export function HelpTrigger({ onOpen }: HelpTriggerProps) {
  return (
    <button
      className={s.helpGuideBtn}
      onClick={onOpen}
      title="Show map controls guide"
      aria-label="Show guide"
    >
      <HelpCircle size={15} />
    </button>
  );
}
