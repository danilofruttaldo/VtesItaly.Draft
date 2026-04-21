import json
import os
import sys
import urllib.request

import openpyxl
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
from pathlib import Path

from _utils import norm

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / "data" / "Draft Cube.xlsx"
SHEET = "Library"
KRCG_JSON = "https://static.krcg.org/data/vtes.json"

# Entries: (image_path, card_name, (x0,y0,x1,y1), rotate_degrees_CCW)
CROPS: list[tuple[str, str, tuple[int, int, int, int], int]] = [
    ("images/scan/GmeSqyaX0AAKn2Y.jpg", "Crimson Sentinel, The", (540, 135, 800, 580), 0),
    ("images/scan/GmeSqyaX0AAKn2Y.jpg", "Distraction", (1150, 135, 1445, 580), 0),
    ("images/scan/GmeSqyaX0AAKn2Y.jpg", "Alamut", (1170, 490, 1495, 930), 0),
    ("images/scan/GmeSnA4XwAAxJ1Q.jpg", "Judgment: Camarilla Segregation", (1225, 610, 1505, 1015), 0),
    ("images/scan/GmeSm8HboAAAL4G.jpg", "Zip Gun", (45, 795, 395, 1250), 0),
    ("images/scan/GmeSSd_WEAAQZQA.jpg", "Arson", (535, 150, 770, 550), 0),
    ("images/scan/GmeSSd_WEAAQZQA.jpg", "Brujah Debate", (830, 540, 1100, 900), 0),
    ("images/scan/GmeSqw0XgAECSEn.jpg", "Resplendent Protector", (820, 90, 1095, 580), 0),
    ("images/scan/GmeSSmPb0AARrSs.jpg", "Gangrel Revel", (480, 490, 770, 960), 0),
    ("images/scan/GmeSd4OXYAAl1mN.jpg", "Society Hunting Ground", (832, 520, 1105, 940), 0),
    ("images/scan/GmeSdyiXEAEEbI6.jpg", "Abactor", (540, 200, 810, 620), 0),
    ("images/scan/GmeSdyiXEAEEbI6.jpg", "Bait and Switch", (1185, 560, 1470, 960), 0),
    ("images/scan/GmeSq3lXUAIACzC.jpg", "Anarch Railroad", (200, 220, 530, 625), 0),
    ("images/scan/GmeSq3lXUAIACzC.jpg", "Pulled Fangs", (80, 925, 385, 1300), 0),
    ("images/scan/GmeSq3lXUAIACzC.jpg", "Tasha Morgan", (385, 1280, 690, 1765), 0),
    ("images/scan/GmeSq3lXUAIACzC.jpg", "Sunset Strip, Hollywood", (798, 1270, 1125, 1760), 0),
    # Landscape photo, cards rotated 90° CW — need to rotate 90° CW (270° CCW) to un-rotate
    ("images/scan/GmeSm96WcAA79_B.jpg", "Island of Yiaros", (478, 110, 775, 440), 270),
    ("images/scan/GmeSm96WcAA79_B.jpg", "Murder of Crows", (925, 95, 1260, 435), 270),
    ("images/scan/GmeSm96WcAA79_B.jpg", "47th Street Royals", (1358, 0, 1770, 355), 270),
    ("images/scan/GmeSm96WcAA79_B.jpg", "Carlton Van Wyk", (25, 1180, 425, 1485), 270),
    # Missing commons recovered from stack photos
    ("images/scan/GmeR030XcAAJ95m.jpg", "Anarch Free Press, The", (85, 430, 380, 820), 0),
    ("images/scan/GmeR0buXQAAyb4g.jpg", "Anarch Manifesto, An", (85, 920, 340, 1300), 0),
    ("images/scan/GmeR0buXQAAyb4g.jpg", "Night Moves", (995, 440, 1215, 815), 0),
    ("images/scan/GmeR0lVboAADddx.jpg", "Party Out Of Bounds", (680, 275, 960, 680), 0),
    ("images/scan/GmeR0lVboAADddx.jpg", "Platinum Protocol, The", (975, 275, 1230, 670), 0),
    ("images/scan/GmeQdW3WQAAT2Nu.jpg", "Parity Shift", (245, 1255, 520, 1650), 0),
    ("images/scan/GmeQdW3WQAAT2Nu.jpg", "Deep Ecology", (335, 500, 590, 810), 0),
    ("images/scan/GmeQdW3WQAAT2Nu.jpg", "Diversion", (950, 470, 1215, 810), 0),
    ("images/scan/GmeR135XQAAB-C8.jpg", "Fourth Tradition: The Accounting", (85, 630, 350, 1020), 0),
    ("images/scan/GmeR135XQAAB-C8.jpg", "Form of the Bat", (380, 620, 645, 1020), 0),
    ("images/scan/GmeR135XQAAB-C8.jpg", "Warrens, The", (951, 130, 1215, 500), 0),
    ("images/scan/GmeR135XQAAB-C8.jpg", "Hunger of Marduk", (1271, 870, 1531, 1260), 0),
    ("images/scan/GmeR1jkW0AA6tlV.jpg", "Dust Up", (976, 1239, 1261, 1649), 0),
    ("images/scan/GmeR1jkW0AA6tlV.jpg", "Earth Meld", (585, 1250, 875, 1660), 0),
    ("images/scan/GmeR1-RbsAAm9is.jpg", "Fake Out", (700, 690, 930, 1060), 0),
    ("images/scan/GmeR1-RbsAAm9is.jpg", "Skin of Rock", (1261, 230, 1541, 620), 0),
    ("images/scan/GmeRzAkXgAAkCSk.jpg", "Hawg", (940, 115, 1216, 500), 0),
    ("images/scan/GmeRzAkXgAAkCSk.jpg", "Line Brawl", (1215, 400, 1480, 870), 0),
    ("images/scan/GmeRzBsaIAAqVfs.jpg", "Creeping Sabotage", (640, 1160, 910, 1570), 0),
]

RARITY_TO_DIR = {
    "Common": ROOT / "images" / "library-common",
    "Uncommon": ROOT / "images" / "library-uncommon",
    "Rare": ROOT / "images" / "library-rare",
}


def enhance(img: Image.Image) -> Image.Image:
    img = ImageOps.autocontrast(img, cutoff=1)
    img = ImageEnhance.Color(img).enhance(1.15)
    img = ImageEnhance.Sharpness(img).enhance(1.6)
    img = img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=110, threshold=2))
    return img


def main() -> int:
    wb = openpyxl.load_workbook(XLSX)
    ws = wb[SHEET]
    rarity_by_norm: dict[str, str] = {}
    for r in ws.iter_rows(min_row=2, values_only=True):
        if r[1] in RARITY_TO_DIR and r[2]:
            rarity_by_norm[norm(r[2])] = r[1]

    data = json.loads(urllib.request.urlopen(KRCG_JSON).read())
    libs = [c for c in data if "Vampire" not in c.get("types", []) and "Imbued" not in c.get("types", [])]
    by_norm: dict[str, dict] = {}
    for c in libs:
        by_norm.setdefault(norm(c.get("_name", "")), c)
        for v in c.get("name_variants", []) or []:
            by_norm.setdefault(norm(v), c)

    saved = 0
    for src, name, box, rot in CROPS:
        card = by_norm.get(norm(name))
        if not card:
            print(f"FAIL lookup {name}")
            continue
        rarity = rarity_by_norm.get(norm(card["_name"])) or rarity_by_norm.get(norm(name))
        if not rarity:
            print(f"FAIL rarity {name}")
            continue
        im = Image.open(ROOT / src)
        crop = im.crop(box)
        if rot:
            crop = crop.rotate(rot, expand=True)
        crop = enhance(crop)
        fname = os.path.basename(card["url"])
        out = RARITY_TO_DIR[rarity] / fname
        crop.save(out, quality=92)
        print(f"ok   {name} [{rarity}] -> {out}")
        saved += 1

    print(f"\nSaved {saved}/{len(CROPS)} crops.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
