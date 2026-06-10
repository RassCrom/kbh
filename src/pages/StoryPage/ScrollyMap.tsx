import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import { darkDramaticStyle } from '../MapPage/darkDramaticStyle';
import { buildYearColorExpr, buildHeightExtrusionExpr } from '../MapPage/mapHelpers';

export interface ChapterConfig {
  id: string;
  camera: {
    center: [number, number];
    zoom: number;
    pitch?: number;
    bearing?: number;
  };
  /** Buildings inside this range render in era colors; the rest stay dimmed. */
  yearRange?: [number, number];
  /** Animate the upper bound of yearRange from [0] to [1] on chapter entry. */
  animateYears?: [number, number];
  /** Show 3D extrusions for the highlighted buildings. */
  extrude?: boolean;
}

interface ScrollyMapProps {
  chapter: ChapterConfig | null;
}

const PREFERS_REDUCED_MOTION =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function yearFilter(range: [number, number]): maplibregl.FilterSpecification {
  const parsedYear = ['coalesce', ['get', 'year_int'], 0];
  return ['all',
    ['!=', parsedYear, 0],
    ['>=', parsedYear, range[0]],
    ['<=', parsedYear, range[1]],
  ] as unknown as maplibregl.FilterSpecification;
}

/**
 * Sticky background map for scrollytelling stories. Renders the building
 * dataset twice: a dim base coat plus an era-colored layer filtered to the
 * active chapter's year range, so each chapter "lights up" its period.
 */
export function ScrollyMap({ chapter }: ScrollyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const loadedRef = useRef(false);
  const animTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: darkDramaticStyle,
      center: [71.43, 51.15],
      zoom: 11.5,
      interactive: false, // narrative drives the camera; scroll stays with the page
      attributionControl: { compact: true },
    });

    map.on('load', () => {
      map.addSource('story-buildings', {
        type: 'vector',
        url: 'pmtiles:///buildings-ast-v44.pmtiles',
      });

      // Dim base coat — the city is always present as context
      map.addLayer({
        id: 'story-base',
        type: 'fill',
        source: 'story-buildings',
        'source-layer': 'buildings',
        paint: {
          'fill-color': '#252b38',
          'fill-opacity': 0.55,
        },
      });

      // Highlighted era buildings
      map.addLayer({
        id: 'story-active',
        type: 'fill',
        source: 'story-buildings',
        'source-layer': 'buildings',
        paint: {
          'fill-color': buildYearColorExpr(),
          'fill-opacity': 0.92,
          'fill-opacity-transition': { duration: 600, delay: 0 },
        },
      });

      // 3D extrusions for street-level chapters
      map.addLayer({
        id: 'story-3d',
        type: 'fill-extrusion',
        source: 'story-buildings',
        'source-layer': 'buildings',
        minzoom: 13,
        layout: { visibility: 'none' },
        paint: {
          'fill-extrusion-color': buildYearColorExpr(),
          'fill-extrusion-height': buildHeightExtrusionExpr(),
          'fill-extrusion-opacity': 0.88,
        },
      });

      loadedRef.current = true;
    });

    mapRef.current = map;

    return () => {
      if (animTimerRef.current) clearInterval(animTimerRef.current);
      map.remove();
      maplibregl.removeProtocol('pmtiles');
    };
  }, []);

  // React to chapter changes: fly the camera, swap filters, run year animation
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !chapter) return;

    const apply = () => {
      if (animTimerRef.current) {
        clearInterval(animTimerRef.current);
        animTimerRef.current = null;
      }

      map.flyTo({
        ...chapter.camera,
        pitch: chapter.camera.pitch ?? 0,
        bearing: chapter.camera.bearing ?? 0,
        duration: PREFERS_REDUCED_MOTION ? 0 : 2400,
        curve: 1.35,
        essential: true,
      });

      const vis = chapter.extrude ? 'visible' : 'none';
      if (map.getLayer('story-3d')) map.setLayoutProperty('story-3d', 'visibility', vis);

      if (chapter.animateYears) {
        const [from, to] = chapter.animateYears;
        if (PREFERS_REDUCED_MOTION) {
          const f = yearFilter([1900, to]);
          map.setFilter('story-active', f);
          map.setFilter('story-3d', f);
          return;
        }
        let year = from;
        const f0 = yearFilter([1900, year]);
        map.setFilter('story-active', f0);
        map.setFilter('story-3d', f0);
        animTimerRef.current = setInterval(() => {
          year += 1;
          if (year >= to) {
            year = to;
            if (animTimerRef.current) clearInterval(animTimerRef.current);
            animTimerRef.current = null;
          }
          const f = yearFilter([1900, year]);
          if (map.getStyle()) {
            map.setFilter('story-active', f);
            map.setFilter('story-3d', f);
          }
        }, 90);
      } else {
        const range = chapter.yearRange ?? [1900, 2100];
        const f = yearFilter(range);
        map.setFilter('story-active', f);
        map.setFilter('story-3d', f);
      }
    };

    if (loadedRef.current) apply();
    else map.once('load', apply);
  }, [chapter]);

  return <div ref={containerRef} className="scrolly-map-canvas" style={{ width: '100%', height: '100%' }} />;
}
