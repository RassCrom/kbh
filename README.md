# Astana Building History

> TODO: Add a one-sentence project description and the main value proposition.

[Live Demo](https://kbh-nu.vercel.app)

TODO: Add a hero screenshot or animated preview.
![Astana Building History map](/public/intro.png)


## Overview

Astana building history project is an interactive web map showing Astana through buildings in many ways. It combines urban history, culture, design, and climate challenges.

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

- Visualizing heavy building data on the web and make it open for anyone
- Architects, public policy makers, map enthusiasts
- The project combine unique features that are rarely can be seen in the experience of web maps. It shows data that is hard to find for Astana (or do not exist at all) — buildings age, construction companies, urban greenness, and many other
- Making building data available

## Key Features

- Interactive 2D and 3D MapLibre map of Astana buildings.
- Construction timeline and animated city-growth playback.
- Historical-era, elevation, land-surface-temperature, building-use, and UHI visualizations.
- Historical reconstruction versus modern map swipe comparison.
- Guided landmark and urban-history tours.
- Building attribute panels and mobile tap previews.
- Narrative stories and contextual content.
- Responsive desktop and mobile interface.
- UPCOMING: Crime data and urban green (rule 3-30-300: 3 trees, 30% of green cover and 300 meters till park)
- UPCOMING: Art of Astana through Murals, graffiti, and other street art
- UPCOMING: More guided tours, improving existing tours
- UPCOMING: More building data (age, construction company, etc.)
- UPCOMING: Storytelling about Astana building heritage

## Map Layers

| Layer / Mode | Purpose | Main attributes | Source |
| --- | --- | --- | --- |
| Year Built | Shows construction periods and historical eras | `year_int`, `year_str`
| Elevation | Shows terrain elevation beneath buildings | `dem_mean`
| Summer Heat | Shows mean summer land surface temperature | `lst_1mean`
| Building Use | Shows primary building function | `type`
| Heat × Age | Combines building age and summer LST | `year_int`, `lst_1mean`
| Historical Comparison | Compares buildings up to 1990 with the modern city | `year_int`
| District Borders | Provides administrative context | `district`

## Data and Methodology

### Data Sources

| Dataset | Provider | Coverage / date | License | Processing notes |
| --- | --- | --- | --- | --- |
| Building footprints | OSM and manual digitizing | Updated: June 2026 | Open Database License (ODbL) | none |
| Construction years | Manual data aggregation | Updated: June 2026 | N/A | none |
| Building heights | none | none | none | none |
| Elevation / DTM | FABDEM | 2015 year | N/A | University of Bristol and Fathom |
| Land surface temperature | Landsat 8 and 9 | 2015-2025 | N/A | none |
| District boundaries | OSM | 2025 year | Open Database License (ODbL) | none |

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
| `arch_style` | String | Architectural style, where available | - |
| `construction_company` | String | Builder or developer, where available | - |

### Limitations

- TODO

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

- Node.js: v22+.
- npm or pnpm.
- A modern browser with WebGL support.

### Installation

```bash
git clone https://github.com/RassCrom/kbh.git
cd kbh
npm install
```

### Run Locally

```bash
npm run dev
```

Open the local URL printed by Vite.

## Available Scripts

| Command | Description |
| --- | --- |
| `pnpm  dev` | Start the local Vite development server |
| `pnpm  build` | Type-check and create a production build |
| `pnpm  lint` | Run ESLint |
| `pnpm  preview` | Preview the production build locally |

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

### Data Delivery

QGIS is used for data collection and pre web visualization in gpkg format. For web production, gpkg converts to geojson, then through tippecanoe geojson is being converted to PMTiles.

### Main Routes

| Route | Purpose |
| --- | --- |
| `/` | Project landing page |
| `/map` | Main interactive map |
| `/articles` | Article catalogue |

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
| Alikhan Beisenbayev | Development, Map design, Data collection | https://alinbeisenbayev.pages.dev/ |
| Tolegen Akynzhanov | Data collection, Visualization ideas | https://www.linkedin.com/in/tolegen-akynzhanov/ |

### Data and Libraries

- [MapLibre GL JS](https://maplibre.org/)
- [PMTiles](https://protomaps.com/docs/pmtiles/)
- [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)

## License

TODO: Add the software license and separate data/content licensing terms.
