"""Generate DRAFT_OPTION.md: which library cards have the DRAFT: clause."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CARDS = ROOT / "data" / "cards.json"
OUT = ROOT / "docs" / "DRAFT_OPTION.md"


def main() -> int:
    data = json.loads(CARDS.read_text(encoding="utf-8"))
    library = data["library"]
    by_rarity_yes: dict[str, list[dict]] = {}
    by_rarity_no: dict[str, list[dict]] = {}
    for c in library:
        target = by_rarity_yes if c.get("draft") else by_rarity_no
        target.setdefault(c["rarity"], []).append(c)

    total = len(library)
    yes = sum(len(v) for v in by_rarity_yes.values())
    no = sum(len(v) for v in by_rarity_no.values())

    lines: list[str] = []
    lines.append("# DRAFT option - library cards\n")
    lines.append(
        f"Detection via OCR (easyocr) over `images/library-*/`, refined with manual "
        f"overrides in `data/draft_overrides.json`. Total {total} cards - "
        f"**{yes} with DRAFT: clause**, {no} without.\n"
    )
    lines.append(
        "> Method: regex `\\bDRAFT\\s*[:;]` on the extracted text. Accuracy ~95-98% - "
        "some cards with low image quality can yield false negatives.\n"
    )

    for section, by_rarity in (("With DRAFT clause", by_rarity_yes), ("Without DRAFT clause", by_rarity_no)):
        lines.append(f"\n## {section}\n")
        for rarity in ("Common", "Uncommon", "Rare"):
            cards = sorted(by_rarity.get(rarity, []), key=lambda c: c["name"].lower())
            if not cards:
                continue
            lines.append(f"\n### {rarity} ({len(cards)})\n")
            for c in cards:
                if c.get("draft_text"):
                    snip = c["draft_text"].replace("|", "\\|")
                    lines.append(f"- **{c['name']}** - _{snip[:200]}_")
                else:
                    lines.append(f"- {c['name']}")
            lines.append("")

    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT.name}: {yes} with DRAFT, {no} without")
    return 0


if __name__ == "__main__":
    sys.exit(main())
