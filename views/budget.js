// STUB - Task D in PLAN.md replaces this file.
import { placeholder } from "../dom.js";

export function render(root, data, ctx) {
  const buckets = (data.budget && Array.isArray(data.budget.buckets) && data.budget.buckets) || [];
  root.replaceChildren(placeholder("Budget", `${buckets.length} buckets in the file. Bucket list with pct and amount coming soon.`));
}
