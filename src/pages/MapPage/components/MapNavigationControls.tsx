import { useState } from 'react';
import type maplibregl from 'maplibre-gl';
import { Compass, Minus, Plus, RotateCcw, View } from 'lucide-react';
import s from './MapNavigationControls.module.scss';

interface MapNavigationControlsProps {
  mapRef: React.MutableRefObject<maplibregl.Map | null>;
}

export function MapNavigationControls({ mapRef }: MapNavigationControlsProps) {
  const [open, setOpen] = useState(false);

  const withMap = (action: (map: maplibregl.Map) => void) => {
    const map = mapRef.current;
    if (map?.getStyle()) action(map);
  };

  return (
    <div className={s.controls}>
      {open && (
        <div className={s.revealed} role="group" aria-label="Map camera controls">
          <button
            onClick={() => withMap((map) => map.easeTo({ zoom: map.getZoom() + 1, duration: 240 }))}
            aria-label="Zoom in"
            title="Zoom in"
          >
            <Plus size={17} />
          </button>
          <button
            onClick={() => withMap((map) => map.easeTo({ zoom: map.getZoom() - 1, duration: 240 }))}
            aria-label="Zoom out"
            title="Zoom out"
          >
            <Minus size={17} />
          </button>
          <button
            onClick={() => withMap((map) => map.easeTo({
              pitch: map.getPitch() > 12 ? 0 : 58,
              duration: 420,
            }))}
            aria-label="Toggle map pitch"
            title="Toggle 3D pitch"
          >
            <View size={17} />
          </button>
          <button
            onClick={() => withMap((map) => map.easeTo({ bearing: 0, pitch: 0, duration: 420 }))}
            aria-label="Reset map orientation"
            title="Reset north and pitch"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      )}

      <button
        className={`${s.trigger} ${open ? s.triggerOpen : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Hide map camera controls' : 'Show map camera controls'}
        aria-expanded={open}
        title="Map camera"
      >
        <Compass size={18} />
        <span>Camera</span>
      </button>
    </div>
  );
}
