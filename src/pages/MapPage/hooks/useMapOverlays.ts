import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { createGraffitiPinImage, loadGraffitiPhotoMarkers, type GraffitiGeoJSON } from '../overlays/graffiti';
import { setOverlayVisible } from '../overlays/overlayLayers';

interface UseMapOverlaysOptions {
  mapRef: React.MutableRefObject<maplibregl.Map | null>;
  mapLoaded: boolean;
}

export function useMapOverlays(opts: UseMapOverlaysOptions) {
  const [graffitiVisible, setGraffitiVisible] = useState(false);
  const [crimeVisible, setCrimeVisible] = useState(false);
  const [greenVisible, setGreenVisible] = useState(false);
  const [districtsVisible, setDistrictsVisible] = useState(false);
  const [selectedGraffiti, setSelectedGraffiti] = useState<Record<string, unknown> | null>(null);

  const graffitiDataRef = useRef<GraffitiGeoJSON | null>(null);
  const graffitiPhotosLoadedRef = useRef(false);
  const graffitiInitRef = useRef(false);
  const graffitiVisibleRef = useRef(false);

  // ── Lazy-load graffiti layer ─────────────────────────────────────────────
  const ensureGraffitiLayer = useCallback((map: maplibregl.Map) => {
    if (graffitiInitRef.current) return;
    graffitiInitRef.current = true;
    createGraffitiPinImage(map);

    fetch('/graffiti-astana.geojson')
      .then((res) => res.json())
      .then((geojson: GraffitiGeoJSON) => {
        if (!geojson?.features || !map.getStyle()) return;
        graffitiDataRef.current = geojson;
        const vis: maplibregl.VisibilitySpecification = graffitiVisibleRef.current ? 'visible' : 'none';

        map.addSource('graffiti', { type: 'geojson', data: geojson });
        map.addLayer({
          id: 'graffiti-layer',
          type: 'symbol',
          source: 'graffiti',
          layout: {
            'icon-image': ['coalesce', ['image', ['get', 'photo']], 'graffiti-pin'],
            'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.55, 14, 0.9, 18, 1.1],
            'icon-allow-overlap': true,
            'icon-anchor': 'center',
            'visibility': vis,
          },
          paint: {
            'icon-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 1.0, 0.88],
          },
        });
        map.addLayer({
          id: 'graffiti-label',
          type: 'symbol',
          source: 'graffiti',
          minzoom: 15,
          layout: {
            'text-field': ['get', 'title'],
            'text-size': 11,
            'text-anchor': 'top',
            'text-offset': [0, 1.0],
            'text-allow-overlap': false,
            'visibility': vis,
          },
          paint: {
            'text-color': '#CAFF00',
            'text-halo-color': 'rgba(0,0,0,0.8)',
            'text-halo-width': 1.5,
          },
        });

        let hoveredGraffitiId: string | number | null = null;
        map.on('mousemove', 'graffiti-layer', (e) => {
          if (!e.features?.length) return;
          map.getCanvas().style.cursor = 'pointer';
          const feat = e.features[0];
          if (feat.id !== hoveredGraffitiId) {
            if (hoveredGraffitiId !== null) map.setFeatureState({ source: 'graffiti', id: hoveredGraffitiId }, { hover: false });
            hoveredGraffitiId = feat.id ?? null;
            if (hoveredGraffitiId !== null) map.setFeatureState({ source: 'graffiti', id: hoveredGraffitiId }, { hover: true });
          }
        });
        map.on('mouseleave', 'graffiti-layer', () => {
          map.getCanvas().style.cursor = '';
          if (hoveredGraffitiId !== null) {
            map.setFeatureState({ source: 'graffiti', id: hoveredGraffitiId }, { hover: false });
            hoveredGraffitiId = null;
          }
        });

        if (graffitiVisibleRef.current && !graffitiPhotosLoadedRef.current) {
          graffitiPhotosLoadedRef.current = true;
          loadGraffitiPhotoMarkers(map, geojson);
        }
      })
      .catch((err) => console.error('Error loading graffiti layer:', err));
  }, []);

  // ── Sync visibility ──────────────────────────────────────────────────────
  useEffect(() => {
    graffitiVisibleRef.current = graffitiVisible;
    const map = opts.mapRef.current;
    if (!map || !opts.mapLoaded || !map.getStyle()) return;
    if (graffitiVisible) ensureGraffitiLayer(map);
    const vis: maplibregl.VisibilitySpecification = graffitiVisible ? 'visible' : 'none';
    if (map.getLayer('graffiti-layer')) map.setLayoutProperty('graffiti-layer', 'visibility', vis);
    if (map.getLayer('graffiti-label')) map.setLayoutProperty('graffiti-label', 'visibility', vis);
    if (graffitiVisible && !graffitiPhotosLoadedRef.current && graffitiDataRef.current) {
      graffitiPhotosLoadedRef.current = true;
      loadGraffitiPhotoMarkers(map, graffitiDataRef.current);
    }
  }, [graffitiVisible, opts.mapLoaded, ensureGraffitiLayer]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = opts.mapRef.current;
    if (!map || !opts.mapLoaded || !map.getStyle()) return;
    setOverlayVisible(map, 'crime', crimeVisible);
  }, [crimeVisible, opts.mapLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = opts.mapRef.current;
    if (!map || !opts.mapLoaded || !map.getStyle()) return;
    setOverlayVisible(map, 'green', greenVisible);
  }, [greenVisible, opts.mapLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = opts.mapRef.current;
    if (!map || !opts.mapLoaded || !map.getStyle()) return;
    setOverlayVisible(map, 'districts', districtsVisible);
  }, [districtsVisible, opts.mapLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stable toggle callbacks ──────────────────────────────────────────────
  const handleGraffitiToggle = useCallback(() => setGraffitiVisible((v) => !v), []);
  const handleCrimeToggle = useCallback(() => setCrimeVisible((v) => !v), []);
  const handleGreenToggle = useCallback(() => setGreenVisible((v) => !v), []);
  const handleDistrictsToggle = useCallback(() => setDistrictsVisible((v) => !v), []);

  return {
    graffitiVisible,
    crimeVisible,
    greenVisible,
    districtsVisible,
    selectedGraffiti,
    setSelectedGraffiti,
    handleGraffitiToggle,
    handleCrimeToggle,
    handleGreenToggle,
    handleDistrictsToggle,
  };
}
