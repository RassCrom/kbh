import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Columns2 } from 'lucide-react';
import { darkDramaticStyle } from '../darkDramaticStyle';
import { buildHeightExtrusionExpr, buildYearColorExpr } from '../mapHelpers';
import { applyMapTheme, type MapTheme } from '../mapTheme';
import s from '../MapPage.module.scss';

const HISTORICAL_YEAR = 1990;
const MODERN_YEAR = new Date().getFullYear();

interface HistoricalCompareProps {
  mainMapRef: React.RefObject<maplibregl.Map | null>;
  mapTheme: MapTheme;
}

export function HistoricalCompare({ mainMapRef, mapTheme }: HistoricalCompareProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const compareMapRef = useRef<maplibregl.Map | null>(null);
  const draggingRef = useRef(false);
  const [position, setPosition] = useState(50);

  useEffect(() => {
    const mainMap = mainMapRef.current;
    if (!mapContainerRef.current || !mainMap) return;

    const center = mainMap.getCenter();
    const compareMap = new maplibregl.Map({
      container: mapContainerRef.current,
      style: structuredClone(darkDramaticStyle),
      center,
      zoom: mainMap.getZoom(),
      pitch: mainMap.getPitch(),
      bearing: mainMap.getBearing(),
      minZoom: 10,
      maxZoom: 23,
      interactive: false,
      attributionControl: false,
    });
    compareMapRef.current = compareMap;

    const syncCamera = () => {
      if (!compareMap.getStyle()) return;
      compareMap.jumpTo({
        center: mainMap.getCenter(),
        zoom: mainMap.getZoom(),
        pitch: mainMap.getPitch(),
        bearing: mainMap.getBearing(),
      });
    };

    compareMap.on('load', () => {
      const parsedYear = ['coalesce', ['get', 'year_int'], 0];
      const historicalFilter = [
        'all',
        ['>=', parsedYear, 1900],
        ['<=', parsedYear, HISTORICAL_YEAR],
      ] as unknown as maplibregl.FilterSpecification;

      compareMap.addSource('historical-buildings', {
        type: 'vector',
        url: 'pmtiles:///buildings-ast-v44.pmtiles',
      });
      compareMap.addLayer({
        id: 'historical-buildings-fill',
        type: 'fill',
        source: 'historical-buildings',
        'source-layer': 'buildings',
        filter: historicalFilter,
        paint: {
          'fill-color': buildYearColorExpr(),
          'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10, 1, 14, 0.88, 17, 0.55],
        },
      });
      compareMap.addLayer({
        id: 'historical-buildings-outline',
        type: 'line',
        source: 'historical-buildings',
        'source-layer': 'buildings',
        filter: historicalFilter,
        paint: {
          'line-color': 'rgba(255,255,255,0.22)',
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.35, 13, 0],
        },
      });
      compareMap.addLayer({
        id: 'historical-buildings-3d',
        type: 'fill-extrusion',
        source: 'historical-buildings',
        'source-layer': 'buildings',
        minzoom: 13,
        filter: historicalFilter,
        paint: {
          'fill-extrusion-color': buildYearColorExpr(),
          'fill-extrusion-height': buildHeightExtrusionExpr(),
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.88,
        },
      });
      applyMapTheme(compareMap, mapTheme);
      syncCamera();
    });

    mainMap.on('move', syncCamera);
    return () => {
      mainMap.off('move', syncCamera);
      compareMap.remove();
      compareMapRef.current = null;
    };
  }, [mainMapRef]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const compareMap = compareMapRef.current;
    if (!compareMap) return;
    const apply = () => applyMapTheme(compareMap, mapTheme);
    if (compareMap.isStyleLoaded()) apply();
    else compareMap.once('load', apply);
  }, [mapTheme]);

  const updatePosition = useCallback((clientX: number) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(92, Math.max(8, next)));
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    updatePosition(event.clientX);
  }, [updatePosition]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (draggingRef.current) updatePosition(event.clientX);
  }, [updatePosition]);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    setPosition((current) => Math.min(92, Math.max(8, current + (event.key === 'ArrowLeft' ? -2 : 2))));
  }, []);

  return (
    <div ref={rootRef} className={s.compareOverlay} aria-label="Historical and modern map comparison">
      <div className={s.compareHistoricalClip} style={{ width: `${position}%` }}>
        <div ref={mapContainerRef} className={s.compareMap} />
      </div>

      <span className={`${s.compareLabel} ${s.compareLabelHistorical}`}>
        Reconstructed · {HISTORICAL_YEAR}
      </span>
      <span className={`${s.compareLabel} ${s.compareLabelModern}`}>
        Modern · {MODERN_YEAR}
      </span>

      <button
        type="button"
        className={s.compareDivider}
        style={{ left: `${position}%` }}
        role="slider"
        aria-label="Move historical map comparison divider"
        aria-valuemin={8}
        aria-valuemax={92}
        aria-valuenow={Math.round(position)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
      >
        <span className={s.compareDividerLine} />
        <span className={s.compareHandle}>
          <Columns2 size={18} />
        </span>
      </button>
    </div>
  );
}
