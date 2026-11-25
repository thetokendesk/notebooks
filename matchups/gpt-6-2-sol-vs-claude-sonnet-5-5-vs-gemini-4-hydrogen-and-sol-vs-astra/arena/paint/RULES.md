# Paint: the rules

Three painters share one grid. You write the brain of one painter: a JavaScript function the arena calls ten times a
second. The other two brains were written by someone else. You never see their code.

## The map

- 48 cells wide and 30 cells tall. x runs 0 to 47 from left to right, y runs 0 to 29 from top to bottom.
- Some cells are walls. The edge of the map is closed: nothing goes past it.
- There are five maps. You see the map only through `state.grid`.

## Painters

- Each painter starts on its own starting cell, which is already painted its colour.
- Each move, a painter goes one cell `up` (y − 1), `down` (y + 1), `left` (x − 1) or `right` (x + 1), or it stays.
- Every cell a painter moves into takes that painter's colour, whatever colour it had before.
- A painter cannot move into a wall or off the map. It stays where it is.
- All painters move at the same moment:
  - A painter can move into a cell that another painter is leaving in the same move.
  - If two or three painters move into the same cell, the one with the fewest cells gets it and the others stay where
    they are. If they have equal cells, the cell goes to the first of them in this order: the one moving `up`, then
    `right`, then `down`, then `left`.
  - Two painters cannot swap cells: if each moves into the other's cell, both stay.
  - A painter cannot move into a cell where another painter stays (because it chose to stay or its own move failed).

## Paint bombs

- A bomb appears at the end of tick 150 (5 seconds in), then every 150 ticks: 11 bombs a round, the last at tick 1650.
- Each bomb appears on the map's next bomb spot, in the order of `state.bombSpots`, going back to the first after the
  last. If a bomb is still lying on that spot, no bomb appears that time.
- A painter that moves into a bomb's cell bursts it. Every cell in the 7 × 7 square centred on the bomb (up to 3 cells
  away in x and in y), except walls, takes that painter's colour. That includes cells other painters stand on.
- A bomb that appears under a painter lies there until a painter moves into its cell.
- Bursts happen after all painters have moved. If two bursts in the same move reach one cell, it takes the colour of
  the nearer bomb, counting the larger of the x and y distances. If both are equally near, the cell keeps its colour.

## A round

- A round lasts 60 seconds: 1,800 ticks at 30 ticks a second. Painters move on every third tick (ticks 0, 3, 6 … 1797),
  so a round has 600 moves. Your brain is called once for each move.
- At the end of the round, each painter scores the number of cells in its colour.
- Points: most cells 3, second 1, third 0. Painters with equal cells share the higher place: two tied for most both
  get 3 and the third gets 0; two tied for second both get 1.
- A match is 15 rounds: each of the five maps three times. The painters rotate between the three starting cells so
  that, on every map, each painter starts once from each. The most points wins the match. Equal points: the most cells
  over all 15 rounds.

## Your brain

Write one function, `brain(state, memory)`, in plain JavaScript. You may put helper functions and constants beside it.

```js
function brain(state, memory) {
  // state: the world at this move (below). Read-only.
  // memory: an object that is yours for the whole round. Store anything in it. It starts as {} each round.
  return 'up';
}
```

Return one of the strings `'up'`, `'down'`, `'left'`, `'right'` or `'stay'`. Anything else counts as `'stay'`.

What `state` holds:

```js
{
  tick: 0,                       // 0, 3, 6 … 1797
  width: 48, height: 30,
  grid: [[ /* 48 numbers */ ], /* … 30 rows */],
                                 // grid[y][x] (row first): -1 wall, 0 unpainted, 1, 2 or 3 painted by that painter
  me: { id: 2, x: 43, y: 4, cells: 1 },
  painters: [                    // all three painters, you included
    { id: 1, x: 4, y: 4, cells: 1 },
    { id: 2, x: 43, y: 4, cells: 1 },
    { id: 3, x: 23, y: 26, cells: 1 },
  ],
  bombs: [{ x: 23, y: 9 }],      // bombs lying on the map now
  bombSpots: [{ x: 23, y: 9 }, /* … */],   // this map's bomb spots, in the order bombs appear on them
  nextBomb: { tick: 150, x: 23, y: 9 },    // when and where the next bomb is due; null after the last one
}
```

Each painter's `id` stays the same for the whole round. `cells` is how many cells are in that painter's colour.

## Limits

- Your function has 5 milliseconds per call. If it takes longer, or throws an error, your painter stays that move.
- Code outside the function runs once at the start of each round, and also has 5 milliseconds. If it fails, your
  painter stays for the whole round.
- Your code is at most 20,000 characters.
- No imports, no network, no timers. `Math.random` and `Date` do not exist in the arena: it is deterministic, so the
  same three brains always play the same match.

## What you know about the other painters

Nothing, except that they play by exactly the same rules.
