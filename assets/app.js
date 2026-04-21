import {
  SORT_OPTIONS,
  norm,
  escapeHtml,
  renderDisc,
  renderTextWithIcons,
  cardKey,
  thumbSrc,
  computeFiltered,
  countActiveFilters,
  buildFilterSearchParams,
} from "./core.mjs";

const state = {
  data: { crypt: [], library: [] },
  q: "",
  kinds: new Set(["crypt", "library"]),
  clan: "",
  type: "",
  sort: "",
  rarities: new Set(["Common", "Uncommon", "Rare"]),
  filtered: [],
  modalIndex: -1,
  lastFocus: null,
  hideModalTimer: 0,
};

const $ = (id) => document.getElementById(id);

const BASE_TITLE = "VTES Draft Cube";

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// Reuse grid nodes across renders: card data is static, so we only rebuild the
// element the first time the card is seen. Subsequent renders just reorder +
// update dataset.idx, avoiding createElement + img re-decoding for hundreds of
// cards on every keystroke.
const cardNodeCache = new Map();

function buildCardNode(c) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "card";
  el.setAttribute("role", "listitem");
  el.setAttribute("aria-label", `${c.name}, ${c.count} copies`);
  const thumb = encodeURI(thumbSrc(c.img));
  const full = encodeURI(c.img);
  el.innerHTML = `
    <img loading="lazy" decoding="async" width="160" height="223"
         src="${thumb}" srcset="${thumb} 1x, ${full} 2x"
         alt="${escapeHtml(c.name)}">
    <span class="badge" aria-hidden="true">×${c.count}</span>
    <span class="card-name" aria-hidden="true">${escapeHtml(c.name)}</span>
  `;
  return el;
}

function render() {
  state.filtered = computeFiltered(state);
  const grid = $("grid");
  const frag = document.createDocumentFragment();
  state.filtered.forEach((c, idx) => {
    const key = cardKey(c);
    let el = cardNodeCache.get(key);
    if (!el) {
      el = buildCardNode(c);
      cardNodeCache.set(key, el);
    }
    const idxStr = String(idx);
    if (el.dataset.idx !== idxStr) el.dataset.idx = idxStr;
    frag.appendChild(el);
  });
  grid.replaceChildren(frag);

  const totalCount = state.filtered.reduce((s, c) => s + c.count, 0);
  $("count").textContent = `${state.filtered.length} unique · ${totalCount} copies`;
  $("empty").hidden = state.filtered.length !== 0;
  renderActiveFilters();
  updateResetButton();
  updateFiltersCount();
  syncUrl();
}

function updateResetButton() {
  $("reset").hidden = countActiveFilters(state) === 0;
}

function updateFiltersCount() {
  // Exclude the search box from the drawer badge (search is visible outside the drawer)
  let n = 0;
  if (state.clan) n++;
  if (state.type) n++;
  if (state.sort) n++;
  if (state.kinds.size !== 2) n++;
  if (state.rarities.size !== 3) n++;
  const badge = $("filters-count");
  if (n > 0) {
    badge.hidden = false;
    badge.textContent = String(n);
  } else {
    badge.hidden = true;
  }
}

function renderActiveFilters() {
  const host = $("active-filters");
  const chips = [];
  const mk = (label, onRemove) =>
    `<button class="filter-chip" data-rm="${onRemove}" type="button" aria-label="Remove filter ${escapeHtml(label)}">${escapeHtml(label)}<span class="x" aria-hidden="true">×</span></button>`;
  if (state.q) chips.push(mk(`"${state.q}"`, "q"));
  if (state.clan) chips.push(mk(`Clan: ${state.clan}`, "clan"));
  if (state.type) chips.push(mk(`Type: ${state.type}`, "type"));
  if (state.sort) {
    const opt = SORT_OPTIONS.find((s) => s.value === state.sort);
    if (opt) chips.push(mk(`Sort: ${opt.label}`, "sort"));
  }
  if (!state.kinds.has("crypt")) chips.push(mk("Crypt off", "kind:crypt"));
  if (!state.kinds.has("library")) chips.push(mk("Library off", "kind:library"));
  for (const r of ["Common", "Uncommon", "Rare"]) {
    if (!state.rarities.has(r)) chips.push(mk(`${r} off`, "rarity:" + r));
  }
  host.innerHTML = chips.length ? `<span class="label">Active:</span>${chips.join("")}` : "";
}

$("active-filters").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-rm]");
  if (!btn) return;
  const rm = btn.dataset.rm;
  if (rm === "q") {
    state.q = "";
    $("q").value = "";
  } else if (rm === "clan") {
    setComboValue("clan", "");
  } else if (rm === "type") {
    setComboValue("type", "");
  } else if (rm === "sort") {
    setComboValue("sort", "");
  } else if (rm.startsWith("kind:")) {
    const k = rm.slice(5);
    state.kinds.add(k);
    document.querySelector(`[data-kind="${k}"]`).setAttribute("aria-pressed", "true");
  } else if (rm.startsWith("rarity:")) {
    const r = rm.slice(7);
    state.rarities.add(r);
    document.querySelector(`[data-rarity="${r}"]`).setAttribute("aria-pressed", "true");
  }
  render();
});

/* --- URL persistence of filter state --- */
function buildFilterUrl() {
  const qs = buildFilterSearchParams(state).toString();
  return qs ? `${location.pathname}?${qs}` : location.pathname;
}

let urlSyncTimer;
function syncUrl() {
  clearTimeout(urlSyncTimer);
  urlSyncTimer = setTimeout(() => {
    if (state.modalIndex >= 0) return;
    history.replaceState(null, "", buildFilterUrl() + location.hash);
  }, 200);
}

function loadStateFromUrl() {
  const p = new URLSearchParams(location.search);
  if (p.has("q")) {
    state.q = p.get("q");
    $("q").value = state.q;
  }
  if (p.has("clan")) {
    state.clan = p.get("clan");
    setComboLabel("clan", state.clan);
  }
  if (p.has("type")) {
    state.type = p.get("type");
    setComboLabel("type", state.type);
  }
  if (p.has("sort")) {
    state.sort = p.get("sort");
    setComboLabel("sort", state.sort);
  }
  if (p.has("kinds")) {
    state.kinds = new Set(p.get("kinds").split(",").filter(Boolean));
    document
      .querySelectorAll("[data-kind]")
      .forEach((b) => b.setAttribute("aria-pressed", String(state.kinds.has(b.dataset.kind))));
  }
  if (p.has("rarities")) {
    state.rarities = new Set(p.get("rarities").split(",").filter(Boolean));
    document
      .querySelectorAll("[data-rarity]")
      .forEach((b) => b.setAttribute("aria-pressed", String(state.rarities.has(b.dataset.rarity))));
  }
  if (state.type) applyTypeConstraint();
}

/* --- preload neighbor images in modal --- */
function preloadNeighbors(idx) {
  const n = state.filtered.length;
  if (n < 2) return;
  for (const i of [(idx + 1) % n, (idx - 1 + n) % n]) {
    const im = new Image();
    im.src = encodeURI(state.filtered[i].img);
  }
}

function discList(arr, sep = " ") {
  return arr.map((d) => renderDisc(d)).join(sep);
}

function buildTags(c) {
  const tags = [];
  if (c.kind === "crypt") {
    if (c.clan) tags.push(`<span class="tag">${escapeHtml(c.clan)}</span>`);
    if (c.capacity != null) tags.push(`<span class="tag">cap ${c.capacity}</span>`);
    if (c.group) tags.push(`<span class="tag">group ${c.group}</span>`);
    if (c.title) tags.push(`<span class="tag">${escapeHtml(c.title)}</span>`);
    if (c.disciplines && c.disciplines.length) tags.push(`<span class="tag">${discList(c.disciplines)}</span>`);
  } else {
    if (c.type) tags.push(`<span class="tag">${escapeHtml(c.type)}</span>`);
    if (c.rarity) tags.push(`<span class="tag">${escapeHtml(c.rarity)}</span>`);
    if (c.cost) tags.push(`<span class="tag">${escapeHtml(c.cost)}</span>`);
    if (c.disciplines && c.disciplines.length) tags.push(`<span class="tag">${discList(c.disciplines, " ")}</span>`);
    if (c.clans && c.clans.length) tags.push(`<span class="tag">${c.clans.map(escapeHtml).join(" · ")}</span>`);
  }
  tags.push(`<span class="tag">×${c.count} in cube</span>`);
  return tags.join(" ");
}

/* --- Modal --- */
function openModal(idx, pushHistory = true) {
  if (idx < 0 || idx >= state.filtered.length) return;
  if (state.modalIndex === -1) state.lastFocus = document.activeElement;
  const firstOpen = state.modalIndex === -1;
  state.modalIndex = idx;
  // Cancel pending hide from a previous close so a rapid reopen doesn't get
  // invisibilized when the deferred `modal.hidden = true` fires.
  if (state.hideModalTimer) {
    clearTimeout(state.hideModalTimer);
    state.hideModalTimer = 0;
  }
  const c = state.filtered[idx];
  const img = $("modal-img");
  img.src = encodeURI(c.img);
  img.alt = c.name;
  img.classList.remove("zoomed");
  $("modal-name").textContent = c.name;
  $("modal-tags").innerHTML = buildTags(c);
  const textEl = $("modal-text");
  let body = c.text || "(text unavailable)";
  if (c.draft && c.draft_text) body += "\n\n" + c.draft_text;
  textEl.innerHTML = renderTextWithIcons(body);
  $("modal-counter").textContent = `${idx + 1} / ${state.filtered.length}`;
  $("modal-share").hidden = !(navigator.share || navigator.clipboard);
  preloadNeighbors(idx);

  const modal = $("modal");
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add("open"));
  document.body.style.overflow = "hidden";
  $("modal-close").focus();

  // History first, then title: browsers snapshot document.title onto the
  // outgoing entry when pushState runs. Setting the card title before
  // pushState taints the previous entry, so history.back() on close restores
  // the card title instead of BASE_TITLE.
  const hash = "#" + encodeURIComponent(c.name);
  if (firstOpen && pushHistory) {
    history.pushState({ modal: true }, "", hash);
  } else if (firstOpen) {
    // deep-link entry: keep state null so "close" doesn't escape the site
    history.replaceState(null, "", hash);
  } else {
    history.replaceState(history.state, "", hash);
  }
  document.title = `${c.name} — ${BASE_TITLE}`;
}

function stepModal(delta) {
  if (state.modalIndex < 0 || !state.filtered.length) return;
  const n = state.filtered.length;
  openModal((state.modalIndex + delta + n) % n, false);
}

function closeModal(fromPopState = false) {
  if (state.modalIndex < 0) return;
  state.modalIndex = -1;
  const modal = $("modal");
  modal.classList.remove("open");
  clearTimeout(state.hideModalTimer);
  state.hideModalTimer = setTimeout(() => {
    modal.hidden = true;
  }, 180);
  document.body.style.overflow = "";
  document.title = BASE_TITLE;
  if (state.lastFocus && state.lastFocus.focus) {
    try {
      state.lastFocus.focus();
    } catch (_) {
      /* ignore */
    }
  }
  // Rebuild the URL from live state: location.search may still hold filter
  // params from before a resetAll (e.g. deep-link into a filtered-out card
  // or any filter change made while syncUrl's debounce was pending).
  if (!fromPopState) {
    if (history.state && history.state.modal) history.back();
    else history.replaceState(null, "", buildFilterUrl());
  } else {
    history.replaceState(null, "", buildFilterUrl());
  }
}

window.addEventListener("popstate", () => {
  if (state.modalIndex >= 0) closeModal(true);
  // Belt-and-suspenders: some browsers restore the per-entry title on back
  // navigation *after* popstate fires synchronously — reassert BASE_TITLE.
  if (state.modalIndex < 0) document.title = BASE_TITLE;
});

/* --- Focus trap in modal ---
 * Visibility check via getClientRects() instead of offsetParent: the latter
 * is null for position:fixed descendants (all modal nav buttons), which would
 * wrongly filter them out and let Tab escape the dialog. */
const FOCUSABLE =
  'button:not([hidden]):not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
function isVisible(n) {
  return !n.hidden && n.getClientRects().length > 0;
}
function trapFocus(e) {
  if (state.modalIndex < 0 || e.key !== "Tab") return;
  const modal = $("modal");
  const nodes = Array.from(modal.querySelectorAll(FOCUSABLE)).filter(isVisible);
  if (!nodes.length) return;
  const first = nodes[0],
    last = nodes[nodes.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    last.focus();
    e.preventDefault();
  } else if (!e.shiftKey && document.activeElement === last) {
    first.focus();
    e.preventDefault();
  }
}

/* --- Modal image zoom (tap / click toggles) --- */
const modalImg = $("modal-img");
modalImg.addEventListener("click", (e) => {
  e.stopPropagation();
  modalImg.classList.toggle("zoomed");
});

/* --- event wiring (static) --- */
const debouncedRender = debounce(render, 120);

$("q").addEventListener("input", (e) => {
  state.q = e.target.value;
  debouncedRender();
});

// Delegated click handler for card grid — one listener instead of N
$("grid").addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (!card) return;
  const idx = Number(card.dataset.idx);
  if (Number.isFinite(idx)) openModal(idx);
});

function applyTypeConstraint() {
  if (!state.type) return;
  state.kinds.delete("crypt");
  state.kinds.add("library");
  document.querySelector('[data-kind="crypt"]').setAttribute("aria-pressed", "false");
  document.querySelector('[data-kind="library"]').setAttribute("aria-pressed", "true");
}

document.querySelectorAll("[data-kind]").forEach((b) =>
  b.addEventListener("click", () => {
    const k = b.dataset.kind;
    const turningOn = !state.kinds.has(k);
    if (turningOn) state.kinds.add(k);
    else state.kinds.delete(k);
    b.setAttribute("aria-pressed", String(turningOn));
    if (k === "crypt" && turningOn && state.type) {
      setComboValue("type", "");
    }
    render();
  }),
);

document.querySelectorAll("[data-rarity]").forEach((b) =>
  b.addEventListener("click", () => {
    const r = b.dataset.rarity;
    if (state.rarities.has(r)) state.rarities.delete(r);
    else state.rarities.add(r);
    b.setAttribute("aria-pressed", String(state.rarities.has(r)));
    render();
  }),
);

function resetAll() {
  state.q = "";
  state.clan = "";
  state.type = "";
  state.sort = "";
  state.kinds = new Set(["crypt", "library"]);
  state.rarities = new Set(["Common", "Uncommon", "Rare"]);
  $("q").value = "";
  setComboLabel("clan", "");
  setComboLabel("type", "");
  setComboLabel("sort", "");
  document.querySelectorAll("[data-kind], [data-rarity]").forEach((b) => b.setAttribute("aria-pressed", "true"));
  render();
}

$("reset").addEventListener("click", resetAll);
$("empty-reset").addEventListener("click", resetAll);

$("modal").addEventListener("click", (e) => {
  if (
    e.target.closest(".modal-info") ||
    e.target.closest(".modal-nav") ||
    e.target.closest(".modal-close") ||
    e.target.closest(".modal-share") ||
    e.target.closest("img")
  )
    return;
  closeModal();
});
$("modal-close").addEventListener("click", () => closeModal());
$("modal-prev").addEventListener("click", (e) => {
  e.stopPropagation();
  stepModal(-1);
});
$("modal-next").addEventListener("click", (e) => {
  e.stopPropagation();
  stepModal(1);
});

/* --- Web Share API --- */
$("modal-share").addEventListener("click", async (e) => {
  e.stopPropagation();
  if (state.modalIndex < 0) return;
  const c = state.filtered[state.modalIndex];
  const url = location.origin + location.pathname + "#" + encodeURIComponent(c.name);
  const payload = { title: c.name, text: `${c.name} — VTES Draft Cube`, url };
  try {
    if (navigator.share) {
      await navigator.share(payload);
      return;
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      showToast("Link copied");
      return;
    }
    showToast("Sharing not supported");
  } catch (err) {
    // AbortError = user cancelled the native sheet — stay silent
    if (err && err.name === "AbortError") return;
    showToast("Share failed");
  }
});

function showToast(msg) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-atomic", "true");
    document.body.appendChild(el);
  }
  el.textContent = msg;
  requestAnimationFrame(() => {
    el.classList.add("show");
  });
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    el.classList.remove("show");
  }, 1800);
}

/* --- Keyboard in modal --- */
document.addEventListener("keydown", (e) => {
  if (state.modalIndex < 0) {
    // Escape dismisses the mobile filter drawer even when no modal is open.
    if (e.key === "Escape" && advancedRow.classList.contains("open")) {
      closeDrawer();
    }
    return;
  }
  if (e.key === "Escape") closeModal();
  else if (e.key === "ArrowLeft") stepModal(-1);
  else if (e.key === "ArrowRight") stepModal(1);
  else if (e.key === "Tab") trapFocus(e);
});

/* --- Touch gestures in modal: swipe left/right = prev/next, swipe down = close.
 * Only trigger when the gesture starts on the image or empty modal area — not
 * inside .modal-info, where vertical pan is needed for reading card text. */
let touchStartX = 0,
  touchStartY = 0,
  touchTime = 0,
  touchStartOnInfo = false;
$("modal").addEventListener(
  "touchstart",
  (e) => {
    if (state.modalIndex < 0) return;
    const t = e.changedTouches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touchTime = Date.now();
    touchStartOnInfo = !!(e.target && e.target.closest && e.target.closest(".modal-info"));
  },
  { passive: true },
);
$("modal").addEventListener(
  "touchend",
  (e) => {
    if (state.modalIndex < 0) return;
    if (modalImg.classList.contains("zoomed")) return;
    if (touchStartOnInfo) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const dt = Date.now() - touchTime;
    if (dt >= 600) return;
    const absX = Math.abs(dx),
      absY = Math.abs(dy);
    if (absX > 60 && absX > absY * 1.5) {
      stepModal(dx < 0 ? 1 : -1);
    } else if (dy > 80 && absY > absX * 1.5) {
      closeModal();
    }
  },
  { passive: true },
);

/* --- Filter drawer (mobile) --- */
const filtersToggle = $("filters-toggle");
const advancedRow = $("controls-advanced");
const drawerBackdrop = $("drawer-backdrop");

function isMobile() {
  return window.matchMedia("(max-width: 640px)").matches;
}
function openDrawer() {
  if (!isMobile()) return;
  advancedRow.classList.add("open");
  drawerBackdrop.classList.add("open");
  filtersToggle.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
}
function closeDrawer() {
  advancedRow.classList.remove("open");
  drawerBackdrop.classList.remove("open");
  filtersToggle.setAttribute("aria-expanded", "false");
  if (state.modalIndex < 0) document.body.style.overflow = "";
}
filtersToggle.addEventListener("click", () => {
  if (advancedRow.classList.contains("open")) closeDrawer();
  else openDrawer();
});
$("drawer-close").addEventListener("click", closeDrawer);
drawerBackdrop.addEventListener("click", closeDrawer);

/* --- Sticky topbar shadow --- */
const topbar = $("topbar");
const onScroll = () => topbar.classList.toggle("scrolled", window.scrollY > 0);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* --- Combobox widget --- */
const comboConfigs = {}; // id -> { options, onChange, ... }

function initCombobox(cbId, options, onChange) {
  const root = $(cbId);
  const btn = root.querySelector(".combobox-btn");
  const label = root.querySelector(".combobox-label");
  const panel = root.querySelector(".combobox-panel");
  const list = root.querySelector(".combobox-list");
  const searchInput = root.querySelector(".combobox-search input");
  comboConfigs[root.dataset.for] = { root, options, btn, label, panel, list, searchInput, onChange };

  const renderOptions = (q = "") => {
    const nq = norm(q);
    list.innerHTML = "";
    const matches = options.filter((o) => !nq || norm(o.label).includes(nq) || norm(o.value).includes(nq));
    if (!matches.length) {
      const empty = document.createElement("div");
      empty.className = "combobox-option none";
      empty.textContent = "No matches";
      list.appendChild(empty);
      return;
    }
    for (const o of matches) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "combobox-option";
      b.setAttribute("role", "option");
      b.dataset.value = o.value;
      b.textContent = o.label;
      if (o.value === "" && !o.label) b.classList.add("none");
      list.appendChild(b);
    }
    updateSelected();
  };

  const updateSelected = () => {
    const cur = getComboState(root.dataset.for);
    list.querySelectorAll(".combobox-option").forEach((el) => {
      el.setAttribute("aria-selected", String(el.dataset.value === cur));
    });
  };

  renderOptions();

  btn.addEventListener("click", () => {
    const wasOpen = root.classList.contains("open");
    closeAllCombos();
    if (!wasOpen) {
      root.classList.add("open");
      btn.setAttribute("aria-expanded", "true");
      renderOptions("");
      if (searchInput) {
        searchInput.value = "";
        setTimeout(() => searchInput.focus(), 30);
      }
    }
  });

  if (searchInput) {
    searchInput.addEventListener("input", (e) => renderOptions(e.target.value));
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeAllCombos();
        btn.focus();
      } else if (e.key === "ArrowDown") {
        const first = list.querySelector(".combobox-option:not(.none)");
        if (first) {
          first.focus();
          e.preventDefault();
        }
      } else if (e.key === "Enter") {
        const first = list.querySelector(".combobox-option:not(.none)");
        if (first) {
          first.click();
          e.preventDefault();
        }
      }
    });
  }

  list.addEventListener("click", (e) => {
    const opt = e.target.closest(".combobox-option:not(.none)");
    if (!opt) return;
    onChange(opt.dataset.value, opt.textContent);
    closeAllCombos();
    btn.focus();
  });

  list.addEventListener("keydown", (e) => {
    const opts = Array.from(list.querySelectorAll(".combobox-option:not(.none)"));
    const idx = opts.indexOf(document.activeElement);
    if (e.key === "ArrowDown" && idx < opts.length - 1) {
      opts[idx + 1].focus();
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      if (idx > 0) {
        opts[idx - 1].focus();
        e.preventDefault();
      } else if (searchInput) {
        searchInput.focus();
        e.preventDefault();
      }
    } else if (e.key === "Escape") {
      closeAllCombos();
      btn.focus();
    } else if (e.key === "Enter" && idx >= 0) {
      opts[idx].click();
      e.preventDefault();
    }
  });
}

function closeAllCombos() {
  document.querySelectorAll(".combobox.open").forEach((cb) => {
    cb.classList.remove("open");
    const b = cb.querySelector(".combobox-btn");
    if (b) b.setAttribute("aria-expanded", "false");
  });
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".combobox")) closeAllCombos();
});

function getComboState(key) {
  if (key === "clan") return state.clan;
  if (key === "type") return state.type;
  if (key === "sort") return state.sort;
  return "";
}

function setComboLabel(key, value) {
  const cfg = comboConfigs[key];
  if (!cfg) return;
  const opt = cfg.options.find((o) => o.value === value);
  // Orphan value (e.g. stale URL param pointing to a clan that no longer
  // exists): fall back to the empty state rather than showing a placeholder
  // label with an "active" styling on the button.
  if (value && !opt) {
    setComboValue(key, "");
    return;
  }
  const ph = !value;
  cfg.label.textContent = opt ? opt.label : key === "clan" ? "All clans" : key === "type" ? "All types" : "Default";
  cfg.label.classList.toggle("ph", ph);
  cfg.btn.classList.toggle("active", !ph);
}

function setComboValue(key, value) {
  if (key === "clan") state.clan = value;
  else if (key === "type") state.type = value;
  else if (key === "sort") state.sort = value;
  setComboLabel(key, value);
}

/* --- data load --- */

fetch("data/cards.json")
  .then((r) => {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  })
  .then((data) => {
    data.crypt.forEach((c) => {
      c.kind = "crypt";
    });
    data.library.forEach((c) => {
      c.kind = "library";
    });
    state.data = data;

    const clans = [...new Set(data.crypt.map((c) => c.clan).filter(Boolean))].sort();
    initCombobox(
      "cb-clan",
      [{ value: "", label: "All clans" }, ...clans.map((c) => ({ value: c, label: c }))],
      (val) => {
        state.clan = val;
        setComboLabel("clan", val);
        render();
      },
    );

    const types = [...new Set(data.library.flatMap((c) => (c.type || "").split(/,\s*/).filter(Boolean)))].sort();
    initCombobox(
      "cb-type",
      [{ value: "", label: "All types" }, ...types.map((t) => ({ value: t, label: t }))],
      (val) => {
        state.type = val;
        setComboLabel("type", val);
        applyTypeConstraint();
        render();
      },
    );

    initCombobox("cb-sort", SORT_OPTIONS, (val) => {
      state.sort = val;
      setComboLabel("sort", val);
      render();
    });

    const cryptCopies = data.crypt.reduce((s, c) => s + c.count, 0);
    const libCopies = data.library.reduce((s, c) => s + c.count, 0);
    $("summary").textContent =
      `${data.crypt.length} crypt (${cryptCopies}) · ${data.library.length} library (${libCopies})`;

    $("loading").hidden = true;
    loadStateFromUrl();
    render();

    // Deep link: open card from URL hash. If the card exists but is hidden
    // by active filters, reset filters silently and open it anyway.
    let hash = "";
    try {
      hash = decodeURIComponent(location.hash.replace(/^#/, ""));
    } catch (_) {
      hash = "";
    }
    if (hash) {
      let idx = state.filtered.findIndex((c) => c.name === hash);
      if (idx < 0) {
        const all = [...state.data.crypt, ...state.data.library];
        if (all.some((c) => c.name === hash)) {
          resetAll();
          idx = state.filtered.findIndex((c) => c.name === hash);
        }
      }
      if (idx >= 0) openModal(idx, false);
    }
  })
  .catch((e) => {
    $("loading").hidden = true;
    $("grid").innerHTML = `<div class="empty">Failed to load data/cards.json: ${escapeHtml(e.message)}</div>`;
  });

/* --- PWA service worker --- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* SW registration is best-effort */
    });
  });
}
