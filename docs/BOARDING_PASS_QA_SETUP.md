# Your Ticket to Leonida — QA setup

Scope: community-qa only. Do not change main or production.

## Database migration (required)

1. Open Supabase SQL Editor for the existing QA community database.
2. Run the complete file: supabase/boarding-pass-schema.sql
3. It creates two RLS-protected tables, the idempotent issuance function,
   per-edition atomic counters and an AFTER INSERT trigger.
4. It backfills existing accounts by their original created_at dates.
   Everyone registered before Nov 6, including before Nov 1, is a Founder.
5. Re-running is safe: tickets retain their serials, editions and public IDs.

## Pages deployment

Deploy the community-qa Pages preview after running SQL.
The build includes ticket.html and dynamic /ticket/* Function routes.
No new Worker deploy or Cloudflare secret is required.

## QA checks

- Open an existing member profile. Confirm a stable F-00001-style ticket.
- Sign up a new QA member and check automatic issuance.
- Refresh and log in again: code, edition and join date do not change.
- Download the landscape PNG (1600 x 900) and Story PNG (1080 x 1920).
- Verify the background uses repository screenshots, not remote imagery.
- Open the public share link privately; no login should be necessary.
- A nonexistent public UUID must return 404 and reveal no account data.
- Delete a test user; ON DELETE CASCADE invalidates its public link.
- Spot-check UTC edition cutoff boundaries.

## Security / social sharing

- Table and counter access, and issuance RPC, restricted to service_role.
- Random 128-bit public UUIDs are independent of progressive ticket numbers.
- Public verification returns only nickname, edition, join date and ticket code.
- Shared links are public to recipients; pages are noindex by default.
- Instagram/TikTok have no reliable direct website photo-upload interface.
  Use device share sheet if available, otherwise download a story PNG.
- Tickets are decorative, unofficial fan-made collectibles, not real bookings.
