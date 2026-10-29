# LIVE HYPE — same-room 20/50/100 WebSocket stress test (local-only)

This is an isolated **local workerd/Durable Object** test of the real
`workers/hype-worker/src/index.js` class, not a simulator of socket APIs.
It creates synthetic test IDs **only on loopback**, no Google login, Supabase
keys, real accounts, Cloudflare Access, or remote deployed Durable Object.
This is not a true global capacity or Free-tier cost benchmark.

**Never deploy** `wrangler.local-load.jsonc` or
`workers/hype-worker/src/local-loadtest.js`. Never use `--remote` here.

## Start local runtime

From PowerShell terminal A:

```powershell
cd "$HOME\the-final-wait"
git pull --ff-only origin community-qa
npx wrangler dev --local --config workers/hype-worker/wrangler.local-load.jsonc --ip 127.0.0.1 --port 8787
```

Wait for **Ready on http://127.0.0.1:8787**.

In Edge or Chrome, open `http://127.0.0.1:8787/`.
Click **Test 20 sockets**, then **Test 50 sockets**, then **Test 100 sockets**
only if earlier tests succeed. All 20/50/100 connections go to ONE
`tz:Europe/Rome` Durable Object room. The script checks that each socket
receives the test broadcast, then closes sockets.

Each batch reports `connected`, `failedHandshakes`, handshake P50/P95,
`recipients`, `fullBroadcast`, broadcast P50/P95, and total wall time.
Expected: all sockets open, all sockets receive the reaction, zero failures.

Stop the local runtime with **Ctrl+C** in terminal A after testing.

## Important boundaries

- The hard cap in the page is 100; do not scale up without discussing
  local CPU/memory and network constraints.
- Do not use the original deployed Worker config for this test. Keep
  Cloudflare Pages Production `COMMUNITY_ENABLED=false`.
- If port 8787 is occupied, stop the competing process instead of changing
  URLs in half the test files.
- Local workerd behaves much closer to Cloudflare Workers than earlier
  pure-JavaScript mocks, but local timings still do **not** predict WAN
  latency, CDN behavior, or Cloudflare billing.
- Browser `Origin` must equal the loopback host, and Wrangler must bind
  **127.0.0.1**, not **0.0.0.0**, because this harness deliberately uses
  synthetic IDs in place of real authentication.
- Send the resulting JSON reports; they do not contain secrets.

Official docs: https://developers.cloudflare.com/workers/local-development/
