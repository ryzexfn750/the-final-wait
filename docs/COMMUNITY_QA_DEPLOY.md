# QA deployment — The Final Wait

This document applies **only** to `community-qa`. Never replace the production
worker `the-final-wait-hype` or change the Pages Production bindings.

## 1. Preview site

The Cloudflare Pages project is configured to build its `community-qa`
preview automatically from branch pushes. Verify its latest deployment in
**Cloudflare → Workers & Pages → the-final-wait → Deployments** and open:

https://community-qa.the-final-wait.pages.dev/

The GitHub Actions suite must be green. Public access to preview deployments
should be restricted with a Cloudflare Access policy before QA signup.

## 2. Dedicated QA Durable Object Worker

An isolated Wrangler config lives in
`workers/hype-worker/wrangler.qa.jsonc`. Its script name is
`the-final-wait-hype-qa`, **not** the production worker. It creates a separate
`HypeRoom` Durable Object namespace. Do not deploy the default
`wrangler.jsonc` in a QA-only release.

From the repository root, after authenticating Wrangler to the correct
Cloudflare account:

```sh
npx wrangler deploy --config workers/hype-worker/wrangler.qa.jsonc
```

This requires a Cloudflare deployment credential and is **not run by the
GitHub validation workflow**. Never commit or paste tokens. Ensure the active
Cloudflare account is correct before running the command.

## 3. Preview-only Pages binding

In Cloudflare Pages project settings, configure **Preview** environment's
Durable Object binding `HYPE_ROOMS` to the dedicated worker
`the-final-wait-hype-qa` and its `HypeRoom` class/namespace.
Leave the Production environment untouched. Make sure Preview has
`COMMUNITY_ENABLED=true` and its existing authentication/security secrets.

Pages bindings require a new Preview deployment before changes become effective.
The Pages preview must then be rebuilt through the supported Cloudflare
deployment controls or another `community-qa` push.

## 4. Verify without production changes

1. Confirm the preview WebSocket welcome packet advertises `protocol: 2`
   and all seven emoji in `emojis`.
2. Check that 🥳, 🌴 and 🩷 each receive `reaction_ack` and produce a
   real broadcast to another registered QA browser session.
3. Check that an unsupported emoji gets `reaction_error` and does not
   consume the client cooldown.
4. Test Terms, Privacy, Support, browser Back/Forward, page audio continuity,
   and account gate on desktop and mobile.
5. Confirm the `main` branch and production Worker/script have not changed.

If credentials or Cloudflare Preview bindings are missing, the Worker deploy
remains **pending**; a Git push alone does not update the Durable Object Worker.
