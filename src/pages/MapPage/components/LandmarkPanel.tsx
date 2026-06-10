import { X, Landmark as LandmarkIcon, Calendar, Ruler, PenTool, Sparkles } from 'lucide-react';
import type { Landmark } from '../overlays/landmarksData';
import s from '../MapPage.module.scss';

interface Props {
  landmark: Landmark | null;
  onClose: () => void;
  onFlyTo: (landmark: Landmark) => void;
}

/** Popup for the 3D landmark models (Bayterek, Kabanbai mausoleum). */
export function LandmarkPanel({ landmark, onClose, onFlyTo }: Props) {
  if (!landmark) return null;

  return (
    <aside className={s.landmarkPanel} aria-label={`${landmark.name} details`}>
      <div className={s.landmarkHeader}>
        <span className={s.landmarkBadge}>
          <LandmarkIcon size={11} />
          3D Landmark
        </span>
        <button className={s.landmarkClose} onClick={onClose} aria-label="Close panel">
          <X size={14} />
        </button>
      </div>

      <h3 className={s.landmarkName}>{landmark.name}</h3>
      <p className={s.landmarkDesc}>{landmark.description}</p>

      <div className={s.landmarkFacts}>
        <div className={s.landmarkFactRow}>
          <Calendar size={12} />
          <span className={s.landmarkFactKey}>Built</span>
          <span className={s.landmarkFactVal}>{landmark.year}</span>
        </div>
        <div className={s.landmarkFactRow}>
          <Ruler size={12} />
          <span className={s.landmarkFactKey}>Height</span>
          <span className={s.landmarkFactVal}>{landmark.height}</span>
        </div>
        <div className={s.landmarkFactRow}>
          <PenTool size={12} />
          <span className={s.landmarkFactKey}>Design</span>
          <span className={s.landmarkFactVal}>{landmark.architect}</span>
        </div>
      </div>

      <ul className={s.landmarkFactList}>
        {landmark.facts.map((fact) => (
          <li key={fact}>
            <Sparkles size={10} />
            <span>{fact}</span>
          </li>
        ))}
      </ul>

      <button className={s.landmarkFlyBtn} onClick={() => onFlyTo(landmark)}>
        Orbit the model
      </button>
    </aside>
  );
}
