// STUB - Task C in PLAN.md replaces this file.
import { placeholder } from "../dom.js";

export function render(root, data, ctx) {
  const ef = (data.savings && data.savings.emergencyFund) || {};
  root.replaceChildren(placeholder("Emergency fund", `${ctx.money(ef.current)} of ${ctx.money(ef.goal)}. Progress bar coming soon.`));
}
