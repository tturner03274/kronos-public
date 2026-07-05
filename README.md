# KRONOS: public site

The retail-facing site. **Static, dumb, and disconnected by design.** It renders
entirely from `feed/public_feed.json`, a sanitized snapshot pushed outward from
Kronos nightly. It never connects to Kronos; no path exists.

## Security rules (do not weaken)
1. This repo must NEVER contain: API keys, broker anything, Kronos URLs/credentials,
   or code that calls any private system.
2. The feed is produced by Kronos' `PublicFeedService` (whitelist-only, guarded by
   `tests/test_public_feed.py` in the Kronos repo). Add fields THERE, never here.
3. If this site is fully compromised, the attacker gets published data and (later)
   an email list. Keep it that way.

## Running locally
    python -m http.server 8899
Renders from `feed/public_feed.sample.json` until a real feed exists.

## Deploying (pick one, both free)
- **Cloudflare Pages**: create a new GitHub repo from this folder, connect it in
  Cloudflare Pages, no build step, output dir = `/`. Custom domain when ready.
- **GitHub Pages**: Settings → Pages → deploy from branch.

## The nightly feed push (from the Kronos server)
Kronos writes `data/public_feed.json` nightly. Add a step on the Kronos server
(cron or end of the deploy Action) that copies it here and pushes:

    cp /path/to/kronos/data/public_feed.json feed/public_feed.json
    git add feed/public_feed.json && git commit -m "feed: nightly" && git push

Pages redeploys automatically on push. One-way valve complete.

## Launch checklist (before charging money)
- [ ] ~3 months of live track record with the high band holding ≥55% beat-rate
- [ ] FCA wording check: information/education, NOT personal advice (get real advice)
- [ ] Waitlist form → real endpoint (currently localStorage stub in `js/site.js`)
- [ ] Stripe + magic-link login for the members' picks page (£10–15/mo; free tier = track record)
- [ ] Delayed preview policy review: currently 2 oldest picks visible, rest locked
