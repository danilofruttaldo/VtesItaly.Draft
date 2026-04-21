"""OCR post-processing for the DRAFT: clause.

Extracted from build_site_data.py so it can be unit-tested in isolation
(without pulling in openpyxl/PIL). See tests/test_ocr_cleanup.py for golden
input/output pairs.
"""

from __future__ import annotations

import re


def clean_draft_snippet(snip: str) -> str:
    """Trim OCR noise around the DRAFT clause + fix common OCR artefacts."""
    if not snip:
        return ""
    up = snip.upper()
    i = up.find("DRAFT:")
    if i < 0:
        i = up.find("DRAFT;")
    if i < 0:
        return ""
    s = snip[i:]

    # Cut at card-footer markers (illustrator / copyright)
    end_markers = [
        "Illus:",
        "Illus ",
        "Illus;",
        "Illu:",
        "Ius:",
        "lus:",
        "llus:",
        "ilus:",
        "©",
        "Ⓒ",
        "(@",
        "@ 20",
        " 0 20",
        " 0 202",
        "02024",
        "02025",
        "0 1024",
        "0 2024",
        "Paradox",
        "Parador",
        "(publ",
        "publ)",
        "publl",
        "(puby",
    ]
    cut = len(s)
    for m in end_markers:
        pos = s.find(m)
        if pos > 0:
            cut = min(cut, pos)
    s = s[:cut]

    # Normalize DRAFT prefix
    s = re.sub(r"^DRAFT\s*[;:]", "DRAFT:", s, flags=re.I)

    # Strip @ icon variants aggressively (don't absorb real capitalized words)
    s = re.sub(r"[a-z]?@[\}\)\]]+", "", s)  # l@}, @} (must come before @ alone)
    s = re.sub(r"@(?=[A-Z][a-z])", "", s)  # @As -> As, @Reduce -> Reduce
    s = re.sub(r"@[A-Z](?=As\b)", "", s)  # @JAs -> As (icon letter before As)
    s = re.sub(r"@[A-Z]{0,2}\]?", "", s)  # @EJ, @J, @], @

    # Other icon-letter garbage tokens
    icon_tokens = [
        r"\[[A-Za-z\d]{1,3}\]?",  # [U, [d], [1]
        r"[A-Z]J(?=\s|$|[A-Z])",  # DJ, EJ at word-end
        r"[A-Z]\](?=\s|$)",  # D], E]
        r"Xis\s*\d*\.?",  # Xis 0.
        r"\bEE\b",
        r"[€£¥§¢][A-Z]{0,2}",  # currency-symbol OCR of icon
    ]
    icon_re = "|".join(icon_tokens)

    s = re.sub(rf"^(DRAFT:)\s*(?:{icon_re})\s*", r"\1 ", s)
    s = re.sub(rf"(?<=[.\s])(?:{icon_re})\s+", " ", s)

    # Trailing mixed-case short gibberish after "above" (e.g. "above UeDl")
    s = re.sub(r"\babove\s+[A-Za-z]{1,6}\s*\.?$", "above.", s, flags=re.I)

    # Normalize icon letters stuck to "above" BEFORE the illustrator trimmer:
    # if we leave "Mlabove" in place, the `Word Word$` heuristic below mistakes
    # "As Mlabove." for "Firstname Lastname" and deletes it entirely.
    s = re.sub(r"\b(?:M[il]?|E[il]{0,2}|EJ|[ML]|la|[A-Z])above\b", "above", s, flags=re.I)

    # Trailing illustrator name leaked as plain text (e.g. "ur Steve Prescott", "Randi Galleeos")
    s = re.sub(r"\s+\w{1,3}\s+[A-Z][a-z]+\s+[A-Z][a-z]+\s*\.?$", "", s)
    s = re.sub(r"\s+[A-Z][a-z]+\s+[A-Z][a-z]+\s*\.?$", ".", s)

    # Bracket stuck to word: [above -> above, word] -> word
    s = re.sub(r"\[(?=[A-Za-z])", "", s)
    s = re.sub(r"(?<=[A-Za-z])[\]\}]", "", s)

    # Illustrator marker without colon (Ius David Day, Ius James Stowe)
    s = re.sub(r"\s+Ius\s+[A-Z].*$", "", s)

    # Tail copyright garbage: "(,20XX ..." or "0 20XX ..." not caught by end_markers
    s = re.sub(r"\s+\(?,?\s*20\d{2}\b.*$", "", s)
    s = re.sub(r"\s+0\s+1?02[45].*$", "", s)

    # Flavor text attribution (— Name or a trailing " The <Capital word>...")
    s = re.sub(r"\s+[—–-]\s*[A-Z][a-z]+.*$", "", s)

    # Missing "As" before "above" at the start
    s = re.sub(r"^DRAFT:\s+above\b", "DRAFT: As above", s)

    # Icon letter(s) stuck to "As" (DAs, EAs, EYAs, JAs -> As)
    s = re.sub(r"\b[A-Z]{1,3}(?=As\b)", "", s)

    # Double-capital word starts (icon + real letter: EEnter -> Enter)
    s = re.sub(r"\b([A-Z])\1(?=[a-z])", r"\1", s)

    # Leading single-letter icon right after "DRAFT:"
    s = re.sub(r"^DRAFT:\s+[A-Z]\s+(?=[A-Za-z])", "DRAFT: ", s)
    # Leading single-letter icon inside clause after period/space
    s = re.sub(r"(?<=[.\s])[A-Z]\s+(?=[A-Z][a-z])", " ", s)

    # Trailing single-letter icon (" M.", " I.", " J.")
    s = re.sub(r"\s+[A-Z]\.?\s*$", "", s)
    s = re.sub(r"\s+[A-Z]\b(?=\s*\.?$)", "", s)

    # Pipe misread for '1' in numeric contexts
    s = re.sub(r"\+\s*[|\\Il]+", "+1 ", s)  # +|, + |, +\|, +I
    s = re.sub(r"strength\s*\+\s*[|\\Il]+", "strength+1", s, flags=re.I)
    s = re.sub(r"\bby\s+[|I]\b", "by 1", s)

    # Stray tilde from italics, ampersand noise
    s = s.replace("~", " ")

    # Collapse whitespace
    s = re.sub(r"\s{2,}", " ", s).strip()

    # Ensure sentence ends cleanly
    s = s.rstrip(" :,;.-_|\"'")
    if s and s[-1] not in ".!?":
        s += "."

    return s
