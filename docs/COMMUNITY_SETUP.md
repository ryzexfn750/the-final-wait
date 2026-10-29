# THE FINAL WAIT — Community Hype (deployment checklist)

Status: **CODE COMPLETE FOR INTEGRATION TESTING; NOT ACTIVE UNTIL CONFIGURED**.
The existing countdown, R2 audio and Google Analytics operate independently.

## 0. Legal checklist — do this before any public registrations

Edit `community-terms.html` and `community-privacy.html`. Replace every
`[ADD ...]` / `[FINALIZE]` placeholder with the actual operator, privacy
contact and retention policy. Review age-appropriate eligibility, lawful bases,
moderation and deletion workflows, international transfers and processor
agreements. These documents are drafts, **not legal advice**.

## 1. Supabase project (Free tier)

1. Create a Supabase project. In **Authentication → Providers**, enable Google.
   Configure OAuth Client ID/Secret in Google Cloud Console. Google OAuth
   callback URI is `https://<PROJECT>.supabase.co/auth/v1/callback`.
2. In Supabase **Authentication → URL Configuration**, set the site URL
   `https://thefinalwait.com`, and allow redirect URL
   `https://thefinalwait.com/**`. If you test on preview domains, whitelist
   only the exact preview origins required.
3. In **SQL Editor**, execute `supabase/community-schema.sql` once.
   RLS remains enabled and client users have no direct table privileges.
4. Copy the **Project URL**, **public anon/publishable key** and a
   **server-only service-role (secret) key**. Never commit the service-role key.
5. Pages production environment variables:
   - `SUPABASE_URL` = `https://<PROJECT>.supabase.co`
   - `SUPABASE_ANON_KEY` = public key (safe for browser)
   - `SUPABASE_SERVICE_ROLE_KEY` = secret key (encrypted)
   - `COMMUNITY_ENABLED` = `false` initially.

Google auth is email-based but passwordless. The verified email is private;
the user chooses a nickname after first sign-in. Login uses the PKCE flow.

## 2. Live rooms (Workers Free + SQLite Durable Objects)

Cloudflare Pages **cannot create a DO namespace inside its project**.
The worker in `workers/hype-worker` is deployed *separately*.

From a machine with Node.js / Wrangler:

```sh
npx wrangler login
npx wrangler deploy --config workers/hype-worker/wrangler.jsonc
```

This deploys worker `the-final-wait-hype` with SQLite-backed
`HypeRoom` Durable Object. `workers_dev:false` prevents a public worker
HTTP endpoint. Then, in Cloudflare:
**Workers & Pages → the-final-wait → Settings → Bindings → Add →
Durable Object**. Set the binding name **HYPE_ROOMS**, and select the
namespace created by the worker. Redeploy Pages after adding the binding.

Pages production secret `HYPE_TICKET_SECRET`: generate a random value
(32+ bytes, e.g. PowerShell:
`[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))`).
This signs short-lived WebSocket tickets **only in Pages Functions**.
The DO never receives Supabase tokens, emails or signing secrets.

Rate limit: 1 emoji per connection/account per 10s, 2 connections/account
per time-zone room, batched outgoing updates. The countdown keeps working
if the live feature is temporarily unavailable. Guest viewing is not enabled
in this initial, safer release: users sign in to join rooms.

## 3. Sender.net Free (optional marketing list)

Create a Sender account, verify your sender domain, create a dedicated
**The Final Wait Announcements** contact group, find its group ID and
API token. Add encrypted Pages secrets:
- `SENDER_API_KEY`
- `SENDER_GROUP_ID`

Consent checkbox is **off by default**. API subscriber updates are run only
on affirmative opt-in. API errors set newsletter status to `pending` or
`pending_unsubscribe`; handle those manually before sending any campaign.
Use Sender's **unsubscribe link** in every campaign and monitor the
provider's free contacts/volume quotas. Do not infer that a
`pending` record has been added to Sender.

Important: if Sender secrets are absent, account creation still works but
newsletter requests remain `pending`. Do not launch a campaign before
checking the contact list and the opt-out sync queue.

## 4. Final enablement

When provider accounts, privacy notice, database and DO binding are tested,
set Pages production `COMMUNITY_ENABLED=true`, then redeploy Pages.
Visit `https://thefinalwait.com/api/community/config`; verify
`enabled:true`. Only then does the **LIVE HYPE** launcher appear.

Check Google login, nickname uniqueness, the independent newsletter checkbox,
a live emoji sent across two sessions with the same selected time zone, and
separation between two different zones. Check account deletion and
unsubscribe before marketing to anyone.

## 5. Safety and incident behavior

- /api/community/* is the only additional Pages Functions invocation route.
- New feature is hidden while `COMMUNITY_ENABLED` is false or binding is
  missing, and must not alter the countdown.
- Cloudflare free quotas apply to Worker and DO requests; frequent messages
  or large broadcasts may exceed free-tier resources.
- If a peak occurs, set `COMMUNITY_ENABLED=false` and redeploy,
  or use security rules specifically for the API. Static pages and R2
  audio remain served by the CDN.
- Do not use browser localStorage to store the service-role key or Sender key.
- Before opening registration, run integration checks with real Supabase
  Google OAuth, Sender and Cloudflare Durable Object bindings.
- Source-controlled unit tests can run with `node --test tests/community.test.mjs`.

Docs:
Cloudflare DO Pages binding: https://developers.cloudflare.com/pages/functions/bindings/#durable-objects
Cloudflare hibernation: https://developers.cloudflare.com/durable-objects/examples/websocket-hibernation-server/
Supabase Google Auth: https://supabase.com/docs/guides/auth/social-login/auth-google
Sender API: https://api.sender.net/subscribers/add-subscriber/
