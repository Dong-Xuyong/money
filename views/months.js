// Months tab. Selected month lives in ctx.state.month and survives re-renders.

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function monthEntries(data) {
  const list = data && Array.isArray(data.months) ? data.months : [];
  return list
    .filter((month) => month && typeof month === "object")
    .sort((a, b) => String(a.month || "").localeCompare(String(b.month || "")));
}

function flowMax(months, isNum) {
  let max = null;
  for (const month of months) {
    const combined = asObject(month.combined);
    for (const key of ["in", "out"]) {
      const value = combined[key];
      if (isNum(value) && (max === null || value > max)) max = value;
    }
  }
  return max;
}

/**
 * @param {HTMLElement} root
 * @param {object} data
 * @param {{ el: Function, fmt: object, money: Function, signedMoney: Function, state: object, rerender: Function }} ctx
 */
export function render(root, data, ctx) {
  const { el, fmt } = ctx;
  const months = monthEntries(data);
  if (!months.length) {
    root.replaceChildren(el("div", { class: "card empty" }, el("p", { class: "muted" }, "No months in finance.json yet.")));
    return;
  }

  const selected = months.find((month) => month.month === ctx.state.month) || months[months.length - 1];
  const select = (month) => {
    ctx.state.month = month;
    ctx.rerender();
  };

  let selectedChip = null;
  const chips = months.map((month) => {
    const pressed = month === selected;
    const chip = el(
      "button",
      {
        type: "button",
        class: "chip",
        "aria-pressed": pressed ? "true" : "false",
        onclick: () => select(month.month),
      },
      fmt.monthLabel(month.month)
    );
    if (pressed) selectedChip = chip;
    return chip;
  });

  const summary = summaryCard(el, fmt, ctx, data, selected);
  const chart = chartCard(el, fmt, ctx, months, selected, select);

  root.replaceChildren(el("div", { class: "card" }, el("div", { class: "chips" }, chips)), summary, chart);
  if (selectedChip) selectedChip.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function summaryCard(el, fmt, ctx, data, month) {
  const combined = asObject(month.combined);
  const accounts = Array.isArray(data.accounts) ? data.accounts : [];
  const flows = asObject(month.accounts);
  const seen = new Set();

  const accountRows = [];
  for (const account of accounts) {
    if (!account || typeof account !== "object") continue;
    const id = account.id;
    if (id != null) seen.add(String(id));
    const name = typeof account.name === "string" && account.name ? account.name : id != null ? String(id) : "—";
    accountRows.push(accountRow(el, ctx, fmt, name, id != null ? flows[id] : null));
  }
  for (const id of Object.keys(flows)) {
    if (seen.has(id)) continue;
    accountRows.push(accountRow(el, ctx, fmt, id, flows[id]));
  }

  const noteTexts = Array.isArray(month.notes) ? month.notes.filter((note) => typeof note === "string" && note !== "") : [];
  const notes = noteTexts.length ? el("ul", { class: "note-list" }, noteTexts.map((note) => el("li", {}, note))) : null;

  return el(
    "div",
    { class: "card" },
    el(
      "div",
      { class: "card-head" },
      el("h2", { class: "card-title" }, fmt.monthLabel(month.month)),
      month.partial ? el("span", { class: "badge badge-partial" }, "Partial") : null
    ),
    el(
      "div",
      { class: "stats" },
      stat(el, "In", ctx.money(combined.in)),
      stat(el, "Out", ctx.money(combined.out)),
      stat(el, "Net", ctx.signedMoney(combined.net), "tone-" + fmt.tone(combined.net))
    ),
    el(
      "table",
      { class: "table" },
      el(
        "thead",
        {},
        el("tr", {}, el("th", {}, "Account"), el("th", {}, "In"), el("th", {}, "Out"), el("th", {}, "Net"))
      ),
      el("tbody", {}, accountRows, el("tr", { class: "is-total" }, el("td", {}, "Combined"), ...flowCells(el, ctx, fmt, combined)))
    ),
    notes
  );
}

function stat(el, label, value, tone) {
  return el(
    "div",
    { class: "stat" },
    el("span", { class: "label" }, label),
    el("span", { class: tone ? "stat-value " + tone : "stat-value" }, value)
  );
}

function accountRow(el, ctx, fmt, name, flow) {
  return el("tr", {}, el("td", {}, name), ...flowCells(el, ctx, fmt, flow));
}

function flowCells(el, ctx, fmt, flow) {
  const src = flow && typeof flow === "object" ? flow : {};
  return [
    el("td", {}, ctx.money(src.in)),
    el("td", {}, ctx.money(src.out)),
    el("td", { class: "tone-" + fmt.tone(src.net) }, ctx.signedMoney(src.net)),
  ];
}

function chartCard(el, fmt, ctx, months, selected, select) {
  const max = flowMax(months, fmt.isNum);
  const columns = months.map((month) => {
    const combined = asObject(month.combined);
    const text = fmt.monthLabel(month.month) + ": in " + ctx.money(combined.in) + ", out " + ctx.money(combined.out);
    return el(
      "button",
      {
        type: "button",
        class: "bar-col",
        "aria-pressed": month === selected ? "true" : "false",
        "aria-label": text,
        title: text,
        onclick: () => select(month.month),
      },
      el("div", { class: "bar-stack" }, bar(el, fmt, "in", combined.in, max), bar(el, fmt, "out", combined.out, max)),
      el("div", { class: "bar-label" }, fmt.monthLabel(month.month, { short: true }))
    );
  });

  return el(
    "div",
    { class: "card" },
    el("h2", { class: "card-title" }, "In vs out"),
    el("div", { class: "bars" }, columns),
    el(
      "div",
      { class: "legend" },
      legendItem(el, "bar-in", "In"),
      legendItem(el, "bar-out", "Out"),
      legendItem(el, "bar-unknown", "Unknown")
    )
  );
}

function bar(el, fmt, kind, value, max) {
  if (!fmt.isNum(value)) return el("div", { class: "bar bar-unknown", style: { height: "12%" } });
  const height = !fmt.isNum(max) || max === 0 ? "0%" : (value / max) * 100 + "%";
  return el("div", { class: "bar bar-" + kind, style: { height } });
}

function legendItem(el, barClass, label) {
  return el("span", {}, el("span", { class: "legend-dot " + barClass, "aria-hidden": "true" }), label);
}
