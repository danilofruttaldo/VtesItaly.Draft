import argparse
import json
import os
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
RARITIES = {
    "Common": ROOT / "images" / "library-common",
    "Uncommon": ROOT / "images" / "library-uncommon",
    "Rare": ROOT / "images" / "library-rare",
}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("rarity", choices=list(RARITIES.keys()))
    args = ap.parse_args()

    out_dir = RARITIES[args.rarity]
    os.makedirs(out_dir, exist_ok=True)

    wb = openpyxl.load_workbook(XLSX)
    ws = wb[SHEET]
    names = [r[2] for r in ws.iter_rows(min_row=2, values_only=True) if r[1] == args.rarity and r[2]]

    data = json.loads(urllib.request.urlopen(KRCG_JSON).read())
    libs = [c for c in data if "Vampire" not in c.get("types", []) and "Imbued" not in c.get("types", [])]

    by_name: dict[str, list[dict]] = {}
    for c in libs:
        by_name.setdefault(norm(c.get("_name", "")), []).append(c)
        for v in c.get("name_variants", []) or []:
            by_name.setdefault(norm(v), []).append(c)

    missing = []
    for name in names:
        matches = by_name.get(norm(name), [])
        unique = {c["id"]: c for c in matches}
        if len(unique) != 1:
            missing.append((name, len(unique)))
            continue
        card = next(iter(unique.values()))
        url = card["url"]
        fname = os.path.basename(url)
        dest = os.path.join(out_dir, fname)
        if os.path.exists(dest):
            print(f"skip {name} -> {fname}")
            continue
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Vtes.Draft/1.0"})
            with urllib.request.urlopen(req, timeout=30) as resp, open(dest, "wb") as f:
                f.write(resp.read())
            print(f"ok   {name} -> {fname}")
            time.sleep(0.1)
        except Exception as e:
            print(f"FAIL {name} -> {url}: {e}")
            missing.append((name, -1))

    if missing:
        print(f"\nMissing {len(missing)}: {missing}")
        return 1
    print(f"\nDone. {len(names)} {args.rarity} cards downloaded to {out_dir}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
