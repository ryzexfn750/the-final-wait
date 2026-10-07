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

The daily story is controlled by:

```text
content/today.json
```

Edit the issue/date/category/headline/dek and the `blocks` array. Supported block types:

- `paragraph`
- `heading`
- `image` (`sceneId` + optional `caption`)
- `quote` (`text` + optional `cite`)
- `sources` (array of links)

After changing the story, regenerate the social preview card:

```powershell
python tools/build_today_card.py
```

The article is available at `today.html`. Its X/WhatsApp/share buttons point directly to that article, whose Open Graph preview uses `assets/today-card.png`.

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
