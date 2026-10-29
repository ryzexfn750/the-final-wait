# The Final Wait - private community QA

This branch is a separate Cloudflare Pages **Preview** deployment. Production `main`
remains unchanged. Do not enable the public community in Production.

## Required first: lock preview URLs

Cloudflare > Workers & Pages > the-final-wait > Settings > General >
**Enable access policy** for preview deployments, allowing only the operator's
account. Preview deployments are otherwise PUBLIC.

## Cloudflare Pages Preview configuration

Under Settings > Variables and Secrets, select **Preview**, and configure:
- `COMMUNITY_ENABLED=true` (Preview ONLY, after access policy)
- `SUPABASE_URL`: same Supabase project URL
- `SUPABASE_ANON_KEY`: publishable key
- `SUPABASE_SERVICE_ROLE_KEY`: secret
- `HYPE_TICKET_SECRET`: strong secret (different from production is preferred)
- `TURNSTILE_SITE_KEY`: preview widget site key (or production one with preview hostname added)
- `TURNSTILE_SECRET`: matching preview secret
- `SENDER_API_KEY`: active/replaced secret (never commit)
- `SENDER_GROUP_ID`: dedicated test group preferred

Under Settings > Bindings > Preview, set Durable Object binding `HYPE_ROOMS`
to the deployed `the-final-wait-hype_HypeRoom` namespace.

## OAuth and Turnstile

Allow the **exact** preview origin, with trailing `/**`, in Supabase
Authentication > URL Configuration > Redirect URLs (retain Production).
Cloudflare Turnstile Hostname Management: allow exact Preview hostname, or use
separate test sitekey and secret. The Google OAuth callback remains the Supabase
`/auth/v1/callback` URL.

## Smoke test

Open a preview deployment URL protected by Cloudflare Access. In browser
DevTools console:
```js
localStorage.setItem('tfw_community_preview','yes'); location.reload();
```
Click LIVE HYPE; test login with one operator Google account, choose nickname,
verify Turnstile and optional newsletter, test two tabs + emoji, unsubscribe and
account deletion, inspect Sender contacts and Supabase profile, collect errors.

This is QA only; legal documents remain draft and public account signup must
not be enabled until controller identification / retention / provider checks
are complete.
