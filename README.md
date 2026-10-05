# The Final Wait — V10

Complete V10 build for GitHub Pages. Replace the site files in your repository, keeping its .git folder, then commit and push. No build or npm installation is required.

# The Final Wait: Road to Leonida

Unofficial fan countdown built as a static site for GitHub Pages.

## Publish / update on GitHub Pages

From the repository folder:

```powershell
git add .
git commit -m "Update The Final Wait"
git push
```

GitHub Pages will redeploy the `main` branch automatically.

## Update “Today in Leonida”

The daily front-page story is controlled only by:

```text
content/today.json
```

You do **not** need to edit `index.html` or `today.html` for a normal daily article. Change these fields:

- `issue` — e.g. `ISSUE 002`
- `date` — the visible publication date
- `category` — the small category label
- `headline` — article title
- `dek` — short summary used on the homepage card and article hero
- `heroSceneId` — large article-cover image
- `cardSceneId` — image used on the homepage newspaper card
- `readingTime` and `byline`
- `blocks` — the actual article content

Supported `blocks`:

```json
{ "type": "paragraph", "text": "..." }
{ "type": "heading", "text": "..." }
{ "type": "eyebrow", "text": "..." }
{ "type": "image", "sceneId": "scene-17", "caption": "..." }
{ "type": "quote", "text": "...", "cite": "..." }
{ "type": "sources", "items": [{ "label": "...", "url": "https://..." }] }
```

To choose an image, open `assets/scenes.json` and use the `id` of the screenshot/artwork you want, for example `scene-17`. The image itself remains inside `assets/screenshots/desktop/` and `assets/screenshots/mobile/`; you only reference its scene ID in the article.

After editing `content/today.json`, regenerate the social preview card:

```powershell
python tools/build_today_card.py
```

Then test `today.html` locally or on GitHub Pages and push the update:

```powershell
git add .
git commit -m "Update Today in Leonida"
git push
```

The homepage card and `today.html` read the JSON automatically, so the new article appears without duplicating the text anywhere else.

## Add new official screenshots later

Use the existing helper:

```powershell
python tools/add_screenshots.py <folder-with-new-images>
```

Then verify `assets/scenes.json`, commit and push.

## Time zone behavior

The default countdown is midnight on **November 19, 2026 in Europe/Rome (CET / UTC+1 on that date)**. Visitors can switch the target to midnight in another IANA time zone through the time-zone selector. Their selection is saved locally in the browser.

## Analytics

Set `gaMeasurementId` in `config.js` if you want Google Analytics 4. The site includes an optional analytics-consent prompt.

## Main files

- `index.html` — main experience
- `today.html` / `article.js` — newspaper article page
- `config.js` — timeline, Leonida Intel, site configuration
- `content/today.json` — manually editable daily story
- `styles.css` — visual system and animations
- `app.js` — countdown, time zones, backgrounds, shares, timeline, audio and interactions

## Disclaimer

This is not an official Rockstar Games project. Grand Theft Auto, Grand Theft Auto VI, Rockstar Games, related trademarks, names and official imagery belong to their respective owners. This fan-made website is not affiliated with or endorsed by Rockstar Games or Take-Two Interactive.


## V3 content
- `content/today.json` controls the daily newspaper article.
- `content/intel.json` controls the internal Inside Leonida dossiers.
- `intel.html?article=<id>` opens an internal dossier.
- Hero scenes rotate every 10 seconds.

## V4 interaction fixes
- Countdown now has a dedicated watchdog clock plus the main animation clock, so the timer and percentage keep updating in real time.
- Internal section navigation uses eased animated scrolling instead of abrupt hash jumps.
- Story/dossier navigation shows a full-screen loading transition.
- Timeline starts on the first milestone, can center the final milestone, and includes Rockstar's February 4, 2022 development confirmation.
- Article sources use the new Source Desk layout.
- A persistent Countdown shortcut appears after leaving the hero.

## V7
- 141 countdown screenshots; artwork is reserved for editorial sections and the rotating final banner.
- Shared automatic image drift plus local mouse parallax; reduced-motion preferences are respected.
- 22 sourced timeline milestones, native touch scrolling, drag, arrows, Home/End and bounded ends.
- 18 expanded dossiers plus the main story, with article contents and reading progress.
- Direct loading of index.html#intel without a visible trip through the countdown.
- Historical rumors, reports, editorial interpretation and scheduled events are labeled separately.
- Content reviewed October 5, 2026. The countdown remains a configurable fan target at midnight, not a guarantee of a worldwide simultaneous launch.

## Timeline archive stories

Every timeline milestone now opens an internal long-form story at:

```text
timeline.html?story=<story-id>
```

The articles live in `content/timeline.json`. They are intentionally not listed in the general `Inside Leonida` dossier grid; the only public entry point is the horizontal timeline. Each milestone also keeps compact external source links beside the internal `READ STORY` action.

## Languages

The top bar includes English, French, Spanish, Russian and Italian through the GTranslate website widget. The site remains authored in English and translations are generated on the page by the external translation service, so no server or build step is required.

## Countdown milestone experience / preview

The live countdown automatically has cinematic sequences at 1 month, 2 weeks, 1 week, 1 day, 12 hours, 6 hours, 1 hour, 30 minutes, 15 minutes, 5 minutes, 1 minute, 30 seconds and release. Audio effects are generated in the browser with Web Audio and respect the site's SOUND preference.

To preview every sequence without changing the real clock, open:

```text
https://ryzexfn750.github.io/the-final-wait/?preview=1
```

A small `EXPERIENCE PREVIEW` button appears at the bottom-left. The 30-second preview is accelerated so you can inspect the full final countdown quickly.


## V10 finale simulator

Open the site with `?preview=1` to enter the finale preview. V10 automatically starts the preview at **-05:00** and drives the real countdown UI with simulated time. The preview panel includes a scrubber covering the complete final 30 minutes, so you can drag to arbitrary positions such as `-23:56.000`, pause there, or press **PLAY FROM HERE** to resume in real time.

Finale audio:

- `assets/audio/final-5-minutes.mp3` starts at `-05:00` and ends around `-00:42`.
- `assets/audio/final-10-release.mp4` starts exactly at `-00:10`, continues through `00:00`, and drives the music-reactive visualizer.
- Tick cues begin at `-00:40` and accelerate during the final second.

At `00:00` the timer is replaced in-place by the release message. Fireworks and the release-state visual effects remain active for as long as the release state is displayed.
