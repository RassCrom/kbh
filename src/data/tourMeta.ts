/**
 * Presentation metadata for the guided tours, shared by the home page card
 * carousel and the map's tour catalogue.
 *
 * Kept separate from `pages/MapPage/tours.ts` — which adds each tour's stops,
 * camera poses and narration text — so the home page bundle doesn't pull in
 * the full tour scripts it never renders. Same reasoning as landmarksData.ts
 * staying free of three.js imports.
 */

export interface TourMeta {
  id: string;
  title: string;
  /** Longer copy for the home page card. */
  blurb: string;
  era: string;
  /** Accent colour, also the first stop of the card's gradient strip. */
  color: string;
  gradient: string;
  duration: string;
  stopCount: number;
}

export const TOUR_META: TourMeta[] = [
  {
    id: 'nurzhol',
    title: 'Nurzhol Axis — Birth of a Capital',
    blurb:
      'Fly the ceremonial boulevard shaped by Kisho Kurokawa\'s award-winning 1998 masterplan: Khan Shatyr, Bayterek, Ak Orda, the Pyramid and the great mosque-square of Independence.',
    era: '1997 – 2017',
    color: '#00AFCA',
    gradient: 'linear-gradient(135deg, #00AFCA, #007A9A)',
    duration: '~6 min',
    stopCount: 6,
  },
  {
    id: 'tselinograd',
    title: 'Tselinograd — The Soviet Grid',
    blurb:
      'The right bank remembers: the railway station of the Virgin Lands settlers, khrushchyovka quarters, the mikrorayon machine, and the river that splits two ideologies.',
    era: '1954 – 1990',
    color: '#4A7BAA',
    gradient: 'linear-gradient(135deg, #4A7BAA, #7B4D9E)',
    duration: '~5 min',
    stopCount: 5,
  },
  {
    id: 'sacred',
    title: 'Sacred & Monumental Astana',
    blurb:
      'Mosques, cathedrals, a pyramid built for every faith, and the museums of a young state writing its own history in marble and glass.',
    era: '1990s – 2022',
    color: '#F5B82E',
    gradient: 'linear-gradient(135deg, #F5B82E, #C47A24)',
    duration: '~5 min',
    stopCount: 5,
  },
  {
    id: 'expo',
    title: 'EXPO & the Future City',
    blurb:
      'The world\'s largest sphere, a kilometre-long mall, a flagship university and Central Asia\'s tallest tower — the city\'s bet on its next chapter.',
    era: '2010 – 2024',
    color: '#8B5CF6',
    gradient: 'linear-gradient(135deg, #8B5CF6, #4A7BAA)',
    duration: '~5 min',
    stopCount: 5,
  },
];

export const TOUR_META_BY_ID: Record<string, TourMeta> = Object.fromEntries(
  TOUR_META.map((tour) => [tour.id, tour]),
);
