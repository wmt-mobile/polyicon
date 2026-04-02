# Changelog

All notable changes to this project will be documented in this file.

## [0.1.5] — 2026-04-02

### Fixed
- Fixed an issue in `stroke-linecap="round"` conversion where inward SVG arcs caused generated icons (like `close.svg`) to render redundantly or blank instead of matching their outline.

## [0.1.4] — 2026-04-02

### Added
- Stroke-to-fill conversion (`stroke_to_fill.js`) — stroked SVG paths (e.g. line icons from Figma/Heroicons) are now automatically converted to filled outlines for font generation, with support for round, square, and butt linecaps

### Fixed
- Unified shape extraction regex to correctly match both self-closing and paired SVG element tags in a single pass — the previous `||` alternation silently dropped closing tags from paired elements

## [0.1.3] — 2026-04-02

### Fixed
- Blank icon generation for SVGs using non-path elements (`<circle>`, `<ellipse>`, `<rect>`, `<polygon>`, `<polyline>`, `<line>`) — previously only `<path>` elements were extracted, silently dropping all other shapes
- White background rect stripping no longer removes closing tags from non-white rects

## [0.1.2] — 2026-03-18

### Fixed
- `svgtofont` v6 is ESM-only — switched from `require()` to dynamic `import()` in `run_svgtofont.js` to resolve "svgtofont is not a function" error

## [0.1.1] — 2026-03-18

### Added
- `.gitignore` — excludes `node_modules/` and tmp build dirs

### Changed
- `svgtofont` upgraded `4.x` → `6.5.1`
- `fast-xml-parser` upgraded `4.x` → `5.5.6` (fixes CVE-2026-26278)
- `CHANGELOG.md` included in published npm package via `files` field

## [0.1.0] — 2026-03-18

### Added
- Interactive HTML preview (`polyicon-preview.html`) generated at the root of the output folder alongside fonts and CSS
  - Live search filter by icon name
  - Click any icon card to copy its class name to clipboard
  - Displays unicode code point for each icon
- Programmatic API — `const { buildIcons } = require('polyicon')`
- `"main"` field in `package.json` pointing to `src/index.js`
- Success log printed after `polyicon generate` completes

### Fixed
- `write_polyicon_config.js`: replaced `charCodeAt(0)` with `codePointAt(0)` for correct unicode handling above U+FFFF

### Changed
- `svgtofont` upgraded `4.x` → `6.5.1` — drops `del`/`node-gyp` chain, eliminating all deprecated transitive dependencies (`rimraf@3`, `glob@7`, `tar@6`, `npmlog`, `gauge`, `are-we-there-yet`, `inflight`)
- `fast-xml-parser` upgraded `4.x` → `5.5.6` — fixes high-severity CVE-2026-26278 (numeric entity expansion bypass)
- `npm audit`: 0 vulnerabilities, 0 deprecation warnings

## [0.0.1] — initial release

- SVG → icon font pipeline (`eot`, `svg`, `ttf`, `woff`, `woff2`)
- Generated CSS with configurable font URL prefix (`importFontsPath`)
- JS/TS types file (`IconTypes`)
- Fontello-compatible `config.json` output
- `polyicon init` and `polyicon generate` CLI commands
- `.polyiconrc` config file support
