/**
 * Landmark metadata + hit-target GeoJSON. Kept free of three.js imports so the
 * heavy 3D module (landmarks3d.ts) can be loaded lazily without pulling this in.
 */

export interface Landmark {
  id: string;
  name: string;
  lngLat: [number, number];
  year: string;
  height: string;
  architect: string;
  description: string;
  facts: string[];
}

export const LANDMARKS: Landmark[] = [
  {
    id: 'bayterek',
    name: 'Bayterek Tower',
    lngLat: [71.43050756481662, 51.12862200109599],
    year: '1997–2002',
    height: '97 m (105 m with orb)',
    architect: 'Concept: N. Nazarbayev · Design: A. Rustembekov',
    description:
      'The symbol of post-independence Astana. Bayterek embodies the Kazakh legend of the Samruk bird laying a golden egg in the branches of the tree of life — the gilded sphere holds an observation deck at 97 m, the year the capital moved here.',
    facts: [
      'The 97 m height marks 1997, the year Astana became the capital',
      'The orb is 22 m in diameter and weighs about 300 tonnes',
      'Centerpiece of the Nurzhol Boulevard axis by Kisho Kurokawa',
    ],
  },
  {
    id: 'kabanbai',
    name: 'Kabanbai Batyr Mausoleum',
    lngLat: [71.40986540891022, 50.87289280012467],
    year: '2000 (memorial complex)',
    height: '~12 m dome',
    architect: 'Memorial complex over an 18th-century burial site',
    description:
      'Mausoleum of Kabanbai Batyr, the legendary Kazakh military commander of the 18th century who led decisive battles against the Dzungar invasion. The complex stands on the steppe south of Astana, near the city that bears his name on its main avenue.',
    facts: [
      'Kabanbai Batyr avenue in Astana is named after him',
      'A site of pilgrimage about 25 km south of the capital',
      'The conical dome echoes traditional steppe mausoleum forms',
    ],
  },
];

/** GeoJSON for the invisible hit-target + glow halo markers. */
export function landmarksGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: LANDMARKS.map((lm) => ({
      type: 'Feature',
      id: lm.id,
      geometry: { type: 'Point', coordinates: lm.lngLat },
      properties: { id: lm.id, name: lm.name },
    })),
  };
}
