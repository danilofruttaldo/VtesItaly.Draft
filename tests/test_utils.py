"""Tests for scripts/_utils.py::download_atomic against a local HTTP server."""

from __future__ import annotations

import http.client
import http.server
import sys
import tempfile
import threading
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from _utils import download_atomic  # noqa: E402


class _Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        if self.path == "/ok":
            self.send_header("Content-Length", "5")
            self.end_headers()
            self.wfile.write(b"hello")
        else:
            # Promise 1000 bytes, send 7, hang up: a truncated download.
            self.send_header("Content-Length", "1000")
            self.end_headers()
            self.wfile.write(b"partial")
            self.wfile.flush()
            self.close_connection = True

    def log_message(self, *args):
        pass


class DownloadAtomicTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.HTTPServer(("127.0.0.1", 0), _Handler)
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def test_complete_download_lands_at_dest(self):
        download_atomic(f"{self.base}/ok", self.dir / "card.webp", timeout=5)
        self.assertEqual((self.dir / "card.webp").read_bytes(), b"hello")
        self.assertEqual([p.name for p in self.dir.iterdir()], ["card.webp"])

    def test_truncated_download_leaves_no_file(self):
        with self.assertRaises(http.client.IncompleteRead):
            download_atomic(f"{self.base}/truncated", self.dir / "card.webp", timeout=5)
        self.assertEqual(list(self.dir.iterdir()), [])


if __name__ == "__main__":
    unittest.main()
