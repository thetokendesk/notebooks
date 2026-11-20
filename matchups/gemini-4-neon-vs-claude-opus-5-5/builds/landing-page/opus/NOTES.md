# Kestrine Cold Brew launch page: notes

**The page:** `site/index.html`, with the resized images in `site/img/`. It works offline: no CDNs, no web fonts, no outside requests.
**To rebuild:** run `python3 build_site.py`. It resizes the brand photos and logos, checks colour contrast (the build fails if a pair fails) and writes the page.
**To check:** `preview site/index.html`. The screenshots are in `site/index-preview/`, which git ignores.

## Before it goes live: the waitlist form
- The brief names no email tool or server, so nothing collects sign-ups yet. Right now each form:
  - checks the address,
  - shows an error if it's empty or malformed,
  - shows a confirmation ("You're on the waitlist…") in both forms,
  - remembers the address in that browser (localStorage), with "Use a different email" to start over.
- **Wire it up before launch.** Set `ENDPOINT` at the top of the page's script to your email tool's form URL. The form then POSTs the email there and only confirms when the POST succeeds.
- The confirmation says "We'll email you when it goes on sale on 15 April." That is what a waitlist implies, but the brief doesn't say it. Change it if you plan something else.

## Content choices (everything comes from `inputs/launch-brief.md` and `brand/BRAND.md`)
- **Headline:** the brief's own line, "Our house blend, steeped 18 hours, in a can." It's concrete, has a number and is in the brand's voice.
- **Derived numbers** (arithmetic on the brief, not new facts):
  - **$28.80:** the $36 12-pack at 20% off.
  - **"148 days to go":** worked out from the visitor's own date. It hides itself after launch day.
- **Proof:** there are no reviews or quotes in the inputs, so I didn't invent any. The proof section uses brand facts instead: founded in 2016 by Maya Okafor and Tom Reyes, about 3,600 kg a month on one 15 kg roaster on the Southside, three cafés.
- **Things I left out because the inputs don't support them:**
  - ingredients beyond "nothing added" (no "no sugar/milk" claims)
  - caffeine, shelf life, nutrition
  - a privacy promise under the form
  - grab-and-go fridges in the cafés
- **"Ships within the US"** comes from the brand guide's description of the online shop. The brief only says "shipped cold, in 12-packs".
- **kestrinecoffee.com** is plain text, not a link. Make it a link if the page will live somewhere else.
- **Photos:**
  - used: cans (hero), partner farm in Colombia (taste), roastery (who makes it), Airport café (where to buy)
  - not used: `pour-over.jpg` (hot coffee would mislead), `bags-lineup.jpg` and `subscription-box.jpg` (bags, not cans)
- **Missing file:** BRAND.md mentions a `brand/data/` folder, but it isn't there. A landing page doesn't need it.

## Design
- **Colours:** all from BRAND.md (Rust, Roast, Crema, Sage). Sky is chart-only, so it isn't used.
  - Rust marks one thing per screen: the waitlist button, or the $28.80 price where no button is in view.
  - Measured contrast: body text 13.6:1, muted text 7.3:1, white on Rust buttons 5.0:1. Rust on Crema is only 4.2:1, so Rust is never used for small text.
- **Type:** Georgia Bold for headlines, Avenir Next (Regular and Demi Bold) for everything else, with system fallbacks.
- **Logos:**
  - `logo.png` sits on an exact Crema header and `logo-dark.png` on an exact Roast footer (I checked the pixels match), so neither shows a box.
  - Neither is stretched. The logos' own padding plus page padding gives roughly a mark's height of clear space.
  - The favicon is made from `logo-mark.png`.
- **Phone (390 px):** headline, supporting line, email field, button, launch date and offer all fit on the first screen. Tap targets are 44 px or taller; the form controls are 56 px.
- **Image weight:** each photo comes in 800 px and 1536 px versions (srcset), so phones load about 300 KB of photos in total.

## What was and wasn't verified
- `preview` at 1440 and 390 px. I looked at both full pages and at the phone's first screens at full size. No sideways scroll, no clipped text, crops are clean.
- `check_page.mjs` (Playwright) is written but **could not run here**: the sandbox stops Chromium from starting (a mach-port permission error). It checks:
  - script errors and outside requests
  - overflow, alt text, tap targets, heading order
  - the empty, bad-address and good-address form submissions

  Run `node check_page.mjs site/index.html` on a normal machine. The form logic is plain JavaScript and was not tested in a browser here.
