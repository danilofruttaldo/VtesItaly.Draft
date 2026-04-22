import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const SITE = "_site";

rmSync(SITE, { recursive: true, force: true });
mkdirSync(`${SITE}/data`, { recursive: true });
mkdirSync(`${SITE}/images`, { recursive: true });

for (const f of ["index.html", "manifest.webmanifest", "sw.js", "robots.txt", ".nojekyll"]) {
  cpSync(f, `${SITE}/${f}`);
}
if (existsSync("CNAME")) cpSync("CNAME", `${SITE}/CNAME`);

cpSync("assets", `${SITE}/assets`, { recursive: true });
cpSync("data/cards.json", `${SITE}/data/cards.json`);

for (const d of ["crypt", "library-common", "library-uncommon", "library-rare"]) {
  cpSync(`images/${d}`, `${SITE}/images/${d}`, { recursive: true });
}

function dirSize(dir) {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    total += st.isDirectory() ? dirSize(p) : st.size;
  }
  return total;
}

const mb = (dirSize(SITE) / 1024 / 1024).toFixed(1);
console.log(`${SITE} staged: ${mb}MB`);
