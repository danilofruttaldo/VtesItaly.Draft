# vtesItaly.Draft

Interactive web gallery for a VTES Draft Cube: 120 crypt + 261 library cards (381 total) with search, filters, card detail, OCR-detected DRAFT clause and mobile-friendly layout.

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
- deep-link to a single card via URL hash (`#CardName`)
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

Deploy runs via `.github/workflows/deploy.yml` on every push to `main`. The workflow:
1. Rewrites `VERSION` in `sw.js` to a UTC timestamp so cache-first assets (images, icons, manifest) are invalidated on each release.
2. Stages only the runtime files under `_site/` (HTML, `manifest.webmanifest`, `sw.js`, `assets/`, `data/cards.json`, `images/{crypt,library-*}`). Build scripts, Python sources, `docs/`, `requirements.txt`, `data/krcg_vtes.json`, `data/draft_ocr.json`, `data/draft_overrides.json` and `images/scan/` are **not** published.
3. Uploads the staged artifact to GitHub Pages.

One-time repo setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**. The site is served at `https://<user>.github.io/<repo>/`.

### Run locally

```powershell
.\dev.ps1   # interactive menu: start/stop/restart, rebuild cards.json
```

or manually:

```
python -m http.server 8765
# open http://localhost:8765
```

## Layout

```
/
├── index.html, .nojekyll, dev.ps1, requirements.txt
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
- **`build_site_data.py`** - rebuild `data/cards.json` from the source xlsx (not in repo) joined with KRCG data + DRAFT OCR + manual overrides. Requires the original `data/Draft Cube.xlsx`; restore it locally if you need to regenerate.
- **`refresh_non_draft_images.py`** - for cards without DRAFT clause, replace the local image with the most recent KRCG printing.
- **`convert_to_webp.py`** - convert all JPGs in `images/{crypt,library-*}` to WebP and update `cards.json` paths.
- **`download_*.py`, `crop_*.py`** - original image-download / scan-cropping pipeline; depend on the xlsx.

All scripts use paths relative to the repo root (via `__file__`) and can be launched from any working directory.

## Notes

- 1 card was not recovered: **Ventrue Directorate Assembly** (uncommon). The other 261 library + 120 crypt are present.
- **DRAFT: clause** detected on 79/261 library cards (44 Common, 16 Uncommon, 19 Rare). KRCG does not expose this clause as data, so detection relies on OCR + manual review. Full breakdown in [docs/DRAFT_OPTION.md](docs/DRAFT_OPTION.md).
- Some images recovered from user scans have lower quality than the KRCG ones because of the source resolution; the enhancement applied makes them readable but not perfect.
