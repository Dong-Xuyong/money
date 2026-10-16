# Money

A read-only view of Dong's money: monthly in/out per account, subscriptions, the emergency fund, and budget buckets.

Live: https://dong-xuyong.github.io/money/

The data is not in this repo. The page reads `finance.json` from the private repo Dong-Xuyong/progress-sync through the GitHub Contents API. It tries the repo root first, then `progress-sync/finance.json`. It reloads on window focus and every 60 seconds, and it never writes.

Connect: paste a fine-grained GitHub token scoped to Dong-Xuyong/progress-sync only, with Contents read access, on the Connect sync screen. It is stored in localStorage key `dong-gh-sync`, shared with Dong's other apps (crew-log and others).

Demo: `?demo=1` loads `fixtures/finance.sample.json`, and `?demo=nulls` loads `fixtures/finance.nulls.json` (edge cases). Fixtures hold fake numbers only.

Layout:

- `index.html`, `app.js`: shell (topbar, tabs, connect screen, loading, routing by `#months`, `#subs`, `#savings`, `#budget`)
- `format.js`: null-safe formatters (null always renders as `—`), and `dom.js`: safe element builder
- `views/*.js`: one file per tab, each exporting `render(root, data, ctx)`
- `dong-ui/`: vendored shared theme and `gh-sync.js`

Remaining work is split in PLAN.md. To run locally: `python3 -m http.server 8000`, then open `http://localhost:8000/?demo=1`. Tests: `node --test tests/*.test.mjs`.
