// Tiny DOM builder. Children that are strings or numbers become text nodes, so data is never parsed as HTML.

/**
 * el("p", { class: "muted", "aria-label": "x", onclick: fn, style: { width: "40%" } }, "text", childNode)
 * null / undefined / false children and attributes are skipped. Arrays of children are flattened.
 */
export function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2), value);
    } else if (key === "style" && typeof value === "object") {
      Object.assign(node.style, value);
    } else if (key === "dataset" && typeof value === "object") {
      Object.assign(node.dataset, value);
    } else {
      node.setAttribute(key, value === true ? "" : String(value));
    }
  }
  append(node, children);
  return node;
}

function append(node, children) {
  for (const child of children) {
    if (child == null || child === false) continue;
    if (Array.isArray(child)) append(node, child);
    else node.append(child instanceof Node ? child : String(child));
  }
}

/** Placeholder card used by the view stubs and by empty sections. */
export function placeholder(title, text) {
  return el("div", { class: "card dx-card empty" }, el("h2", { class: "card-title" }, title), el("p", { class: "muted" }, text));
}
