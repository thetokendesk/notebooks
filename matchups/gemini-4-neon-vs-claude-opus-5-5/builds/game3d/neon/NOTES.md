# SOLAR DRIFT — Design & Engineering Notes

## Concept & Core Design Choices
- **Genre**: High-speed 3D anti-gravity arcade sky-circuit racer (*Wipeout* / *F-Zero* / *Mario Kart* inspired), chosen because it delivers immediate 3D spatial joy, unmistakable visual affordances on frame 1, zero pointer-lock friction, and high skill-ceiling replayability across both desktop and mobile viewports.
- **Single-File Architecture**: All 3D geometry, PBR/canvas procedural textures, custom GLSL sky & ocean/canyon/orbital shaders, spline physics, AI opponents, ghost replay recorder, particle/ribbon trails, UI, and Web Audio synthesizer/music live inside `game.html`, importing solely `https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js`.

## Gameplay Mechanics & Game Feel
- **3-Tier Plasma Drift-Turbo (`SHIFT`)**: Holding drift into turns kicks out the craft's tail while letting the player modulate their racing line (steering deeper tightens the apex & speeds up charge; counter-steering widens the arc). Charging builds across Cyan (Tier 1), Gold (Tier 2), and Magenta Plasma (Tier 3) sparks + diegetic rear tail-bar color; releasing fires an instant mini-turbo and refills the Overdrive meter.
- **Overdrive Boost & Shockwave (`SPACE`)**: Manual boost gauge refilled via drifts, boost pads, collectible apex energy crystals, mid-air sky rings, barrel-roll landings, and slipstreaming/drafting behind rivals. Activating Overdrive unleashes an expanding sonic ring that nudges nearby rivals aside and widens FOV + radial speed lines.
- **Jump Ramps, Mid-Air Sky Rings & Barrel Rolls (`A`/`D` or `Q`/`E` in air)**: Curved launch ramps propel craft skyward through floating Sky Rings; tapping steer in mid-air executes a 360° Barrel Roll for a high-scoring landing turbo.
- **Countdown Rocket Launch**: Interactive sweet-spot launch bar during the 3-2-1 start sequence rewards timing gas (`W`/`↑`) into the gold zone with a Perfect Rocket Launch.
- **3 Handcrafted Circuits & 3 Hover-Craft**:
  1. **Azure Archipelago** — Sunlit coastal viaduct over a custom GLSL sea with sculpted terraced islands, spinning wind turbines, and striped hot-air balloons.
  2. **Solar Canyon** — Sunset red-rock mesa circuit featuring a 3D Figure-8 overpass bridge crossing 34 meters above the start straight.
  3. **Neon Stratosphere** — Twilight orbital hyper-circuit under an animated GLSL aurora borealis sky with towering monoliths and rotating halo rings.
  - Selectable craft (**Valkyrie-7**, **Solaris-X**, **Zephyr-GT**) differ in silhouette and Speed/Drift/Boost tuning.
- **2 Modes & Persistence**: **Grand Prix** (3 laps vs. 7 AI hover-racers with slipstreaming, hull-bump sparks, and fair pack pacing) and **Time Attack** (solo runs with live 3D holographic Ghost recording/playback). Best times and S/A/B/C medals persist via `localStorage`.

## Technical Highlights & Offline Verification
- **Twist-Free Parallel-Transport Spline Physics**: Closed `CatmullRomCurve3` tracks are uniformly sampled (720 segments) with smoothed curvature-proportional banking (leveled cleanly across the start/finish straight). Track-local `(s, u, h)` physics delivers real corner curvature drag, inside-apex arc-length advantage, banking assistance, hill-crest lift, and guaranteed frame-rate-independent ramp launches with zero collision tunneling.
- **Procedural Graphics & Audio**:
  - Runtime-generated PMREM environment map gives metallic hulls and glossy canopies realistic sky/sun specular reflections without external HDRIs.
  - Procedural `CanvasTexture`s for road decks/kerbs, animated scrolling boost chevrons, checkered start strips, gantry banners, striped hot-air balloons, contact shadows, and circular radial plasma sparks.
  - Web Audio API synthesizer drives continuous velocity-reactive hover turbines, pitch-climbing drift shimmer, one-shot SFX, and a tempo-shifting procedural synth soundtrack (toggleable with `M`).
- **Verification**: Audited offline via `preview game.html` (desktop and phone widths) and headless Playwright gameplay runs across all three tracks, confirming zero console errors, smooth track curvature/clearance metrics, crisp kerbs/sparks, clean mobile HUD/touch separation, and working drift/boost/aerial/results flows.
