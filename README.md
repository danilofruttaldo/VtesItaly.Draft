# vtesItaly.Draft

Interactive web gallery for a VTES Draft Cube: 120 crypt + 262 library cards (382 total) with search, filters, card detail, OCR-detected DRAFT clause and mobile-friendly layout.

## Gallery (GitHub Pages)

`index.html` is a single static page that displays all cards in one grid.

**Filters & search**

- search by name, text, discipline, type, clan
- Crypt / Library kind toggles (segmented)
- searchable combobox for clan, library type, and sort — with typeahead
- sort: name A→Z / Z→A, copies, capacity (crypt), rarity (library)
- Common / Uncommon / Rare rarity toggles
- active-filter chips above the grid (one click to remove)
- filter state persisted in the URL query string (shareable views)
- Reset button appears only when filters are active

**Card detail (modal)**

- image with click / double-tap to zoom
- tags, KRCG card text, DRAFT: clause when present
- navigation: arrows, keyboard (← →), touch swipe left/right, prev/next preload
- swipe down or tap outside to close
- Web Share button (Web Share API with clipboard fallback and toast)
- deep-link to a single card via URL hash (`#CardName`); the parser (`decodeHashName` in `assets/core.mjs`) distinguishes "no hash" from "malformed hash" and surfaces the latter as a console warning so testers spot broken share links instead of hitting a silent no-op
- browser back button closes the modal (`pushState` / `popstate`)
- focus trap (Tab stays inside the dialog)
- styled discipline badges (`[aus]`, `[PRE]`, ...) rendered as colored pills

**Mobile & accessibility**

- bottom-sheet filter drawer on phones (tap "Filters" to open) with backdrop
- 44×44px minimum touch targets, iOS-safe font-size on inputs (no zoom)
- `env(safe-area-inset-*)` respected for notch / home-indicator devices
- `@media (hover: hover)` guards prevent sticky hover on touch devices
- card-name overlay always visible on touch, hover-revealed on desktop
- landscape-mobile modal layout keeps image + text side-by-side
- sticky topbar, dark theme, fully responsive (desktop / tablet / mobile / small phones)
- `prefers-reduced-motion` respected

**Installable (PWA)**

- `manifest.webmanifest` allows install to home screen / desktop
- `sw.js` service worker: network-first for HTML, `app.js`, `styles.css` and `cards.json`; cache-first for images/icons/manifest — works offline after first visit
- Strict Content-Security-Policy meta in `index.html` (`script-src 'self'`, `style-src 'self'` — no inline JS, no inline styles, `object-src 'none'`, `frame-ancestors 'none'`)

Data comes from `data/cards.json` (text + metadata) and `images/**/*.webp`.

### Publish on GitHub Pages

Deploy runs via `.github/workflows/deploy.yml` on every push to `main` (or manual `workflow_dispatch`). The workflow has three sequential jobs sharing a single `_site/` artifact:

1. **`ci`** — installs dev tooling (`npm ci`, `pip install ruff`, both cached) and runs `npm audit --omit=dev` → `lint` → `format:check` → `ruff check` → `ruff format --check` → `npm run test:coverage` (JS via `node --test` wrapped by c8 + DOM smoke + axe-core a11y + Python unittest, with c8 thresholds gated at 65/60/70/65 in `package.json#c8`) as a gate. Then `scripts/stamp-sw.mjs` rewrites `VERSION` in `sw.js` to a UTC timestamp so cache-first assets (images, icons, manifest) are invalidated on each release; `scripts/stage-site.mjs` copies only the runtime files under `_site/` (HTML, `robots.txt`, `manifest.webmanifest`, `sw.js`, `assets/`, `data/cards.json`, `images/{crypt,library-*}` — originals + `*-thumb.webp`). Build scripts, Python sources, `docs/`, `requirements.txt`, `data/krcg_vtes.json`, `data/draft_ocr.json`, `data/draft_overrides.json` and `images/scan/` are **not** published. Finally `npm run minify` shrinks `app.js` / `core.mjs` / `styles.css` / `sw.js` in the staged copy (esbuild), a 60 MB size guard runs, and `_site/` is uploaded as an artifact.
2. **`lighthouse`** — depends on `ci`. Downloads the `_site/` artifact and runs Lighthouse CI from `.lighthouserc.json` against it. Accessibility threshold blocks; perf/SEO/best-practices warn.
3. **`deploy`** — depends on both `ci` and `lighthouse`, and only on push (not on PR). Downloads the same `_site/` artifact and publishes it to GitHub Pages. No re-build.

Workflow-level `concurrency: pages-${{ github.ref }}` is per-ref so a Dependabot burst of PRs doesn't cancel each other in the queue; pushes to `main` collapse to a single group. `permissions: contents: read` scopes the default token to the minimum (the `deploy` job elevates to `pages: write` + `id-token: write` only for itself). Single workflow per push: one CI gate, one Lighthouse audit, one deploy — never duplicated.

One-time repo setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**. The site is served at `https://<user>.github.io/<repo>/`.

### Run locally

In VS Code press **F5** ("Sito locale (dev)"): it starts the dev server quietly
(logs in the Debug Console, no terminal) and opens the default browser. Saving a
file live-reloads the page. The profile lives in `.vscode/launch.json` (local,
git-ignored).

or manually:

```
npm run dev        # @web/dev-server on http://localhost:8765 (watch + live-reload)
```

Rebuilding `data/cards.json` stays a separate step (`python scripts/build_site_data.py`).

### JS tooling (lint / format / test)

The site itself ships no JS dependencies. The `package.json` is dev-only — it
provides the hooks that CI and the pre-commit hook run.

```
npm install                            # one-time (JS dev tooling)
pip install -r requirements-dev.txt    # one-time (Python lint/format)
npm test                               # node --test (core.mjs) + jsdom DOM smoke + axe-core a11y + python unittest
npm run test:coverage                  # same suite under c8 with thresholds gated (65/60/70/65)
npm run lint                           # ESLint over assets/, sw.js, scripts/*.mjs, tests/
npm run format                         # Prettier write
npm run format:check                   # Prettier check
npm run minify                         # esbuild over _site/ (use only against a staged copy)
python -m ruff check scripts/ tests/   # Python lint
python -m ruff format scripts/ tests/  # Python format
```

Enable the pre-commit gate (prettier + eslint + ruff + tests) once per clone:

```
git config core.hooksPath .githooks
```

## Layout

```
/
├── index.html, .nojekyll, requirements.txt
├── manifest.webmanifest                # PWA manifest (installable)
├── sw.js                               # service worker (offline cache)
├── .github/workflows/deploy.yml        # CI: bump sw.js VERSION + deploy Pages
├── assets/
│   ├── app.js, styles.css              # gallery logic & styles (extracted from HTML)
│   └── favicon.ico, apple-touch-icon.png, vtes.svg
├── data/
│   ├── cards.json                      # gallery data (consumed by index.html)
│   ├── krcg_vtes.json                  # cached KRCG dataset (build input, gitignored)
│   ├── draft_ocr.json                  # raw easyocr output per image (build input)
│   └── draft_overrides.json            # manual DRAFT-clause corrections (build input)
├── docs/
│   └── DRAFT_OPTION.md                 # report: cards with/without DRAFT clause
├── images/
│   ├── crypt/                          # 120 crypt images (.webp)
│   ├── library-common/                 # 102
│   ├── library-uncommon/               # 79
│   ├── library-rare/                   # 80
│   └── scan/                           # original user photos (legacy source, gitignored)
└── scripts/                            # Python pipeline
```

Cards with the DRAFT: clause use scans from the draft-era sets (KMW, LoB, LotN, 3E, SoC, NoR, TR, KoT, EK, HttB). Cards without a DRAFT-era reprint use the most recent KRCG scan available (Fifth Edition, New Blood, etc.).

## Scripts (`scripts/`)

- **`detect_draft_ocr.py`** - run easyocr on every `images/library-*/*.webp` to detect the **DRAFT:** clause; writes `data/draft_ocr.json`. Idempotent; pass `--force` to redo.
- **`build_draft_report.py`** - generate `docs/DRAFT_OPTION.md` from `data/cards.json`.
- **`build_site_data.py`** - rebuild `data/cards.json` from the source xlsx (not in repo) joined with KRCG data + DRAFT OCR + manual overrides. Requires the original `data/Draft Cube.xlsx`; restore it locally if you need to regenerate. Pass `--refresh-krcg` to force re-download the KRCG cache.
- **`refresh_non_draft_images.py`** - for cards without DRAFT clause, replace the local image with the most recent KRCG printing.
- **`convert_to_webp.py`** - convert all JPGs in `images/{crypt,library-*}` to WebP and update `cards.json` paths.
- **`build_og_image.py`** - regenerate `assets/og-image.png` (1200×630 Open Graph preview). Run when branding changes.
- **`build_thumbnails.py`** - emit `<name>-thumb.webp` (320 px wide) next to every card image, consumed by the grid `srcset`. Idempotent — skips thumbs newer than their source.
- **`ocr_cleanup.py`** - pure `clean_draft_snippet()` module shared by `build_site_data.py` and `tests/test_ocr_cleanup.py`. Do not import openpyxl/PIL from here.
- **`minify.mjs`** (Node) - minify `app.js` / `core.mjs` / `styles.css` / `sw.js` in the staged `_site/` copy via esbuild. CI runs it after staging; do not point it at the source `assets/` directory.
- **`stamp-sw.mjs`** (Node) - rewrite `const VERSION` in `sw.js` to a UTC timestamp (`YYYYMMDD-HHMMSS`). CI runs it before staging so each release invalidates cache-first assets. Fails loud if the `VERSION` line can't be matched.
- **`stage-site.mjs`** (Node) - build the `_site/` deploy tree (mkdir + recursive copy of runtime files only) and print the staged size. Replaces the previous inline bash in the workflow; use it locally to reproduce the exact deploy layout.
- **`run-tests.mjs`** (Node) - cross-platform discovery wrapper: runs all `tests/*.test.mjs` via `node --test` and then `tests/test_*.py` via `python -m unittest`.
- **`download_*.py`, `crop_*.py`** - original image-download / scan-cropping pipeline; depend on the xlsx.

All scripts use paths relative to the repo root (via `__file__`) and can be launched from any working directory.

## Notes

- **DRAFT: clause** detected on 79/262 library cards (44 Common, 16 Uncommon, 19 Rare). KRCG does not expose this clause as data, so detection relies on OCR + manual review. Full breakdown in [docs/DRAFT_OPTION.md](docs/DRAFT_OPTION.md).
- Some images recovered from user scans have lower quality than the KRCG ones because of the source resolution; the enhancement applied makes them readable but not perfect.

## License

[MIT](LICENSE) — © 2026 VTES Italy.
