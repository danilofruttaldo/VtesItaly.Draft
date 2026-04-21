/* End-to-end smoke test: boot the real app.js against a jsdom-hosted
 * index.html, stub fetch to serve a tiny cards.json, and exercise the main
 * user flows (grid render → search → click → modal).
 *
 * JSDOM does not execute <script type="module"> tags, so we can't let it
 * bootstrap app.js on its own. Instead we set up the window globals the
 * module expects, then `await import("../assets/app.js")` to run the real
 * code inside the Node process with jsdom as its DOM. Because the module
 * graph is cached, every assertion happens in one test against one app
 * instance — tests 2/3/... here are assertion steps within a single flow.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

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
    {
      name: "Bob Sample",
      clan: "Ventrue",
      count: 1,
      img: "images/crypt/bob.webp",
      capacity: 3,
      group: "4",
      disciplines: ["dom"],
      text: "Another crypt.",
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

// Load index.html as the document, but strip the module <script> so jsdom
// doesn't try to fetch it (we'll run the real script via dynamic import).
const html = readFileSync(resolve(ROOT, "index.html"), "utf8").replace(/<script\s+type="module"[^>]*><\/script>/i, "");
const dom = new JSDOM(html, { url: "http://localhost/", pretendToBeVisual: true });

// Some Node 24+ globals (navigator, location) are read-only getters on the
// module globalThis, so we use defineProperty with configurable:true to
// replace them with jsdom's counterparts.
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
    return {
      ok: true,
      status: 200,
      json: async () => fixture,
    };
  }
  return { ok: false, status: 404, json: async () => ({}) };
});

await import("../assets/app.js");
// Let the top-level `fetch().then(render)` chain settle.
await new Promise((r) => setTimeout(r, 60));

test("DOM smoke: grid renders the fixture", () => {
  const cards = document.querySelectorAll(".card");
  assert.equal(cards.length, 3, "expected 2 crypt + 1 library");
});

test("DOM smoke: summary reports crypt / library totals", () => {
  const summary = document.getElementById("summary").textContent;
  assert.match(summary, /2 crypt \(3\)/);
  assert.match(summary, /1 library \(3\)/);
});

test("DOM smoke: card <img> carries a 1x/2x srcset", () => {
  const img = document.querySelector(".card img");
  const srcset = img.getAttribute("srcset") || "";
  assert.match(srcset, /-thumb\.webp 1x/);
  assert.match(srcset, /\.webp 2x/);
});

test("DOM smoke: clicking a card opens the modal with its name", async () => {
  document.querySelector(".card").click();
  await new Promise((r) => setTimeout(r, 30));
  const modal = document.getElementById("modal");
  assert.equal(modal.hidden, false);
  assert.ok(document.getElementById("modal-name").textContent.length > 0);
  // Close for subsequent tests
  document.getElementById("modal-close").click();
  await new Promise((r) => setTimeout(r, 200));
});

test("DOM smoke: search input narrows the grid (debounced)", async () => {
  const q = document.getElementById("q");
  q.value = "Govern";
  q.dispatchEvent(new window.Event("input", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 200));
  const cards = document.querySelectorAll(".card");
  assert.equal(cards.length, 1, "only the Govern library card should match");
  assert.match(cards[0].getAttribute("aria-label"), /Govern the Unaligned/);
});

test("DOM smoke: clearing the search restores all cards", async () => {
  const q = document.getElementById("q");
  q.value = "";
  q.dispatchEvent(new window.Event("input", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(document.querySelectorAll(".card").length, 3);
});

test("DOM smoke: kind toggle filters out crypt cards", async () => {
  document.querySelector('[data-kind="crypt"]').click();
  await new Promise((r) => setTimeout(r, 30));
  const labels = [...document.querySelectorAll(".card")].map((c) => c.getAttribute("aria-label"));
  assert.equal(labels.length, 1);
  assert.match(labels[0], /Govern the Unaligned/);
  // Restore
  document.querySelector('[data-kind="crypt"]').click();
  await new Promise((r) => setTimeout(r, 30));
});
