// STUB - Task A in PLAN.md replaces this file.
import { placeholder } from "../dom.js";

export function render(root, data, ctx) {
  const months = Array.isArray(data.months) ? data.months : [];
  root.replaceChildren(placeholder("Months", `${months.length} months in the file. Month picker, per-account table and bar chart coming soon.`));
}
