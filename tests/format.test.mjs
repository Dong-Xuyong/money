import test from "node:test";
import assert from "node:assert/strict";
import * as f from "../format.js";

test("null and non-numbers render as a dash, zero renders as zero", () => {
  for (const v of [null, undefined, NaN, "12", Infinity]) {
    assert.equal(f.money(v), f.DASH);
    assert.equal(f.signedMoney(v), f.DASH);
    assert.equal(f.pct(v), f.DASH);
    assert.equal(f.tone(v), "unknown");
  }
  assert.equal(f.money(0), "€0.00");
  assert.equal(f.tone(0), "zero");
});

test("money and signedMoney", () => {
  assert.equal(f.money(1234.5), "€1,234.50");
  assert.equal(f.money(1234.5, { cents: false }), "€1,235");
  assert.equal(f.signedMoney(12), "+€12.00");
  assert.equal(f.signedMoney(-12), "\u2212€12.00");
});

test("dates and months", () => {
  assert.equal(f.date("2026-10-05"), "5 Oct 2026");
  assert.equal(f.date(null), f.DASH);
  assert.equal(f.monthLabel("2026-07"), "Jul 2026");
  assert.equal(f.monthLabel("2026-07", { short: true }), "Jul");
  assert.equal(f.monthLabel("bad"), f.DASH);
});

test("monthlyEquivalent", () => {
  assert.equal(f.monthlyEquivalent(10, "monthly"), 10);
  assert.equal(f.monthlyEquivalent(120, "yearly"), 10);
  assert.ok(Math.abs(f.monthlyEquivalent(12, "weekly") - 52) < 1e-9);
  assert.equal(f.monthlyEquivalent(null, "monthly"), null);
  assert.equal(f.monthlyEquivalent(5, "per-use"), null);
});

test("sumKnown and ratio", () => {
  assert.deepEqual(f.sumKnown([1, null, 2]), { total: 3, unknown: 1 });
  assert.deepEqual(f.sumKnown([null, null]), { total: null, unknown: 2 });
  assert.deepEqual(f.sumKnown([]), { total: null, unknown: 0 });
  assert.equal(f.ratio(750, 3000), 0.25);
  assert.equal(f.ratio(5000, 3000), 1);
  assert.equal(f.ratio(null, 3000), null);
  assert.equal(f.ratio(10, 0), null);
});
