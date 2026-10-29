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

## Visual refinement pass — October 29

- Registration: always display a visible pointer over the full-screen gate;
  the kicker is now just THE FINAL WAIT. Repeated Google invitation and
  private-email caption were removed.
- Original header geometry is preserved: the profile control is an
  absolutely positioned person-outline icon next to the actual language
  widget. A separate header coordinator measures its position on narrow
  screens and after translator DOM updates.
- Reactions: emoji rail is inset a little from the right edge, while its
  separate intensity tube is vertical, bottom-up, and animated.
- Animated reactions sample available countdown space. The sampler rejects
  collisions with titles, countdown, release HUD, navigation and special
  Final Call content whenever safe positions are available. Animation
  lifetime is 2.6 seconds and DOM nodes are bounded.
- Profile: simple person-outline avatar, permanent nickname text without
  extra caption, logout and delete with a branded, accessible confirmation
  dialog rather than native `confirm()` prompts.
- Newsletter/CAPTCHA controls are completely absent from `profile.html`.
  The unsubscribe link in **every footer** opens `newsletter.html`,
  preserving seamless navigation and audio. The dedicated newsletter page
  still performs Cloudflare Turnstile verification for secure preference
  changes, using the existing authenticated API.
- Previous web asset versions: `community.js?v=3`,
  `community.css?v=3`, `community-profile.js?v=2`,
  `community-profile.css?v=2`, `community-header.js?v=3`.
- Run `node --test tests/community.test.mjs` and
  `node tools/build-cloudflare-pages.mjs` on `community-qa`.
  Browser QA must explicitly confirm cursor appearance on an anonymous
  new session, no navbar shifting with each translator language, newsletter
  unsubscribe in footer, modal operations, mobile layout and post-release
  animated reactions.

Do not deploy the community module to Production before legal and runtime
checks. The app-only gate is a UX gate, not static HTTP authorization.

## October 29 — QA v4 bug fixes (post-soak)

- **Seamless routing and wheel isolation:** opening profile, newsletter,
  privacy, terms or support now locks the original homepage at both `html`
  and `body` levels. Underlying `syncSectionHash()` ignores scroll events
  while a page overlay is open. The iframe remains the only active scroll
  owner and should restore the original HYPE UI upon Back/Return.
- **Registration date:** the authenticated profile query now selects the
  actual Supabase `created_at` field. The profile displays "MEMBER SINCE"
  with a UTC-formatted date. No timestamp is accepted from the client.
- **HYPE tube:** same approximate height as the seven-emoji rail,
  now physically opposite on the left side of the countdown, with
  "HYPE LEVEL" and percent INSIDE the vertical tube. Fill rises bottom-up.
- **Emoji glyphs:** consistent grid cell measurements, no button padding
  variations. Reaction particles fade/rotate in just **1.6 seconds**,
  retaining reduced-motion accessibility.
- **Registration:** `novalidate` disables the browser validation bubble.
  Nicknames with spaces or forbidden characters get a styled inline error,
  `aria-invalid`, and focused input. Redundant instructions were removed.
  Server-side validation still applies.
- **Support:** footer links now open `support.html`, displaying a copyable
  email address even when Windows has no configured `mailto:` client.
  Support remains accessible without a signed-in account, just like
  the legal/privacy disclosures. Check externally that
  `support@thefinalwait.com` is configured to receive real messages.
- **Footer:** legal disclaimer sits beside the brand on desktop;
  privacy/terms/newsletter/support are discreet, small, unbordered links
  below, with responsive stacking on mobile.
- **Cache:** `js/community.js?v=4`, `css/community.css?v=4`,
  `js/seamless-navigation.js?v=51`, `js/app.js?v=51`,
  `js/community-profile.js?v=3`, `css/community-profile.css?v=3`.

### Regression checklist in the protected QA Preview

1. Test new registration with `John Doe` and `John_Doe`: the first must
   produce our inline error; no browser popover should appear.
2. Verify member-since date after Google registration.
3. Open profile, scroll to bottom, press browser Back, then repeat.
   Underlying URL should remain `/profile.html` during profile scrolling
   and HYPE emoji bars must still be visible after return. No double
   scrollbar, even on the very first visit after registration.
4. Repeat with Privacy Notice, Terms, Newsletter, and Support in the footer.
   Verify links and audio continuity.
5. Check HYPE tube opposite the seven emoji and alignment on desktop,
   tablets and narrow phones. Test release preview and Final Call.
6. Send multiple emoji, checking slight rotations, 1.6-second decay and
   avoidance of clock text/control regions.
7. Inspect footer: logo/disclaimer side-by-side desktop, tiny legal links
   without rule, and readable stacked layout mobile.

Run from the `community-qa` branch:
```powershell
git pull --ff-only origin community-qa
node --test tests/community.test.mjs
node tools/build-cloudflare-pages.mjs
```
No Production gates, public Worker bindings, or Cloudflare Durable Object
deployment changes are required for these frontend/Pages Function fixes.
