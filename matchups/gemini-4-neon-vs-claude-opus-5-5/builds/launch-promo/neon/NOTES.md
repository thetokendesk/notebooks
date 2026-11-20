# Production Notes: Kestrine Cold Brew Launch Promo (`promo.mp4`)

## Format & Deliverables
- **File:** `promo.mp4`
- **Spec:** 1080×1920 vertical (9:16), 30 fps CFR, 26.40 seconds (within the 20–30 s target), H.264 `yuv420p` (`tv` range, `bt709`), silent 48 kHz stereo AAC (`192 kbps`), `+faststart`.
- **Safe Area:** All typography, pills, brand marks, and key faces/subjects stay strictly inside `x: 90–930` and `y: 250–1500` so Instagram Reels and YouTube Shorts UI chrome (right-side buttons and bottom caption/controls) never obscure content.

## Beat-by-Beat Plan (26.4 s total, 0.35 s smooth cross-dissolves)

| Beat | Time (s) | Dur | Photo & Motion | On-Screen Copy | Purpose |
|---|---|---|---|---|---|
| **1. Hook** | `0.0–3.0` | `3.0s` | `cold-brew-cans.jpg` — tight vertical portrait of frosted center can on ice; slow push-in (`1.00→1.08`), immediate at frame 0 (no black frame or slow fade-in) | Top pill: `NEW · 15 APRIL 2027`<br>**`Our house blend, now cold in a can.`** | Immediate product + value hook in the first 2 seconds |
| **2. Blend** | `3.0–6.2` | `3.2s` | `bags-lineup.jpg` — sunlit kraft Kestrine bags on wood shelf; gentle horizontal glide + push-in (`1.02→1.07`) | `HOVER HOUSE BLEND`<br>**`The coffee you already love.`**<br>`Brazil & Colombia, medium roast.` | Grounds the cold brew in the signature Hover House Blend for existing fans |
| **3. Method** | `6.2–9.4` | `3.2s` | `roastery.jpg` — brick Chattanooga roastery, cooling tray & roaster inspecting dark beans; pan right + gentle push-in | `ROASTED IN CHATTANOOGA`<br>**`Steeped 18 hours.`**<br>`8 oz can. Nothing added.` | Key product specs: local roast, 18-hour steep, 8 oz can, pure ingredients |
| **4. Taste** | `9.4–12.8` | `3.4s` | `farm-visit.jpg` — Colombian partner farmer holding glistening red coffee cherries; gentle push-in | `TASTING NOTES`<br>**`Chocolate, toasted almond, a little cherry.`**<br>`Smooth, not bitter.` | Customer-language tasting notes from the brief, visually echoed by the cherries |
| **5. Convenience** | `12.8–16.0` | `3.2s` | `airport-cafe.jpg` — barista handing coffee to smiling traveler by terminal glass; gentle push-in | `COLD, ON THE GO`<br>**`Skip the café line.`**<br>`Same Kestrine coffee, ready to grab.` | Speaks directly to the target audience: cold, on the go, no café line |
| **6. Cafés & Price** | `16.0–19.2` | `3.2s` | `cafe-downtown.jpg` — sunlit Downtown brick café panning toward the rust espresso bar | `CHATTANOOGA`<br>**`$4.50 a can in all three cafés.`**<br>`Downtown · North Shore · Airport` | Café pricing and all three Chattanooga locations |
| **7. Online 12-Pack** | `19.2–22.4` | `3.2s` | `cold-brew-cans.jpg` — uncropped 3:2 showcase revealing all three frosted cans over a moving blurred Roast-tinted backdrop | `SHIPPED COLD ONLINE`<br>**`$36 for a 12-pack.`**<br>`On sale Thursday, 15 April 2027.` | Online 12-pack price, cold shipping, and exact launch date |
| **8. Waitlist CTA** | `22.4–26.4` | `4.0s` | Moving atmospheric `cold-brew-cans.jpg` backdrop behind a centered solid Roast (`#2B1D16`) brand card with `logo-dark.png` | `[Kestrine Coffee Co. logo]`<br>`KESTRINE COLD BREW`<br>**`Join the waitlist.`**<br>`20% off your first 12-pack with free shipping.`<br>Button: **`kestrinecoffee.com`**<br>`On sale Thursday, 15 April 2027 · Chattanooga cafés · Ships cold in the US` | Strong waitlist offer and URL held for 4.0 seconds (well over the 2 s minimum) |

## Sensible Choices Made
1. **Silent 48 kHz Stereo AAC Track (No Artificial Synth or TTS):** Because no music or voice-over was supplied, I chose not to generate robotic TTS or synthetic waveforms that would clash with Kestrine's warm, handcrafted specialty-coffee identity. Instead, the copy, pacing (3.0–3.4 s per beat, ~3.5–4 words/sec), and typography carry the entire story cleanly with sound off, while muxing a silent 48 kHz stereo AAC track (`192 kbps`) ensures full container compatibility for Instagram Reels, YouTube Shorts, and effortless in-app music pairing at upload.
2. **Photo Selection:** Used 6 of the 8 brand photos (`cold-brew-cans.jpg`, `bags-lineup.jpg`, `roastery.jpg`, `farm-visit.jpg`, `airport-cafe.jpg`, `cafe-downtown.jpg`). Intentionally omitted `pour-over.jpg` (steaming hot brew could confuse a fast silent viewer in a cold brew ad) and `subscription-box.jpg` (shows two coffee bags in a box rather than a 12-pack of cans). Used `cold-brew-cans.jpg` in three distinct framings: tight single-can hero hook (Beat 1), full 3-can uncropped 3:2 showcase (Beat 7), and atmospheric moving background behind the CTA card (Beat 8).
3. **Brand Guide Compliance (`brand/BRAND.md`):**
   - **Typography:** Georgia Bold (`66–82 px`) for all headlines; Avenir Next Demi Bold (`32–52 px`) and Regular (`34 px`) for eyebrows, body lines, CTA button, and footer — sized for crisp mobile legibility after `yuv420p` encoding.
   - **Palette:** Roast (`#2B1D16`) for warm editorial gradient scrims and the CTA card; Crema (`#F3E9DC`) for high-contrast warm typography; Kestrel Rust (`#B4532A`) strictly disciplined to **one accent element per frame** (pill dot on Beat 1, short horizontal accent rule on Beats 2–7, hero CTA pill on Beat 8). Sky (`#9DB7C9`) was not used (reserved for charts).
   - **Logo Clear Space:** `brand/logo-dark.png` is placed unmodified (no stretching or recoloring) on an exact matching `#2B1D16` Roast card at `540×156 px` (mark height `91 px`), with `111 px` vertical clear space (`1.22×` mark height) and `153 px` horizontal clear space (`1.68×` mark height) on all sides.
   - **Voice:** Warm, plain, specific, short sentences, zero exclamation marks, and none of the avoided phrases ("artisanal", "crafted with love", "elevate").
4. **Subpixel Motion & Clean Transitions:** Rendered frames with floating-point subpixel affine resampling in Pillow (preserving exact aspect ratio on every beat) piped directly to `ffmpeg` (`libx264`), avoiding `zoompan` pixel jitter and guaranteeing continuous motion with no frozen stretches or overlapping text during cross-dissolves.

## Verification Results
- **`ffprobe`:** `h264`, `1080×1920`, `yuv420p`, `color_range=tv`, `30/1` fps CFR; `aac`, `48000 Hz`, `2 ch` (stereo); duration `26.400 s`; size `15.28 MB`.
- **Faststart (`+faststart`):** Verified `moov` atom at byte offset `36` before `mdat` at `30327`.
- **Black & Freeze Check (`blackdetect=d=0.1:pix_th=0.1,freezedetect=n=0.003:d=1`):** Zero black frames and zero frozen stretches detected across all 26.40 s (including the 4.0 s CTA hold).
- **Visual Review (`preview promo.mp4 --every 0.5`):** Inspected all 54 extracted frames (`frame-001.png`–`frame-053.png` and `frame-last.png`). Confirmed immediate hook on frame 1 (no black frame or fade-in), clean cross-dissolves with no colliding text, legible mobile-scale typography and subjects strictly within the safe area (`x: 90–930`, `y: 250–1500`), zero image stretching, and the complete waitlist CTA + logo held through `frame-last.png`.

