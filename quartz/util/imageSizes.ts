// SHARED SIZING — keep in sync with quartz/styles/_variables.scss

// CSS pixels at which a map tile renders at zoom = 1.
// Mirror of $mapTileDisplayWidth in _variables.scss.
export const MAP_TILE_DISPLAY_WIDTH = 150

// Target device pixel ratio (most modern phones are 2; some are 3).
export const DPR_TARGET = 2

// React Flow's default maxZoom is 2; we pass this constant through to the
// ReactFlow `maxZoom` prop in mapcanvas.inline.ts so the encoding math and
// the canvas behavior stay in sync. Bump this to allow deeper zoom-in
// (and to encode tiles at higher resolution).
export const MAP_MAX_ZOOM = 2

// Encoded width caps.
export const CONTENT_MAX_WIDTH = 800
export const MAP_TILE_MAX_WIDTH =
    MAP_TILE_DISPLAY_WIDTH * MAP_MAX_ZOOM * DPR_TARGET // 600

export const WEBP_QUALITY = 85

// Video compression settings — applied to map_image videos at build time.
// Changes auto-bust the cache.
export const VIDEO_CRF = 28      // 18=near-lossless, 28=good lossy, 34=aggressive
export const VIDEO_FPS = 24