# THE FINAL WAIT — LIVE HYPE security and performance review
Date: 2026-10-29. Scope: Cloudflare Pages Functions, Supabase account/profile API,
Sender group integration, browser client and Durable Object WebSocket room.

## Test status and scope

The operator reported passing end-to-end Preview tests for Google authentication,
profile creation, Turnstile, multi-tab real-time emojis, adaptive cooldown,
newsletter add/remove and account deletion. These are **manual functional tests**,
not a penetration test or a 5,000-concurrent-user load test.

Additional source-level QA smoke checks were performed after this review.
The new lifetime/alarm patch has only undergone source syntax and mocked alarm tests so far. Deploying this updated Worker remains a separate Wrangler action; do not infer live verification from the existing integration tests.

## Changes on branch community-qa only

1. **Current terms gate** — `functions/api/community/ticket.js` now requires
   `profile.terms_version === TERMS_VERSION` before issuing a signed WebSocket
   ticket. Previously any stored version was sufficient.
2. **Same-origin WebSocket** — `functions/api/community/live.js` now rejects
   missing or mismatched `Origin` headers; browsers supply the header.
3. **Tagged per-user connections** — the Durable Object uses
   `acceptWebSocket(server, ['uid:'+userId])` and
   `getWebSockets('uid:'+userId)` instead of scanning all peers for each join.
4. **Input hardening** — the Durable Object validates UUID user IDs and
   nickname shape before accepting a connection, and drops app-level `ping`
   messages without writing back unbounded `pong` replies. Cloudflare handles
   protocol-level ping/pong frames.
5. **Cooldown robustness** — share cooldown timestamps across the two connected
   tabs using serialized WebSocket attachments (also after hibernation).
   Evict oldest cache entries instead of clearing every cooldown at once at 12k.
6. **Regression coverage** — added terms enforcement, WebSocket security checks,
   and a mock alarm/session-expiry test to `tests/community.test.mjs`.
7. **Bounded WebSocket lifetime (pending Worker redeploy)** — new sockets expire
   after at least 15 and less than 30 minutes, grouped into shared
   15-minute deadline buckets per room. A single per-room Durable Object alarm
   closes expired sockets even while the object would otherwise hibernate.
   The browser automatically reconnects and requests a fresh authenticated
   ticket. A deleted account cannot obtain a valid new ticket once Supabase
   rejects it. This is *bounded revocation*, not instantaneous revocation.
   In high-traffic multi-zone scenarios, alarm invocations consume quota
   (up to roughly 96 alarms/day for a continuously occupied room).

No change was made to `PUBLIC_COMMUNITY_ENABLED` or Production deployment
variables. The production feature stays disabled.

## Residual technical risks (must not oversell as solved)

- This is not a verified stress test. Practical capacity at 1k / 5k / 25k
  active connections, latency, reconnect storms and Cloudflare Free quotas
  still need measurement; Cloudflare's theoretical 32,768 sockets per DO
  does not imply this app can handle that load.
- The new Worker session deadline bounds already-connected sessions to
  less than 30 minutes after a successful handshake, rather than revoking them
  instantly when an account is deleted. Expiration depends on Durable Object
  alarm execution and is not a substitute for a realtime multi-room revocation
  system. Confirm reconnect behavior and alarm execution in the protected Preview
  before enabling any public account creation.
- Reaction cooldown can be bypassed by disconnecting all sockets and
  reconnecting quickly, because the in-memory cache resets on DO hibernation.
  Per-socket attachments preserve the cooldown only for still-connected tabs.
  For stronger adversarial abuse resistance, use durable per-user rate limiting,
  while accounting for SQLite write quotas.
- Sender API update failures are represented by `pending` or
  `pending_unsubscribe` and require administrative reconciliation before
  marketing campaigns. Privacy and consent compliance requires provider-specific
  retention and unsubscribe processing review.
- `community-privacy.html` and `community-terms.html` are still DRAFT.
  The legal controller identification, retention periods and provider documents
  need final verification before public registrations.
- Preview and Production share the deployed Durable Object namespace today;
  deploy Worker modifications in a controlled test window, since deployment
  can affect active Preview sessions.

## QA instructions — deployment of this revised version

1. Confirm Cloudflare Pages Preview branch `community-qa` builds successfully;
   its API `/api/community/config` should show `enabled:true`.
2. On the operator's local checkout:
   ```powershell
   cd C:\Users\Ryze\the-final-wait
   git fetch origin
   git switch community-qa
   git pull --ff-only origin community-qa
   node --test tests/community.test.mjs
   npx wrangler deploy --config workers/hype-worker/wrangler.jsonc
   ```
   Do not deploy the Worker before running tests. If `git switch` reports
   uncommitted changes, preserve them first; do not force overwrites.
3. Re-run login, nickname update, Turnstile, two-tab emoji, cooldown, newsletter
   opt-in/withdrawal, and deletion in Cloudflare Access-protected Preview.
4. Specifically test stale terms blocking, a second tab, reconnects and bursts.
5. Monitor Cloudflare Worker / Durable Object metrics and Supabase auth errors.
   Maintain `COMMUNITY_ENABLED=false` in Production.

## Capacity and budget facts

Cloudflare Workers Free Durable Objects are subject to daily compute-request,
active duration and SQLite-storage quotas. The current Free plan advertises
100,000 requests/day and 13,000 GB-s/day, as well as 100,000 SQL rows written/day.
WebSocket **outgoing** messages are not individually billed. Incoming application
WebSocket frames are billed as compute requests at a 20:1 ratio, while each
new connection is a request. Therefore short bursts and large sustained audiences
need benchmark data; do not promise all-day 5k-user traffic on Free.

Sources:
- https://developers.cloudflare.com/durable-objects/api/state/
- https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- https://developers.cloudflare.com/durable-objects/platform/pricing/
- https://supabase.com/docs/guides/database/postgres/row-level-security
