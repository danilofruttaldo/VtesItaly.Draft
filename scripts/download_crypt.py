import json
import os
import re
import sys
import time
import urllib.request

import openpyxl
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / "data" / "Draft Cube.xlsx"
SHEET = "Crypt"
OUT_DIR = ROOT / "images" / "crypt"
KRCG_JSON = "https://static.krcg.org/data/vtes.json"


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def main() -> int:
    wb = openpyxl.load_workbook(XLSX)
    ws = wb[SHEET]
    excel_names = [r[2] for r in ws.iter_rows(min_row=2, values_only=True) if r[2]]

    data = json.loads(urllib.request.urlopen(KRCG_JSON).read())
    vamps = [c for c in data if "Vampire" in c.get("types", []) or "Imbued" in c.get("types", [])]

    by_name_group: dict[tuple[str, str], dict] = {}
    by_name: dict[str, list[dict]] = {}
    for c in vamps:
        nm = norm(c.get("_name", ""))
        g = str(c.get("group", ""))
        by_name_group[(nm, g)] = c
        by_name.setdefault(nm, []).append(c)

    os.makedirs(OUT_DIR, exist_ok=True)

    missing = []
    for name in excel_names:
        m = re.match(r"^(.*?)\s+[gG](\d+)$", name)
        card = None
        if m:
            card = by_name_group.get((norm(m.group(1).strip()), m.group(2)))
        if card is None:
            matches = by_name.get(norm(name), [])
            if len(matches) == 1:
                card = matches[0]

        if card is None:
            missing.append(name)
            continue

        url = card["url"]
        fname = os.path.basename(url)
        dest = os.path.join(OUT_DIR, fname)
        if os.path.exists(dest):
            print(f"skip {name} -> {fname} (already present)")
            continue
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Vtes.Draft/1.0"})
            with urllib.request.urlopen(req, timeout=30) as resp, open(dest, "wb") as f:
                f.write(resp.read())
            print(f"ok   {name} -> {fname}")
            time.sleep(0.1)
        except Exception as e:
            print(f"FAIL {name} -> {url}: {e}")
            missing.append(name)

    if missing:
        print(f"\nMissing {len(missing)}: {missing}")
        return 1
    print(f"\nDone. {len(excel_names)} cards downloaded to {OUT_DIR}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
