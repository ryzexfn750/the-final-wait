# LIVE HYPE controlled REAL WebSocket test (protected Preview only)

**Do not use the public domain or production Pages deployment.** This QA
script is ONLY in branch `community-qa`; the script refuses to run except on
`https://community-qa.the-final-wait.pages.dev`.

## Preconditions

- Cloudflare Access still protects the Preview branch and your email is the
  sole approved access identity.
- `COMMUNITY_ENABLED=true` in Preview and `false` in Production.
- Your normal Google account is signed into the LIVE HYPE Preview, with a
  completed profile and accepted current terms.
- Cloudflare Worker `the-final-wait-hype` is deployed.
- No other benchmark is running.

## Run (browser DevTools, not PowerShell)

1. Visit https://community-qa.the-final-wait.pages.dev/
2. Complete Cloudflare Access sign-in if prompted, then open LIVE HYPE.
   Sign into Google if needed; you should see your nickname and CONNECTED.
3. Press F12, select Console, and run:

   ```javascript
   const { run } = await import('/js/hype-loadtest-qa.js');
   await run({ connections: 20 });
   ```

4. Approve the explicit confirmation prompt. The test opens 20 genuine
   WSS connections using authenticated Pages Functions tickets, with a
   maximum of 2 connections in each of 10 different time-zone rooms.
   It sends one emoji per room and verifies delivery to the second socket.
   It reports a table, **without tokens or email addresses**, and closes
   every test connection in a finally block.

5. If 20/20 connections open and all 10 rooms receive their reaction,
   wait at least 15 seconds and run:

   ```javascript
   await run({ connections: 50 });
   ```

This opens two sockets in each of 25 distinct rooms. The test intentionally
does not bypass the production per-user room limit, does not add privileged
test endpoints, and does not create fake users.

## How to interpret

- `openedConnections`: should equal 20 or 50
- `activeRooms`: should equal 10 or 25
- `broadcastReceivedRooms`: should equal `activeRooms`
- `handshakeP95ms`: 95th percentile of successful WebSocket open time
- `broadcastP95ms`: 95th percentile of emoji delivery to the second socket
- `roomFailures`: should be 0

Any nonzero failures need investigation before increasing load.
`Client disconnected` errors can result from normal socket cleanup;
they are not by themselves proof of a runtime exception. Monitor
Durable Object errors and costs during the test.

## Critical limitations

- This tests *real* edge networking and 20–50 real concurrent WebSockets,
  but **not** many users in the *same* room. It cannot prove performance
  for 50 or 5,000 people sharing a single time zone.
- Connection timings include genuine browser/network/Cloudflare round trips,
  but results depend on this user's PC and Internet.
- This runs against the current Preview's existing HypeRoom namespace,
  not a fully isolated staging DO. Existing users' rooms and Free quotas can
  be affected; do not run it repeatedly or raise the hard cap.
- User data/keys are not printed. A browser's normal Supabase auth token is
  used only for same-origin Pages API calls. Never paste a token in chat.
- Do not use the script after making the QA branch public or removing Access.

Next: analyze metrics in Durable Objects, including error types, request counts,
wall time, and billable duration; then consider a truly isolated staging
Worker/Durable Object if single-room fanout load is needed.
