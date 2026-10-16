// Budget tab. Bucket amounts come from the file and are not recomputed from pct × income.
import { el } from "../dom.js";
import * as fmt from "../format.js";

function list(value) {
  return Array.isArray(value) ? value : [];
}

function asRecord(value) {
  return value !== null && typeof value === "object" ? value : {};
}

function displayName(record) {
  if (typeof record.name === "string" && record.name !== "") return record.name;
  if (typeof record.id === "string" && record.id !== "") return record.id;
  return fmt.DASH;
}

function displayLabel(value) {
  return typeof value === "string" && value !== "" ? value : fmt.DASH;
}

function barWidth(pct) {
  if (!fmt.isNum(pct)) return "0%";
  return Math.min(100, Math.max(0, pct)) + "%";
}

function unknownNote(count) {
  return count > 0 ? ` (+${count} unknown)` : "";
}

function isoDay(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
}

function basisCard(budget, ctx) {
  const income = fmt.isNum(budget.monthlyIncomeRef) ? ctx.money(budget.monthlyIncomeRef) + "/mo" : fmt.DASH;
  const basis = typeof budget.basis === "string" && budget.basis !== "" ? budget.basis : null;
  return el(
    "div",
    { class: "card" },
    el("div", { class: "label" }, "Reference income"),
    el("div", { class: "stat-value num" }, income),
    basis ? el("p", { class: "muted small" }, basis) : null
  );
}

function bucketRow(bucket, ctx) {
  const record = asRecord(bucket);
  const name = displayName(record);
  const pct = record.pct;
  const known = fmt.isNum(pct);
  return el(
    "li",
    { class: "row" },
    el(
      "div",
      { class: "row-main", style: { flex: "1" } },
      el("div", { class: "row-title" }, name),
      el(
        "div",
        {
          class: "progress",
          role: "progressbar",
          "aria-label": name,
          "aria-valuemin": 0,
          "aria-valuemax": 100,
          "aria-valuenow": known ? pct : null,
          "aria-valuetext": fmt.pct(pct),
        },
        el("div", { class: "progress-fill is-alt", style: { width: barWidth(pct) } })
      )
    ),
    el(
      "div",
      { class: "row-end" },
      el("span", { class: "num" }, fmt.pct(pct)),
      el("span", { class: "muted small num" }, ctx.money(record.amount))
    )
  );
}

function bucketsCard(buckets, ctx) {
  const children = [el("h2", { class: "card-title" }, "Buckets")];
  if (buckets.length === 0) {
    children.push(el("p", { class: "muted" }, "No buckets in finance.json."));
  } else {
    const pctSum = fmt.sumKnown(buckets.map((bucket) => asRecord(bucket).pct));
    const amtSum = fmt.sumKnown(buckets.map((bucket) => asRecord(bucket).amount));
    const total =
      "Total " +
      fmt.pct(pctSum.total) +
      unknownNote(pctSum.unknown) +
      " · " +
      ctx.money(amtSum.total) +
      unknownNote(amtSum.unknown);
    const offHundred = pctSum.unknown === 0 && fmt.isNum(pctSum.total) && Math.abs(pctSum.total - 100) > 1e-6;
    children.push(
      el("ul", { class: "rows" }, buckets.map((bucket) => bucketRow(bucket, ctx))),
      el(
        "p",
        { class: "muted small num" },
        total,
        offHundred ? " " : null,
        offHundred ? el("span", { class: "badge badge-review" }, "Adds to " + fmt.pct(pctSum.total)) : null
      )
    );
  }
  return el("div", { class: "card" }, children);
}

function sortedOneOffs(oneOffs) {
  return oneOffs
    .map((item, index) => ({ item: asRecord(item), index }))
    .sort((a, b) => {
      const da = isoDay(a.item.date);
      const db = isoDay(b.item.date);
      if (da && db && da !== db) return da < db ? 1 : -1;
      if (da && !db) return -1;
      if (!da && db) return 1;
      return a.index - b.index;
    });
}

function oneOffsCard(oneOffs, ctx) {
  const children = [el("h2", { class: "card-title" }, "One-offs")];
  if (oneOffs.length === 0) {
    children.push(el("p", { class: "muted" }, "No one-offs."));
  } else {
    const sorted = sortedOneOffs(oneOffs);
    const sum = fmt.sumKnown(oneOffs.map((item) => asRecord(item).amount));
    children.push(
      el(
        "ul",
        { class: "rows" },
        sorted.map(({ item }) =>
          el(
            "li",
            { class: "row" },
            el(
              "div",
              { class: "row-main" },
              el("div", { class: "row-title" }, displayLabel(item.label)),
              el("p", { class: "muted small" }, fmt.date(item.date))
            ),
            el("div", { class: "row-end" }, el("span", { class: "num" }, ctx.money(item.amount)))
          )
        )
      ),
      el("p", { class: "muted small num" }, "Total " + ctx.money(sum.total) + unknownNote(sum.unknown))
    );
  }
  return el("div", { class: "card" }, children);
}

export function render(root, data, ctx) {
  const budget = (data == null ? undefined : data.budget) ?? {};
  root.replaceChildren(basisCard(budget, ctx), bucketsCard(list(budget.buckets), ctx), oneOffsCard(list(budget.oneOffs), ctx));
}
