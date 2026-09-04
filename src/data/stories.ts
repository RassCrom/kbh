/**
 * The published scrollytelling stories, shared by the home page preview
 * section and the /articles archive so the two can't drift apart.
 * Each entry's `route` must match a <Route> in App.tsx.
 */

export interface Story {
  id: string;
  route: string;
  era: string;
  readTime: string;
  title: string;
  excerpt: string;
  /** Optional cover image; entries without one fall back to an icon tile. */
  image?: string;
}

export const STORIES: Story[] = [
  {
    id: 'soviet-grid',
    route: '/stories/soviet-grid',
    era: '1960s',
    readTime: '8 min read',
    title: 'The Soviet Grid: How Tselinograd Was Planned',
    excerpt:
      'Before becoming Astana, this city was Tselinograd — a Soviet agricultural hub laid out with a ruler. Scroll the map through its grid, era by era.',
  },
  {
    id: 'bayterek',
    route: '/stories/bayterek',
    era: '2000s',
    readTime: '12 min read',
    title: 'Rise of Bayterek: Symbolism in Steel and Glass',
    excerpt:
      "A 105-metre monument at the heart of Astana is less a building than a declaration. How a Kazakh creation myth became Central Asia's most recognisable silhouette.",
  },
];
