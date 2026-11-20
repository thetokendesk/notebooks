# Kestrine Cold Brew launch promo: notes

Output: `promo.mp4`, 1080x1920, 30 fps, H.264 yuv420p (BT.709), AAC 48 kHz stereo, faststart, about 25 s.
Build: `python3 build/cards.py && python3 build/build.py` (scripts in `build/`, intermediates in `build/out/`).

## Plan by beats

Eight clips joined with 0.4 s cross-fades. Times are for the finished video.
There is no voice, so the on-screen lines are the script.

| # | Time (s) | Picture | On screen |
|---|---|---|---|
| 1 | 0.0 to 3.0 | `cold-brew-cans`, centre can, slow push-in | Hook. Rust tag "NEW: KESTRINE COLD BREW" + "Our house blend, now in a can." |
| 2 | 3.0 to 5.7 | `roastery`, roaster with a scoop of beans | "Hover House Blend, steeped 18 hours." |
| 3 | 5.7 to 8.8 | `farm-visit`, farmer holding coffee cherries | "Chocolate, toasted almond, a little cherry." |
| 4 | 8.8 to 11.4 | `cold-brew-cans`, tight on the label | "Nothing added. Smooth, not bitter." |
| 5 | 11.4 to 14.2 | `cafe-downtown`, the bar | "In our three Chattanooga cafés" / "Downtown · North Shore · Airport" |
| 6 | 14.2 to 16.7 | `airport-cafe`, customer taking a cup | "$4.50 a can, ready to go." |
| 7 | 16.7 to 19.8 | `cold-brew-cans`, left can and ice | "Skip the line. 12-packs, shipped cold." / "$36 at kestrinecoffee.com" |
| 8 | 19.8 to 25.2 | End card on Roast: logo, call to action, the three cans | "On sale Thursday 15 April 2027" / "Join the waitlist" / "20% off your first 12-pack, plus free shipping" / "kestrinecoffee.com" |

The call to action is fully on screen for about 5 s at the end.

## Choices I made (nobody to ask)

- **Length about 25 s**, in the middle of the 20 to 30 s asked for: eight beats of 2.5 to 3 s each, plus a 5 s end card.
- **Call to action is the waitlist**, not "buy now": the launch is 15 April 2027, five months from now, and the brief's
  offer (20% off the first 12-pack, free shipping) only applies before launch. I assumed the waitlist is on
  kestrinecoffee.com because the brief gives no other address. Change the end card if it has its own page.
- **Year shown on the date** ("Thursday 15 April 2027"), so it reads correctly whenever it is watched. I checked that
  15 April 2027 is a Thursday.
- **Audio is a silent stereo AAC track**, 48 kHz. No music or voice was supplied and I did not make any up. A silent
  track keeps the file valid on both platforms and lets you add a licensed sound in the Instagram or YouTube editor.
  Because of this, the -14 LUFS loudness target does not apply.
- **Photos left out:** `pour-over` (steam and a kettle say "hot", wrong for a cold-brew launch), `subscription-box`
  and `bags-lineup` (they show bags, and the online offer is cans; showing bags would mislead).
- **Brand:** headlines in Georgia Bold, other text in Avenir Next (Medium and Demi Bold). Text sits on a Roast
  (#2B1D16) band, mostly opaque, in Crema (#F3E9DC). Rust (#B4532A) is used for one thing per frame: the "NEW" tag
  on the hook, the web address on the end card. The logo (`logo-dark.png` on solid Roast) is not stretched or
  recoloured and has clear space of at least the mark's height around it.
- **Copy** follows the brand voice: plain words, short sentences, no exclamation marks, none of the banned words.
  "Skip the line" comes from the brief's audience ("on the go, without the café line") and is attached to online
  ordering, where it is literally true.
- **Safe area:** all text inside x 90 to 930 and y 250 to 1500, so the app's buttons and caption never cover it.
  The end card's centred column is centred on the safe area (x 510), not the frame, so its widest lines stay clear
  of the right-hand buttons. Headlines are 70 to 100 px and supporting lines 56 to 60 px. The only smaller text is
  the 44 px "NEW: KESTRINE COLD BREW" tag, and the can underneath it carries the same name.

## Checks run on the final promo.mp4

- ffprobe: h264 High, 1080x1920, yuv420p, BT.709, 30/1 fps constant (756 frames), AAC LC 48 kHz stereo, 25.2 s.
  The moov atom comes before mdat (faststart).
- blackdetect + freezedetect: nothing found. The end card has a slow push-in on its photo, so it never reads as frozen.
- Loudness: silent by design (-70 LUFS, peak -inf). Add music in the app or replace the track before posting.
- `preview promo.mp4 --every 0.5`: I looked at all 51 frames. The first frame shows the hook. Every line is readable
  and inside the safe area, nothing is stretched (all crops are exactly 9:16), and the cross-fades are clean. The
  last 5 s hold the call to action.

## Not done / limits

- Music and voice-over: none, as noted above.
- I did not make a 1080x1350 feed version or separate captions/subtitle files. The text is burned into the picture.
- Photos are upscaled about 1.9x (2.35x on the tight can shot) to fill a vertical frame from 3:2 sources. On a phone
  they look sharp, but full-size frames are slightly soft.
