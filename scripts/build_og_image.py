"""Generate the 1200x630 Open Graph preview image served on <meta og:image>.

Run manually when branding changes:

    python scripts/build_og_image.py

Idempotent. Uses Pillow only (already in requirements.txt) so no extra deps.
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ICON = ROOT / "assets" / "apple-touch-icon.png"
OUT = ROOT / "assets" / "og-image.png"

WIDTH, HEIGHT = 1200, 630
BG = (18, 18, 20, 255)          # matches --bg in styles.css
ACCENT = (197, 37, 85, 255)     # matches --accent
TEXT = (232, 232, 236, 255)     # matches --text
MUTED = (176, 181, 189, 255)    # matches --muted

TITLE = "VTES Draft Cube"
SUBTITLE = "Interactive gallery — 120 crypt + 261 library cards"
URL = "draft.vtesitaly.com"


def _load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """Best-effort: try common system sans-serif fonts, fall back to PIL default."""
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf",   # Segoe UI Bold (Windows)
        "C:/Windows/Fonts/arialbd.ttf",    # Arial Bold (Windows)
        "/System/Library/Fonts/Helvetica.ttc",  # macOS
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",  # Linux
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size)
        except OSError:
            continue
    return ImageFont.load_default(size=size)


def main() -> int:
    if not ICON.exists():
        print(f"ERROR: icon source not found at {ICON}", file=sys.stderr)
        return 1

    img = Image.new("RGBA", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(img)

    # Left accent bar (same visual cue as the filter chips)
    draw.rectangle([0, 0, 12, HEIGHT], fill=ACCENT)

    # Icon (scaled from 180x180 to 256x256, anchored left). apple-touch-icon is
    # a dark glyph on transparent; re-tint it light so it reads on the dark OG
    # background without burning a separate artwork.
    icon = Image.open(ICON).convert("RGBA")
    icon = icon.resize((256, 256), Image.LANCZOS)
    r, g, b, a = icon.split()
    light = Image.new("RGBA", icon.size, (240, 240, 245, 0))
    light.putalpha(a)
    img.paste(light, (90, (HEIGHT - 256) // 2), light)

    # Text block, right of the icon
    text_x = 90 + 256 + 60
    title_font = _load_font(84)
    subtitle_font = _load_font(32)
    url_font = _load_font(26)

    # Vertically centered stack
    title_bbox = draw.textbbox((0, 0), TITLE, font=title_font)
    subtitle_bbox = draw.textbbox((0, 0), SUBTITLE, font=subtitle_font)
    url_bbox = draw.textbbox((0, 0), URL, font=url_font)
    gap1, gap2 = 24, 48
    stack_h = (
        (title_bbox[3] - title_bbox[1])
        + gap1
        + (subtitle_bbox[3] - subtitle_bbox[1])
        + gap2
        + (url_bbox[3] - url_bbox[1])
    )
    y = (HEIGHT - stack_h) // 2 - title_bbox[1]

    draw.text((text_x, y), TITLE, fill=TEXT, font=title_font)
    y += (title_bbox[3] - title_bbox[1]) + gap1
    draw.text((text_x, y), SUBTITLE, fill=MUTED, font=subtitle_font)
    y += (subtitle_bbox[3] - subtitle_bbox[1]) + gap2
    draw.text((text_x, y), URL, fill=ACCENT, font=url_font)

    img.convert("RGB").save(OUT, "PNG", optimize=True)
    kb = OUT.stat().st_size / 1024
    print(f"Wrote {OUT.relative_to(ROOT)} ({WIDTH}x{HEIGHT}, {kb:.1f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
