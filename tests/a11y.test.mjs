/* axe-core a11y regression: boots app.js inside jsdom against a small
 * fixture, lets the grid + modal render, then runs axe-core against the
 * fully hydrated DOM. Lighthouse only audits the static index.html in CI;
 * this catches violations that appear after data renders (cards, filters,
 * modal). Critical/serious blocks the build; minor/moderate are observed
 * but allowed. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import axe from "axe-core";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const fixture = {
  crypt: [
    {
      name: "Alice Example",
      clan: "Brujah",
      count: 2,
      img: "images/crypt/alice.webp",
      capacity: 5,
      group: "4",
      disciplines: ["cel", "pot"],
      text: "Test crypt card.",
    },
  ],
  library: [
    {
      name: "Govern the Unaligned",
      rarity: "Common",
      count: 3,
      img: "images/library-common/govern.webp",
      type: "Action",
      clans: ["Tremere"],
      disciplines: ["dom"],
      text: "[dom] Test text.",
      draft: false,
      draft_text: "",
    },
  ],
};

const html = readFileSync(resolve(ROOT, "index.html"), "utf8").replace(/<script\s+type="module"[^>]*><\/script>/i, "");
const dom = new JSDOM(html, { url: "http://localhost/", pretendToBeVisual: true });

function expose(name, value) {
  Object.defineProperty(globalThis, name, { value, writable: true, configurable: true });
}
expose("window", dom.window);
expose("document", dom.window.document);
expose("location", dom.window.location);
expose("history", dom.window.history);
expose("navigator", dom.window.navigator);
expose("Image", dom.window.Image);
expose("Event", dom.window.Event);
expose("HTMLElement", dom.window.HTMLElement);
expose("requestAnimationFrame", dom.window.requestAnimationFrame?.bind(dom.window) ?? ((cb) => setTimeout(cb, 0)));
expose("fetch", async (url) => {
  if (url === "data/cards.json") {
    return { ok: true, status: 200, json: async () => fixture };
  }
  return { ok: false, status: 404, json: async () => ({}) };
});

await import("../assets/app.js");
await new Promise((r) => setTimeout(r, 60));

test("axe-core: hydrated grid has no critical or serious WCAG violations", async () => {
  // Inject axe runtime into the jsdom window so it walks the live document.
  dom.window.eval(axe.source);

  const results = await dom.window.axe.run(dom.window.document, {
    // Stay on stable WCAG 2.1 A/AA rules. Skip color-contrast: jsdom doesn't
    // paint, so contrast assertions are unreliable — Lighthouse covers it
    // against the real rendered page.
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    rules: {
      "color-contrast": { enabled: false },
    },
  });

  const blocking = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");

  if (blocking.length > 0) {
    const summary = blocking
      .map((v) => {
        const nodes = v.nodes.map((n) => `      ${n.html}`).join("\n");
        return `  • [${v.impact}] ${v.id}: ${v.help}\n${nodes}\n      see: ${v.helpUrl}`;
      })
      .join("\n");
    assert.fail(`axe-core found ${blocking.length} blocking violation(s):\n${summary}`);
  }
});
