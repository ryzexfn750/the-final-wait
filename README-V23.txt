THE FINAL WAIT — V23 FULL BUILD

This is the complete website folder, not a patch bundle.

Main V23 fixes:
- Simulator range: -31 days + 5 seconds through 00:00.
- Precise simulator input: HH:MM:SS or Nd HH:MM:SS.
- Quick jumps update the real simulated timer, title and milestone SFX.
- Milestone titles remain correct while simulation playback is running.
- Crossing 1 month / 2 weeks / 1 week / 24h / 12h / 6h / 1h / 30m / 15m triggers the event consistently.
- Post-release composition cleaned up with no legacy timer/panels overlapping.
- TIME SINCE GTA VI RELEASE runs after 00:00 and uses smaller countdown-style tiles with a persistent glow.
- Long background soundtrack is permanently stopped at T-05:00 in the launch flow.
- 164 desktop and 164 mobile scene assets included.
- Background music and milestone SFX included.

Git push after copying this folder over your repository:
  git add .
  git commit -m "V23 simulator and release fixes"
  git push origin main

Finale media note:
- The ZIP is self-contained and includes fallback finale audio.
- INSTALL-AND-PUSH preserves the existing final-5-minutes / final-30-sequence / final-1-minute-voice files already in your repository, so your current original finale audio is not overwritten.
