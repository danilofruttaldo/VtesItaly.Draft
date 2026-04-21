import json
import os
import shutil
import sys
import time
import urllib.request
from pathlib import Path

import openpyxl
from _utils import norm

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / "data" / "Draft Cube.xlsx"
SHEET = "Library"
KRCG_JSON = "https://static.krcg.org/data/vtes.json"

DRAFT_ERA_SETS = [
    "Kindred Most Wanted",
    "Legacies of Blood",
    "Lords of the Night",
    "Third Edition",
    "Sword of Caine",
    "Nights of Reckoning",
    "Twilight Rebellion",
    "Keepers of Tradition",
    "Ebony Kingdom",
    "Heirs to the Blood",
]


def main() -> int:
    rarity = sys.argv[1] if len(sys.argv) > 1 else "Common"
    out_dir = ROOT / "images" / f"library-{rarity.lower()}"

    if out_dir.is_dir():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    wb = openpyxl.load_workbook(XLSX)
    ws = wb[SHEET]
    names = [r[2] for r in ws.iter_rows(min_row=2, values_only=True) if r[1] == rarity and r[2]]

    data = json.loads(urllib.request.urlopen(KRCG_JSON).read())
    libs = [c for c in data if "Vampire" not in c.get("types", []) and "Imbued" not in c.get("types", [])]
    by_name: dict[str, list[dict]] = {}
    for c in libs:
        by_name.setdefault(norm(c.get("_name", "")), []).append(c)
        for v in c.get("name_variants", []) or []:
            by_name.setdefault(norm(v), []).append(c)

    downloaded = 0
    no_draft = []
    for name in names:
        card = by_name[norm(name)][0]
        scans = card.get("scans") or {}

        picked = None
        for s in DRAFT_ERA_SETS:
            if s in scans:
                picked = (s, scans[s])
                break

        if not picked:
            no_draft.append(name)
            continue

        s, url = picked
        fname = os.path.basename(card["url"])
        dest = out_dir / fname
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Vtes.Draft/1.0"})
            with urllib.request.urlopen(req, timeout=30) as resp, open(dest, "wb") as f:
                f.write(resp.read())
            print(f"ok   {name} [{s}] -> {fname}")
            downloaded += 1
            time.sleep(0.1)
        except Exception as e:
            print(f"FAIL {name} -> {url}: {e}")

    print(f"\nDownloaded {downloaded}/{len(names)} with DRAFT-era printings.")
    if no_draft:
        print(f"\nNo draft-era printing ({len(no_draft)}):")
        for n in no_draft:
            print(f"  - {n}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
