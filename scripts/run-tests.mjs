/* Cross-platform test discovery + runner for both the JS core module and the
 * Python OCR cleanup pipeline.
 *
 * `node --test` accepts file paths, not glob patterns. Shell globbing for
 * `tests/**` requires bash `globstar`, which is OFF in most non-interactive
 * shells (including the Ubuntu runner used by GitHub Actions), so we walk
 * tests/ with node:fs and spawn `node --test` on the collected files.
 *
 * Then we run Python unittests via `python -m unittest discover` so a single
 * `npm test` invocation covers everything. If python isn't on PATH we skip
 * the Python pack rather than failing — CI has Python installed, and local
 * contributors editing JS shouldn't be blocked by missing Python.
 */
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function findJsTests(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...findJsTests(p));
    } else if (/\.test\.m?js$/.test(entry.name)) {
      out.push(p);
    }
  }
  return out;
}

function hasPythonTests(dir) {
  return readdirSync(dir).some((n) => /^test_.+\.py$/.test(n));
}

function run(cmd, args, label) {
  const res = spawnSync(cmd, args, { stdio: "inherit", cwd: ROOT });
  if (res.status !== 0) {
    console.error(`\n${label} failed with exit code ${res.status}`);
    process.exit(res.status ?? 1);
  }
}

const jsFiles = findJsTests(join(ROOT, "tests"));
if (jsFiles.length === 0) {
  console.error("run-tests: no *.test.mjs files found under tests/");
  process.exit(1);
}
run(process.execPath, ["--test", ...jsFiles], "node --test");

if (hasPythonTests(join(ROOT, "tests"))) {
  const py = process.platform === "win32" ? "python" : "python3";
  const probe = spawnSync(py, ["--version"], { stdio: "ignore" });
  if (probe.status === 0) {
    run(py, ["-m", "unittest", "discover", "-s", "tests", "-p", "test_*.py"], "python unittest");
  } else {
    console.warn(`run-tests: ${py} not found — skipping Python suite (JS tests still ran)`);
  }
}
