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
];
