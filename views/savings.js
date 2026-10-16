import * as fmt from "../format.js";
import { el } from "../dom.js";

/**
 * @param {HTMLElement} root  The <section id="view-savings" class="view"> mount point.
 * @param {object} data       The whole finance.json v1 object. Read-only.
 * @param {object} ctx        ViewContext from the shell.
 */
export function render(root, data, ctx) {
  const ef = data.savings?.emergencyFund ?? {};
  const target = data.savings?.monthlyTarget;
  root.replaceChildren(emergencyCard(ef, ctx), targetCard(ef, target, ctx), balancesCard(data, ctx));
}

function emergencyCard(ef, ctx) {
  const ratio = fmt.ratio(ef.current, ef.goal);
  const status = fundStatus(ratio, ef, ctx);
  const note = typeof ef.note === "string" && ef.note !== "" ? ef.note : null;
  return el(
    "div",
    { class: "card" },
    el("h2", { class: "card-title" }, "Emergency fund"),
    el(
      "div",
      { class: "stat-big num" },
      ctx.money(ef.current),
      el("span", { class: "muted" }, " of " + ctx.money(ef.goal))
    ),
    el(
      "div",
      {
        class: "progress",
        role: "progressbar",
        "aria-label": "Emergency fund",
        "aria-valuemin": 0,
        "aria-valuemax": fmt.isNum(ef.goal) ? ef.goal : null,
        "aria-valuenow": fmt.isNum(ef.current) ? ef.current : null,
        "aria-valuetext": status,
      },
      el("div", { class: "progress-fill", style: { width: (ratio == null ? 0 : ratio * 100) + "%" } })
    ),
    el("p", { class: "muted small num" }, status),
    el("p", { class: "muted small" }, "As of " + fmt.date(ef.currentAt)),
    note ? el("p", { class: "muted small" }, note) : null
  );
}

function fundStatus(ratio, ef, ctx) {
  if (ratio == null) return fmt.DASH + " · " + fmt.DASH + " to go";
  if (ratio >= 1) return "Goal reached";
  return fmt.pct(ratio * 100) + " · " + ctx.money(ef.goal - ef.current) + " to go";
}

function targetCard(ef, target, ctx) {
  const knownTarget = fmt.isNum(target) && target > 0;
  const value = fmt.isNum(target) ? ctx.money(target) + "/mo" : fmt.DASH;
  const remaining = fmt.isNum(ef.goal) && fmt.isNum(ef.current) ? ef.goal - ef.current : null;
  const pace =
    remaining != null && remaining > 0 && knownTarget
      ? "≈ " + Math.ceil(remaining / target) + " months to the goal at this pace"
      : null;
  return el(
    "div",
    { class: "card" },
    el("div", { class: "label" }, "Monthly savings target"),
    el("div", { class: "stat-value num" }, value),
    pace ? el("p", { class: "muted small" }, pace) : null
  );
}

function balancesCard(data, ctx) {
  const accounts = Array.isArray(data?.accounts) ? data.accounts : [];
  return el(
    "div",
    { class: "card" },
    el("h2", { class: "card-title" }, "Balances"),
    accounts.length
      ? el(
          "ul",
          { class: "rows" },
          accounts.map((account) => balanceRow(account && typeof account === "object" ? account : {}, ctx))
        )
      : el("p", { class: "muted" }, "No accounts in finance.json.")
  );
}

function balanceRow(account, ctx) {
  const name = account.name == null ? fmt.DASH : account.name;
  return el(
    "li",
    { class: "row" },
    el(
      "div",
      { class: "row-main" },
      el("div", { class: "row-title" }, name),
      el("div", { class: "muted small" }, "As of " + fmt.date(account.balanceAt))
    ),
    el("div", { class: "row-end" }, el("span", { class: "num" }, ctx.money(account.balance)))
  );
}
