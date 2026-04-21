"""Convert all JPGs in images/{crypt,library-*} to WebP and update cards.json paths.

Removes original JPGs after a successful conversion. Skips images/scan/.
"""

import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
TARGETS = [
    ROOT / "images" / "crypt",
    ROOT / "images" / "library-common",
    ROOT / "images" / "library-uncommon",
    ROOT / "images" / "library-rare",
]
CARDS = ROOT / "data" / "cards.json"
QUALITY = 85


def main() -> int:
    dry = "--dry" in sys.argv
    keep_jpg = "--keep-jpg" in sys.argv

    converted = 0
    skipped = 0
    saved = 0  # bytes saved
    for d in TARGETS:
        for jpg in sorted(d.glob("*.jpg")):
            webp = jpg.with_suffix(".webp")
            if webp.exists() and not dry:
                skipped += 1
                continue
            if dry:
                print(f"DRY  {jpg.relative_to(ROOT)}")
                converted += 1
                continue
            try:
                im = Image.open(jpg).convert("RGB")
                im.save(webp, "WEBP", quality=QUALITY, method=6)
                old_size = jpg.stat().st_size
                new_size = webp.stat().st_size
                saved += old_size - new_size
                if not keep_jpg:
                    jpg.unlink()
                print(f"OK   {jpg.relative_to(ROOT)} -> {webp.name} ({old_size // 1024}K -> {new_size // 1024}K)")
                converted += 1
            except Exception as e:
                print(f"FAIL {jpg.name}: {e}")

    if not dry:
        # Update cards.json: rewrite img paths jpg->webp
        cards = json.loads(CARDS.read_text(encoding="utf-8"))
        for c in cards["crypt"] + cards["library"]:
            if c.get("img", "").endswith(".jpg"):
                c["img"] = c["img"][:-4] + ".webp"
        CARDS.write_text(json.dumps(cards, ensure_ascii=False, indent=2), encoding="utf-8")
        print("Updated cards.json paths to .webp")

    print(f"\nConverted {converted} | skipped (already webp) {skipped} | saved {saved // 1024 // 1024} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
