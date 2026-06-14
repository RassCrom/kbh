import { DISTRICT_OPTIONS } from './constants';
import type { ColorMode } from './mapHelpers';

const DISTRICT_LABELS = Object.fromEntries(
  DISTRICT_OPTIONS.map(({ label, value }) => [value, label]),
) as Record<string, string>;

export const BUILDING_TYPE_LABELS: Record<string, string> = {
  rc: 'Residential',
  bc: 'Business',
  ec: 'Entertainment',
  sc: 'Shopping',
  sf: 'Sport',
  mosque: 'Mosque',
  church: 'Church',
  healthcare: 'Healthcare',
  hospital: 'Hospital',
  clinic: 'Clinic',
  utility: 'Utility',
  'cultural site': 'Cultural',
  admin: 'Administrative',
  airport: 'Airport',
  'train station': 'Train Station',
  school: 'School',
  kdgd: 'Kindergarten',
  kindergarten: 'Kindergarten',
  uni: 'University',
  university: 'University',
  house: 'House',
};

export interface ThemeAttribute {
  label: string;
  value: string;
}

export interface ThemeDetails {
  label: string;
  attributes: ThemeAttribute[];
}

export function parseBuildingYear(properties: Record<string, unknown>): number {
  const yearInt = properties.year_int;
  if (yearInt != null && !isNaN(Number(yearInt))) return Number(yearInt);

  const yearString = properties.year_str;
  if (!yearString) return 0;

  const text = String(yearString);
  const dashIndex = text.indexOf('-');
  if (dashIndex > 0) {
    return Math.round(
      (parseInt(text.slice(0, dashIndex), 10) + parseInt(text.slice(dashIndex + 1), 10)) / 2,
    );
  }
  return parseInt(text, 10) || 0;
}

export function formatDistrict(value: unknown): string {
  if (value == null || value === '') return 'No data';
  const district = String(value);
  return DISTRICT_LABELS[district] ?? district;
}

export function formatBuildingType(value: unknown): string {
  if (value == null || value === '') return 'No data';
  const type = String(value);
  return BUILDING_TYPE_LABELS[type] ?? type;
}

function formatNumber(value: unknown, suffix: string): string {
  if (value == null || value === '' || !Number.isFinite(Number(value))) return 'No data';
  return `${Number(value).toFixed(1)} ${suffix}`;
}

export function getThemeDetails(
  properties: Record<string, unknown>,
  colorMode: ColorMode,
): ThemeDetails {
  const year = parseBuildingYear(properties);
  const yearLabel = properties.year_int ?? properties.year_str;

  switch (colorMode) {
    case 'elevation':
      return {
        label: 'Elevation',
        attributes: [{ label: 'Ground elevation', value: formatNumber(properties.dem_mean, 'm asl') }],
      };
    case 'lst':
      return {
        label: 'Summer Heat',
        attributes: [{ label: 'Mean summer LST', value: formatNumber(properties.lst_1mean, '°C') }],
      };
    case 'type':
      return {
        label: 'Building Use',
        attributes: [{ label: 'Primary use', value: formatBuildingType(properties.type) }],
      };
    case 'uhi':
      return {
        label: 'Heat × Age',
        attributes: [
          { label: 'Building age', value: year ? `${new Date().getFullYear() - year} years` : 'No data' },
          { label: 'Mean summer LST', value: formatNumber(properties.lst_1mean, '°C') },
        ],
      };
    default:
      return {
        label: 'Year Built',
        attributes: [{ label: 'Construction year', value: yearLabel ? String(yearLabel) : 'No data' }],
      };
  }
}
