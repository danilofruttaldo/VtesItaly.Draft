import json
import os
import sys
import urllib.request
from pathlib import Path

import numpy as np
import openpyxl
from _utils import norm
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / "data" / "Draft Cube.xlsx"
SHEET = "Library"
KRCG_JSON = "https://static.krcg.org/data/vtes.json"
PHOTOS_DIR = ROOT / "images" / "scan"

PHOTOS: dict[int, list[str | None]] = {
    1: [
        "Aid from Bats",
        "Anonymous Freight",
        "Apportation",
        "Armor of Vitality",
        "Arms Dealer",
        "Awe",
        "Bribes",
        "Burning Wrath",
        "Burst of Sunlight",
    ],
    2: [
        "Carrion Crows",
        "Catatonic Fear",
        "Claws of the Dead",
        "Command of the Beast",
        "Consanguineous Boon",
        "Cryptic Mission",
        "Cryptic Rider",
        "Day Operation",
        "Decapitate",
    ],
    3: [
        "Dog Pack",
        "Earth Meld",
        "Enhanced Senses",
        "Far Mastery",
        "Fleetness",
        "Flurry of Action",
        "Forced Vigilance",
        "Force of Will",
        "Forgotten Labyrinth",
    ],
    4: [
        "Form of Mist",
        "Form of the Bat",
        "Freak Drive",
        "Gather",
        "Grooming the Protégé",
        "Guard Dogs",
        "Hidden Strength",
        "Hide the Mind",
        "Immortal Grapple",
    ],
    5: [
        "Iron Glare",
        "Leverage",
        "Lightning Reflexes",
        "Lost in Crowds",
        "Magic of the Smith",
        "Masochism",
        "Meat Cleaver",
        "Mesmerize",
        "Mind Numb",
    ],
    6: [
        "Mirror Walk",
        "My Enemy's Enemy",
        "Obedience",
        "Papillon",
        "Perfect Clarity",
        "Permanent Vacation",
        "Petra Resonance",
        "Psyche!",
        "Public Trust",
    ],
    7: [
        "Pulse of the Canaille",
        "Pursuit",
        "Quickness",
        "Rapid Change",
        "Resist Earth's Grasp",
        "Restoration",
        "Roundhouse",
        "Scorn of Adonis",
        "Scouting Mission",
    ],
    8: [
        "Seduction",
        "Side Strike",
        "Slam",
        "Spying Mission",
        "Swallowed by the Night",
        "Telepathic Misdirection",
        "Theft of Vitae",
        "Summoning, The",
        "Thing",
    ],
    9: ["Tier of Souls", "Voracious Vermin", "Walk of Flame", "Weather Control", "Wolf Claws", None, None, None, None],
}

RARITY_TO_DIR = {
    "Common": ROOT / "images" / "library-common",
    "Uncommon": ROOT / "images" / "library-uncommon",
    "Rare": ROOT / "images" / "library-rare",
}


def content_bbox(im: Image.Image) -> tuple[int, int, int, int]:
    a = np.asarray(im.convert("L"))
    mask = a < 180
    rows = mask.any(axis=1)
    cols = mask.any(axis=0)
    ys = np.where(rows)[0]
    xs = np.where(cols)[0]
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


def main() -> int:
    wb = openpyxl.load_workbook(XLSX)
    ws = wb[SHEET]
    rarity_by_name: dict[str, str] = {}
    for r in ws.iter_rows(min_row=2, values_only=True):
        if r[1] in RARITY_TO_DIR and r[2]:
            rarity_by_name[norm(r[2])] = r[1]

    data = json.loads(urllib.request.urlopen(KRCG_JSON).read())
    libs = [c for c in data if "Vampire" not in c.get("types", []) and "Imbued" not in c.get("types", [])]
    by_norm: dict[str, dict] = {}
    for c in libs:
        by_norm.setdefault(norm(c.get("_name", "")), c)
        for v in c.get("name_variants", []) or []:
            by_norm.setdefault(norm(v), c)

    saved = 0
    for idx, cards in PHOTOS.items():
        path = PHOTOS_DIR / f"{idx}.jpg"
        im = Image.open(path)
        x0, y0, x1, y1 = content_bbox(im)
        # force uniform 3-column grid over full content bbox
        cell_w = (x1 - x0) / 3
        # for image 9 only two rows; use cell_h from images 1-8 average (≈643)
        if idx == 9:
            cell_h = (y1 - y0) / 3  # still compute from bbox (may be skewed by stray text)
            # override: content_bbox overshoots because of bottom artifacts; assume row height = cell_w / 0.72
            cell_h = cell_w / 0.72
        else:
            cell_h = (y1 - y0) / 3

        for i, name in enumerate(cards):
            if name is None:
                continue
            row, col = divmod(i, 3)
            cx0 = int(x0 + col * cell_w)
            cy0 = int(y0 + row * cell_h)
            cx1 = int(x0 + (col + 1) * cell_w)
            cy1 = int(y0 + (row + 1) * cell_h)
            # small inner padding to avoid neighbor bleed (2% each side)
            pad_x = int((cx1 - cx0) * 0.015)
            pad_y = int((cy1 - cy0) * 0.015)
            box = (cx0 + pad_x, cy0 + pad_y, cx1 - pad_x, cy1 - pad_y)
            crop = im.crop(box)

            card = by_norm.get(norm(name))
            if not card:
                print(f"FAIL lookup: img{idx}[{i}] {name!r}")
                continue
            rarity = rarity_by_name.get(norm(card["_name"])) or rarity_by_name.get(norm(name))
            if not rarity:
                print(f"FAIL rarity: {name}")
                continue
            fname = os.path.basename(card["url"])
            out = RARITY_TO_DIR[rarity] / fname
            crop.save(out, quality=92)
            print(f"ok   img{idx}[{i}] {name} [{rarity}] -> {out}")
            saved += 1

    print(f"\nSaved {saved} crops.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
