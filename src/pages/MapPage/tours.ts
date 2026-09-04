/**
 * Guided tour definitions — each stop pairs narrative text with a camera pose.
 * Coordinates are approximate landmark anchors; tweak freely as data improves.
 *
 * Titles, colours, era and duration live in `src/data/tourMeta.ts` so the home
 * page can render tour cards without loading these scripts.
 */

import { TOUR_META_BY_ID, type TourMeta } from '../../data/tourMeta';

export interface TourStop {
  id: string;
  name: string;
  year: string;
  text: string;
  camera: {
    center: [number, number];
    zoom: number;
    pitch: number;
    bearing: number;
  };
}

export type Tour = TourMeta & {
  /** Short pitch shown in the map's tour catalogue. */
  tagline: string;
  stops: TourStop[];
};

export const TOURS: Tour[] = [
  {
    ...TOUR_META_BY_ID.nurzhol,
    tagline:
      'Walk the ceremonial boulevard shaped by Kisho Kurokawa\'s award-winning 1998 masterplan, from the tent to the pyramid.',
    stops: [
      {
        id: 'khan-shatyr',
        name: 'Khan Shatyr',
        year: '2010',
        text:
          'Norman Foster\'s 150 m translucent tent anchors the western end of the Nurzhol axis. Inside its ETFE skin, a beach resort stays at +35 °C while the steppe outside drops below −35 °C — the whole climate story of Astana in one building.',
        camera: { center: [71.4023, 51.1326], zoom: 15.6, pitch: 55, bearing: 110 },
      },
      {
        id: 'golden-towers',
        name: 'The Ministries Corridor',
        year: '2003–2006',
        text:
          'Twin golden-glass cones and rows of ministry blocks line the boulevard. This is the administrative spine of the new capital — built almost from scratch on the left bank of the Ishim, where there was bare floodplain in 1997.',
        camera: { center: [71.4180, 51.1290], zoom: 15.8, pitch: 50, bearing: 90 },
      },
      {
        id: 'bayterek',
        name: 'Bayterek Tower',
        year: '2002',
        text:
          'The tree of life rises to a total height of about 105 metres. Its observation deck sits at the symbolic 97-metre mark — a reference to 1997, the year the capital moved. From the golden orb the entire planned axis reveals itself in a single view.',
        camera: { center: [71.4305, 51.1286], zoom: 16.2, pitch: 60, bearing: 75 },
      },
      {
        id: 'ak-orda',
        name: 'Ak Orda Presidential Palace',
        year: '2004',
        text:
          'The white-and-gold presidential palace closes the boulevard at the river. Its dome and spire deliberately quote both steppe horizon and classical statecraft — the formal terminus of Kurokawa\'s symbolic axis.',
        camera: { center: [71.4460, 51.1259], zoom: 15.9, pitch: 52, bearing: 70 },
      },
      {
        id: 'pyramid',
        name: 'Palace of Peace and Reconciliation',
        year: '2006',
        text:
          'Across the Ishim, Foster\'s 62-metre pyramid hosts the triennial Congress of World Religions. Its apex glows with doves painted on stained glass — the spiritual counterweight to the political palace across the river.',
        camera: { center: [71.4632, 51.1230], zoom: 15.7, pitch: 55, bearing: 45 },
      },
      {
        id: 'hazrat',
        name: 'Hazrat Sultan Mosque',
        year: '2012',
        text:
          'For a decade Central Asia\'s largest mosque, in classic Islamic style with Kazakh ornament. Together with the pyramid and the National Museum it forms Independence Square — the eastern climax of the axis.',
        camera: { center: [71.4711, 51.1255], zoom: 15.9, pitch: 50, bearing: 20 },
      },
    ],
  },
  {
    ...TOUR_META_BY_ID.tselinograd,
    tagline:
      'The right bank remembers: khrushchyovkas, the Virgin Lands campaign, and a city drawn with a ruler.',
    stops: [
      {
        id: 'station',
        name: 'Railway Station Quarter',
        year: '1960s',
        text:
          'Every Tselinograd story starts here. Hundreds of thousands of Virgin Lands settlers stepped off trains at this station from 1954 onward. The city they built spreads south in a near-perfect orthogonal grid.',
        camera: { center: [71.4079, 51.1948], zoom: 14.8, pitch: 45, bearing: 170 },
      },
      {
        id: 'beibitshilik',
        name: 'Beibitshilik Street',
        year: '1955–1975',
        text:
          'The old main street. Walk it today and the Soviet grid is still under your feet: parallel blocks, identical setbacks, five-storey panel housing. Turn on the year-built layer and this district lights up in Khrushchev green and Brezhnev blue.',
        camera: { center: [71.4135, 51.1755], zoom: 15.5, pitch: 48, bearing: 185 },
      },
      {
        id: 'mikrorayon',
        name: 'The Mikrorayon Machine',
        year: '1964–1984',
        text:
          'The planning unit of the USSR: 6–12 thousand people, a school, a kindergarten and a bakery within walking distance, no fences. Series 1-464 panels here are identical to blocks in Novosibirsk, Kyiv and Baku. Economical. Fast. Identical.',
        camera: { center: [71.4225, 51.1680], zoom: 15.8, pitch: 55, bearing: 220 },
      },
      {
        id: 'old-square',
        name: 'Old City Square',
        year: '1963',
        text:
          'The civic heart of Tselinograd, ringed by the late-modernist public buildings of the Virgin Lands boom. After 1997 the government moved across the river — and this square quietly became a museum of a different state.',
        camera: { center: [71.4160, 51.1628], zoom: 15.9, pitch: 50, bearing: 250 },
      },
      {
        id: 'river-divide',
        name: 'Two Cities, One River',
        year: '1997 →',
        text:
          'From the embankment the whole story is visible at once: the Soviet grid behind you, the glass axis of the new capital in front. The Ishim is not just a river — it is the line between two ideas of what a city is for.',
        camera: { center: [71.4280, 51.1480], zoom: 14.6, pitch: 60, bearing: 195 },
      },
    ],
  },
  {
    ...TOUR_META_BY_ID.sacred,
    tagline:
      'Mosques, cathedrals, a pyramid for all faiths and the museums of a young state writing its history.',
    stops: [
      {
        id: 'grand-mosque',
        name: 'Astana Grand Mosque',
        year: '2022',
        text:
          'One of the largest mosques in the world, opened in 2022: its main dome rises about 83.2 metres and four minarets reach 130 metres above the left-bank skyline. Its scale states plainly that the young capital intends to be a spiritual center, not just an administrative one.',
        camera: { center: [71.3946, 51.1075], zoom: 15.4, pitch: 52, bearing: 60 },
      },
      {
        id: 'hazrat-2',
        name: 'Hazrat Sultan Mosque',
        year: '2012',
        text:
          'White marble, turquoise domes, and capacity for 10,000 worshippers. Named after the Sufi master Khoja Ahmed Yasawi, it bridges the medieval sacred architecture of Turkestan with the new capital\'s monumental ambitions.',
        camera: { center: [71.4711, 51.1255], zoom: 16.0, pitch: 50, bearing: 320 },
      },
      {
        id: 'pyramid-2',
        name: 'Palace of Peace and Reconciliation',
        year: '2006',
        text:
          'A pyramid built for every faith at once — its congress hall hosts leaders of world religions every three years. Geometry as diplomacy: no dome, no spire, no minaret, just a universal form.',
        camera: { center: [71.4632, 51.1230], zoom: 16.0, pitch: 58, bearing: 130 },
      },
      {
        id: 'museum',
        name: 'National Museum of Kazakhstan',
        year: '2014',
        text:
          'The largest museum in Central Asia, holding the Golden Man and seven halls of national history. Its blue-glass massing closes Independence Square — the state\'s official answer to the question of who Kazakhs are.',
        camera: { center: [71.4699, 51.1196], zoom: 15.8, pitch: 48, bearing: 0 },
      },
      {
        id: 'cathedral',
        name: 'Assumption Cathedral',
        year: '2009',
        text:
          'The main Orthodox cathedral of Kazakhstan, gold onion domes on the old right bank. Its presence beside mosques, the pyramid and Soviet squares is the city\'s religious plurality made visible in stone.',
        camera: { center: [71.3987, 51.1788], zoom: 15.9, pitch: 45, bearing: 90 },
      },
    ],
  },
  {
    ...TOUR_META_BY_ID.expo,
    tagline:
      'The 2017 World Expo left behind a sphere, a university district and the seeds of a tech quarter on the southern steppe.',
    stops: [
      {
        id: 'nur-alem',
        name: 'Nur Alem Sphere',
        year: '2017',
        text:
          'The world\'s largest spherical building — 80 metres of glass holding the Museum of Future Energy. Built as the centerpiece of EXPO 2017 "Future Energy", it turned a patch of southern steppe into the city\'s most futuristic district overnight.',
        camera: { center: [71.4165, 51.0890], zoom: 15.8, pitch: 55, bearing: -30 },
      },
      {
        id: 'expo-district',
        name: 'The EXPO Quarter',
        year: '2014–2017',
        text:
          'Pavilions, congress halls and a covered city-within-a-city built for the three-month world fair. After the visitors left, the quarter was handed to the Astana International Financial Centre and a technopark — an experiment in giving an expo a second life.',
        camera: { center: [71.4135, 51.0855], zoom: 15.2, pitch: 48, bearing: 20 },
      },
      {
        id: 'mega-silk-way',
        name: 'Mega Silk Way',
        year: '2017',
        text:
          'A kilometre-long wave of steel and glass beside the EXPO grounds — one of Central Asia\'s largest malls. Like Khan Shatyr before it, it answers the steppe climate the Astana way: build the street indoors.',
        camera: { center: [71.4040, 51.0900], zoom: 15.5, pitch: 50, bearing: 80 },
      },
      {
        id: 'nazarbayev-university',
        name: 'Nazarbayev University',
        year: '2010',
        text:
          'The flagship English-language research university, its kilometre-long atrium pointing straight at the EXPO sphere. The campus anchors the city\'s bet that the next chapter is written not in oil, but in graduates.',
        camera: { center: [71.3917, 51.0905], zoom: 15.0, pitch: 45, bearing: -60 },
      },
      {
        id: 'abu-dhabi-plaza',
        name: 'Abu Dhabi Plaza',
        year: '2022',
        text:
          'At 311 metres, the tallest building in Central Asia closes the skyline between the EXPO district and the government axis. A Gulf-financed exclamation mark on twenty-five years of building a capital from nothing.',
        camera: { center: [71.4205, 51.1170], zoom: 15.6, pitch: 58, bearing: 150 },
      },
    ],
  },
];
