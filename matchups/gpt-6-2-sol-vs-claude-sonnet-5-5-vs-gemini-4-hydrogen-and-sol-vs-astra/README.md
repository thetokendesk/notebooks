# GPT-6.2 Sol vs Claude Sonnet 5.5 vs Gemini 4 Hydrogen, and Sol vs Astra

The video: https://youtu.be/ds8dVimMpEU

Every model got the same prompts, one try each, and every result is here as it came. Prices are each maker's list price for the tokens the model used.

## GPT-6.2 Sol vs Claude Sonnet 5.5 vs Gemini 4 Hydrogen, and Sol vs Astra

Settings: Sol: reasoning low · Sonnet 5.5: effort high · Hydrogen: thinking medium · Terra: reasoning high · Sol (high): reasoning high · Astra: reasoning high.

Why the settings differ: Levels matched on the Artificial Analysis Intelligence Index, not by name: Sol at low 41, Hydrogen at medium 41, Sonnet 5.5 at high 42, Terra at high 42. Sol against Astra: both at high (55 and 60), one maker's two tiers.

Different price tiers on purpose: OpenAI says Sol comes within half a point of Astra at about a fifth of the cost; Astra runs the same bugs at high beside Sol at high, with every price shown.

- GPT-6.2 Sol (OpenAI): reasoning low, through Codex on a ChatGPT plan, read-only, no web.
- Claude Sonnet 5.5 (Anthropic): effort high, through Claude Code on a Claude plan, tools off.
- Gemini 4 Hydrogen (Google): thinking medium, through Google's Gemini API.
- GPT-6.1 Terra (OpenAI): reasoning high, through Codex on a ChatGPT plan, read-only, no web.
- GPT-6.2 Sol (OpenAI): reasoning high, through Codex on a ChatGPT plan, read-only, no web.
- GPT-6.2 Astra (OpenAI): reasoning high, through Codex on a ChatGPT plan, read-only, no web.

### 3D browser game

| Model | Setting | Turns | Minutes | List price |
|---|---|---|---|---|
| GPT-6.2 Astra | reasoning high | 3 | 21.1 | $2.01 |
| GPT-6.2 Sol | reasoning high | 3 | 29.2 | $0.87 |

Prompts: [prompts/game3d.md](prompts/game3d.md). Builds: [builds/game3d/](builds/game3d/).

### Coalition

Three players, $100 a round for 5 rounds. Back each other + same split = paid. Each round every player sends messages in turn, then secretly names a split, who it backs, and a private reason.

| Model | Setting | Through | Final money | Calls | List price |
|---|---|---|---|---|---|
| GPT-6.2 Sol | reasoning low | Codex, ChatGPT plan | $162 | 15 | $0.07 |
| Claude Sonnet 5.5 | effort high | Claude Code, Claude plan | $75 | 15 | $0.20 |
| Gemini 4 Hydrogen | thinking medium | Gemini API | $163 | 15 | $0.29 |

Rules as the players read them: [prompts/coalition.md](prompts/coalition.md). Every message, vote and private reason: [results/coalition.json](results/coalition.json).

### Paint

Each model wrote a bot from the same rules sheet in its maker's own coding tool; the three bots then coloured one shared board for 15 rounds.

| Model | Points | Rounds won | Cells painted | Writing the bot (list price) |
|---|---|---|---|---|
| GPT-6.2 Sol | 39 | 12 of 15 | 4598 | low in Codex, 23.5 min, $0.95 |
| Claude Sonnet 5.5 | 7 | 1 of 15 | 4041 | high in Claude Code, 4.5 min, $0.29 |
| Gemini 4 Hydrogen | 14 | 2 of 15 | 4225 | medium in Antigravity, 8.1 min, $1.07 |

Rules: [arena/paint/RULES.md](arena/paint/RULES.md). Every round: [results/paint.json](results/paint.json). Replay the match from this folder:

```
node arena/paint/run-match.mjs builds/paint/sol-bot.js builds/paint/sonnet-bot.js builds/paint/hydrogen-bot.js --names Sol,Sonnet,Hydrogen --out replay --tries 6 --restarts 400
```

A bot has 5 ms a move. A move that runs out of time restarts the round from the start, and only a move late on every try counts as a timeout, so a busy computer rarely changes the result. A bot that is itself close to the limit can still time out on a different move, which moves a few cells. `--tries` and `--restarts` raise the limits.

### Bug race

Each model fixed real bugs in marked in its maker's own coding agent, from the code just before the real fix and the bug report. Graded by the tests the real fix added, which the models never saw. Prompt tail: "The code is in this folder. Fix this bug. You may run the existing tests. Work offline: do not search the web or open web pages."

| Bug | hydrogen | sonnet | terra | sol | sol-high | astra |
|---|---|---|---|---|---|---|
| bug1: text after an empty nested quote disappears | 26/26 lines, 2.3 min, $0.36 | 26/26 lines, 0.7 min, $0.10 | 26/26 lines, 1.3 min, $0.05 | 26/26 lines, 1.4 min, $0.15 | 26/26 lines, 4.0 min, $0.29 | 26/26 lines, 2.3 min, $0.45 |
| bug2: checkboxes jump off their labels in a nested checklist | 20/20 lines, 1.8 min, $0.32 | 20/20 lines, 1.0 min, $0.16 | 20/20 lines, 1.0 min, $0.05 | 20/20 lines, 0.9 min, $0.11 | 20/20 lines, 1.7 min, $0.20 | 20/20 lines, 2.3 min, $0.53 |
| bug3: a link quietly points somewhere else | 9/15 lines, 4.2 min, $0.64 | 15/15 lines, 1.6 min, $0.22 | 9/15 lines, 1.6 min, $0.06 | 7/15 lines, 1.1 min, $0.15 | 9/15 lines, 5.9 min, $0.23 | 15/15 lines, 4.9 min, $1.17 |

Agents: Gemini 4 Hydrogen at medium in Antigravity (Google AI Pro (Antigravity quota)); Claude Sonnet 5.5 at high in Claude Code (Claude plan (Claude Code login)); GPT-6.1 Terra at high in Codex (ChatGPT plan (Codex)); GPT-6.2 Sol at low in Codex (ChatGPT plan (Codex)); GPT-6.2 Sol at high in Codex (ChatGPT plan (Codex)); GPT-6.2 Astra at high in Codex (ChatGPT plan (Codex)).

Bugs and their hidden tests: [prompts/bugs.md](prompts/bugs.md). Every run: [results/bug-race.json](results/bug-race.json).

