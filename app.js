import * as fmt from "./format.js";
import { el } from "./dom.js";

const TOKEN_KEY = "dong-gh-sync";
const REPO = "Dong-Xuyong/progress-sync";
// GhSync.load(appId) reads `${appId}.json` from REPO; the root file wins, the nested one is the fallback.
const DATA_PATHS = ["finance", "progress-sync/finance"];
const FIXTURES = { 1: "fixtures/finance.sample.json", nulls: "fixtures/finance.nulls.json" };
const REFRESH_MS = 60_000;

const VIEWS = [
  { id: "months", label: "Months", load: () => import("./views/months.js") },
  { id: "subs", label: "Subs", load: () => import("./views/subs.js") },
  { id: "savings", label: "Savings", load: () => import("./views/savings.js") },
  { id: "budget", label: "Budget", load: () => import("./views/budget.js") },
];

const params = new URLSearchParams(location.search);
const FIXTURE_URL = FIXTURES[params.get("demo")] || null;
const DEMO = !!FIXTURE_URL;

const state = {
  data: null,
  source: null,
  loading: false,
  error: null,
  lastSync: null,
  view: null,
  viewState: Object.fromEntries(VIEWS.map((v) => [v.id, {}])),
};

const $ = (id) => document.getElementById(id);

function readToken() {
  try {
    const cfg = JSON.parse(localStorage.getItem(TOKEN_KEY) || "null");
    return cfg && typeof cfg.token === "string" && cfg.token.trim() ? cfg : null;
  } catch (_) {
    return null;
  }
}

function saveToken(token) {
  const value = String(token || "").trim();
  if (!value) return false;
  const prev = readToken();
  localStorage.setItem(TOKEN_KEY, JSON.stringify({ ...(prev || {}), token: value, repo: (prev && prev.repo) || REPO }));
  return true;
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function validate(data) {
  if (!data || typeof data !== "object") throw new Error("finance.json is empty or not an object");
  if (data.app !== "finance") throw new Error(`Unexpected app "${data.app}" in finance.json`);
  if (data.version !== 1) throw new Error(`Unsupported finance.json version ${data.version}; this page reads v1`);
  return data;
}

async function loadRemote() {
  const gh = window.GhSync;
  if (!gh || typeof gh.load !== "function") throw new Error("GitHub sync script failed to load");
  for (const path of DATA_PATHS) {
    let incoming = null;
    await gh.load(path, (d) => {
      incoming = d;
    });
    if (incoming) return { data: incoming, source: `${REPO}/${path}.json` };
  }
  throw new Error(`finance.json not found in ${REPO} (tried ${DATA_PATHS.map((p) => p + ".json").join(", ")})`);
}

async function loadDemo() {
  const res = await fetch(FIXTURE_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not load ${FIXTURE_URL} (${res.status})`);
  return { data: await res.json(), source: FIXTURE_URL };
}

async function refresh() {
  if (state.loading) return;
  if (!DEMO && !readToken()) {
    state.data = null;
    renderChrome();
    return;
  }
  state.loading = true;
  state.error = null;
  renderChrome();
  try {
    const { data, source } = DEMO ? await loadDemo() : await loadRemote();
    state.data = validate(data);
    state.source = source;
    state.lastSync = new Date();
  } catch (err) {
    state.error = err && err.message ? String(err.message) : "Could not load finance data";
  } finally {
    state.loading = false;
    renderChrome();
    renderView();
  }
}

function currentViewId() {
  const id = location.hash.replace(/^#\/?/, "").split("?")[0];
  return VIEWS.some((v) => v.id === id) ? id : VIEWS[0].id;
}

function renderChrome() {
  const connected = DEMO || !!readToken();
  const showConnect = !connected || state.settingsOpen;
  $("connect").hidden = !showConnect;
  $("connect-clear").hidden = !readToken();
  $("connect-cancel").hidden = !connected;
  $("demo-banner").hidden = !DEMO;
  $("tabs").hidden = !connected;
  $("views").hidden = !connected || !!state.settingsOpen;
  $("main").setAttribute("aria-busy", state.loading ? "true" : "false");

  const label = $("sync-label");
  const text = $("sync-text");
  let mode;
  let msg;
  if (!connected) {
    mode = "off";
    msg = "Not connected";
  } else if (state.loading) {
    mode = "busy";
    msg = "Syncing…";
  } else if (state.error) {
    mode = "off";
    msg = state.error;
  } else if (DEMO) {
    mode = "demo";
    msg = "Example data";
  } else {
    mode = "ok";
    msg = "Updated " + fmt.dateTime(state.data && state.data.updatedAt);
  }
  label.className = "topbar-sync topbar-sync-" + mode;
  label.title = state.source ? `${msg} · ${state.source}` : msg;
  text.textContent = msg;

  $("connect-error").hidden = !state.error || connected;
  $("connect-error").textContent = state.error || "";
  const err = $("load-error");
  err.hidden = !state.error || !connected;
  $("load-error-text").textContent = state.error || "";

  for (const btn of document.querySelectorAll(".tabs-btn")) {
    if (btn.dataset.view === currentViewId()) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  }
}

function viewContext(id) {
  const currency = (state.data && state.data.currency) || "EUR";
  return {
    fmt,
    el,
    currency,
    money: (v, opts) => fmt.money(v, { currency, ...opts }),
    signedMoney: (v, opts) => fmt.signedMoney(v, { currency, ...opts }),
    demo: DEMO,
    state: state.viewState[id],
    rerender: () => renderView(),
  };
}

let renderSeq = 0;

async function renderView() {
  const id = currentViewId();
  for (const v of VIEWS) $("view-" + v.id).hidden = v.id !== id;
  renderChrome();
  if (!state.data) return;
  const root = $("view-" + id);
  const seq = ++renderSeq;
  try {
    const mod = await VIEWS.find((v) => v.id === id).load();
    if (seq !== renderSeq) return;
    mod.render(root, state.data, viewContext(id));
  } catch (err) {
    if (seq !== renderSeq) return;
    console.error(err);
    root.replaceChildren(
      el(
        "div",
        { class: "card notice notice-error" },
        el("h2", { class: "card-title" }, "This view failed to render"),
        el("p", { class: "muted" }, String((err && err.message) || err))
      )
    );
  }
}

function openSettings(open) {
  state.settingsOpen = open;
  renderChrome();
  if (open) $("token-input").focus();
  else renderView();
}

function bind() {
  $("tabs-track").replaceChildren(
    ...VIEWS.map((v) => el("a", { class: "tabs-btn", href: "#" + v.id, dataset: { view: v.id } }, v.label))
  );
  for (const v of VIEWS) {
    $("views").append(el("section", { id: "view-" + v.id, class: "view", dataset: { view: v.id }, "aria-label": v.label, hidden: true }));
  }

  window.addEventListener("hashchange", () => renderView());
  $("refresh-btn").addEventListener("click", () => refresh());
  $("settings-btn").addEventListener("click", () => openSettings(!state.settingsOpen));
  $("connect-cancel").addEventListener("click", () => openSettings(false));
  $("error-retry").addEventListener("click", () => refresh());

  $("connect-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("token-input");
    if (!saveToken(input.value)) {
      input.focus();
      return;
    }
    input.value = "";
    state.settingsOpen = false;
    refresh();
  });
  $("connect-clear").addEventListener("click", () => {
    clearToken();
    state.data = null;
    state.error = null;
    state.settingsOpen = false;
    renderChrome();
  });

  window.addEventListener("focus", () => {
    if (!DEMO) refresh();
  });
  setInterval(() => {
    if (!DEMO && document.visibilityState === "visible") refresh();
  }, REFRESH_MS);
}

bind();
renderView();
refresh();
