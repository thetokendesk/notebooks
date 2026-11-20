# Tank Duel: the rules

Two tanks fight in a closed arena. You write the brain of one tank: a JavaScript function that the arena calls
30 times a second. The other tank's brain was written by someone else. You never see their code.

## The arena

- 960 × 600 units. (0, 0) is the top-left corner; x grows to the right, y grows downward.
- The outer edge is a wall. Inside are 2 to 5 rectangular walls. Each round uses one of five maps.
- Angles are in degrees: 0 points right (+x), 90 points down (+y). Every angle in the state is between 0 and 360.

## Your tank

- A circle of radius 18. It starts with 3 health.
- Body: drives forward or backward along its heading at up to 3 units per tick, and turns at up to 4 degrees per tick.
- Turret: turns separately from the body, at up to 6 degrees per tick. Shells leave in the turret's direction.
- Driving into a wall or the other tank stops you at the contact point. Nothing else happens.

## Shells

- `fire: true` fires a shell when your cooldown is 0. The cooldown is then 40 ticks (1.33 s). At most 2 of your shells
  can be in flight; with 2 out, firing does nothing.
- A shell starts at the turret's tip (25 units from the tank's centre) and moves 9 units per tick in a straight line.
- A shell bounces off any wall, the angle of reflection equal to the angle of arrival. It disappears on its third
  wall contact (so it bounces twice) or after 150 ticks.
- A shell that touches a tank does 1 damage and disappears. **That includes your own tank**: your own shell can hit
  you after its first bounce (not before).
- Two shells that touch each other both disappear.

## A round

- Lasts at most 45 seconds (1,350 ticks). It ends when a tank reaches 0 health: the other tank wins.
- At 1,350 ticks the tank with more health wins. Equal health is a draw.
- A match is 10 rounds on 5 maps. Each map is played twice, the tanks swapping starting places.

## Your brain

Write one function, `brain(state, memory)`, in plain JavaScript (no imports, no network, no timers). You may put
helper functions and constants beside it. `Math.random` and `Date` do not exist in the arena: it is deterministic, so
the same two brains always play the same match.

```js
function brain(state, memory) {
  // state: what the arena tells you this tick (below). Read-only.
  // memory: an object that is yours for the whole round. Store anything in it. It starts as {} each round.
  return { move: 1, turn: 0, turret: 0, fire: false };
}
```

What you return, each tick:

| field | values | meaning |
|---|---|---|
| `move` | -1 to 1 | -1 full speed backward, 1 full speed forward |
| `turn` | -1 to 1 | -1 turn the body left (counter-clockwise on screen) at full rate, 1 right |
| `turret` | -1 to 1 | the same for the turret |
| `fire` | true / false | fire if you can |

Anything missing or not a number counts as 0 (or false). Numbers outside -1 to 1 are cut to the limit.

What `state` holds:

```js
{
  tick: 0,                 // 0 to 1349
  arena: { w: 960, h: 600 },
  walls: [ { x, y, w, h } ],                                       // inner walls; the outer edge is a wall too
  me:    { x, y, heading, turret, health, cooldown, shellsOut },
  enemy: { x, y, heading, turret, health, cooldown },              // always visible, through walls too
  shells: [ { x, y, vx, vy, bouncesLeft, mine } ],                  // every shell in flight, yours and theirs
}
```

## Limits

- Your function has 5 milliseconds per tick. If it takes longer, or throws an error, your tank does nothing that tick.
- Your code is at most 20,000 characters.

## What you know about the other side

Nothing, except that it plays by exactly the same rules.
