# Claude Fable 5.2 vs Gemini 4 Carbon

The video: https://youtu.be/SBSV2gckmKQ

Every model got the same prompts, one try each, and every result is here as it came. Prices are each maker's list price for the tokens the model used.

## Claude Fable 5.2 vs Gemini 4 Carbon: We Made Them Build, Fight and Bargain

Settings: Fable 5.2: effort high · Gemini 4 Carbon: thinking not set (Google's default, medium).

Why the settings differ: Fable ran at its high effort setting; Carbon at Google's default thinking level, medium.

- Claude Fable 5.2 (Anthropic): effort high, through Claude Code on a Claude plan, tools off.
- Gemini 4 Carbon (Google): thinking not set (Google's default, medium), through Google's Gemini API.

### Launch ad

| Model | Setting | Turns | Minutes | List price |
|---|---|---|---|---|
| Gemini 4 Carbon | thinking not set (Google's default, medium) | 2 | 4.1 | $0.27 |
| Claude Fable 5.2 | effort high | 2 | 20.8 | $5.86 |
| Claude Opus 5.5 (side run, not in the matchup) |  | 2 | 13.9 | $2.11 |

Prompts: [prompts/ad.md](prompts/ad.md). Builds: [builds/ad/](builds/ad/).

### Browser game

| Model | Setting | Turns | Minutes | List price |
|---|---|---|---|---|
| Gemini 4 Carbon | thinking not set (Google's default, medium) | 3 | 15.6 | $1.34 |
| Claude Fable 5.2 | effort high | 3 | 28.0 | $9.78 |

Prompts: [prompts/game.md](prompts/game.md). Builds: [builds/game/](builds/game/).

### Mini desktop OS

| Model | Setting | Turns | Minutes | List price |
|---|---|---|---|---|
| Gemini 4 Carbon | thinking not set (Google's default, medium) | 3 | 17.8 | $1.52 |
| Claude Fable 5.2 | effort high | 3 | 38.8 | $13.11 |

Prompts: [prompts/os.md](prompts/os.md). Builds: [builds/os/](builds/os/).

### Tank duel

Each model wrote a tank's brain from the same rules sheet; the brains then fought ten rounds a match. Where a brain broke the rules sheet, an idle brain entered in its place (`-entered.js`).

| Match | Rounds won |
|---|---|
| Exhibition (limits raised, outside the rules) | Claude Fable 5.2 0, Gemini 4 Carbon 1, draws 9 |
| Match 1 | Claude Fable 5.2 10, Gemini 4 Carbon 0, draws 0 |
| Match 2 | Claude Fable 5.2 10, Gemini 4 Carbon 0, draws 0 |

Writing the last brains, list price: Claude Fable 5.2 $0.39, Gemini 4 Carbon $0.14.

Rules: [prompts/tank.md](prompts/tank.md). Brains: [builds/tank/](builds/tank/). Every round: [results/tank.json](results/tank.json).

### Split or Steal

5 rounds of $1,000. Final money: Claude Fable 5.2 $2,000, Gemini 4 Carbon $3,000.

Rules: [prompts/split-steal.md](prompts/split-steal.md). Every message and choice: [results/split-steal.json](results/split-steal.json).

