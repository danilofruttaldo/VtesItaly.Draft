# vtesItaly.Draft

Interactive web gallery for a VTES Draft Cube: 120 crypt + 261 library cards (381 total) with search, filters, card detail, OCR-detected DRAFT clause and mobile-friendly layout.

## Gallery (GitHub Pages)

`index.html` is a single static page that displays all cards in one grid with:

- search by name, text, discipline, type, clan
- Crypt / Library kind toggles (segmented)
- clan filter (also matches library cards with clan requirements)
- library type filter (auto-disables Crypt when set)
- Common / Uncommon / Rare rarity toggles
- active-filter chips above the grid (one click to remove)
- modal lightbox with image, tags, KRCG card text, DRAFT: clause when present
- modal navigation: arrows, keyboard (← →), touch swipe, prev/next preload
- styled discipline badges (`[aus]`, `[PRE]`, ...) rendered as colored pills
- deep-link to a single card via URL hash (`#CardName`)
- filter state persisted in the URL query string (shareable views)
- sticky topbar, dark theme, fully responsive (desktop / tablet / mobile / small phones)

Data comes from `data/cards.json` (text + metadata) and `images/**/*.webp`.

### Publish on GitHub Pages

**Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `/ (root)`**.
The site will be served at `https://<user>.github.io/<repo>/`.

### Run locally

```powershell
.\dev.ps1   # interactive menu: start/stop/restart, opens the browser, rebuild cards.json
```

or manually:

```
python -m http.server 8765
# open http://localhost:8765
```

## Layout

```
/
├── index.html, .nojekyll, dev.ps1
├── assets/                             # favicon.ico, apple-touch-icon.png, vtes.svg
├── data/
│   ├── cards.json                      # gallery data (consumed by index.html)
│   ├── krcg_vtes.json                  # cached KRCG dataset (build input)
│   ├── draft_ocr.json                  # raw easyocr output per image
│   └── draft_overrides.json            # manual DRAFT-clause corrections
├── docs/
│   └── DRAFT_OPTION.md                 # report: cards with/without DRAFT clause
├── images/
│   ├── crypt/                          # 120 crypt images (.webp)
│   ├── library-common/                 # 102
│   ├── library-uncommon/               # 79
│   ├── library-rare/                   # 80
│   └── scan/                           # original user photos (legacy source)
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
