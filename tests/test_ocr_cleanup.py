"""Golden tests for scripts/ocr_cleanup.py::clean_draft_snippet.

Run with:
    python -m unittest tests.test_ocr_cleanup

Cases are representative OCR artefacts derived from the kinds of noise the
easyocr run produces on DRAFT-era card scans. If you need to add a new case
because a regex was tuned in scripts/ocr_cleanup.py, pair it with an input
that actually exercises the branch you changed.
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from ocr_cleanup import clean_draft_snippet  # noqa: E402


class CleanDraftSnippetTests(unittest.TestCase):
    def test_empty_and_none_return_empty_string(self):
        self.assertEqual(clean_draft_snippet(""), "")
        self.assertEqual(clean_draft_snippet(None), "")

    def test_no_draft_marker_returns_empty(self):
        self.assertEqual(clean_draft_snippet("Some other card text without the marker."), "")

    def test_trivial_clean_clause_is_preserved(self):
        self.assertEqual(clean_draft_snippet("DRAFT: As above."), "DRAFT: As above.")

    def test_leading_noise_is_trimmed_before_draft(self):
        self.assertEqual(
            clean_draft_snippet("some garbage DRAFT: As above."),
            "DRAFT: As above.",
        )

    def test_semicolon_after_draft_is_normalised_to_colon(self):
        # OCR frequently reads ":" as ";" on scanned cards.
        self.assertEqual(clean_draft_snippet("DRAFT; As above."), "DRAFT: As above.")

    def test_illustrator_marker_is_cut(self):
        self.assertEqual(
            clean_draft_snippet("DRAFT: As above. Illus: Steve Prescott"),
            "DRAFT: As above.",
        )

    def test_copyright_tail_is_cut(self):
        self.assertEqual(
            clean_draft_snippet("DRAFT: As above © 2024 Paradox Interactive"),
            "DRAFT: As above.",
        )

    def test_missing_as_before_above_is_repaired(self):
        self.assertEqual(
            clean_draft_snippet("DRAFT: above."),
            "DRAFT: As above.",
        )

    def test_double_capital_word_start_is_collapsed(self):
        # Icon letter visually fuses with the real capital: "EEnter" -> "Enter"
        self.assertEqual(
            clean_draft_snippet("DRAFT: EEnter the ready region."),
            "DRAFT: Enter the ready region.",
        )

    def test_icon_letter_stuck_to_above_is_stripped(self):
        for noisy in ["Mlabove", "Elabove", "EJabove", "labove"]:
            with self.subTest(noisy=noisy):
                self.assertEqual(
                    clean_draft_snippet(f"DRAFT: As {noisy}."),
                    "DRAFT: As above.",
                )

    def test_bracketed_icon_letters_are_stripped(self):
        self.assertEqual(
            clean_draft_snippet("DRAFT: [U] As above."),
            "DRAFT: As above.",
        )

    def test_missing_terminator_is_added(self):
        self.assertEqual(
            clean_draft_snippet("DRAFT: Look at the top card of your library"),
            "DRAFT: Look at the top card of your library.",
        )

    def test_whitespace_is_collapsed(self):
        self.assertEqual(
            clean_draft_snippet("DRAFT:    As     above    ."),
            "DRAFT: As above.",
        )

    def test_draft_prefix_lowercase_is_normalised(self):
        self.assertEqual(
            clean_draft_snippet("draft: As above."),
            "DRAFT: As above.",
        )

    def test_trailing_tilde_is_stripped(self):
        self.assertEqual(
            clean_draft_snippet("DRAFT: As above~"),
            "DRAFT: As above.",
        )

    def test_paradox_tail_marker_is_cut(self):
        self.assertEqual(
            clean_draft_snippet("DRAFT: Do the thing. Paradox Interactive AB (publ)"),
            "DRAFT: Do the thing.",
        )


if __name__ == "__main__":
    unittest.main()
