# LIVE HYPE — long-duration stability and Cloudflare Free budget

Status: local soak runner and illustrative Free-tier estimator added to
`community-qa`. **Not deployed to Production.** Real end-to-end long-duration
results must be collected by the operator; existing 1,000-client load test
only measured a short burst.

## 1. Long-duration stability test (local only)

Prerequisites: Node.js 22.4+, Cloudflare Wrangler installed via `npx`,
the operator's local repository branch `community-qa`. Stop the previous
local Wrangler process first to avoid running stale code.

**PowerShell A — isolated local HypeRoom:**

```powershell
cd "$HOME\the-final-wait"
git pull --ff-only origin community-qa
node --test tests/community.test.mjs
npx wrangler dev --local --config workers/hype-worker/wrangler.local-load.jsonc --ip 127.0.0.1 --port 8787
```

Wait until `Ready on http://127.0.0.1:8787`.

**PowerShell B — 20-minute baseline:**

```powershell
cd "$HOME\the-final-wait"
node tools/soak-hype-ws-local.mjs --minutes 20
```

The runner opens **1,000 local WebSockets** to the real HypeRoom Durable
Object, limited to **16 simultaneous new handshakes**. It samples Node
process RSS and event-loop lag, sends one broadcast **every 3 minutes**,
checks receipt by all currently open connections, and records close code
4001 when the room expires an authorized session. Unexpected disconnects
are retried with bounded backoff and a cap on failures.

The script stops automatically after the selected duration, closes the
sockets, and writes `reports/hype-soak-20min-<timestamp>.json`.

If there are no failed broadcasts or connection failures and memory remains
within the 600 MB limit, optionally run **35 minutes** to cover at least one
15–30 minute session-expiration cycle:

```powershell
node tools/soak-hype-ws-local.mjs --minutes 35
```

For this second run, look for **`closeCodes["4001"]`** and
`renewals>0`, confirming that expired sockets were replaced. Any failed
probe or unrecovered connection should be investigated rather than hidden.
Report `peakNodeRssMB`, `finalConnected`, `totalHandshakeFailures`,
`closeCodes`, `renewals`, and `probes`.

**IMPORTANT:** The script monitors **Node client memory**, *not* the
Wrangler/workerd process memory, which must be inspected separately through
Windows Task Manager / Resource Monitor. Native local workerd can differ from
Cloudflare edge behavior and cannot verify Free-plan usage or WAN latency.
Never deploy the local load-test entrypoint. Production remains disabled.

## 2. Cloudflare Durable Objects Free quotas (as checked 2026-10-29)

- **100,000 billable DO requests/day**.
- **13,000 GB-s of billable DO duration/day**, using 128 MB allocated
  memory per DO during billable active time.
- A WebSocket connection establishment counts as a DO request.
- Incoming application WebSocket messages are billed for requests at
  **20 messages = 1 request**, not counting outgoing messages individually.
- DOs eligible for hibernation do not incur duration charges while idle.
- An alarm invocation counts as a request.
- Workers Free over-quota operations **fail** instead of being unlimited.

Reference: https://developers.cloudflare.com/durable-objects/platform/pricing/

Our current HypeRoom code expires connections after **15 to 30 minutes**.
At a sustained 5,000 clients this can result in 40,000–80,000
new DO connection requests over 4 hours, *before counting incoming messages*.
The 100k/day cap is therefore a genuine risk during an extended launch peak.

## 3. Illustrative scenario calculator

Execute:

```powershell
node tools/hype-free-tier-estimator.mjs
```

Assumptions: all users stay connected throughout the event; each has
one WebSocket, the average illustrative session lasts 22.5 minutes
and the worst case 15 minutes, 5% or 10% of users each react every
20 seconds, and all traffic sits in one room unless specified.
These are **model assumptions, not measured user behavior**.

| Connected clients | Hours | Reactive fraction | Expected DO requests | Conservative upper estimate |
|---:|---:|---:|---:|---:|
| 1,000 | 4 | 5% | 12,816 | 17,816 |
| 5,000 | 4 | 5% | 64,016 | 89,016 |
| 5,000 | 4 | 10% | 73,016 | 98,016 |
| 5,000 | 24 | 5% | 374,096 | 534,096 |

An additional example in the script uses eight time-zone rooms.
Those rooms can increase billable duration; if all eight remain
continuously active for four hours, they would consume an
upper-bound ~14,746 GB-s, above the daily Free allowance. With
hibernation the actual duration can be far less.

The numbers above **exclude** Cloudflare Pages Functions request
quotas, Supabase Auth traffic, real browser login, rejected requests,
other sites using the account, retry storms, and any provider changes.
This does not predict a monthly bill. Free plan over-quota operations
fail; there is no guaranteed free capacity for all users.

## 4. Launch gates

1. Gather 20-minute and optionally 35-minute local soak report(s).
2. Investigate any 4001 reconnect storm, failed broadcast, or rising
   memory trend, using the Workerd process as well as Node telemetry.
3. Review all Free-plan quotas with realistic peak traffic, including
   Cloudflare Pages Functions and Supabase limits.
4. Do not activate public account creation until the privacy and terms
   drafts are completed with a correctly identified data controller.
5. Test an isolated Cloudflare staging namespace with **small** traffic
   and a budget; do not route stress traffic to the live shared DO.

Production `COMMUNITY_ENABLED=false` remains unchanged.
