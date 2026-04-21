"""For library cards WITHOUT DRAFT clause, replace local image with the
most recent printing available on KRCG."""

import io
import json
import sys
import time
import urllib.request
from pathlib import Path

from _utils import norm
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CARDS = ROOT / "data" / "cards.json"
KRCG = ROOT / "data" / "krcg_vtes.json"


def main() -> int:
    dry = "--dry" in sys.argv
    cards = json.loads(CARDS.read_text(encoding="utf-8"))
    krcg = json.loads(KRCG.read_text(encoding="utf-8"))

    by_norm: dict[str, list[dict]] = {}
    for c in krcg:
        if "Vampire" in c.get("types", []) or "Imbued" in c.get("types", []):
            continue
        by_norm.setdefault(norm(c.get("_name", "")), []).append(c)
        for v in c.get("name_variants", []) or []:
            by_norm.setdefault(norm(v), []).append(c)

    updated = 0
    skipped = 0
    failed = 0
    no_scan = 0
    for c in cards["library"]:
        if c.get("draft"):
            continue
        ms = by_norm.get(norm(c["name"]), [])
        uniq = {m["id"]: m for m in ms}
        if len(uniq) != 1:
            print(f"AMB  {c['name']}: {len(uniq)} matches in KRCG")
            failed += 1
            continue
        kc = next(iter(uniq.values()))
        sets_info = kc.get("sets") or {}
        scans = kc.get("scans") or {}
        if not scans:
            no_scan += 1
            continue
        # pick most recent set with both metadata + scan
        ordered = sorted(
            (s for s in scans if s in sets_info),
            key=lambda s: sets_info[s][0].get("release_date", "0000"),
            reverse=True,
        )
        if not ordered:
            no_scan += 1
            continue
        dest = ROOT / c["img"]
        if dry:
            best_set = ordered[0]
            print(f"DRY  {c['name']:35} <- {best_set} ({sets_info[best_set][0].get('release_date', '?')})")
            updated += 1
            continue
        # try in order until one URL works; final fallback = default card url
        candidates = [(s, scans[s]) for s in ordered]
        if kc.get("url"):
            candidates.append(("default", kc["url"]))
        success = False
        last_err: str | None = None
        for s, url in candidates:
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Vtes.Draft/1.0"})
                with urllib.request.urlopen(req, timeout=30) as resp:
                    data = resp.read()
                if dest.suffix.lower() == ".webp":
                    Image.open(io.BytesIO(data)).convert("RGB").save(dest, "WEBP", quality=85, method=6)
                else:
                    dest.write_bytes(data)
                date = sets_info.get(s, [{}])[0].get("release_date", "?") if s != "default" else "default"
                print(f"OK   {c['name']:35} <- {s} ({date})")
                updated += 1
                success = True
                time.sleep(0.05)
                break
            except Exception as e:
                last_err = f"{s}: {e}"
        if not success:
            print(f"FAIL {c['name']}: {last_err}")
            failed += 1

    print(f"\nUpdated {updated} | skipped {skipped} | no scan {no_scan} | failed {failed}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
