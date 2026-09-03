export interface EraStop {
  label: string;
  color: string;
  bounds: [number, number];
  description: string;
}

export const ERA_CONFIG: EraStop[] = [
  {
    label: 'Russian Empire (< 1917)',
    color: '#8B2635',
    bounds: [0, 1916] as [number, number],
    description: 'Akmolinsk — Cossack frontier garrison, tsarist brick & timber, Orthodox churches',
  },
  {
    label: 'Early Soviet (1917–1935)',
    color: '#D32F2F',
    bounds: [1917, 1935] as [number, number],
    description: 'Constructivism & NEP era — bold geometric forms, revolutionary anti-ornament',
  },
  {
    label: 'Stalinist era (1936–1952)',
    color: '#C47A24',
    bounds: [1936, 1952] as [number, number],
    description: 'Socialist Realism — gilded spires, columns, grand civic monuments',
  },
  {
    label: 'Khrushchev Thaw (1953–1963)',
    color: '#5E9E6A',
    bounds: [1953, 1963] as [number, number],
    description: 'Khrushchyovki — mass prefab 5-story slabs; Virgin Lands campaign influx',
  },
  {
    label: 'Brezhnev Stagnation (1964–1984)',
    color: '#4A7BAA',
    bounds: [1964, 1984] as [number, number],
    description: 'Brezhnevki — 9–12 story panel blocks, monotonous mass housing',
  },
  {
    label: 'Late Soviet / Perestroika (1985–1990)',
    color: '#7B4D9E',
    bounds: [1985, 1990] as [number, number],
    description: 'Glasnost-era experiment & decline — last Soviet buildings, fading ideology',
  },
  {
    label: 'Early Independence (1991–1996)',
    color: '#A07840',
    bounds: [1991, 1996] as [number, number],
    description: 'Economic collapse & hyperinflation — near-zero construction, raw steppe period',
  },
  {
    label: 'Capital Founding (1997–2006)',
    color: '#007A9A',
    bounds: [1997, 2006] as [number, number],
    description: 'Capital transferred in 1997 — Kurokawa\'s 1998 masterplan, Baiterek tower, new national identity',
  },
  {
    label: 'Capital Boom & EXPO (2007–2018)',
    color: '#00AFCA',
    bounds: [2007, 2018] as [number, number],
    description: 'Khan Shatyr (Foster), EXPO 2017, Left Bank starchitect skyline, peak prosperity',
  },
  {
    label: 'Tokayev era (2019+)',
    color: '#F5B82E',
    bounds: [2019, 2100] as [number, number],
    description: 'Renamed back to Astana 2022 — continued growth under President Tokayev',
  },
  {
    label: 'Unknown',
    color: '#242424',
    bounds: [-1, -1] as [number, number],
    description: 'Construction year undocumented',
  },
];

// Coarser 4-era grouping shown by default — 10 hues read as noise on a
// near-black basemap at a glance. Bounds line up exactly with ERA_CONFIG's
// sub-era edges so switching between the two never changes what a given
// building's year maps to, only how many colors it's grouped into.
export const ERA_CONFIG_SIMPLE: EraStop[] = [
  {
    label: 'Imperial & Early Soviet (< 1936)',
    color: '#B23A3A',
    bounds: [0, 1935],
    description: 'Akmolinsk\'s tsarist garrison years through revolutionary Constructivism and the NEP era',
  },
  {
    label: 'Soviet Era (1936–1990)',
    color: '#4A7BAA',
    bounds: [1936, 1990],
    description: 'Sixty years of Soviet mass housing — Stalinist monuments through Brezhnev-era panel blocks and late-Soviet decline',
  },
  {
    label: 'Independence & Founding (1991–2006)',
    color: '#A07840',
    bounds: [1991, 2006],
    description: 'Independence, hyperinflation, and the 1997 capital transfer through Kurokawa\'s founding masterplan',
  },
  {
    label: 'Modern Astana (2007+)',
    color: '#00AFCA',
    bounds: [2007, 2100],
    description: 'EXPO-era boom and the contemporary skyline under President Tokayev',
  },
  {
    label: 'Unknown',
    color: '#242424',
    bounds: [-1, -1],
    description: 'Construction year undocumented',
  },
];

// [west, south, east, north] — approximate bounding boxes for each district in Astana.
// Keyed by the same district code stored in the `district` feature property
// (see DISTRICT_OPTIONS below) — not by the district's display name.
export const DISTRICT_BOUNDS: Record<string, [number, number, number, number]> = {
  'N':  [71.30, 51.05, 71.55, 51.20], // Nura
  'Y':  [71.38, 51.12, 71.60, 51.25], // Yesil
  'A':  [71.32, 51.07, 71.50, 51.18], // Almaty
  'Sa': [71.25, 51.10, 71.45, 51.22], // Saryarka
  'B':  [71.20, 51.08, 71.40, 51.20], // Baikonur
  'Sk': [71.45, 51.10, 71.65, 51.23], // Saraishik
};

export const DISTRICT_OPTIONS: { label: string; value: string }[] = [
  { label: 'Nura', value: 'N' },
  { label: 'Yesil', value: 'Y' },
  { label: 'Almaty', value: 'A' },
  { label: 'Saryarka', value: 'Sa' },
  { label: 'Baikonur', value: 'B' },
  { label: 'Saraishik', value: 'Sk' },
];

// Total building counts per district — computed from centroids-b-ast-v412.geojson
// using each district's bounding box. Static; does not change with map viewport.
// Keyed by district code, matching DISTRICT_OPTIONS/DISTRICT_BOUNDS above.
export const DISTRICT_TOTAL_COUNTS: Record<string, number> = {
  'N':  37263, // Nura
  'Y':  28597, // Yesil
  'Sa': 26051, // Saryarka
  'A':  20443, // Almaty
  'Sk': 16608, // Saraishik
  'B':  14609, // Baikonur
};

export const TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Residential', value: 'rc' },
  { label: 'Business', value: 'bc' },
  { label: 'Entertainment', value: 'ec' },
  { label: 'Shopping', value: 'sc' },
  { label: 'Sport', value: 'sf' },
  { label: 'Mosque', value: 'mosque' },
  { label: 'Church', value: 'church' },
  { label: 'Healthcare', value: 'healthcare' },
  { label: 'Hospital', value: 'hospital' },
  { label: 'Clinic', value: 'clinic' },
  { label: 'Utility', value: 'utility' },
  { label: 'Cultural', value: 'cultural site' },
  { label: 'Admin', value: 'admin' },
  { label: 'Airport', value: 'airport' },
  { label: 'Train Station', value: 'train station' },
  { label: 'School', value: 'school' },
  { label: 'Kindergarten', value: 'kdgd' },
  { label: 'University', value: 'uni' },
  { label: 'House', value: 'house' },
];

export const TYPE_GROUP_MAPPING: Record<string, string[]> = {
  'Residential': ['rc', 'house'],
  'Commercial & Leisure': ['bc', 'sc', 'ec'],
  'Education & Research': ['school', 'kdgd', 'uni'],
  'Religious Landmarks': ['mosque', 'church'],
  'Culture & Sport': ['cultural site', 'sf'],
  'Healthcare': ['healthcare', 'hospital', 'clinic'],
  'Infrastructure & Admin': ['admin', 'utility', 'airport', 'train station'],
};
