# VOIDLING: notes

`game.html` is a single-file 3D browser game. It imports only three.js 0.170.0 from the jsDelivr CDN. Everything
else is made at runtime: geometry, the ground texture (drawn on a canvas), building facades, the swirl inside the
hole, sound effects and music (WebAudio). There are no image or audio files.

## The game
You are a small hole in the ground in a toy town. Anything smaller than you that slides over the hole falls in, and
you grow. A round lasts 2 minutes, and each gold star you eat adds 3 seconds. The town is a 7×7 grid of blocks that
gets bigger toward the middle. The edge has houses, parks and car parks. Then come shops and offices, then
skyscrapers, and the **Mega Duck** sits in a pond at the centre. The Duck is the last bite and is worth +25,000.

How it plays:
- People run away from you once you are big enough to eat them. Cars and buses drive the street grid, turning at
  junctions, so they drive into you.
- Things that are too big wobble at the edge of the hole and show "too big!".
- Quick bites in a row build a combo (a higher multiplier every 4 bites, up to ×10). Each bite plays a note from a
  pentatonic scale, so a combo plays a rising tune. Combo milestones (10, 20, 35, 50, 75, 100, 150) flash a praise
  word (NICE! … VOIDTASTIC!) with a jingle.
- Growing unlocks a new size level with a banner telling you what you can eat next (cars, houses, skyscrapers…).
- Big bites shake the screen and send out a shockwave. Eating the Duck triggers slow motion and a quack.
- HUD: score, combo, timer (red with ticking for the last 10 s, green flash on +3 s), size bar, leaderboard, active
  power-up timers, minimap (Duck, stars, rivals and power-ups are marked), and % of town eaten.
- The end screen shows a rank (Crumb Catcher → COSMIC VOID), your place among the four holes, stats (rivals
  devoured, best combo, power-ups) and your best score (saved in `localStorage`).

### Rival holes (added in the "make it more fun" pass)
Three AI holes eat the town too: **GOBBLER** (red), **MUNCHY** (green) and **SLURPO** (orange).
- A hole that is at least 15% wider than another can swallow it by covering most of it.
- You eat a rival: +1,500 + 300·size² points, a little growth, a "GULP!" banner. It comes back 6 s later somewhere
  far away, smaller than before, so you can hunt it again.
- A rival eats you: you lose 15% of your size, get knocked back, and blink for 3 s. During that time you can't be
  bitten again. The round goes on, and that rival won't chase you again for 10 s.
- Tags over each rival say what it is to you: red "⚠ NAME" means it can eat you, green "NAME 😋" means you can eat
  it. A red glow at the screen edge pulses when a bigger rival is close.
- AI: a few times a second each rival flees if you could eat it, hunts you for up to 5 s if it could eat you (at
  80% of its top speed, so you can outrun it), and otherwise heads for the best food within 50 m. If it is more
  than 75 m from you, it drifts toward your part of town, so rivals stay in your game. Rivals never take stars,
  power-ups or the Duck.
- Each rival drifts toward a target size relative to yours (rubber-banding): GOBBLER ≈1.2× (the bully, usually
  something to run from), MUNCHY ≈0.95×, SLURPO ≈0.7× (usually a snack).

### Power-ups
Three floating icons with light beams stand on the roads at any time. Each one comes back 6 s after you take it,
somewhere else. The first one is always a Magnet on the road just north of the start.
- 🧲 **Magnet** (8 s): anything you could eat within 2·r + 5 m flies toward you. Stars are not pulled, because
  pulling them stretched rounds too much in testing. A pink ring shrinks toward the hole while it runs.
- 👄 **Mega Mouth** (7 s): the hole is 1.5× wider, so you can eat bigger things and bigger rivals. With it you
  can bite the Duck before you are fully grown.
- ⚡ **Turbo** (8 s): 1.65× speed, a cyan rim and a wider field of view.

## Choices I made (no one to ask)
- **Genre:** a "grow by swallowing" hole game. The mechanic is common in the genre, but the name, the town and the
  Mega Duck goal are my own. I picked it because the sense of growing is fun straight away and needs no tutorial.
- **What "more fun" meant:** the original was a solo score attack with no tension and nothing happening between
  bites. Rivals add stakes: something to chase, something to run from, and a place to win. Power-ups add short
  spikes of excitement. The praise words, timer flash, combo pop and new sounds add feedback.
- **Bitten = lose size, not lose the round:** a 2-minute round shouldn't end because of one mistake.
- **Fixed town:** the town comes from a seeded generator, so every round has the same layout and best scores can be
  compared. Cars, people, rivals and power-up placement still change from round to round.
- **How the hole works:** the ground shader throws away pixels inside any of the four hole circles (a `vec4`
  uniform array, `onBeforeCompile`) and darkens a lip around each edge. Under each hole sits an open cylinder with
  a gradient in that hole's colour, plus a spinning additive swirl. Falling objects really drop below ground level
  and tip toward the centre of the hole that is eating them.
- **Performance:** about 2,700 objects. Small things are `InstancedMesh`es, one per prop type with vertex colours.
  Buildings are separate meshes so their window texture tiles at the right size. The shadow camera follows the
  player and widens as you grow. A rival re-scans for food only every 0.3–0.55 s.
- **Balance:** tuned with a greedy bot that plays whole rounds in a headless copy (test copies only; the
  `VOID_TEST` hook does nothing in normal play; `VOID_TEST.skill` < 1 makes the bot slower to stand in for a
  human). Before rivals, the full-speed bot reached r≈14 at 100 s and ate the Duck at about 85 s. Now:
  - Full-speed bot: r≈13–15 at 120 s, eats 4–6 rivals, never bitten, eats the Duck at about 105–111 s.
  - 60% speed bot: r≈3.5–9, sometimes bitten, up to 8 s of danger per round.
  - 40% speed bot: bitten 1–3 times. It can't outrun anything; a human at full speed can.

  My first rival settings had every rival rubber-band toward your size. Bigger rivals then hurt weak players a
  lot. After I softened that, no rival was ever a threat. Giving each rival its own target size fixed both.
- If the CDN can't be reached, the page shows a plain message after 12 s instead of a blank screen. Script errors
  also appear in a red box.

## Polish pass
Fixes:
- The timer's green "+3 s" flash class stayed on, which blocked the red pulse in the last 10 s after you took any
  star. It is now removed when the flash ends.
- A praise word could appear behind the end screen, and the combo counter stayed on the HUD after the round. Both
  are now cleared when the round ends.
- Lamps, hydrants, trash cans, mailboxes and cones had no label, so "biggest bite" could say "undefined".
- "You became a Abyss" now reads "an Abyss". The stat labels use singular and plural correctly.
- Enter/Space no longer also clicks a focused button (for example, toggling mute when you start). They only restart
  once the end card is showing, so mashing keys at 0:00 doesn't skip it. Space/Enter also resumes from pause.
- The game pauses when the tab is hidden (phones don't always send `blur`). Held keys are released on blur, so the
  hole doesn't keep driving after you alt-tab.

Look and feel:
- Ground texture is 4096² on desktops (2048² on touch devices, for memory and iOS canvas limits), so roads and
  crosswalks stay crisp up close. The seeded random sequence is unchanged, so the town layout is the same as before.
- Power-up light beams fade out toward the top instead of ending as hard lines across the sky.
- The danger glow is a softer edge glow, so it no longer washes over the HUD.
- Things spiral as they drop into a hole, following the swirl (small things spin faster).
- The end screen shows stats as a grid of tiles instead of a block of text.
- Short vibrations on phones when you get bitten, eat a rival, take a big bite or eat the Duck.

## Checks done
- `node --check` on the module script.
- Headless simulation (`.cache/vt-run.py` + `vt-driver.mjs`) runs the real update, camera, visuals and HUD code
  for three full rounds at bot skill 1.0, 0.6 and 0.4. I ran it several times after each balance change. It
  showed no errors and no objects left stuck by the magnet.
- `preview` screenshots at desktop and phone width: the title screen; early play with a dangerous and an edible
  rival nearby (tags, leaderboard, red danger glow, praise word); mid-game with Magnet and Mega Mouth active; and the
  end screen after a full round. No runtime errors appeared.
- After the polish pass: `node --check`, the headless three-round simulation (no errors, same balance), and fresh
  `preview` screenshots (title, early play, end screen) at desktop and phone width.
- Not checked: how the sound actually sounds (no speakers), real mouse or touch play (only the bot steered), or
  frame rate on a real phone.
