import { DISTRICT_OPTIONS } from './constants';
import type { ColorMode } from './mapHelpers';

const DISTRICT_LABELS = Object.fromEntries(
  DISTRICT_OPTIONS.map(({ label, value }) => [value, label]),
) as Record<string, string>;

/**
 * Single source of truth for the `type` attribute's display names, in a
 * compact form (filter chips, chart rows) and a descriptive one (tooltips,
 * detail panels). Both codes and full words are keyed because the dataset
 * carries `kdgd`/`uni` while some records spell them out.
 */
export const BUILDING_TYPES: Record<string, { short: string; long: string }> = {
  rc: { short: 'Residential', long: 'Residential Complex' },
  bc: { short: 'Business', long: 'Business Center' },
  ec: { short: 'Entertainment', long: 'Entertainment Center' },
  sc: { short: 'Shopping', long: 'Shopping Center' },
  sf: { short: 'Sport', long: 'Sport Facility' },
  mosque: { short: 'Mosque', long: 'Mosque' },
  church: { short: 'Church', long: 'Church' },
  healthcare: { short: 'Healthcare', long: 'Healthcare Facility' },
  hospital: { short: 'Hospital', long: 'Hospital' },
  clinic: { short: 'Clinic', long: 'Clinic' },
  utility: { short: 'Utility', long: 'Utility Infrastructure' },
  'cultural site': { short: 'Cultural', long: 'Cultural Site' },
  admin: { short: 'Admin', long: 'Administrative Building' },
  airport: { short: 'Airport', long: 'Airport' },
  'train station': { short: 'Train Stn', long: 'Train Station' },
  school: { short: 'School', long: 'School' },
  kdgd: { short: 'Kindergarten', long: 'Kindergarten' },
  kindergarten: { short: 'Kindergarten', long: 'Kindergarten' },
  uni: { short: 'University', long: 'University' },
  university: { short: 'University', long: 'University' },
  house: { short: 'House', long: 'Private House' },
};

/** Compact label for a raw `type` code, falling back to the code itself. */
export function buildingTypeLabel(type: string, form: 'short' | 'long' = 'short'): string {
  return BUILDING_TYPES[type]?.[form] ?? type;
}

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
  return buildingTypeLabel(String(value));
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
