# Inkling 2 Mini vs Qwen 3.8 27B

The video: https://youtu.be/z2OxF2n5-I8

Every model got the same prompts, one try each, and every result is here as it came.

## How it ran

Open-weight models, run two ways: through OpenRouter for the bug race, and with llama.cpp on Google Colab GPUs (an NVIDIA L4 with 24 GB, a T4 with 16 GB) for the game and the memory and speed tests. llama.cpp built from source at `e300919cc` and `1f8baae28`, with Unsloth's GGUF files. The coding agent is pi 1.6.0 (`pi -nc -ns -np --no-mcp --offline --mode json`: its default system prompt and its own tools, read, bash, edit and write). Sampling is each maker's own: Inkling 2 Mini temperature 1, top_p 1, top_k 0, min_p 0; Qwen 3.8 27B temperature 1, top_p 0.95, top_k 20, presence_penalty 0. Thinking is each model's default unless a row says otherwise. One try per model and task.

### Bug race on OpenRouter

Five real bugs in marked. pi ran on a CPU machine with the models on OpenRouter, each pinned to one host: up to 60 agent turns a bug, a 262,144-token window, at most 32,768 tokens a reply. Graded by the hidden tests and by marked's own spec and unit tests (a new failure counts only if it repeats on a second run). Minutes are the host's speed plus the agent's own commands on that machine, no guide to speed on your own card. Cost is what OpenRouter billed for each call.

- Inkling 2 Mini: `thinkingmachines/inkling-2-mini` on primeintellect (fp4), no thinking setting sent.
- Qwen 3.8 27B: `qwen/qwen3.8-27b` on chutes (fp8), no thinking setting sent.
- Inkling 2 Mini (minimal thinking): `thinkingmachines/inkling-2-mini` on primeintellect (fp4), `"reasoning": {"effort":"minimal"}`.

| Bug | Inkling 2 Mini | Qwen 3.8 27B | Inkling 2 Mini (minimal thinking) |
|---|---|---|---|
| 1: text after an empty nested quote disappears | **pass**, 26/26 lines, 60 turns (turn limit), 6.2 min, $0.0721 | **pass**, 26/26 lines, 46 turns (finished), 31.6 min, $0.1338 | **pass**, 26/26 lines, 47 turns (finished), 4.4 min, $0.0194 |
| 2: checkboxes jump off their labels in a nested checklist | **pass**, 20/20 lines, 60 turns (turn limit), 4.4 min, $0.0374 | **pass**, 20/20 lines, 42 turns (finished), 22.5 min, $0.1127 | **pass**, 20/20 lines, 20 turns (finished), 0.6 min, $0.0057 |
| 3: a link quietly points somewhere else | fail, 5/15 lines, 60 turns (turn limit), 2.5 min, $0.0276 | fail, 9/15 lines, new failures: Lexer, autolink, autolink email, inline, inlineTokens, url, url email, 60 turns (turn limit), 45.7 min, $0.2061 | fail, 5/15 lines, 14 turns (finished), 0.6 min, $0.0021 |
| 4: a tilde before inline code puts the code style on the wrong words | **pass**, 5/5 lines, 60 turns (turn limit), 4.3 min, $0.0390 | **pass**, 5/5 lines, 53 turns (finished), 19.6 min, $0.0943 | **pass**, 5/5 lines, 60 turns (turn limit), 4.9 min, $0.0280 |
| 5: a numbered list after a quote gets swallowed into the quote | fail, 6/12 lines, 60 turns (turn limit), 3.7 min, $0.0730, no change made | **pass**, 12/12 lines, 60 turns (turn limit), 47.6 min, $0.2318 | **pass**, 12/12 lines, 22 turns (finished), 0.8 min, $0.0076 |
| All five | 3 of 5 passed, 62/78 lines, 21.1 min, $0.2491 | 4 of 5 passed, 72/78 lines, 167.1 min, $0.7787 | 4 of 5 passed, 68/78 lines, 11.3 min, $0.0629 |

Bugs and prompts: [prompts/bug-race.md](prompts/bug-race.md). Each patch: [builds/bug-race/](builds/bug-race/). Every run: [results/bug-race.json](results/bug-race.json).

### Bug race on the L4

The same bugs, prompts and grading before the OpenRouter race, with each model served by llama.cpp on its own L4 machine, a 48K window and 75 minutes a bug. Only bugs 1 and 2 fitted in the machines' time.

| Model | Bug | Hidden tests | Lines right | Minutes | Agent turns | Tokens out | Patch |
|---|---|---|---|---|---|---|---|
| Inkling 2 Mini | 1 | fail | 9/26 | 69.6 | 43 | 72,350 | no change |
| Inkling 2 Mini | 2 | **pass**, new failures: Lists, Lists should pass example 307, Lists should pass example 318, Lists should pass example 319 | 20/20 | 75.0 | 60 | 96,515 | [bug2.diff](builds/bug-race-l4/inkling/bug2.diff) |
| Qwen 3.8 27B | 1 | fail | 9/26 | 75.0 | 28 | 56,253 | no change |
| Qwen 3.8 27B | 2 | fail | 17/20 | 75.0 | 46 | 53,709 | [bug2.diff](builds/bug-race-l4/qwen/bug2.diff) |

Every run: [results/bug-race-l4.json](results/bug-race-l4.json).

### 3D browser game

On the L4, llama.cpp with a 48K window, one pi session per model, a time cap on each prompt. The first game filled both windows, so prompts 2 and 3 got nowhere in that session; each model then ran them again in a fresh session from its own file. "Starts" means the file opened in headless Chromium with no errors while a script pressed Enter and Space and clicked.

| Model | Prompt | Session | How it ended | Minutes | Agent turns | Tokens out | Writing (tok/s) | File | Starts |
|---|---|---|---|---|---|---|---|---|---|
| Inkling 2 Mini | 1 | same session | time cap | 40.0 | 20 | 53,173 | 27.9 | [inkling-t1.html](builds/game3d/inkling-t1.html) | yes |
| Inkling 2 Mini | 2 | same session | window full, reply cut off (after one "continue") | 11.6 | 8 | 13,670 | 26 | unchanged |  |
| Inkling 2 Mini | 3 | same session | window full, reply cut off (after one "continue") | 0.0 | 2 | 2 |  | unchanged |  |
| Inkling 2 Mini | 2 | fresh session (exhibition) | finished | 28.8 | 22 | 34,656 | 28.7 | [inkling-t2-fresh.html](builds/game3d/inkling-t2-fresh.html) | yes |
| Inkling 2 Mini | 3 | fresh session (exhibition) | time cap | 90.0 | 48 | 105,749 | 28.7 | [inkling-t3-fresh.html](builds/game3d/inkling-t3-fresh.html) | yes |
| Qwen 3.8 27B | 1 | same session | finished | 55.7 | 4 | 43,573 | 13.4 | [qwen-t1.html](builds/game3d/qwen-t1.html) | yes |
| Qwen 3.8 27B | 2 | same session | window full, reply cut off | 1.5 | 1 | 1,087 | 12.5 | unchanged |  |
| Qwen 3.8 27B | 3 | same session | window full, reply cut off | 1.5 | 1 | 1,084 | 12.5 | unchanged |  |
| Qwen 3.8 27B | 2 | fresh session (exhibition) | window full, reply cut off (after one "continue") | 53.6 | 16 | 40,724 | 13 | [qwen-t2-fresh.html](builds/game3d/qwen-t2-fresh.html) | yes |
| Qwen 3.8 27B | 3 | fresh session (exhibition) | finished | 83.9 | 23 | 63,696 | 13.3 | [qwen-t3-fresh.html](builds/game3d/qwen-t3-fresh.html) | yes |

Prompts: [prompts/game3d.md](prompts/game3d.md). Games: [builds/game3d/](builds/game3d/). Each turn: [results/game3d.json](results/game3d.json).

### Memory and speed on a 24 GB card (L4)

Each model alone on the card: `llama-server -ngl 999 -fa on -np 1 --jinja --fit off` (every layer on the GPU), the context filled with the same document (llama.cpp's own source files), then exactly 512 tokens written. Where the default does not load, the same context with an 8-bit KV cache (`-ctk q8_0 -ctv q8_0`) and with a smaller micro-batch (`-ub 128`). VRAM is `nvidia-smi`, read every second. The rows marked `--fit on` are llama.cpp's own placement (no `-ngl`), filled with 16K tokens.

| Model | File | Context | Setting | Result | VRAM after load (MiB) | Peak while filled (MiB) | Reading (tok/s) | Writing after the fill (tok/s) | Writing, short prompt (tok/s) |
|---|---|---|---|---|---|---|---|---|---|
| Inkling 2 Mini | Q4_K_M | 8,192 | default | fits | 17,076 | 17,170 | 498.7 | 32.8 | 35.8 |
| Inkling 2 Mini | Q4_K_M | 32,768 | default | fits | 20,220 | 20,314 | 312 | 28.1 |  |
| Inkling 2 Mini | Q4_K_M | 49,152 | default | fits | 22,316 | 22,410 | 245.7 | 25.5 |  |
| Inkling 2 Mini | Q4_K_M | 65,536 | default | does not load (compute buffer of 6,524 MiB did not fit) |  |  |  |  |  |
| Inkling 2 Mini | Q4_K_M | 65,536 | 8-bit KV | does not load (compute buffer of 6,524 MiB did not fit) |  |  |  |  |  |
| Inkling 2 Mini | Q4_K_M | 131,072 | default | does not load (compute buffer of 12,860 MiB did not fit) |  |  |  |  |  |
| Inkling 2 Mini | Q4_K_M | 131,072 | 8-bit KV | does not load (compute buffer of 12,860 MiB did not fit) |  |  |  |  |  |
| Inkling 2 Mini | Q4_K_M | 262,144 | default | does not load (KV cache of 8,192 MiB did not fit) |  |  |  |  |  |
| Inkling 2 Mini | Q4_K_M | 262,144 | 8-bit KV | does not load (compute buffer of 25,532 MiB did not fit) |  |  |  |  |  |
| Inkling 2 Mini | Q4_K_M | 65,536 | -ub 128 | fits | 19,476 | 19,662 | 194 | 23.6 |  |
| Inkling 2 Mini | Q4_K_M | 131,072 | -ub 128 | does not load (compute buffer of 3,213 MiB did not fit) |  |  |  |  |  |
| Inkling 2 Mini | Q4_K_M | 131,072 | 8-bit KV + -ub 128 | fits | 21,100 | 21,286 | 117.2 | 18.7 |  |
| Inkling 2 Mini | Q4_K_M | 262,144 | -ub 128 | does not load (KV cache of 8,192 MiB did not fit) |  |  |  |  |  |
| Inkling 2 Mini | Q4_K_M | 262,144 | 8-bit KV + -ub 128 | does not load (compute buffer of 6,382 MiB did not fit) |  |  |  |  |  |
| Inkling 2 Mini | Q4_K_M | 131,072 | llama.cpp default placement (--fit on) | runs, parts on CPU | 21,098 | 21,142 | 119.5 | 2.9 |  |
| Qwen 3.8 27B | Q4_K_M | 8,192 | default | fits | 15,822 | 15,850 | 843.7 | 14.3 | 14.8 |
| Qwen 3.8 27B | Q4_K_M | 32,768 | default | fits | 17,382 | 17,392 | 767.3 | 13.1 |  |
| Qwen 3.8 27B | Q4_K_M | 49,152 | default | fits | 18,422 | 18,432 | 712.7 | 12.4 |  |
| Qwen 3.8 27B | Q4_K_M | 65,536 | default | fits | 19,462 | 19,472 | 669 | 11.8 |  |
| Qwen 3.8 27B | Q4_K_M | 131,072 | default | does not load (KV cache of 8,192 MiB did not fit) |  |  |  |  |  |
| Qwen 3.8 27B | Q4_K_M | 131,072 | 8-bit KV | fits | 20,256 | 20,266 | 519.5 | 8.5 |  |
| Qwen 3.8 27B | Q4_K_M | 262,144 | default | does not load (KV cache of 16,384 MiB did not fit) |  |  |  |  |  |
| Qwen 3.8 27B | Q4_K_M | 262,144 | 8-bit KV | does not load (KV cache of 8,704 MiB did not fit) |  |  |  |  |  |
| Qwen 3.8 27B | Q4_K_M | 65,536 | -ub 128 | fits | 19,306 | 19,340 | 561.2 | 11.8 |  |
| Qwen 3.8 27B | Q4_K_M | 131,072 | -ub 128 | does not load (KV cache of 8,192 MiB did not fit) |  |  |  |  |  |
| Qwen 3.8 27B | Q4_K_M | 131,072 | 8-bit KV + -ub 128 | fits | 20,084 | 20,120 | 421.4 | 8.5 |  |
| Qwen 3.8 27B | Q4_K_M | 262,144 | -ub 128 | does not load (KV cache of 16,384 MiB did not fit) |  |  |  |  |  |
| Qwen 3.8 27B | Q4_K_M | 262,144 | 8-bit KV + -ub 128 | does not load (KV cache of 8,704 MiB did not fit) |  |  |  |  |  |
| Qwen 3.8 27B | Q4_K_M | 131,072 | llama.cpp default placement (--fit on) | runs, parts on CPU | 21,388 | 21,408 | 481.1 | 6.2 |  |

### 3-bit files on a 16 GB card (T4)

Each model alone on the card: `llama-server -ngl 999 -fa on -np 1 --jinja --fit off` (every layer on the GPU), the context filled with the same document (llama.cpp's own source files), then exactly 512 tokens written. Where the default does not load, the same context with an 8-bit KV cache (`-ctk q8_0 -ctv q8_0`) and with a smaller micro-batch (`-ub 128`). VRAM is `nvidia-smi`, read every second. Unsloth's 3-bit files, 8K and 32K.

| Model | File | Context | Setting | Result | VRAM after load (MiB) | Peak while filled (MiB) | Reading (tok/s) | Writing after the fill (tok/s) | Writing, short prompt (tok/s) |
|---|---|---|---|---|---|---|---|---|---|
| Inkling 2 Mini | Q3_K_XL | 8,192 | default | fits | 14,299 | 14,395 | 219 | 23 | 26.3 |
| Inkling 2 Mini | Q3_K_XL | 32,768 | default | does not load (compute buffer of 3,356 MiB did not fit) |  |  |  |  |  |
| Inkling 2 Mini | IQ3_XXS | 8,192 | default | fits | 12,477 | 12,571 | 208.8 | 21.3 | 24.6 |
| Inkling 2 Mini | IQ3_XXS | 32,768 | default | does not load (compute buffer of 3,356 MiB did not fit) |  |  |  |  |  |
| Inkling 2 Mini | IQ3_XXS | 32,768 | 8-bit KV | does not load (compute buffer of 3,356 MiB did not fit) |  |  |  |  |  |
| Inkling 2 Mini | Q3_K_XL | 32,768 | 8-bit KV | does not load (compute buffer of 3,356 MiB did not fit) |  |  |  |  |  |
| Inkling 2 Mini | Q3_K_XL | 32,768 | -ub 128 | loads, then out of memory | 14,883 |  |  |  |  |
| Inkling 2 Mini | Q3_K_XL | 32,768 | 8-bit KV + -ub 128 | fits | 14,315 | 14,503 | 107.5 | 17.4 |  |
| Inkling 2 Mini | IQ3_XXS | 32,768 | -ub 128 | fits | 13,061 | 13,245 | 107.6 | 18.2 |  |
| Qwen 3.8 27B | Q3_K_XL | 8,192 | default | fits | 12,623 | 12,657 | 265.1 | 7.1 | 7.1 |
| Qwen 3.8 27B | Q3_K_XL | 32,768 | default | fits | 14,183 | 14,193 | 230.2 | 6.7 |  |
| Qwen 3.8 27B | Q3_K_XL | 32,768 | -ub 128 | fits | 14,051 | 14,077 | 208 | 6.8 |  |
| Qwen 3.8 27B | IQ3_XXS | 8,192 | default | fits | 10,637 | 10,871 | 255.2 | 7.2 | 7.2 |
| Qwen 3.8 27B | IQ3_XXS | 32,768 | default | fits | 12,197 | 12,405 | 221.7 | 7 |  |
| Qwen 3.8 27B | IQ3_XXS | 32,768 | -ub 128 | fits | 12,065 | 12,283 | 200.5 | 7 |  |

### 16 GB card with part of the model in system RAM (T4)

The 4-bit files, too big for the card, on a Tesla T4 (15,360 MiB) with 52,214 MiB of system RAM, llama.cpp `1f8baae28`. Inkling in three placements, Qwen in llama.cpp's default. Same fill and 512 tokens written; the memory split is llama.cpp's own table.

| Model | Placement | Context | Result | Layers on GPU | VRAM peak (MiB) | Weights on GPU / in RAM (MiB) | Reading (tok/s) | Writing (tok/s) |
|---|---|---|---|---|---|---|---|---|
| Inkling 2 Mini | (a) llama.cpp default (--fit on) | 8,192 | runs | 49/49 | 13,905 | 12,200 / 3,629 | 174.8 | 20.2 |
| Inkling 2 Mini | (a) llama.cpp default (--fit on) | 32,768 | runs | 49/49 | 13,795 | 2,359 / 13,471 | 81.1 | 5.4 |
| Inkling 2 Mini | (b) all experts on the CPU (--cpu-moe) | 8,192 | runs | 49/49 | 9,553 | 1,266 / 14,563 | 94.1 | 5.5 |
| Inkling 2 Mini | (b) all experts on the CPU (--cpu-moe) | 32,768 | runs | 49/49 | 12,697 | 1,266 / 14,563 | 78 | 5.2 |
| Inkling 2 Mini | (c) looped layers' experts on the GPU (-ot, layers 0-5 and 18-23 experts on the CPU) | 8,192 | runs | 49/49 | 9,563 | 7,827 / 8,002 | 128.3 | 14.5 |
| Inkling 2 Mini | (c) looped layers' experts on the GPU (-ot, layers 0-5 and 18-23 experts on the CPU) | 32,768 | runs | 49/49 | 12,707 | 7,827 / 8,002 | 98.7 | 13.3 |
| Qwen 3.8 27B | llama.cpp default (--fit on) | 8,192 | runs | 57/66 | 13,845 | 12,902 / 2,549 | 244.6 | 5.1 |
| Qwen 3.8 27B | llama.cpp default (--fit on) | 32,768 | runs | 51/66 | 13,935 | 11,727 / 3,725 | 190.9 | 2.3 |

The commands:

```
# Inkling 2 Mini, (a) llama.cpp default (--fit on)
llama-server -m Inkling-2-Mini-UD-Q4_K_M.gguf -c <context> --host 127.0.0.1 --port 18090 -fa on -np 1 --jinja --metrics -lv 4
# Inkling 2 Mini, (b) all experts on the CPU (--cpu-moe)
llama-server -m Inkling-2-Mini-UD-Q4_K_M.gguf -c <context> --host 127.0.0.1 --port 18090 -ngl 999 -fa on -np 1 --jinja --metrics -lv 4 --fit off --cpu-moe
# Inkling 2 Mini, (c) looped layers' experts on the GPU (-ot, layers 0-5 and 18-23 experts on the CPU)
llama-server -m Inkling-2-Mini-UD-Q4_K_M.gguf -c <context> --host 127.0.0.1 --port 18090 -ngl 999 -fa on -np 1 --jinja --metrics -lv 4 --fit off -ot 'blk\.([0-5]|1[89]|2[0-3])\.ffn_(up|down|gate|gate_up)_(ch|)exps=CPU'
# Qwen 3.8 27B, llama.cpp default (--fit on)
llama-server -m Qwen3.8-27B-UD-Q4_K_M.gguf -c <context> --host 127.0.0.1 --port 18090 -fa on -np 1 --jinja --metrics -lv 4
```

Every row: [results/memory-speed.json](results/memory-speed.json).

### Quiz

15 short questions about news from October and November 2026, on the L4 with llama.cpp. Asked once closed book, with leave to say "I don't know", and once with two pasted search results, one holding the answer.

| Model | Closed book: right / declined / wrong / no answer | With search results: right |
|---|---|---|
| Inkling 2 Mini | 0 / 15 / 0 / 0 | 15 of 15 |
| Qwen 3.8 27B | 0 / 14 / 0 / 1 | 15 of 15 |

Prompts and questions: [prompts/quiz.md](prompts/quiz.md). Every answer: [results/quiz.json](results/quiz.json).

