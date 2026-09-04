import {
  Building2, Flame, Hexagon, History, Info, Layers, Mountain, Ruler, Thermometer,
} from 'lucide-react';
import s from '../../MapPage.module.scss';
import { ERA_CONFIG } from '../../constants';
import { OverlayRow } from './controls';
import {
  ELEVATION_STEPS, LST_STEPS, TYPE_LEGEND, UHI_MATRIX,
  type ColorMode, type ExtrudeMode,
} from '../../mapHelpers';

interface LayersTabProps {
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
  extrudeMode: ExtrudeMode;
  onExtrudeModeChange: (mode: ExtrudeMode) => void;
  districtsVisible: boolean;
  onDistrictsToggle: () => void;
  expandedInfo: Record<string, boolean>;
  toggleInfo: (key: string, e: React.MouseEvent) => void;
}

/** "Layers" tab — the visualization-mode picker plus thematic overlay rows. */
export function LayersTab({
  colorMode, onColorModeChange, extrudeMode, onExtrudeModeChange,
  districtsVisible, onDistrictsToggle, expandedInfo, toggleInfo,
}: LayersTabProps) {
  return (
      <div className={s.layersBody}>
        <div className={s.layersIntro}>
          <span className={s.layersIntroLabel}>Visualization Layer</span>
          <span className={s.layersIntroMeta}>Color buildings by data attribute</span>
        </div>

        <div className={s.vizOptionList}>

          {/* Year Built */}
          <div
            className={`${s.vizOption} ${colorMode === 'year' ? s.vizOptionActive : ''}`}
            onClick={() => onColorModeChange('year')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onColorModeChange('year');
              }
            }}
          >
            <div className={s.vizOptionHeader}>
              <div className={s.vizOptionTitleRow}>
                <Layers size={13} className={s.vizOptionIcon} />
                <span className={s.vizOptionName}>Year Built</span>
                <button
                  type="button"
                  className={`${s.infoBtn} ${expandedInfo['year'] ? s.infoBtnActive : ''}`}
                  onClick={(e) => toggleInfo('year', e)}
                  title="Show methodology and details"
                  aria-label="Toggle year built methodology"
                >
                  <Info size={11} />
                </button>
              </div>
              {colorMode === 'year' && <span className={s.vizOptionBadge}>Active</span>}
            </div>
            <p className={s.vizOptionDesc}>Construction era · historical periods 1900 – present</p>
            <div className={s.vizGradientDiscrete}>
              {ERA_CONFIG.filter(e => e.bounds[0] !== -1).map(e => (
                <div
                  key={e.label}
                  className={s.vizGradientSwatch}
                  style={{ background: e.color }}
                  title={e.label}
                />
              ))}
            </div>
            <div className={s.vizGradientLabels}>
              <span>Pre-1917</span>
              <span>2019+</span>
            </div>
            {expandedInfo['year'] && (
              <div className={s.vizInfoBlock} onClick={(e) => e.stopPropagation()}>
                <p className={s.vizInfoText}>
                  <strong>Description:</strong> Visualizes building age and construction periods from 1900 to the present day, tracking physical growth across political eras.
                </p>
                <p className={s.vizInfoText}>
                  <strong>Methodology:</strong> Aggregated from administrative archives, historical maps, and satellite remote sensing. Classified into key urban historical eras.
                </p>
              </div>
            )}
          </div>

          {/* Elevation */}
          <div
            className={`${s.vizOption} ${colorMode === 'elevation' ? s.vizOptionActive : ''}`}
            onClick={() => onColorModeChange('elevation')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onColorModeChange('elevation');
              }
            }}
          >
            <div className={s.vizOptionHeader}>
              <div className={s.vizOptionTitleRow}>
                <Mountain size={13} className={s.vizOptionIcon} />
                <span className={s.vizOptionName}>Elevation</span>
                <button
                  type="button"
                  className={`${s.infoBtn} ${expandedInfo['elevation'] ? s.infoBtnActive : ''}`}
                  onClick={(e) => toggleInfo('elevation', e)}
                  title="Show methodology and details"
                  aria-label="Toggle elevation methodology"
                >
                  <Info size={11} />
                </button>
              </div>
              {colorMode === 'elevation' && <span className={s.vizOptionBadgeElevation}>Active</span>}
            </div>
            <p className={s.vizOptionDesc}>Ground elevation · DTM FABDEM · dem_mean (m asl)</p>
            <div className={s.vizGradientDiscrete}>
              {ELEVATION_STEPS.map(step => (
                <div
                  key={step.min}
                  className={s.vizGradientSwatch}
                  style={{ background: step.color }}
                  title={`≥ ${step.min} m`}
                />
              ))}
            </div>
            <div className={s.vizGradientLabels}>
              <span>335 m</span>
              <span>417 m</span>
            </div>
            {expandedInfo['elevation'] && (
              <div className={s.vizInfoBlock} onClick={(e) => e.stopPropagation()}>
                <p className={s.vizInfoText}>
                  <strong>Description:</strong> Maps ground surface elevation beneath building footprints, revealing micro-topography and natural floodplain contours of the Ishim River.
                </p>
                <p className={s.vizInfoText}>
                  <strong>Methodology:</strong> Derived using high-resolution FABDEM Digital Terrain Model (DTM), computing the mean elevation value (`dem_mean`) in meters asl.
                </p>
              </div>
            )}
          </div>

          {/* Summer Heat (LST) */}
          <div
            className={`${s.vizOption} ${colorMode === 'lst' ? s.vizOptionActive : ''}`}
            onClick={() => onColorModeChange('lst')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onColorModeChange('lst');
              }
            }}
          >
            <div className={s.vizOptionHeader}>
              <div className={s.vizOptionTitleRow}>
                <Thermometer size={13} className={s.vizOptionIcon} />
                <span className={s.vizOptionName}>Summer Heat (LST)</span>
                <button
                  type="button"
                  className={`${s.infoBtn} ${expandedInfo['lst'] ? s.infoBtnActive : ''}`}
                  onClick={(e) => toggleInfo('lst', e)}
                  title="Show methodology and details"
                  aria-label="Toggle LST methodology"
                >
                  <Info size={11} />
                </button>
              </div>
              {colorMode === 'lst' && <span className={s.vizOptionBadgeLst}>Active</span>}
            </div>
            <p className={s.vizOptionDesc}>Mean land surface temp · summer 2015–2025 · lst_1mean (°C)</p>
            <div className={s.vizGradientDiscrete}>
              {LST_STEPS.map(step => (
                <div
                  key={step.min}
                  className={s.vizGradientSwatch}
                  style={{ background: step.color }}
                  title={`≥ ${step.min} °C`}
                />
              ))}
            </div>
            <div className={s.vizGradientLabels}>
              <span>33 °C</span>
              <span>48 °C</span>
            </div>
            {expandedInfo['lst'] && (
              <div className={s.vizInfoBlock} onClick={(e) => e.stopPropagation()}>
                <p className={s.vizInfoText}>
                  <strong>Description:</strong> Highlights peak summer thermal variations, mapping heat concentration, urban heat islands, and cooler vegetated zones.
                </p>
                <p className={s.vizInfoText}>
                  <strong>Methodology:</strong> Calculated using multi-temporal thermal bands of Landsat-8 and Sentinel-2 (2015-2025), showing average surface temperature (`lst_1mean`) in °C.
                </p>
              </div>
            )}
          </div>

          {/* Building Use */}
          <div
            className={`${s.vizOption} ${colorMode === 'type' ? s.vizOptionActive : ''}`}
            onClick={() => onColorModeChange('type')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onColorModeChange('type');
              }
            }}
          >
            <div className={s.vizOptionHeader}>
              <div className={s.vizOptionTitleRow}>
                <Building2 size={13} className={s.vizOptionIcon} />
                <span className={s.vizOptionName}>Building Use</span>
                <button
                  type="button"
                  className={`${s.infoBtn} ${expandedInfo['type'] ? s.infoBtnActive : ''}`}
                  onClick={(e) => toggleInfo('type', e)}
                  title="Show methodology and details"
                  aria-label="Toggle building use methodology"
                >
                  <Info size={11} />
                </button>
              </div>
              {colorMode === 'type' && <span className={s.vizOptionBadgeType}>Active</span>}
            </div>
            <p className={s.vizOptionDesc}>Functional category · occupancy and primary building usage</p>
            <div className={s.vizGradientDiscrete}>
              {TYPE_LEGEND.map(item => (
                <div
                  key={item.label}
                  className={s.vizGradientSwatch}
                  style={{ background: item.color }}
                  title={item.label}
                />
              ))}
            </div>
            <div className={s.vizGradientLabels}>
              <span>Residential</span>
              <span>Infrastructure</span>
            </div>
            {expandedInfo['type'] && (
              <div className={s.vizInfoBlock} onClick={(e) => e.stopPropagation()}>
                <p className={s.vizInfoText}>
                  <strong>Description:</strong> Illustrates the primary structural and zoning functions of buildings across commercial, residential, administrative, and civic categories.
                </p>
                <p className={s.vizInfoText}>
                  <strong>Methodology:</strong> Classified from OpenStreetMap tag hierarchies cross-referenced with local city registers and land-use records.
                </p>
              </div>
            )}
          </div>

          {/* Urban Heat Island (bivariate) */}
          <div
            className={`${s.vizOption} ${colorMode === 'uhi' ? s.vizOptionActive : ''}`}
            onClick={() => onColorModeChange('uhi')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onColorModeChange('uhi');
              }
            }}
          >
            <div className={s.vizOptionHeader}>
              <div className={s.vizOptionTitleRow}>
                <Flame size={13} className={s.vizOptionIcon} />
                <span className={s.vizOptionName}>Heat × Age (UHI)</span>
                <button
                  type="button"
                  className={`${s.infoBtn} ${expandedInfo['uhi'] ? s.infoBtnActive : ''}`}
                  onClick={(e) => toggleInfo('uhi', e)}
                  title="Show methodology and details"
                  aria-label="Toggle UHI methodology"
                >
                  <Info size={11} />
                </button>
              </div>
              {colorMode === 'uhi' && <span className={s.vizOptionBadgeUhi}>Active</span>}
            </div>
            <p className={s.vizOptionDesc}>Bivariate 3×3 · building age crossed with summer surface temp</p>
            <div className={s.vizGradientDiscrete}>
              {UHI_MATRIX[2].map((color, i) => (
                <div key={`h${i}`} className={s.vizGradientSwatch} style={{ background: color }} title="Hot" />
              ))}
              {UHI_MATRIX[0].map((color, i) => (
                <div key={`c${i}`} className={s.vizGradientSwatch} style={{ background: color }} title="Cool" />
              ))}
            </div>
            <div className={s.vizGradientLabels}>
              <span>Hot + Old</span>
              <span>Cool + New</span>
            </div>
            {expandedInfo['uhi'] && (
              <div className={s.vizInfoBlock} onClick={(e) => e.stopPropagation()}>
                <p className={s.vizInfoText}>
                  <strong>Description:</strong> Displays bivariate correlation of structural building age combined with LST summer thermal stress, locating areas susceptible to UHI effects.
                </p>
                <p className={s.vizInfoText}>
                  <strong>Methodology:</strong> Standardized 3×3 matrix pairing age eras (pre-1991, 1991-2010, 2011+) with summer land surface temperature categories.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* ── 3D extrusion mode ───────────────────────────────────────── */}
        <div className={s.layersIntro} style={{ marginTop: 18 }}>
          <span className={s.layersIntroLabel}>3D Extrusion</span>
          <span className={s.layersIntroMeta}>What building height represents at zoom 13+</span>
        </div>
        <div className={s.extrudeModeRow} role="radiogroup" aria-label="3D extrusion mode">
          <button
            type="button"
            role="radio"
            aria-checked={extrudeMode === 'height'}
            className={`${s.extrudeModeBtn} ${extrudeMode === 'height' ? s.extrudeModeBtnActive : ''}`}
            onClick={() => onExtrudeModeChange('height')}
          >
            <Ruler size={12} />
            <span>Real Height</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={extrudeMode === 'age'}
            className={`${s.extrudeModeBtn} ${extrudeMode === 'age' ? s.extrudeModeBtnActive : ''}`}
            onClick={() => onExtrudeModeChange('age')}
          >
            <History size={12} />
            <span>Building Age</span>
          </button>
        </div>
        {extrudeMode === 'age' && (
          <p className={s.extrudeModeHint}>
            Older buildings rise taller — the historic Tselinograd core towers
            over the new left bank. Buildings with unknown years stay flat.
          </p>
        )}

        {/* ── Thematic overlay layers ─────────────────────────────────── */}
        <div className={s.layersIntro} style={{ marginTop: 18 }}>
          <span className={s.layersIntroLabel}>Overlay Layers</span>
          <span className={s.layersIntroMeta}>Independent data layers on top of the basemap</span>
        </div>
        <div className={s.overlayList}>



          <OverlayRow
            icon={<Hexagon size={13} />}
            title="District Borders"
            desc="Administrative boundaries with labels"
            active={districtsVisible}
            onToggle={onDistrictsToggle}
            infoOpen={!!expandedInfo['ov-districts']}
            onInfoToggle={(e) => toggleInfo('ov-districts', e)}
          >
            <p className={s.vizInfoText}>
              Official district boundaries of Astana — useful spatial context when
              filtering buildings by district.
            </p>
          </OverlayRow>

        </div>
      </div>
  );
}
