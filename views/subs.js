// STUB - Task B in PLAN.md replaces this file.
import { placeholder } from "../dom.js";

export function render(root, data, ctx) {
  const subs = Array.isArray(data.subscriptions) ? data.subscriptions : [];
  root.replaceChildren(placeholder("Subscriptions", `${subs.length} subscriptions in the file. Grouped list and monthly total coming soon.`));
}
