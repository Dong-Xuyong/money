# Money: build plan

The shell is done. Four views are left. Each is **one file** and **one task**. Builders work in parallel and must not touch any other file.

| Task | File | Tab / mount point | Hash |
| --- | --- | --- | --- |
| A | `views/months.js` | `<section id="view-months">` | `#months` (default) |
| B | `views/subs.js` | `<section id="view-subs">` | `#subs` |
| C | `views/savings.js` | `<section id="view-savings">` | `#savings` |
| D | `views/budget.js` | `<section id="view-budget">` | `#budget` |

## Shared contract (all tasks)

### What the shell already does

- `index.html` holds the topbar (Home link to https://dong-xuyong.github.io/, sync status, refresh, connection settings, theme toggle), the tabs, the Connect sync screen and the demo banner.
- `app.js` loads the data, checks `app === "finance"` and `version === 1`, and picks the tab from `location.hash`. It creates the four `<section id="view-<id>" class="view">` mount points inside `#views`, then dynamically imports the active view and calls its `render`. If a view throws, only that tab shows an error card.
- Data source: a token in localStorage key `dong-gh-sync` is used to read `Dong-Xuyong/progress-sync` → `finance.json` at the repo root, with `progress-sync/finance.json` as the fallback. The data is reloaded on window focus and every 60 s. The app never writes.
- `?demo=1` loads `fixtures/finance.sample.json` and `?demo=nulls` loads `fixtures/finance.nulls.json`. Both hold fake numbers only, and the nulls file is the edge-case fixture.

### Signature you must export

```js
/**
 * @param {HTMLElement} root  The <section id="view-<id>" class="view"> mount point (flex column, 0.75rem gap).
 * @param {object} data       The whole finance.json v1 object (schema below). Treat it as read-only.
 * @param {ViewContext} ctx
 */
export function render(root, data, ctx) {
  root.replaceChildren(/* your cards */);
}
```

`render` is called again on every tab switch, every refresh and every `ctx.rerender()`. It must:

- be synchronous and idempotent, and replace **all** of `root`'s children each time (`root.replaceChildren(...)`);
- touch nothing outside `root`: no `document.querySelector` on shell elements, no listeners on `window`/`document`, no timers, no `fetch`, no `localStorage`, no `history`/`location` changes;
- export nothing except `render`, and keep helpers private to the file;
- never mutate `data`.

`ViewContext`:

| Field | Type | Use |
| --- | --- | --- |
| `ctx.fmt` | module `format.js` | null-safe helpers (below) |
| `ctx.el` | `el(tag, attrs, ...children)` from `dom.js` | build DOM; strings become text nodes |
| `ctx.currency` | string | `data.currency` or `"EUR"` |
| `ctx.money(v, opts?)` | `→ string` | `fmt.money` already bound to the currency |
| `ctx.signedMoney(v, opts?)` | `→ string` | `fmt.signedMoney` bound to the currency |
| `ctx.demo` | boolean | true for fixtures (the shell already shows a banner) |
| `ctx.state` | object | per-view scratch object that survives re-renders (e.g. the selected month) |
| `ctx.rerender()` | `→ void` | call after changing `ctx.state` in a click handler |

You may also `import { el, placeholder } from "../dom.js"` and `import * as fmt from "../format.js"` directly.

`format.js` helpers (all return `"—"` (`fmt.DASH`) for null, undefined, NaN or non-numbers):

- `isNum(v)`
- `money(v, { currency, cents = true })` gives `"€1,234.50"`
- `signedMoney(v)` gives `"+€12.00"` or `"−€12.00"`
- `pct(v, digits = 0)` gives `"25%"`; the input is already a percentage
- `tone(v)` gives `"pos" | "neg" | "zero" | "unknown"`, for the `.tone-*` classes
- `date("2026-10-05")` gives `"5 Oct 2026"`, and `dateTime(iso)`
- `monthLabel("2026-07")` gives `"Jul 2026"`; `monthLabel("2026-07", { short: true })` gives `"Jul"`
- `monthlyEquivalent(amount, cadence)` returns a number or `null`. It understands daily, weekly, biweekly, fortnightly, monthly, bimonthly, quarterly, semiannual, yearly, annual and annually; anything else gives `null`.
- `sumKnown(values)` gives `{ total: number|null, unknown: count }`. The total is `null` when nothing is known.
- `ratio(current, goal)` gives a value in 0..1, clamped, or `null`.

### Rules that apply to every view

1. **Null means unknown.** Render it as `—` through the `fmt` helpers. Never show `€0.00` for a null, and never treat null as 0 in a sum: use `fmt.sumKnown` and say how many values were unknown. A real `0` in the data does render as `€0.00`.
2. **Missing structure is not an error.** A missing or non-array list counts as empty, and a missing object counts as `{}`. An empty section renders a `.card.empty` with a one-line message, not a blank space and not an exception.
3. **No HTML strings from data.** Build with `el(...)`, `textContent` or `replaceChildren`. No `innerHTML` with data values.
4. **CSS: use the shell's classes only.** Do not edit `styles.css` and do not inject `<style>`. Inline `style` is allowed only for data-driven sizes (bar heights, progress widths). Available classes:
   - Layout: `.card`, `.card-title` (h2), `.card-head` (title row: title left, extra right), `.empty`, `.muted`, `.small`, `.num` (tabular numbers), `.label` (small caps label), `.actions`
   - Stats: `.stats` (3-column grid) > `.stat` > `.label` + `.stat-value`; `.stat-big` for a hero number
   - Tone: `.tone-pos`, `.tone-neg`, `.tone-zero`, `.tone-unknown` (use `"tone-" + fmt.tone(v)`)
   - Picker: `.chips` > `button.chip[aria-pressed="true|false"]`
   - Badges: `.badge` plus `.badge-active`, `.badge-review`, `.badge-ended` or `.badge-partial`
   - Rows: `ul.rows` > `li.row` > `.row-main` (`.row-title` + `.muted.small` lines) and `.row-end` (right-aligned)
   - Table: `table.table` with `thead` and `tbody`; `tr.is-total` for a bold total row; the first column is left-aligned and the others right-aligned
   - Progress: `.progress[role=progressbar]` > `.progress-fill` (green) or `.progress-fill.is-alt` (blue), width in inline `%`
   - Bars: `.bars` > `button.bar-col[aria-pressed]` > `.bar-stack` (> `.bar.bar-in` / `.bar.bar-out` / `.bar.bar-unknown`, height in inline `%`) + `.bar-label`; `.legend` > spans with `.legend-dot` (give each dot the matching `bar-*` class)
   - Notes: `ul.note-list`
5. **Mobile first.** It must work at 360 px wide without horizontal page scroll (only `.chips` and `.bars` may scroll sideways), and in both light and dark theme.
6. **Accessibility.** Clickable things are `<button type="button">`. Pickers use `aria-pressed`. Progress bars have `aria-valuemin`, `aria-valuemax`, `aria-valuenow` (left out when unknown) and `aria-valuetext`.

### Files you must NOT touch

`index.html`, `app.js`, `format.js`, `dom.js`, `styles.css`, `dong-ui/*`, `fixtures/*`, `tests/*`, `PLAN.md`, `README.md`, and the other three view files. If you think the shell needs a change, say so in your PR description and work around it inside your file.

### How to test

```bash
python3 -m http.server 8000      # from the repo root
# open http://localhost:8000/?demo=1#<hash>  and  http://localhost:8000/?demo=nulls#<hash>
node --test tests/*.test.mjs     # must still pass
```

Check: no console errors, works at 360 px, light and dark both readable, and the tab still renders after pressing Refresh, which re-renders the view.

### Delivery

One branch and one PR per task, changing exactly one file. Put a screenshot of `?demo=1` and of `?demo=nulls` at 360 px in the PR.

### Schema v1 (fields the views use)

```text
currency: "EUR"
accounts[]: { id: "novobanco"|"revolut", name, balance: number|null, balanceAt: "YYYY-MM-DD"|null }
months[]: { month: "YYYY-MM", partial: bool,
            accounts: { [accountId]: { in, out, net } },   // any value may be null; an account may be missing
            combined: { in, out, net },                     // any value may be null
            notes?: string[] }
subscriptions[]: { id, name, account, amount: number|null, cadence, lastCharged|null, nextDue|null,
                   status: "active"|"review"|"ended", note }
savings: { emergencyFund: { goal, current|null, currentAt|null, note }, monthlyTarget|null }
budget: { basis, monthlyIncomeRef|null, buckets[]: { id, name, pct|null, amount|null },
          oneOffs[]: { date, label, amount|null } }
```

`recurring[]` and `sources[]` are out of scope for v1 views.

---

## Task A: `views/months.js` (Months tab)

Replace the stub in `views/months.js`. Follow the Shared contract in PLAN.md. Change only this file.

**Signature:** `export function render(root, data, ctx)`, mounted into `<section id="view-months" class="view">` (hash `#months`, the default tab).

**Build, top to bottom:**

1. **Month picker card.** `.chips` with one `button.chip` per entry in `data.months`, in chronological order (sort by the `month` string, oldest on the left). The label is `fmt.monthLabel(month)` and `aria-pressed="true"` marks the selected month. The selected month is `ctx.state.month`. When it is unset, or no longer exists in the data, use the latest month. A click sets `ctx.state.month` and calls `ctx.rerender()`. After render, scroll the selected chip into view with `scrollIntoView({ block: "nearest", inline: "nearest" })` on the chip only.
2. **Selected month summary card.** `.card-head` holds `h2.card-title` = `monthLabel(month)` and, if `partial`, a `span.badge.badge-partial` "Partial". Below it, `.stats` with three `.stat` items, In, Out and Net, taken from `month.combined` (do not recompute). The net value gets `"tone-" + fmt.tone(net)` and uses `ctx.signedMoney`. In and Out use `ctx.money`.
3. **Per-account table in the same card.** `table.table` with header columns Account, In, Out, Net. There is one row per account in `data.accounts` order, using `account.name`. After those, add rows for any account id found in `month.accounts` but missing from `data.accounts`, with the id as the name. If the month has no entry for an account, all three cells are `—`. The last row is `tr.is-total` "Combined" from `month.combined`. Net cells carry a tone class.
4. **Notes.** If `month.notes` is a non-empty array, add a `ul.note-list` of them below the table.
5. **Bar chart card.** `h2.card-title` "In vs out". Then `.bars` with one `button.bar-col` per month (same order as the chips). Each has `aria-pressed` for the selected month, `aria-label` like `"Jul 2026: in €30.99, out €203.41"`, and `title` set to the same text. Inside goes a `.bar-stack` with two bars, `.bar.bar-in` (`combined.in`) and `.bar.bar-out` (`combined.out`), and then `.bar-label` = `monthLabel(month, { short: true })`. Bar height is `value / max * 100 + "%"`, where `max` is the largest known `combined.in` or `combined.out` across all months. A null value instead renders `.bar.bar-unknown` with `height: 12%`. If `max` is null or 0, known bars get `height: 0%` (the CSS min-height of 2 px still shows them). Clicking a column selects that month, just like the chip. Below the bars, a `.legend` shows In, Out and Unknown, with a `.legend-dot` that has the matching `bar-in`, `bar-out` or `bar-unknown` class.
6. **Empty state.** If there are no months, render a single `.card.empty` "No months in finance.json yet." and nothing else.

**Acceptance criteria:**

- `?demo=1#months` opens on **Jul 2026**, with four chips (Apr to Jul 2026). The Revolut row shows `—` for In and Net and `€382.79` for Out. Combined Net reads `+€396.91` in the positive tone.
- Clicking the **Apr** chip, or the Apr bar column, shows the **Partial** badge and the Apr numbers. Switching to another tab and back keeps Apr selected.
- `?demo=nulls#months` opens on **Sep 2026**, which has the Partial badge. The Revolut row is all `—` because the account is missing from that month. The Combined row is all `—`. There is no notes list (the field is missing).
- In `?demo=nulls`, Aug 2026 shows Novo Banco In as `€0.00` (a real zero) and Combined In as `—`. Its In bar is the hatched unknown bar.
- `€0.00` never appears for a null value. There are no console errors, and it works at 360 px in light and dark.
- `data.months` missing or set to `[]` gives the empty card, not an exception.

---

## Task B: `views/subs.js` (Subscriptions tab)

Replace the stub in `views/subs.js`. Follow the Shared contract in PLAN.md. Change only this file.

**Signature:** `export function render(root, data, ctx)`, mounted into `<section id="view-subs" class="view">` (hash `#subs`).

**Build, top to bottom:**

1. **Total card.** `.label` "Monthly equivalent (active)", then `div.stat-big.num` = `ctx.money(total)`. `total` is `fmt.sumKnown` of `fmt.monthlyEquivalent(amount, cadence)` over subscriptions with `status === "active"`. Below that, a `.muted.small` line: `"N active"`, plus `" · M not counted (unknown amount or cadence)"` when `unknown > 0`. Then a second line `.muted.small` "Including review: X", where X is the same sum over the active and review subscriptions together.
2. **Group cards** in this order: **Active**, **Review**, **Ended**. Each is a `.card` whose `.card-head` holds `h2.card-title` with the group name and a `span.muted.small` count. Subscriptions whose `status` is not one of the three go into **Review**. Leave out a group card when it has no items. If there are no subscriptions at all, render a single `.card.empty` "No subscriptions in finance.json." instead of the total card and the groups.
3. **Rows.** Inside each group, `ul.rows` with one `li.row` per subscription, sorted by monthly equivalent (highest first, unknowns last), with ties broken by `name`.
   - `.row-main` has `.row-title` = `name` and then a `span.badge.badge-<status>` showing the raw status. Only add that badge when the status is not the group's own status, i.e. for unknown statuses.
   - Next comes `.muted.small` `"<account name> · <cadence>"`. The account name comes from looking up `data.accounts` by `id`, falling back to the raw `account` value, then to `—`. Cadence falls back to `—`.
   - Next, `.muted.small` `"Last <date(lastCharged)> · Next <date(nextDue)>"`, where nulls show as `—`.
   - Last, `.muted.small` `note`, only if it is a non-empty string.
   - `.row-end` has `span.num` = `ctx.money(amount)` and, below it, `span.muted.small.num`. That second span is `"≈ " + ctx.money(eq) + "/mo"` when the cadence is not `monthly` and `eq` is known, or `"—/mo"` when `eq` is null. Leave it out for monthly subscriptions with a known amount.

**Acceptance criteria:**

- `?demo=1#subs`: the total is **€863.17** (448.75 + 213.61 + 200.81), "3 active", with no "not counted" text. "Including review" is **€1,780.23**, because the weekly 211.63 counts as 917.06/mo. The Active group has 3 rows sorted 448.75, 213.61, 200.81. The Review group has 1 row with `≈ €917.06/mo`. There is no Ended card.
- `?demo=nulls#subs`: the total is **€10.00** (the yearly 120 ÷ 12) with "2 active · 1 not counted (unknown amount or cadence)". The unknown-amount row shows `—` and `—/mo` and is sorted last in Active. The per-use row in Review shows `€9.99` and `—/mo`. The Ended card shows "Example ended".
- Dates render as `6 Nov 2026`, and null dates as `—`. The account shows as "Revolut", not "revolut".
- Nothing shows `€0.00` for an unknown value. There are no console errors, and it works at 360 px in light and dark.
- `data.subscriptions` missing gives the empty card, not an exception.

---

## Task C: `views/savings.js` (Savings tab)

Replace the stub in `views/savings.js`. Follow the Shared contract in PLAN.md. Change only this file.

**Signature:** `export function render(root, data, ctx)`, mounted into `<section id="view-savings" class="view">` (hash `#savings`).

Read `ef = data.savings?.emergencyFund ?? {}` and `target = data.savings?.monthlyTarget`. Do **not** hard-code the €3,000 goal; it comes from `ef.goal`.

**Build, top to bottom:**

1. **Emergency fund card.** `h2.card-title` "Emergency fund". Then `div.stat-big.num` = `ctx.money(ef.current)`, followed by `span.muted` `" of " + ctx.money(ef.goal)`.
   - Progress bar: `div.progress[role=progressbar]` with `aria-label="Emergency fund"`, `aria-valuemin=0`, `aria-valuemax=<goal>` (left out if the goal is unknown), `aria-valuenow=<current>` (left out if current is unknown) and `aria-valuetext` = the status line below. Inside it, a `div.progress-fill` with `style.width = r * 100 + "%"`, where `r = fmt.ratio(ef.current, ef.goal)`. When `r` is null the width is `0%`.
   - Status line `.muted.small.num`. If `r` is known and `r >= 1`, it reads `"Goal reached"`. If `r` is known and below 1, it reads `fmt.pct(r * 100) + " · " + ctx.money(goal - current) + " to go"`. If `r` is unknown, it reads `"— · — to go"`.
   - `.muted.small` `"As of " + fmt.date(ef.currentAt)`.
   - `.muted.small` `ef.note`, if it is a non-empty string.
2. **Monthly target card.** `.label` "Monthly savings target", then `div.stat-value.num` = `ctx.money(target) + "/mo"`. When the target is unknown, show just `—`. If the remaining amount (goal − current) is known and above 0, and the target is known and above 0, add `.muted.small` `"≈ N months to the goal at this pace"` with `N = Math.ceil(remaining / target)`. Otherwise leave that line out.
3. **Balances card.** `h2.card-title` "Balances", then `ul.rows` with one `li.row` per entry in `data.accounts`. `.row-main` holds `.row-title` = name and `.muted.small` `"As of " + fmt.date(balanceAt)`. `.row-end` holds `span.num` = `ctx.money(balance)`. When there are no accounts, show `.muted` "No accounts in finance.json." inside the card.

**Acceptance criteria:**

- `?demo=1#savings`: the card shows **€24.23** of **€3,000.00**, and the fill width is about 0.81%. The status reads **"1% · €2,975.77 to go"** and the date reads "As of 5 Oct 2026". The target reads **€754.63/mo** with "≈ 4 months to the goal at this pace". Balances show Novo Banco `€125.26` (as of 5 Oct 2026) and Revolut `—` (as of `—`).
- `?demo=nulls#savings`: current is `—` of `€3,000.00`, with no fill, `aria-valuenow` absent, and the status `"— · — to go"`. The target is `—` and there is no months-to-goal line. Balances show Novo Banco `—` and Revolut **`€0.00`** (a real zero).
- If `current` is at or above `goal` (try it by editing a local copy, not the fixture), the bar is full and the status reads "Goal reached".
- There are no console errors, and it works at 360 px in light and dark. `data.savings` missing renders `—` values, not an exception.

---

## Task D: `views/budget.js` (Budget tab)

Replace the stub in `views/budget.js`. Follow the Shared contract in PLAN.md. Change only this file.

**Signature:** `export function render(root, data, ctx)`, mounted into `<section id="view-budget" class="view">` (hash `#budget`).

Read `b = data.budget ?? {}`. Bucket amounts come from the file. Do **not** recompute them from pct × income.

**Build, top to bottom:**

1. **Basis card.** `.label` "Reference income", then `div.stat-value.num` = `ctx.money(b.monthlyIncomeRef) + "/mo"`, or just `—` when unknown. Then `.muted.small` = `b.basis`, if it is a non-empty string.
2. **Buckets card.** `h2.card-title` "Buckets", then `ul.rows` with one `li.row` per bucket in file order.
   - `.row-main` contains `.row-title` = `name` (falling back to `id`), followed by a `div.progress` with `role=progressbar`, `aria-label=<name>`, `aria-valuemin=0`, `aria-valuemax=100`, `aria-valuenow=<pct>` (left out if unknown) and `aria-valuetext=fmt.pct(pct)`. Inside it goes a `div.progress-fill.is-alt` with width `clamp(pct, 0, 100) + "%"`, or `0%` if pct is unknown. Give `.row-main` the inline style `flex: 1` so the bar uses the row width.
   - `.row-end` contains `span.num` = `fmt.pct(pct)` and `span.muted.small.num` = `ctx.money(amount)`.
   - After the list comes a total line, `.muted.small.num`: `"Total " + fmt.pct(pctSum.total) + " · " + ctx.money(amtSum.total)`. Append `" (+N unknown)"` to each part that has unknowns. If every pct is known and the total is not 100, add a `span.badge.badge-review` "Adds to X%".
   - With no buckets, show `.muted` "No buckets in finance.json." inside the card.
3. **One-offs card.** `h2.card-title` "One-offs", then `ul.rows` sorted by `date` with the newest first. `.row-main` holds `.row-title` = `label` and `.muted.small` = `fmt.date(date)`. `.row-end` holds `span.num` = `ctx.money(amount)`. After the list, add a total line `.muted.small.num` = `"Total " + ctx.money(sum.total)`, plus `" (+N unknown)"` when there are unknowns. With no one-offs, show `.muted` "No one-offs." inside the card.

**Acceptance criteria:**

- `?demo=1#budget`: income is `€503.03/mo`. Four buckets appear in file order (25%, 15%, 50%, 10%), and the bar widths match the pct. The total reads **"Total 100% · €2,419.22"** with no "Adds to" badge. One-offs show 7 Sep 2026 (€302.76) first and 27 May 2026 (€113.20) second, with a total of **€415.96**.
- `?demo=nulls#budget`: income is `—`. The essentials row shows `50%` and `—`. The growth row shows `—` for pct with an empty bar, and `€100.00`. The total reads **"Total 50% (+1 unknown) · €100.00 (+1 unknown)"** with no badge, because one pct is unknown. One-offs show "No one-offs."
- There are no console errors, and it works at 360 px in light and dark. `data.budget` missing renders `—` and the empty messages, not an exception.
