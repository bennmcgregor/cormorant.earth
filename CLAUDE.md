# Project: cormorant.earth (Quartz static site)

## Quick orientation

This is a customized [Quartz 4](https://quartz.jzhao.xyz/) static site. The entry points for layout and customization are `quartz.layout.ts` and `quartz.config.ts`. Don't explore the node_modules or public directories.

## Key file map
| What | Where |
|------|-------|
| Layout config | `quartz.layout.ts` |
| Site config | `quartz.config.ts` |
| CSS variables + grid | `quartz/styles/variables.scss` |
| User CSS overrides | `quartz/styles/custom.scss` |
| Page template | `quartz/components/renderPage.tsx` |
| Component registry | `quartz/components/index.ts` |
| Custom components | `quartz/components/TopNav.tsx`, `MapLink.tsx`, `MapCanvas.tsx` |
| Map page | `content/map.md` (minimal — MapCanvas does the work) |
| Map canvas z-index | `quartz/components/styles/mapcanvas.scss` — `#map-canvas-root` is `z-index: 100` |

## Component authoring

- All custom components live in `quartz/components/`. Export from `quartz/components/index.ts` and reference via `Component.Foo()` in `quartz.layout.ts`.
- Constructor pattern required: `export default (() => MyComponent) satisfies QuartzComponentConstructor`
- SCSS files go in `quartz/components/styles/`, import variables with `@use "../../styles/variables.scss" as *`
- Attach CSS/scripts: `MyComponent.css = style`, `MyComponent.afterDOMLoaded = script`
- The `Flex` component (already available) correctly aggregates `css`/`afterDOMLoaded` from all wrapped children — safe to use in `afterBody`.

## Page-specific CSS hook
`<body data-slug="...">` is set on every page by renderPage.tsx. Use `body[data-slug="map"] { ... }` etc. for page-specific overrides without touching component code.

## Search
The search script (`quartz/components/scripts/search.inline.ts`) handles **multiple** `.search` elements on the same page — it calls `setupSearch()` per element. Ctrl+K keyboard shortcut fires once per instance, so having two search components on one page means the shortcut opens both overlays. For a delegate-click approach to work, the target `.search-button` must already have its listener attached (i.e., the real Search component must be in the DOM first).

## Layout system — critical gotchas

### CSS grid lives on `#quartz-body`, not `.page`
The grid is defined on `.page > #quartz-body`. The grid columns/rows/areas are driven by SCSS maps in `quartz/styles/variables.scss` (`$desktopGrid`, `$tabletGrid`, `$mobileGrid`). The left sidebar already spans all grid rows. The center column width is `auto` — article text is capped via `#quartz-body article { max-width: $pageWidth }` in `custom.scss`.

### Non-desktop padding
On non-desktop screens the grid uses `padding: 0 1rem`. The `<header>` (outside the grid) uses a matching media query in `topnav.scss` via `@media all and not ($desktop)` — use that same variable rather than hardcoding `800px`/`1200px`.