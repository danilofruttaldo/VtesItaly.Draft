"""OCR library card images (via easyocr) to detect the DRAFT: clause.

Saves results to data/draft_ocr.json keyed by image relative path:
  {"images/library-common/44magnum.webp": {"has_draft": true, "snippet": "..."}}
"""

import json
import re
import sys
from pathlib import Path

import easyocr

ROOT = Path(__file__).resolve().parent.parent
LIB_DIRS = [
    ROOT / "images" / "library-common",
    ROOT / "images" / "library-uncommon",
    ROOT / "images" / "library-rare",
]
OUT = ROOT / "data" / "draft_ocr.json"

DRAFT_PAT = re.compile(r"\bDRAFT\s*[:;]", re.IGNORECASE)


def main() -> int:
    reader = easyocr.Reader(["en"], gpu=False, verbose=False)
    results: dict[str, dict] = {}
    if OUT.exists():
        try:
            results = json.loads(OUT.read_text(encoding="utf-8"))
        except Exception:
            results = {}

    force = "--force" in sys.argv
    total = 0
    processed = 0
    hits = 0
    for d in LIB_DIRS:
        for p in sorted(list(d.glob("*.webp")) + list(d.glob("*.jpg"))):
            rel = f"images/{d.name}/{p.name}"
            total += 1
            if not force and rel in results:
                if results[rel].get("has_draft"):
                    hits += 1
                continue
            try:
                lines = reader.readtext(str(p), detail=0, paragraph=True)
            except Exception as e:
                print(f"FAIL {rel}: {e}")
                results[rel] = {"has_draft": False, "error": str(e)}
                continue
            text = "\n".join(lines)
            m = DRAFT_PAT.search(text)
            has = bool(m)
            snippet = ""
            if has:
                start = max(0, m.start() - 20)
                snippet = text[start : m.end() + 120].replace("\n", " ").strip()
                hits += 1
            results[rel] = {"has_draft": has, "snippet": snippet}
            processed += 1
            flag = "DRAFT" if has else "  -  "
            print(f"{flag} {rel}")
            if processed % 20 == 0:
                OUT.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")

    OUT.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nScanned {total} images ({processed} newly processed). DRAFT hits: {hits}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
