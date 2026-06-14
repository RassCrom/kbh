# Astana Building History

> TODO: Add a one-sentence project description and the main value proposition.

[Live Demo](TODO) · [Competition Entry](TODO) · [Issue Tracker](TODO)

<!-- TODO: Add a hero screenshot or animated preview.
![Astana Building History map](docs/images/hero.jpg)
-->

## Overview

Astana Building History is an interactive web cartography project that explores the architectural and urban development of Astana through building footprints, construction years, thematic layers, guided tours, and narrative stories.

TODO: Replace this paragraph with the final project overview.

## Table of Contents

- [Project Goals](#project-goals)
- [Key Features](#key-features)
- [Competition Submission](#competition-submission)
- [Map Layers](#map-layers)
- [Data and Methodology](#data-and-methodology)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Content Guide](#content-guide)
- [Quality and Accessibility](#quality-and-accessibility)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Credits](#credits)
- [License](#license)

## Project Goals

- TODO: Explain the primary cartographic question.
- TODO: Describe the intended audience.
- TODO: Explain what makes the project different from existing maps.
- TODO: Define the expected educational or research impact.

## Key Features

- Interactive 2D and 3D MapLibre map of Astana buildings.
- Construction timeline and animated city-growth playback.
- Historical-era, elevation, land-surface-temperature, building-use, and UHI visualizations.
- Historical reconstruction versus modern map swipe comparison.
- Guided landmark and urban-history tours.
- Building attribute panels and mobile tap previews.
- Narrative stories and contextual content.
- Responsive desktop and mobile interface.

## Competition Submission

### Entry Details

| Field | Value |
| --- | --- |
| Competition | TODO |
| Category | TODO |
| Submission URL | TODO |
| Submission date | TODO |
| Team / author | TODO |
| Contact | TODO |

### Cartographic Intent

TODO: Describe the visual hierarchy, map language, color choices, interaction design, and the story the map is intended to communicate.

### Innovation

TODO: Explain the technically or cartographically innovative aspects of the project.

### Jury Walkthrough

1. TODO: Add the recommended starting point.
2. TODO: Add the key interaction or layer to demonstrate.
3. TODO: Add the guided tour or story to open.
4. TODO: Add the final comparison or conclusion.

## Map Layers

| Layer / Mode | Purpose | Main attributes | Source |
| --- | --- | --- | --- |
| Year Built | Shows construction periods and historical eras | `year_int`, `year_str` | TODO |
| Elevation | Shows terrain elevation beneath buildings | `dem_mean` | TODO |
| Summer Heat | Shows mean summer land surface temperature | `lst_1mean` | TODO |
| Building Use | Shows primary building function | `type` | TODO |
| Heat × Age | Combines building age and summer LST | `year_int`, `lst_1mean` | TODO |
| Historical Comparison | Compares buildings up to 1990 with the modern city | `year_int` | TODO |
| District Borders | Provides administrative context | `district` | TODO |
| Additional Overlays | TODO: Describe graffiti, green-rule, crime, or future layers | TODO | TODO |

## Data and Methodology

### Data Sources

| Dataset | Provider | Coverage / date | License | Processing notes |
| --- | --- | --- | --- | --- |
| Building footprints | TODO | TODO | TODO | TODO |
| Construction years | TODO | TODO | TODO | TODO |
| Building heights | TODO | TODO | TODO | TODO |
| Elevation / DTM | TODO | TODO | TODO | TODO |
| Land surface temperature | TODO | TODO | TODO | TODO |
| District boundaries | TODO | TODO | TODO | TODO |

### Processing Workflow

1. TODO: Describe source collection.
2. TODO: Describe cleaning and normalization.
3. TODO: Describe spatial joins and derived attributes.
4. TODO: Describe PMTiles or vector-tile generation.
5. TODO: Describe validation and quality-control steps.

### Attribute Dictionary

| Attribute | Type | Description | Example |
| --- | --- | --- | --- |
| `year_int` | Number | Normalized construction year | `2007` |
| `year_str` | String | Original or ranged construction year | `2005-2008` |
| `b_height` | Number | Building height in metres | `42.5` |
| `district` | String | District code | `Sk` |
| `type` | String | Building-use code | `rc` |
| `dem_mean` | Number | Mean ground elevation in metres above sea level | `348.2` |
| `lst_1mean` | Number | Mean summer land surface temperature in °C | `41.7` |
| `arch_style` | String | Architectural style, where available | TODO |
| `construction_company` | String | Builder or developer, where available | TODO |

### Limitations

- TODO: Document missing or uncertain construction years.
- TODO: Explain the meaning of reconstructed historical views.
- TODO: Document temporal and spatial limitations of LST data.
- TODO: Explain synthetic, demo, or incomplete layers.
- TODO: Add a confidence or uncertainty statement.

## Technology Stack

- **Frontend:** React 19, TypeScript
- **Mapping:** MapLibre GL JS, PMTiles
- **Styling:** Sass / CSS Modules
- **Build Tool:** Vite
- **Routing:** React Router
- **3D:** Three.js
- **Analytics / Hosting:** Vercel

## Getting Started

### Prerequisites

- Node.js: TODO: Specify the supported version.
- npm or pnpm.
- A modern browser with WebGL support.

### Installation

```bash
git clone https://github.com/RassCrom/kbh.git
cd kbh
npm install
```

### Environment Variables

Create a local `.env` file when required.

```dotenv
# TODO: Document required public environment variables.
```

Do not commit secrets or private access tokens.

### Run Locally

```bash
npm run dev
```

Open the local URL printed by Vite.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local Vite development server |
| `npm run build` | Type-check and create a production build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build locally |

## Project Structure

```text
.
├── public/                       # Public datasets, PMTiles, audio, and static assets
├── scratch/                      # One-off processing and generation scripts
├── src/
│   ├── components/               # Homepage and shared UI sections
│   ├── pages/
│   │   ├── ArticlesPage/         # Article catalogue
│   │   ├── MapPage/              # Interactive map, layers, tours, and controls
│   │   ├── NotFoundPage/         # Fallback route
│   │   └── StoryPage/            # Narrative stories and scrollytelling
│   ├── styles/                   # Global styles, tokens, and mixins
│   ├── App.tsx                   # Routes and page composition
│   └── main.tsx                  # Application entry point
├── index.html
├── package.json
├── vercel.json
└── vite.config.ts
```

## Architecture

### Map Lifecycle

TODO: Explain how `useMapInit`, MapLibre sources, layers, filters, and UI state work together.

### Data Delivery

TODO: Explain where PMTiles and GeoJSON files are stored, how they are generated, and how cache/version changes are managed.

### Main Routes

| Route | Purpose |
| --- | --- |
| `/` | Project landing page |
| `/map` | Main interactive map |
| `/articles` | Article catalogue |
| `/stories/soviet-grid` | Soviet-grid narrative story |
| `/stories/bayterek` | Bayterek narrative story |

## Content Guide

### Adding a Guided Tour

1. Add the tour definition in `src/pages/MapPage/tours.ts`.
2. Add any narration assets under `public/audio/tours/<tour-id>/`.
3. Add or update the homepage tour card.
4. Verify deep linking with `/map?tour=<tour-id>`.

### Adding a Story

1. TODO: Document story component creation.
2. TODO: Document route registration.
3. TODO: Document article-card publication.
4. TODO: Document image attribution requirements.

### Editorial Standards

- Distinguish verified facts from interpretation.
- Include dates and dimensions with sources.
- Avoid unsupported absolute claims.
- State when a map view is reconstructed or approximate.
- TODO: Add citation and transliteration standards.

## Quality and Accessibility

Before submitting or deploying:

```bash
npm run lint
npm run build
```

Checklist:

- [ ] Keyboard navigation works for major controls.
- [ ] Mobile text and controls remain readable.
- [ ] Map layers have understandable legends.
- [ ] Colors maintain sufficient contrast.
- [ ] All factual claims have been reviewed.
- [ ] Data sources and limitations are documented.
- [ ] Desktop and mobile flows have been browser-tested.

## Deployment

The repository contains a `vercel.json` configuration for Vercel deployment.

TODO: Document the production project, domain, deployment workflow, and required environment variables.

## Roadmap

- [ ] TODO: Add archival georeferenced maps.
- [ ] TODO: Add data-confidence indicators.
- [ ] TODO: Publish final narrative stories.
- [ ] TODO: Add multilingual content.
- [ ] TODO: Add final competition deliverables.

## Contributing

TODO: Define the contribution workflow, branch naming, review requirements, and data-submission process.

Suggested workflow:

1. Create a focused branch.
2. Make and verify the change.
3. Run lint and build checks.
4. Open a pull request with screenshots for visual changes.

## Credits

### Team

| Name | Role | Contact |
| --- | --- | --- |
| TODO | TODO | TODO |

### Data and Libraries

- TODO: List data providers and licenses.
- [MapLibre GL JS](https://maplibre.org/)
- [PMTiles](https://protomaps.com/docs/pmtiles/)
- [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)

## License

TODO: Add the software license and separate data/content licensing terms.
