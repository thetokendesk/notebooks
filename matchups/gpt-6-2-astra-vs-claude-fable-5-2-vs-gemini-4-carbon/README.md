# GPT-6.2 Astra vs Claude Fable 5.2 vs Gemini 4 Carbon

The video: https://youtu.be/IeBpBNhXSPM

Every model got the same prompts, one try each, and every result is here as it came. Prices are each maker's list price for the tokens the model used.

## GPT-6.2 Astra vs Claude Fable 5.2 vs Gemini 4 Carbon

Settings: Astra: reasoning high · Fable 5.2: effort high · Gemini 4 Carbon: thinking medium.

Why the settings differ: Carbon played Coalition and wrote its Paint bot at medium (index 58), as in the 11 Nov mini OS: at high it thought through all 16,000 tokens of a 60-word Coalition message and wrote nothing. The 3D game ran all three at high: Astra 60, Fable 5.2 62, Carbon 60.

- GPT-6.2 Astra (OpenAI): reasoning high, through Codex on a ChatGPT plan, read-only, no web.
- Claude Fable 5.2 (Anthropic): effort high, through Claude Code on a Claude plan, tools off.
- Gemini 4 Carbon (Google): thinking medium, through Google's Gemini API.

### 3D browser game

| Model | Setting | Turns | Minutes | List price |
|---|---|---|---|---|
| GPT-6.2 Astra | reasoning high | 3 | 21.1 | $2.01 |
| Gemini 4 Carbon | thinking high | 3 | 39.7 | $3.78 |
| Claude Fable 5.2 | effort high | 3 | 35.4 | $11.67 |

Prompts: [prompts/game3d.md](prompts/game3d.md). Builds: [builds/game3d/](builds/game3d/).

### Mini desktop OS

Gemini 4 Carbon and Claude Fable 5.2 ran this test in an earlier matchup (fable-carbon-20261111); the others got the same prompts.

| Model | Setting | Turns | Minutes | List price |
|---|---|---|---|---|
| GPT-6.2 Astra | reasoning high | 3 | 34.0 | $3.38 |
| Gemini 4 Carbon | thinking medium | 3 | 17.8 | $1.52 |
| Claude Fable 5.2 | effort high | 3 | 38.8 | $13.11 |

Prompts: [prompts/os.md](prompts/os.md). Builds: [builds/os/](builds/os/).

### Coalition

Three players, $100 a round for 5 rounds. Back each other + same split = paid. Each round every player sends messages in turn, then secretly names a split, who it backs, and a private reason.

| Model | Setting | Through | Final money | Calls | List price |
|---|---|---|---|---|---|
| GPT-6.2 Astra | reasoning high | Codex, ChatGPT plan | $172 | 15 | $0.36 |
| Claude Fable 5.2 | effort high | Claude Code, Claude plan | $172 | 15 | $0.63 |
| Gemini 4 Carbon | thinking medium | Gemini API | $156 | 15 | $0.70 |

Rules as the players read them: [prompts/coalition.md](prompts/coalition.md). Every message, vote and private reason: [results/coalition.json](results/coalition.json).

### Paint

Each model wrote a bot from the same rules sheet in its maker's own coding tool; the three bots then coloured one shared board for 15 rounds.

| Model | Points | Rounds won | Cells painted | Writing the bot (list price) |
|---|---|---|---|---|
| GPT-6.2 Astra | 40 | 13 of 15 | 4749 | high in Codex, 25.4 min, $2.50 |
| Claude Fable 5.2 | 10 | 1 of 15 | 3582 | high in Claude Code, 13.5 min, $2.57 |
| Gemini 4 Carbon | 11 | 1 of 15 | 3550 | medium in Gemini CLI, 15.7 min, $2.42; stopped by our spend limit, with its bot saved |

Rules: [arena/paint/RULES.md](arena/paint/RULES.md). Every round: [results/paint.json](results/paint.json). Replay the match from this folder:

```
node arena/paint/run-match.mjs builds/paint/astra-bot.js builds/paint/fable-bot.js builds/paint/carbon-bot.js --names Astra,Fable,Carbon --out replay --tries 6 --restarts 400
```

A bot has 5 ms a move. A move that runs out of time restarts the round from the start, and only a move late on every try counts as a timeout, so a busy computer rarely changes the result. A bot that is itself close to the limit can still time out on a different move, which moves a few cells. `--tries` and `--restarts` raise the limits.

