# The Final Wait — LIVE HYPE community v2 QA

Changes exist on the **community-qa** branch, not main. Production must remain
`COMMUNITY_ENABLED=false`, `PUBLIC_COMMUNITY_ENABLED=false`.

## Design behavior requested

1. When preview is enabled and visitor opens any first-party page directly,
   show a blocking account welcome screen. Google OAuth first; then permanent
   nickname, required community terms and separate **unchecked by default**
   optional newsletter choice; Turnstile server verification.
2. Registered visitor bypasses the gate after session validation.
3. Profile icon lives immediately left of the translation dropdown on the
   homepage, article pages and dedicated `profile.html`.
4. Profile page shows immutable nickname, logout, optional newsletter updates,
   account deletion, normal topbar, language selector, sharing, fullscreen,
   navigation and audio controls. Embedded navigation must keep the parent's
   ambient soundtrack playing instead of starting another player.
5. A compact right-side rail over the countdown offers only seven emoji
   (🔥 🚀 🥳 🎉 🌴 🩷 💜) plus the number of seconds until the next reaction.
6. Incoming emoji animations are rendered **inside #hero**, with the author's
   nickname below, no floating popup/feed. Reactions and rail remain available
   before, at, and after 00:00, including the final-call special window.
7. A separate small HYPE LEVEL meter uses the recently broadcast reaction
   counts relative to room audience size. It is a *relative live-intensity
   indicator*, not a persistent/cumulative worldwide counter.
8. Footer includes Privacy Notice, Terms, newsletter unsubscribe link
   (`profile.html#newsletter`) and contact.

## Internal dependencies

- `functions/_lib/community.js` EMOJIS: seven values.
- `workers/hype-worker/src/index.js` ALLOWED: same seven values.
- `functions/api/community/profile.js` permanently rejects nickname changes.
- `functions/api/community/newsletter.js` requires Google identity, current
  community terms and verified Cloudflare Turnstile to change the preference.
- `js/community.js`, `css/community.css`: gate / rail / animation / meter.
- `profile.html`, `js/community-profile.js`,
  `css/community-profile.css`: profile experience.
- All five original site pages have the early QA-only identity mask and
  footer/menu account links.
- `js/seamless-navigation.js`: permits profile.html to load in the existing
  sound-preserving iframe shell.
- `tools/build-cloudflare-pages.mjs`: copies profile.html into Pages output.

## Required manual QA (Preview, protected by Cloudflare Access)

After local soak finishes, update the local QA branch; run:

```powershell
node --test tests/community.test.mjs
node tools/build-cloudflare-pages.mjs
```

Then review only the protected QA Preview. Do NOT flip Production gates.

- Clean browser profile: set
  `localStorage.setItem('tfw_community_preview','yes'); location.reload()`.
  Account gate must cover countdown, navigation and all article URLs.
- Login with Google; choose a **unique** nickname. Terms are required;
  newsletter checkbox starts unchecked. Verify profile only becomes available
  after Turnstile and successful API registration.
- Reopen every first-party route; existing account should not be asked to
  register again.
- Try to modify nickname using a handcrafted authenticated profile POST:
  server must return 409; UI never exposes username editing.
- On profile: subscribe, unsubscribe; confirm API persisted the opt-out and
  Sender state. Test sign out, sign back in and delete account.
- On homepage: seven emoji buttons, countdown in rail, animated nickname
  reactions, live hype meter and reconnect after changing time zones.
- On phone: narrow countdown, rail, meter, account link and language menu
  must all remain usable with no horizontal overflow.
- On release state: test clock before and after 00:00 and special Final Call
  preview. Music, final call, fireworks and route transitions must remain
  intact; separate animations must never cover the main form while gated.
- Open article and profile by clicking in-page links; return to homepage;
  verify one audio owner, accurate countdown and sound spectrum.

## Launch caveats

**The visual registration gate is not server-side access control for static
Cloudflare Pages HTML.** A script-disabled browser or direct static-asset
request can still retrieve public page content. Account access to protected
profile/emoji APIs is enforced server-side. If hard paywall-style restriction
is required, design separate cookie/session validation for Pages CDN routes.

The community's terms and privacy files are still marked draft. Complete
GDPR/controller identification and retention disclosures before public
account creation. Making a Google account compulsory may reduce access and
requires a defensible purpose; newsletter consent must stay independently
optional. Avoid claiming the site or coin is officially affiliated with
Rockstar.

The Pages preview may deploy automatically from the QA branch, but **the
Durable Object Worker needs a separate deployment** before the three new
emojis are usable end-to-end. Never deploy the special *local* load-test
config. Deploy only the original Worker config after soak is complete and
tests have passed.
