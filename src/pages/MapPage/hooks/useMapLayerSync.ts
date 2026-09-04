import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { type EraStop } from '../constants';
import { applyMapTheme, type MapTheme } from '../mapTheme';
import {
  buildYearColorExpr, buildElevationColorExpr, buildLstColorExpr, buildTypeColorExpr,
  buildUhiColorExpr, buildCombinedFilter, buildHeightExtrusionExpr, buildAgeExtrusionExpr,
  type ColorMode, type ExtrudeMode,
} from '../mapHelpers';
import {
  buildCountColorExpr, buildYearAvgColorExpr, buildHexHeightExpr,
  buildHexCinemaHeightExpr, type HexMetric,
} from '../hexUtils';

const BUILDING_FILTER_LAYERS = ['buildings-fill', 'buildings-outline', 'buildings-3d'];

interface Options {
  mapRef: React.MutableRefObject<maplibregl.Map | null>;
  mapTheme: MapTheme;
  colorMode: ColorMode;
  activeEraConfig: EraStop[];
  hoveredEra: string | null;
  extrudeMode: ExtrudeMode;
  hexMetric: HexMetric;
  vizMode: 'buildings' | 'hexagons';
  cinemaActive: boolean;
  cinemaYear: number;
  isPlaying: boolean;
  yearRange: [number, number];
  selectedTypes: string[];
  selectedDistricts: string[];
  selectedArchStyle: string;
  selectedCompany: string;
  selectedUhiCells: string[];
  onUhiCellsReset: () => void;
}

/**
 * Pushes React state into MapLibre paint/filter properties.
 *
 * Every effect here follows the same shape: bail out unless the style is
 * ready, then set a paint property or filter. They are grouped in one hook so
 * MapPage reads as composition rather than a wall of map plumbing.
 */
export function useMapLayerSync(opts: Options): void {
  const {
    mapRef, mapTheme, colorMode, activeEraConfig, hoveredEra, extrudeMode,
    hexMetric, vizMode, cinemaActive, cinemaYear, isPlaying, yearRange,
    selectedTypes, selectedDistricts, selectedArchStyle, selectedCompany,
    selectedUhiCells, onUhiCellsReset,
  } = opts;

  // ── Dark / light theme ────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.dataset.theme = mapTheme;
    const map = mapRef.current;
    if (!map) return;
    const apply = () => applyMapTheme(map, mapTheme);
    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [mapTheme, mapRef]);

  // ── Building colour expression ────────────────────────────────────────────
  useEffect(() => {
    onUhiCellsReset();
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const colorExpr =
        colorMode === 'elevation' ? buildElevationColorExpr() :
          colorMode === 'lst' ? buildLstColorExpr() :
            colorMode === 'type' ? buildTypeColorExpr() :
              colorMode === 'uhi' ? buildUhiColorExpr() :
                buildYearColorExpr(activeEraConfig);
      if (map.getLayer('buildings-fill')) map.setPaintProperty('buildings-fill', 'fill-color', colorExpr);
      if (map.getLayer('buildings-3d')) map.setPaintProperty('buildings-3d', 'fill-extrusion-color', colorExpr);
    };
    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [colorMode, mapTheme, activeEraConfig, mapRef]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Combined attribute filter ─────────────────────────────────────────────
  // While the time-lapse plays, onPlayTick drives the filter directly in the
  // same rAF frame; running here too would overwrite it with a stale year.
  useEffect(() => {
    if (isPlaying) return;
    const map = mapRef.current;
    if (!map || !map.getStyle()) return;
    const filterExpr = buildCombinedFilter(
      yearRange,
      selectedTypes,
      selectedDistricts,
      selectedArchStyle,
      selectedCompany,
      colorMode === 'uhi' ? selectedUhiCells : [],
    ) as maplibregl.FilterSpecification;
    for (const id of BUILDING_FILTER_LAYERS) {
      if (map.getLayer(id)) map.setFilter(id, filterExpr);
    }
  }, [
    isPlaying, yearRange, selectedTypes, selectedDistricts, selectedArchStyle,
    selectedCompany, selectedUhiCells, colorMode, mapRef,
  ]);

  // ── Era hover highlight ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getStyle() || !map.getLayer('buildings-fill')) return;

    let opacityExpr: unknown = ['interpolate', ['linear'], ['zoom'], 12, 0.7, 14, 0.85, 14.5, 0];
    let opacity3dExpr: unknown = 0.85;

    if (colorMode === 'year' && hoveredEra) {
      const era = activeEraConfig.find((e) => e.label === hoveredEra);
      if (era) {
        const parsedYear = ['coalesce', ['get', 'year_int'], 0];
        const inEraExpr = era.label === 'Unknown'
          ? ['==', parsedYear, 0]
          : ['all', ['>=', parsedYear, era.bounds[0]], ['<=', parsedYear, era.bounds[1]], ['!=', parsedYear, 0]];
        opacityExpr = ['case', inEraExpr, opacityExpr, 0.1];
        opacity3dExpr = ['case', inEraExpr, opacity3dExpr, 0.1];
      }
    }

    map.setPaintProperty('buildings-fill', 'fill-opacity', opacityExpr as maplibregl.ExpressionSpecification);
    if (map.getLayer('buildings-3d')) {
      map.setPaintProperty('buildings-3d', 'fill-extrusion-opacity', opacity3dExpr as maplibregl.ExpressionSpecification);
    }
  }, [hoveredEra, colorMode, activeEraConfig, mapRef]);

  // ── Extrusion height source (real height vs age) ──────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getStyle()) return;
    const apply = () => {
      const expr = extrudeMode === 'age' ? buildAgeExtrusionExpr() : buildHeightExtrusionExpr();
      if (map.getLayer('buildings-3d')) map.setPaintProperty('buildings-3d', 'fill-extrusion-height', expr);
      if (map.getLayer('buildings-3d-hover')) map.setPaintProperty('buildings-3d-hover', 'fill-extrusion-height', expr);
    };
    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [extrudeMode, mapRef]);

  // ── Hexagon metric ────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getStyle() || !map.getLayer('hex-layer')) return;
    const colorExpr = hexMetric === 'count'
      ? buildCountColorExpr()
      : buildYearAvgColorExpr(activeEraConfig);
    map.setPaintProperty('hex-layer', 'fill-extrusion-color', colorExpr);
  }, [hexMetric, activeEraConfig, mapRef]);

  // ── Cinema sweep applied to hexagon heights ───────────────────────────────
  // The ref keeps the reset to a single write when cinema ends, instead of
  // re-setting the static height expression on every sweep tick.
  const hexCinemaActiveRef = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getStyle() || !map.getLayer('hex-layer')) return;
    if (cinemaActive && vizMode === 'hexagons') {
      hexCinemaActiveRef.current = true;
      map.setPaintProperty('hex-layer', 'fill-extrusion-height', buildHexCinemaHeightExpr(cinemaYear));
    } else if (hexCinemaActiveRef.current) {
      hexCinemaActiveRef.current = false;
      map.setPaintProperty('hex-layer', 'fill-extrusion-height', buildHexHeightExpr());
    }
  }, [cinemaActive, vizMode, cinemaYear, mapRef]);
}
