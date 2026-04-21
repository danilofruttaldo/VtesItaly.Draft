/* Pure, DOM-free helpers extracted from app.js so tests (node --test) can
 * import them without jsdom. Mutation happens in app.js; everything here is
 * a plain transformation over inputs. */

export const SORT_OPTIONS = [
  { value: "", label: "Default" },
  { value: "name", label: "Name (A → Z)" },
  { value: "name-desc", label: "Name (Z → A)" },
  { value: "count", label: "Copies (most first)" },
  { value: "count-asc", label: "Copies (least first)" },
  { value: "capacity", label: "Capacity (crypt)" },
  { value: "rarity", label: "Rarity (library)" },
];

export const RARITY_ORDER = { Common: 0, Uncommon: 1, Rare: 2 };

/* Tokens rendered as inline pill in card text. Covers disciplines, action
 * types, modifiers, and major clan names used in [x] notation. Any [token]
 * not in this set renders as literal text, which prevents non-icon bracketed
 * words (e.g. editorial annotations) from being styled as icons. */
export const ICON_TOKENS = new Set([
  // Disciplines
  "ani",
  "aus",
  "cel",
  "chi",
  "dom",
  "for",
  "obf",
  "obt",
  "pot",
  "pre",
  "pro",
  "ser",
  "tha",
  "thn",
  "vic",
  "nec",
  "qui",
  "tem",
  "mel",
  "dem",
  "dai",
  "mul",
  "obe",
  "val",
  "vis",
  "san",
  "spi",
  "mal",
  "abo",
  // Action / card types
  "combat",
  "action",
  "reaction",
  "political",
  "ally",
  "equipment",
  "retainer",
  "power",
  // Clan tokens
  "brujah",
  "malkavian",
  "nosferatu",
  "toreador",
  "tremere",
  "ventrue",
  "gangrel",
  "lasombra",
  "tzimisce",
  "assamite",
  "ravnos",
  "giovanni",
  "setite",
  "caitiff",
  "salubri",
  "pander",
  "imbued",
  "gargoyle",
  "abomination",
  "ahrimanes",
  "akunanse",
  "baali",
  "cappadocian",
  "daughters",
  "followers",
  "guruhi",
  "harbingers",
  "ishtarri",
  "kiasyd",
  "nagaraja",
  "osebo",
  "samedi",
  "banu",
  "haqim",
  "ministry",
  // Modifiers
  "mod",
  "merged",
  "flight",
]);

/* Bound must cover the longest known token: "cappadocian"/"abomination" = 11. */
const TOKEN_RE = /\[([A-Za-z]{2,12})\]/g;

export function norm(s) {
  // Strip Unicode combining marks so accented queries match unaccented names
  // (e.g. "gadeke" matches "Gädeke").
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const HTML_ESCAPE = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => HTML_ESCAPE[c]);
}

export function renderDisc(token) {
  const lower = token.toLowerCase();
  const sup = token === token.toUpperCase() && token.length === 3;
  const cls = `disc disc-${lower}${sup ? " sup" : ""}`;
  const label = sup ? token.toUpperCase() : lower;
  return `<span class="${cls}">${escapeHtml(label)}</span>`;
}

export function renderTextWithIcons(text) {
  if (!text) return "";
  return escapeHtml(text).replace(TOKEN_RE, (m, tok) => (ICON_TOKENS.has(tok.toLowerCase()) ? renderDisc(tok) : m));
}

export function cardKey(c) {
  return c.kind + ":" + c.name;
}

export function matchSearch(c, q) {
  if (!q) return true;
  const hay = norm(
    c.name +
      " " +
      (c.text || "") +
      " " +
      (c.type || "") +
      " " +
      (c.clan || "") +
      " " +
      (c.clans || []).join(" ") +
      " " +
      (c.disciplines || []).join(" "),
  );
  return hay.includes(q);
}

export function sortItems(items, sort) {
  if (!sort) return items;
  const arr = items.slice();
  const cmpName = (a, b) => a.name.localeCompare(b.name);
  switch (sort) {
    case "name":
      arr.sort(cmpName);
      break;
    case "name-desc":
      arr.sort((a, b) => -cmpName(a, b));
      break;
    case "count":
      arr.sort((a, b) => b.count - a.count || cmpName(a, b));
      break;
    case "count-asc":
      arr.sort((a, b) => a.count - b.count || cmpName(a, b));
      break;
    case "capacity":
      // crypt cards by capacity ascending; library cards pushed to the end
      arr.sort((a, b) => {
        const ac = a.kind === "crypt" && a.capacity != null ? a.capacity : 9999;
        const bc = b.kind === "crypt" && b.capacity != null ? b.capacity : 9999;
        return ac - bc || cmpName(a, b);
      });
      break;
    case "rarity":
      // library cards by rarity; crypt cards pushed to the end
      arr.sort((a, b) => {
        const ar = a.kind === "library" ? (RARITY_ORDER[a.rarity] ?? 99) : 99;
        const br = b.kind === "library" ? (RARITY_ORDER[b.rarity] ?? 99) : 99;
        return ar - br || cmpName(a, b);
      });
      break;
  }
  return arr;
}

/* Takes the app's flat state object (q, kinds, clan, type, rarities, sort,
 * data) and returns the sorted filtered list. Caller is responsible for
 * assigning it back to state.filtered. */
export function computeFiltered(state) {
  const q = norm(state.q);
  const items = [];
  if (state.kinds.has("crypt")) {
    for (const c of state.data.crypt) {
      if (!matchSearch(c, q)) continue;
      if (state.clan && c.clan !== state.clan) continue;
      items.push(c);
    }
  }
  if (state.kinds.has("library")) {
    for (const c of state.data.library) {
      if (!matchSearch(c, q)) continue;
      if (!state.rarities.has(c.rarity)) continue;
      if (state.type && !(c.type || "").split(/,\s*/).includes(state.type)) continue;
      if (state.clan && !(c.clans || []).includes(state.clan)) continue;
      items.push(c);
    }
  }
  return sortItems(items, state.sort);
}

export function countActiveFilters(state) {
  let n = 0;
  if (state.q) n++;
  if (state.clan) n++;
  if (state.type) n++;
  if (state.sort) n++;
  if (state.kinds.size !== 2) n++;
  if (state.rarities.size !== 3) n++;
  return n;
}

export function buildFilterSearchParams(state) {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  if (state.clan) p.set("clan", state.clan);
  if (state.type) p.set("type", state.type);
  if (state.sort) p.set("sort", state.sort);
  if (state.kinds.size !== 2) p.set("kinds", [...state.kinds].join(","));
  if (state.rarities.size !== 3) p.set("rarities", [...state.rarities].join(","));
  return p;
}
