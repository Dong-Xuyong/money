import { el } from "../dom.js";
import * as fmt from "../format.js";

const GROUPS = [
  { id: "active", title: "Active" },
  { id: "review", title: "Review" },
  { id: "ended", title: "Ended" },
];

const KNOWN_STATUS = new Set(GROUPS.map((group) => group.id));

function listOf(value) {
  return Array.isArray(value) ? value : [];
}

function subscriptionsOf(data) {
  return listOf(data && data.subscriptions).filter((sub) => sub && typeof sub === "object");
}

function groupId(status) {
  return KNOWN_STATUS.has(status) ? status : "review";
}

function textOrDash(value) {
  return typeof value === "string" && value !== "" ? value : fmt.DASH;
}

function accountLabel(accounts, account) {
  const match = listOf(accounts).find((item) => item && item.id === account);
  if (match && typeof match.name === "string" && match.name !== "") return match.name;
  return textOrDash(account);
}

function monthlyEq(sub) {
  return fmt.monthlyEquivalent(sub.amount, sub.cadence);
}

function byMonthlyThenName(a, b) {
  const left = monthlyEq(a);
  const right = monthlyEq(b);
  const leftKnown = fmt.isNum(left);
  const rightKnown = fmt.isNum(right);
  if (leftKnown && rightKnown && left !== right) return right - left;
  if (leftKnown !== rightKnown) return leftKnown ? -1 : 1;
  const leftName = typeof a.name === "string" ? a.name : "";
  const rightName = typeof b.name === "string" ? b.name : "";
  return leftName.localeCompare(rightName, "en");
}

function statusBadge(status) {
  const label = typeof status === "string" && status !== "" ? status : fmt.DASH;
  const safe = typeof status === "string" && /^[A-Za-z0-9_-]+$/.test(status);
  return el("span", { class: safe ? "badge badge-" + status : "badge" }, label);
}

function monthlyHint(sub, money) {
  const eq = monthlyEq(sub);
  if (String(sub.cadence || "").toLowerCase() === "monthly" && fmt.isNum(eq)) return null;
  return el("span", { class: "muted small num" }, fmt.isNum(eq) ? "≈ " + money(eq) + "/mo" : fmt.DASH + "/mo");
}

function subscriptionRow(sub, accounts, money) {
  const note = typeof sub.note === "string" && sub.note !== "" ? sub.note : null;
  return el(
    "li",
    { class: "row" },
    el(
      "div",
      { class: "row-main" },
      el("div", { class: "row-title" }, textOrDash(sub.name)),
      KNOWN_STATUS.has(sub.status) ? null : statusBadge(sub.status),
      el("div", { class: "muted small" }, accountLabel(accounts, sub.account) + " · " + textOrDash(sub.cadence)),
      el("div", { class: "muted small" }, "Last " + fmt.date(sub.lastCharged) + " · Next " + fmt.date(sub.nextDue)),
      note ? el("div", { class: "muted small" }, note) : null
    ),
    el("div", { class: "row-end" }, el("span", { class: "num" }, money(sub.amount)), monthlyHint(sub, money))
  );
}

function groupCard(group, items, accounts, money) {
  const sorted = items.slice().sort(byMonthlyThenName);
  return el(
    "div",
    { class: "card dx-card" },
    el(
      "div",
      { class: "card-head" },
      el("h2", { class: "card-title" }, group.title),
      el("span", { class: "muted small" }, String(sorted.length))
    ),
    el(
      "ul",
      { class: "rows" },
      sorted.map((sub) => subscriptionRow(sub, accounts, money))
    )
  );
}

function activeCountLine(count, unknown) {
  const base = count + " active";
  if (unknown > 0) return base + " · " + unknown + " not counted (unknown amount or cadence)";
  return base;
}

function totalCard(subs, money) {
  const active = subs.filter((sub) => sub.status === "active");
  const activeSum = fmt.sumKnown(active.map(monthlyEq));
  const withReview = subs.filter((sub) => groupId(sub.status) !== "ended");
  const reviewSum = fmt.sumKnown(withReview.map(monthlyEq));
  return el(
    "div",
    { class: "card dx-card" },
    el("div", { class: "label" }, "Monthly equivalent (active)"),
    el("div", { class: "stat-big num" }, money(activeSum.total)),
    el("p", { class: "muted small" }, activeCountLine(active.length, activeSum.unknown)),
    el("p", { class: "muted small" }, "Including review: " + money(reviewSum.total))
  );
}

/** @param {HTMLElement} root @param {object} data @param {object} ctx */
export function render(root, data, ctx) {
  const subs = subscriptionsOf(data);
  if (subs.length === 0) {
    root.replaceChildren(el("div", { class: "card dx-card empty" }, el("p", { class: "muted" }, "No subscriptions in finance.json.")));
    return;
  }
  const money = ctx.money;
  const accounts = data && data.accounts;
  const groups = GROUPS.flatMap((group) => {
    const items = subs.filter((sub) => groupId(sub.status) === group.id);
    return items.length ? [groupCard(group, items, accounts, money)] : [];
  });
  root.replaceChildren(totalCard(subs, money), ...groups);
}
