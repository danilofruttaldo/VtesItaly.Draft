"""Generate 320px-wide *-thumb.webp companions for the grid srcset.

For each image in images/{crypt,library-*}/ this writes a sibling
`<name>-thumb.webp` sized so its longer side is at most `MAX_WIDTH`. The grid
in assets/app.js emits a `srcset` pointing at the thumb for 1x and at the
original for 2x.

Idempotent: skips thumbnails that are already up-to-date with their source.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DIRS = [
    "images/crypt",
    "images/library-common",
    "images/library-uncommon",
    "images/library-rare",
]
MAX_WIDTH = 320
# Grid thumbs display at 160 CSS px; even at DPR 2 the destination pixel count
# is small enough that q=75 is visually indistinguishable from q=85, and the
# extra compression shaves ~30% off the per-file size.
QUALITY = 75
METHOD = 6
SUFFIX = "-thumb.webp"


def main() -> int:
    generated = 0
    skipped = 0
    total_bytes = 0

    for d in DIRS:
        folder = ROOT / d
        if not folder.is_dir():
            print(f"WARN: missing {folder}", file=sys.stderr)
            continue
        for src in sorted(folder.glob("*.webp")):
            if src.stem.endswith("-thumb"):
                continue
            dst = src.with_name(src.stem + SUFFIX)
            if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
                skipped += 1
                total_bytes += dst.stat().st_size
                continue
            with Image.open(src) as im:
                w, h = im.size
                if w > MAX_WIDTH:
                    ratio = MAX_WIDTH / w
                    new_size = (MAX_WIDTH, round(h * ratio))
                    thumb = im.resize(new_size, Image.LANCZOS)
                else:
                    thumb = im.copy()
                thumb.save(dst, "WebP", quality=QUALITY, method=METHOD)
            generated += 1
            total_bytes += dst.stat().st_size

    print(
        f"Generated {generated} thumbnails, skipped {skipped} up-to-date "
        f"(total thumb size: {total_bytes / 1024 / 1024:.1f} MB)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
