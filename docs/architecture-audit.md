# Astana Buildings — code, UX, map, tour, and data audit

Audit date: 2026-07-10

## Outcome

The application now has a validated real-crime-data path, discrete accessible tour
navigation, progressive map camera controls, cross-fading overlays, stronger loading
and error feedback, reduced scroll work, and a darker two-accent visual system. The
production build and ESLint pass cleanly.

## Codebase findings and actions

| Area | Finding | Action |
| --- | --- | --- |
| Routing | Heavy route pages were already split with `React.lazy`. | Preserved. Replaced the inline route-loader styles and keyframes with a reusable, reduced-motion-aware component. |
| Map engine | MapLibre/PMTiles were already isolated in a vendor chunk. | Preserved. Large building and hex datasets continue to stream as PMTiles rather than monolithic GeoJSON. |
| 3D landmarks | The Three.js landmark chunk was dynamically imported, but requested immediately after map load. | It is now requested only at zoom 13+ and during an idle window. City-scale visitors do not download the 621 kB async chunk. |
| Crime overlay | The live UI referenced `crime-astana.geojson`, a 720-record mock. | Deleted the mock and replaced it with lazy worker parsing of `crime-data-ast.geojson`, plus heatmap, cluster, and clickable point layers. |
| Dead code | An unused Newsletter component and stylesheet were not reachable from any route. | Removed. |
| Scroll work | Hero mouse and scroll handlers wrote competing transforms on every event. Navbar also evaluated every scroll event. | Coalesced work into `requestAnimationFrame`, stopped hero work while offscreen, and disabled parallax under reduced motion. |
| Sass | Five deprecated global `lighten()` calls emitted build warnings. | Migrated to `color.adjust`; the build is warning-free apart from intentionally large async vendor chunks. |
| Component consistency | `RouteLoader` used large inline style objects while the rest of the app used modules/tokens. | Moved to a CSS module and semantic status markup. |
| Oversized modules | `MapPage.tsx`, `FilterSidebar.tsx`, and `MapPage.module.scss` remain large orchestration surfaces. | New crime and camera UI were added as isolated modules. A deeper split is recommended below rather than performing a risky mechanical rewrite of mature map behavior. |
| Duplicated data | The home tour catalogue duplicates metadata from `MapPage/tours.ts`. | Kept for this pass to avoid changing public copy; should move to one shared catalogue module. |

## UX uncertainty review

| Screen / mode | Ambiguity found | Resolution |
| --- | --- | --- |
| Home navigation | “Hero” described an implementation section, not a user destination. Keyboard users had no skip route. | Renamed to “Overview” and added a visible-on-focus skip link. |
| Home hero | Pointer and scroll motion could fight and ignored reduced-motion settings. | Unified the transform and added visibility and motion guards. |
| Articles archive | An empty archive still exposed search/filter controls and reported that filters had no matches. | Search is hidden until content exists; the empty state now explains availability and links to the working map. |
| Methodology | Copy was vague (“googling”) and did not describe validation. | Replaced with a concise collection → validation/indexing → visualization pipeline and added public city datasets. |
| Explorer map | Native icon-only zoom/pitch controls stayed visible and offered little context. | Replaced with one labelled “Camera” trigger that progressively reveals zoom, pitch, and reset controls. |
| Thematic overlays | Layer switches had no loading/error state and crime was labelled demo data. | Crime now shows source period, loading size, failure/retry feedback, validated record count, audit details, and a time legend. |
| Crime visualization | Raw mock points implied unsupported categories. Incidents were not individually inspectable. | The real data uses density at city scale, clusters at district scale, and year-colored/severity-sized clickable points with a source-detail panel. |
| Tour direction | Wheel delta was continuous, scroll-down advanced, and one trackpad gesture could skip multiple points. | Scroll-up advances and scroll-down returns. A 36 px threshold plus a 280 ms gesture quiet period limits each gesture to one step. |
| Tour accessibility | Left/right keys existed, but there was no swipe-end threshold, scroll hint, or way to regain map control without exiting. | Added ↑/↓ keys, swipe-up/down, a visible animated next-point hint, numbered progress, Escape/exit, and “Explore” pause mode that restores map gestures. |
| Tour camera | New camera flights could overlap a previous drift animation. | Each step stops the current camera animation before a 2.1 s fly-to; pause invalidates drift and resume re-flies to the selected stop. |
| Reduced motion | Some new motion could have remained active. | Route loader, crime panel, camera-control reveal, tour hint, hero parallax, and tour camera all respect reduced motion. |

## Crime-data validation and rendering pipeline

The source remains `public/crime-data-ast.geojson`; it is fetched only after the
layer is enabled. A dedicated Vite worker parses and normalizes the file away from
the map interaction thread.

Validation result:

| Check | Result |
| --- | --- |
| Source features | 9,346 |
| Geometry | 9,346 valid Points; 0 invalid |
| CRS | `urn:ogc:def:crs:OGC:1.3:CRS84` |
| Bounds | 71.231527–71.714201 E, 51.011822–51.333245 N |
| Missing required year/code/stable ID | 0 |
| Duplicate stable IDs | 0 |
| Coincident date/code/location records | 117 |
| Period | 2015–2022 |

Coincident records are not removed because their stable police record IDs are
distinct; treating spatial coincidence as duplication would discard valid reports.
The runtime deduplicates only repeated stable IDs. `pnpm audit:data` reproduces the
source audit and exits non-zero for invalid geometry, missing required fields, or
duplicate stable IDs.

The visualization deliberately avoids guessing legal categories from opaque crime
codes. Year buckets supply color, the source severity code supplies point size and
heatmap weight, clusters aggregate intermediate zooms, and the details panel exposes
the original date, legal article, code, authority, and record identifier.

## Performance and bundle observations

- Initial page JS remains about 212 kB minified / 67 kB gzip.
- Map page logic is about 167 kB / 47 kB gzip and is route-loaded.
- Crime validation adds a 2.4 kB worker; the 4.4 MB source file is not requested
  until the overlay is enabled.
- MapLibre is a 1.05 MB / 280 kB gzip vendor chunk. It is map-route-only and cached
  independently.
- Three.js/3D landmarks remain a 621 kB / 158 kB gzip async chunk, now deferred to
  a close zoom and idle time.
- Building and hexagon data already use PMTiles (about 6.1 MB and 1.6 MB on disk),
  allowing HTTP range requests instead of full-dataset startup downloads.
- GeoJSON overlay changes now animate paint opacity for 280 ms before hiding layers,
  avoiding abrupt visual swaps without recreating sources.

## Remaining follow-ups

1. Split `FilterSidebar.tsx` into Filters, Charts, Visualization, and Overlay tabs;
   move their styles out of the roughly 3,900-line `MapPage.module.scss`. This is the
   largest remaining maintainability hotspot.
2. Move the home and map tour catalogues to one shared typed data module.
3. Remove or archive unused binary public assets after confirming they are not used
   by an external publishing workflow: `intro.png`, `kabanbay-processed.glb`, and
   `kabanbay-processed.bin`.
4. The 3-30-300 green layer is still explicitly labelled demo data. It should receive
   the same provenance, validation, and error-state treatment before being presented
   as factual analysis.
5. Add browser-level interaction tests for MapLibre. Unit/build validation cannot
   fully prove WebGL layer hit-testing, trackpad gesture grouping, or mobile safe-area
   layout across GPU/browser combinations.

## Verification

- `pnpm lint`
- `pnpm audit:data`
- `pnpm build`

