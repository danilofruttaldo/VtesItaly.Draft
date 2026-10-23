"""Shared helpers for the scripts/ pipeline.

Kept in a single place so name-normalization stays consistent across every
entry point that needs to match user-provided names against KRCG records.
"""

import os
import re
import unicodedata
import urllib.request
from pathlib import Path

KRCG_JSON_URL = "https://static.krcg.org/data/vtes.json"
USER_AGENT = "Vtes.Draft/1.0"

# Library rarity → relative image dir. Scripts that need absolute paths build
# them with `ROOT / LIB_RARITY_DIRS[rarity]`; build_site_data uses the strings
# directly when serializing card.img into cards.json.
LIB_RARITY_DIRS = {
    "Common": "images/library-common",
    "Uncommon": "images/library-uncommon",
    "Rare": "images/library-rare",
}

_EXTRA_MAP = str.maketrans(
    {
        "ł": "l",
        "Ł": "L",
        "ø": "o",
        "Ø": "O",
        "đ": "d",
        "Đ": "D",
        "ß": "ss",
        "æ": "ae",
        "Æ": "AE",
        "œ": "oe",
        "Œ": "OE",
        "ð": "d",
        "Ð": "D",
        "þ": "th",
        "Þ": "Th",
    }
)


def norm(s: str) -> str:
    """Normalize a card name to a stable alphanumeric slug.

    Applies the EXTRA_MAP translations for characters that NFKD can't unfold
    (ł, ø, ß, ...), then strips combining marks, lowercases, and drops every
    non-alphanumeric character.
    """
    s = (s or "").translate(_EXTRA_MAP)
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", s.lower())


def download_atomic(url: str, dest: str | Path, *, timeout: float = 30) -> None:
    """Download `url` to `dest` through a sibling `.tmp` file.

    The final name only appears after a complete download (os.replace is
    atomic on the same filesystem), so a failed or interrupted request never
    leaves a truncated file that the next run would skip as "already present".
    """
    dest = Path(dest)
    tmp = dest.with_name(dest.name + ".tmp")
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp, open(tmp, "wb") as f:
            f.write(resp.read())
        os.replace(tmp, dest)
    finally:
        tmp.unlink(missing_ok=True)
