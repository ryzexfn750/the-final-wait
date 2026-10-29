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

## Stage 2: 250 / 500 / 1,000 with controlled connection ramp (Node.js)

The browser tests (20/50/100) completed with full fan-out, but browser-side
handshake P95 rose to ~4.7 seconds for 100 sockets, whereas Wrangler logs
showed individual accepted Upgrade requests frequently taking 3–8 ms.
This discrepancy **does not prove** the Worker is the bottleneck.

Use the new native Node WebSocket runner to compare browser and Node client
scheduling under 16 in-flight handshakes. Requires **Node.js >= 22.4**;
no npm package installation is needed.

### Terminal A: isolated local Worker

Stop any existing local Wrangler instance with Ctrl+C before fetching the
new version, and restart it after updating:

```powershell
cd "$HOME\the-final-wait"
git pull --ff-only origin community-qa
node --test tests/community.test.mjs
npx wrangler dev --local --config workers/hype-worker/wrangler.local-load.jsonc --ip 127.0.0.1 --port 8787
```

### Terminal B: ramp up gradually

Close the browser's local load-test tab before using Node; this avoids
mixing earlier WebSockets with a new run.

```powershell
cd "$HOME\the-final-wait"
node --version
node tools/benchmark-hype-ws-local.mjs --connections 250 --concurrency 16
```

Only when **connected = 250, failedHandshakes = 0, delivered = 250 and
broadcastComplete = true** continue:

```powershell
node tools/benchmark-hype-ws-local.mjs --connections 500 --concurrency 16
node tools/benchmark-hype-ws-local.mjs --connections 1000 --concurrency 16
```

**Never run 500 or 1,000 if the previous test failed.** Stop with Ctrl+C
if system responsiveness suffers. The script enforces 1,000 total clients,
at most 32 simultaneous handshakes, a 600 MiB client RSS ceiling, and a
120-second startup cap. Each benchmark closes its connections in a
`finally` block; no real Google/Supabase identity is used.

The script probes an exact local harness marker at
`http://127.0.0.1:8787` before creating WebSockets, and uses an
individual synthetic run nickname to avoid miscounting broadcasts left
from earlier runs. It refuses arbitrary destinations.

### Measurements

- `connectionRampMs` — wall-clock duration of opening all sockets in
  bounded parallel batches, not an individual handshake.
- `handshakeP50ms`, `handshakeP95ms`, `handshakeMaxMs` — from the
  Node client's socket constructor until `open`. Compare with the *browser*
  100-connection test and Wrangler's per-request Upgrade durations.
- `delivered`, `expected`, `broadcastComplete`,
  `broadcastP95ms` — every peer receives the *same* unique-run reaction
  through one Durable Object.
- `clientRssPeakMB`, `clientHeapUsedMB`, `nodeCpuTimeMs`,
  `clientEventLoopLagP95ms` — **Node client process only**,
  not actual Cloudflare Durable Object memory, CPU, or billing.

Do not extrapolate any of these timings or resource figures to internet
users on Cloudflare's network. Before public launch, review costs, auth
integrity, newsletter opt-outs, privacy notices, and remote performance
in a separately budgeted, access-controlled staging environment.
