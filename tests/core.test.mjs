import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ICON_TOKENS,
  SORT_OPTIONS,
  RARITY_ORDER,
  norm,
  escapeHtml,
  renderDisc,
  renderTextWithIcons,
  cardKey,
  matchSearch,
  sortItems,
  computeFiltered,
  countActiveFilters,
  buildFilterSearchParams,
} from "../assets/core.mjs";

/* --- norm --- */

test("norm lowercases and strips diacritics", () => {
  assert.equal(norm("Gädeke"), "gadeke");
  assert.equal(norm("Éloïse"), "eloise");
  assert.equal(norm("Brujah"), "brujah");
});

test("norm handles null/undefined/empty without throwing", () => {
  assert.equal(norm(null), "");
  assert.equal(norm(undefined), "");
  assert.equal(norm(""), "");
});

/* --- escapeHtml --- */

test("escapeHtml escapes HTML-dangerous characters", () => {
  assert.equal(escapeHtml("<script>"), "&lt;script&gt;");
  assert.equal(escapeHtml(`"quoted"`), "&quot;quoted&quot;");
  assert.equal(escapeHtml("a & b"), "a &amp; b");
  assert.equal(escapeHtml("it's"), "it&#39;s");
});

/* --- renderDisc --- */

test("renderDisc renders lowercase token as lowercase pill", () => {
  const html = renderDisc("aus");
  assert.match(html, /class="disc disc-aus"/);
  assert.match(html, />aus</);
});

test("renderDisc renders 3-letter uppercase as superior discipline", () => {
  const html = renderDisc("AUS");
  assert.match(html, /class="disc disc-aus sup"/);
  assert.match(html, />AUS</);
});

/* --- renderTextWithIcons (bug #1 regression) --- */

test("renderTextWithIcons converts short discipline tokens to pills", () => {
  const out = renderTextWithIcons("Requires [aus] and [DOM].");
  assert.match(out, /<span class="disc disc-aus"/);
  assert.match(out, /<span class="disc disc-dom sup"/);
});

test("renderTextWithIcons converts long clan tokens to pills (>8 chars)", () => {
  // Regression: previous regex capped at 8 chars, silently dropping pills for
  // malkavian/cappadocian/abomination/ahrimanes/harbingers/daughters/followers.
  const longTokens = ["malkavian", "cappadocian", "abomination", "ahrimanes", "harbingers", "daughters", "followers"];
  for (const tok of longTokens) {
    const out = renderTextWithIcons(`Prefix [${tok}] suffix`);
    assert.match(out, new RegExp(`<span class="disc disc-${tok}"`), `token ${tok} should render as pill`);
  }
});

test("renderTextWithIcons leaves non-token bracketed text as literal", () => {
  const out = renderTextWithIcons("See [above] note.");
  assert.equal(out.includes("disc-"), false);
  assert.match(out, /\[above\]/);
});

test("renderTextWithIcons escapes surrounding HTML", () => {
  const out = renderTextWithIcons("<b>[aus]</b>");
  assert.match(out, /&lt;b&gt;/);
  assert.match(out, /<span class="disc/);
});

test("renderTextWithIcons returns empty string for empty input", () => {
  assert.equal(renderTextWithIcons(""), "");
  assert.equal(renderTextWithIcons(null), "");
});

/* --- cardKey --- */

test("cardKey combines kind and name", () => {
  assert.equal(cardKey({ kind: "crypt", name: "Alice" }), "crypt:Alice");
  assert.equal(cardKey({ kind: "library", name: "Govern the Unaligned" }), "library:Govern the Unaligned");
});

/* --- matchSearch --- */

const aliceCrypt = {
  name: "Alice",
  kind: "crypt",
  clan: "Brujah",
  disciplines: ["cel", "pot"],
  text: "She can take a hit.",
  count: 1,
};

const govern = {
  name: "Govern the Unaligned",
  kind: "library",
  type: "Action",
  clans: ["Tremere"],
  disciplines: ["dom"],
  text: "(D) +1 stealth.",
  rarity: "Common",
  count: 3,
};

test("matchSearch returns true for empty query", () => {
  assert.equal(matchSearch(aliceCrypt, ""), true);
});

test("matchSearch matches name", () => {
  assert.equal(matchSearch(aliceCrypt, norm("alice")), true);
  assert.equal(matchSearch(aliceCrypt, norm("bob")), false);
});

test("matchSearch matches across text/clan/discipline fields", () => {
  assert.equal(matchSearch(aliceCrypt, norm("brujah")), true);
  assert.equal(matchSearch(aliceCrypt, norm("cel")), true);
  assert.equal(matchSearch(govern, norm("tremere")), true);
  assert.equal(matchSearch(govern, norm("action")), true);
});

test("matchSearch is accent-insensitive", () => {
  const gadeke = { ...aliceCrypt, name: "Gädeke" };
  assert.equal(matchSearch(gadeke, norm("gadeke")), true);
});

/* --- sortItems --- */

test("sortItems returns original when sort key empty", () => {
  const input = [
    { name: "B", count: 1 },
    { name: "A", count: 1 },
  ];
  assert.equal(sortItems(input, ""), input);
});

test("sortItems name ascending / descending", () => {
  const input = [
    { name: "Charlie", count: 1 },
    { name: "Alice", count: 1 },
    { name: "Bob", count: 1 },
  ];
  assert.deepEqual(
    sortItems(input, "name").map((c) => c.name),
    ["Alice", "Bob", "Charlie"],
  );
  assert.deepEqual(
    sortItems(input, "name-desc").map((c) => c.name),
    ["Charlie", "Bob", "Alice"],
  );
});

test("sortItems by count breaks ties with name", () => {
  const input = [
    { name: "Bob", count: 2 },
    { name: "Alice", count: 3 },
    { name: "Charlie", count: 2 },
  ];
  assert.deepEqual(
    sortItems(input, "count").map((c) => c.name),
    ["Alice", "Bob", "Charlie"],
  );
});

test("sortItems by capacity pushes non-crypt to the end", () => {
  const input = [
    { name: "L", kind: "library", count: 1 },
    { name: "B", kind: "crypt", capacity: 5, count: 1 },
    { name: "A", kind: "crypt", capacity: 3, count: 1 },
  ];
  assert.deepEqual(
    sortItems(input, "capacity").map((c) => c.name),
    ["A", "B", "L"],
  );
});

test("sortItems by rarity uses RARITY_ORDER, ties break on name", () => {
  const input = [
    { name: "Z", kind: "library", rarity: "Rare", count: 1 },
    { name: "B", kind: "library", rarity: "Common", count: 1 },
    { name: "A", kind: "library", rarity: "Uncommon", count: 1 },
  ];
  assert.deepEqual(
    sortItems(input, "rarity").map((c) => c.name),
    ["B", "A", "Z"],
  );
});

test("sortItems does not mutate the input array", () => {
  const input = [
    { name: "B", count: 1 },
    { name: "A", count: 1 },
  ];
  const copy = input.slice();
  sortItems(input, "name");
  assert.deepEqual(input, copy);
});

/* --- computeFiltered --- */

function buildState(overrides = {}) {
  return {
    q: "",
    kinds: new Set(["crypt", "library"]),
    clan: "",
    type: "",
    sort: "",
    rarities: new Set(["Common", "Uncommon", "Rare"]),
    data: {
      crypt: [aliceCrypt, { ...aliceCrypt, name: "Bob", clan: "Ventrue" }],
      library: [govern, { ...govern, name: "Deflection", type: "Reaction", rarity: "Common", clans: ["Ventrue"] }],
    },
    ...overrides,
  };
}

test("computeFiltered returns all cards for empty filters", () => {
  const state = buildState();
  const out = computeFiltered(state);
  assert.equal(out.length, 4);
});

test("computeFiltered hides crypt when kinds excludes it", () => {
  const state = buildState({ kinds: new Set(["library"]) });
  const out = computeFiltered(state);
  assert.equal(
    out.every((c) => c.kind === "library"),
    true,
  );
  assert.equal(out.length, 2);
});

test("computeFiltered filters by clan on crypt and library separately", () => {
  const state = buildState({ clan: "Brujah" });
  const out = computeFiltered(state);
  // Crypt: only Alice matches; library: none (govern has Tremere, deflection has Ventrue)
  assert.deepEqual(
    out.map((c) => c.name),
    ["Alice"],
  );
});

test("computeFiltered filters library by type via comma-split", () => {
  // `type` only constrains library cards; the real app also forces kinds=library
  // when a type is chosen (applyTypeConstraint in app.js).
  const state = buildState({ type: "Action", kinds: new Set(["library"]) });
  const out = computeFiltered(state);
  assert.equal(out.length > 0, true);
  assert.equal(
    out.every((c) => c.kind === "library" && c.type.includes("Action")),
    true,
  );
});

test("computeFiltered filters by rarity set", () => {
  const state = buildState({ rarities: new Set(["Rare"]) });
  const out = computeFiltered(state);
  // No rare library in fixture → library block empty, crypt still shows
  assert.equal(
    out.every((c) => c.kind === "crypt"),
    true,
  );
});

test("computeFiltered applies search query in combination with filters", () => {
  const state = buildState({ q: "tremere", kinds: new Set(["library"]) });
  const out = computeFiltered(state);
  assert.deepEqual(
    out.map((c) => c.name),
    ["Govern the Unaligned"],
  );
});

/* --- countActiveFilters --- */

test("countActiveFilters reports 0 for default state", () => {
  assert.equal(countActiveFilters(buildState()), 0);
});

test("countActiveFilters counts each active filter once", () => {
  const state = buildState({
    q: "alice",
    clan: "Brujah",
    type: "Action",
    sort: "name",
    kinds: new Set(["library"]),
    rarities: new Set(["Common"]),
  });
  assert.equal(countActiveFilters(state), 6);
});

/* --- buildFilterSearchParams --- */

test("buildFilterSearchParams emits only active filters", () => {
  const state = buildState({ q: "alice", clan: "Brujah" });
  const p = buildFilterSearchParams(state);
  assert.equal(p.get("q"), "alice");
  assert.equal(p.get("clan"), "Brujah");
  assert.equal(p.has("type"), false);
  assert.equal(p.has("kinds"), false);
  assert.equal(p.has("rarities"), false);
});

test("buildFilterSearchParams emits kinds/rarities when non-default", () => {
  const state = buildState({
    kinds: new Set(["library"]),
    rarities: new Set(["Common", "Rare"]),
  });
  const p = buildFilterSearchParams(state);
  assert.equal(p.get("kinds"), "library");
  assert.equal(p.get("rarities").split(",").sort().join(","), "Common,Rare");
});

/* --- constants integrity --- */

test("SORT_OPTIONS includes a default-empty option", () => {
  assert.ok(SORT_OPTIONS.some((o) => o.value === "" && o.label === "Default"));
});

test("RARITY_ORDER covers Common/Uncommon/Rare", () => {
  assert.equal(RARITY_ORDER.Common, 0);
  assert.equal(RARITY_ORDER.Uncommon, 1);
  assert.equal(RARITY_ORDER.Rare, 2);
});

test("ICON_TOKENS covers the clan tokens that exceeded the old 8-char regex", () => {
  for (const tok of ["malkavian", "cappadocian", "abomination", "harbingers"]) {
    assert.ok(ICON_TOKENS.has(tok), `ICON_TOKENS missing ${tok}`);
  }
});
