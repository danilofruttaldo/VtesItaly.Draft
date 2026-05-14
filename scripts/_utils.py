"""Shared helpers for the scripts/ pipeline.

Kept in a single place so name-normalization stays consistent across every
entry point that needs to match user-provided names against KRCG records.
"""

import re
import unicodedata

KRCG_JSON_URL = "https://static.krcg.org/data/vtes.json"

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
