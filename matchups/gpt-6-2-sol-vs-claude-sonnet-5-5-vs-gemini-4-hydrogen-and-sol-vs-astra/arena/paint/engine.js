'use strict';
const vm = require('node:vm');

const RULES = Object.freeze({
  width: 48, height: 30, tps: 30, ticks: 1800, moveEvery: 3,
  bombFirst: 150, bombEvery: 150, blast: 3,
  deadlineMs: 5, maxSource: 20000, points: Object.freeze([3, 1, 0]),
});
const MOVES = Object.freeze({ up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0], stay: [0, 0] });
const KEYS = ['A', 'B', 'C'];
const TIE_ORDER = ['up', 'right', 'down', 'left'];

// The brain's code and every call run inside one isolated context per round, under the deadline.
// What crosses back to the host is only ever a primitive string, checked inside the context with === (no
// coercion): one of the five moves, or ERROR when the brain threw (caught inside the context). Anything the host
// itself catches is the deadline, so no brain-made object, getter or toString ever runs in the host.
const TIMEOUT = '!timeout', ERROR = '!error', LOAD_TRIES = 3;
function createBrain(source) {
  if (typeof source !== 'string' || source.length > RULES.maxSource) {
    throw new Error(`Brain source must be at most ${RULES.maxSource.toLocaleString('en-US')} characters`);
  }
  let setup = null, context = null, valid = false;
  try {
    setup = new vm.Script(`
      globalThis.Date = undefined;
      Object.defineProperty(Math, 'random', { value: undefined });
      Object.defineProperty(globalThis, '__memory', { value: {}, writable: false, configurable: false });
      Object.defineProperty(globalThis, '__freeze', { writable: false, configurable: false, value: function freeze(o) {
        if (o && typeof o === 'object') { Object.values(o).forEach(freeze); Object.freeze(o); }
        return o;
      } });
      ${source}
      ;if (typeof brain !== 'function') throw new Error('Expected brain(state, memory)');
      Object.defineProperty(globalThis, '__brain', { value: brain, writable: false, configurable: false });
    `);
  } catch { setup = null; }
  // Loading gets a few fresh contexts: a busy machine can push it past the deadline once.
  for (let attempt = 0; setup && !valid && attempt < LOAD_TRIES; attempt++) {
    context = vm.createContext(Object.create(null), { microtaskMode: 'afterEvaluate' });
    try { setup.runInContext(context, { timeout: RULES.deadlineMs }); valid = true; } catch { valid = false; }
  }
  return {
    valid,
    // `json` is the state as JSON text, built by the host. A fresh script embeds it as a literal.
    call(json) {
      if (!valid) return 'stay';
      try {
        const out = new vm.Script(`(() => { try {
          const r = __brain(__freeze(${json}), __memory);
          return r === 'up' || r === 'down' || r === 'left' || r === 'right' ? r : 'stay';
        } catch { return '${ERROR}'; } })()`).runInContext(context, { timeout: RULES.deadlineMs });
        return out === ERROR ? ERROR : typeof out === 'string' && Object.hasOwn(MOVES, out) ? out : 'stay';
      } catch { return TIMEOUT; }
    },
  };
}

// A map is 30 strings of 48 characters: '#' wall, '.' floor, '1' '2' '3' starting cells,
// 'a', 'b', 'c' … bomb spots in the order bombs appear there. Starts and spots are floor.
function parseMap(map) {
  const { width: W, height: H } = RULES;
  if (!Array.isArray(map.rows) || map.rows.length !== H || map.rows.some(r => r.length !== W)) {
    throw new Error(`Map ${map.id}: expected ${H} rows of ${W} characters`);
  }
  const wall = new Uint8Array(W * H), starts = [], spots = [];
  map.rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '#') wall[y * W + x] = 1;
    else if (ch >= '1' && ch <= '3') starts[ch - 1] = { x, y };
    else if (ch >= 'a' && ch <= 'z') spots[ch.charCodeAt(0) - 97] = { x, y };
    else if (ch !== '.') throw new Error(`Map ${map.id}: unknown character "${ch}"`);
  }));
  if (starts.length !== 3 || starts.some(s => !s)) throw new Error(`Map ${map.id}: needs starts 1, 2 and 3`);
  if (!spots.length || spots.some(s => !s)) throw new Error(`Map ${map.id}: bomb spots must run a, b, c … without gaps`);
  return { wall, starts, spots };
}

// Places by competition ranking: equal cells share the higher place. Points 3 / 1 / 0.
function score(cells) {
  const places = cells.map(c => 1 + cells.filter(d => d > c).length);
  return { places, points: places.map(p => RULES.points[p - 1]) };
}

// Round `rotation` r puts player i on starting cell (i + r) mod 3, so r = 0, 1, 2 visits every cell once.
const startPlace = (player, rotation) => (player + rotation) % 3;

function bombTicks() {
  const out = [];
  for (let t = RULES.bombFirst; t < RULES.ticks; t += RULES.bombEvery) out.push(t);
  return out;
}

class Simulation {
  // `retry` (from playRound) turns a call that runs out of time into a restart of the round; see playRound.
  constructor({ map, brains = ['', '', ''], names = ['A', 'B', 'C'], rotation = 0, retry = null, makeBrain = createBrain }) {
    const { width: W, height: H } = RULES;
    this.map = { id: map.id, name: map.name || map.id, rows: map.rows.slice() };
    const parsed = parseMap(map);
    this.wall = parsed.wall; this.spots = parsed.spots;
    this.names = names.slice(); this.rotation = rotation;
    this.brains = brains.map(makeBrain);
    this.retry = retry; this.timeouts = [0, 0, 0]; this.errors = [0, 0, 0];
    this.tick = 0; this.result = null; this.spawnIndex = 0;
    this.grid = new Int8Array(W * H);
    for (let i = 0; i < W * H; i++) if (this.wall[i]) this.grid[i] = -1;
    this.counts = [0, 0, 0]; this.bursts = [0, 0, 0];
    this.bombs = [];
    this.painters = [0, 1, 2].map(i => ({ ...parsed.starts[startPlace(i, rotation)] }));
    this.starts = [0, 1, 2].map(i => startPlace(i, rotation));
    const changes = [];
    this.painters.forEach((p, i) => this.paint(i, p.x, p.y, changes));
    this.frames = [this.frame(changes, [])];
  }
  floor(x, y) {
    return x >= 0 && y >= 0 && x < RULES.width && y < RULES.height && !this.wall[y * RULES.width + x];
  }
  paint(i, x, y, changes) {
    const k = y * RULES.width + x, before = this.grid[k];
    if (before === i + 1 || before === -1) return false;
    if (before > 0) this.counts[before - 1]--;
    this.counts[i]++; this.grid[k] = i + 1; changes.push([x, y, i]);
    return true;
  }
  nextBomb() {
    const t = bombTicks().find(t => t >= this.tick);
    if (t === undefined) return null;
    const s = this.spots[this.spawnIndex % this.spots.length];
    return { tick: t, x: s.x, y: s.y };
  }
  // The world as one brain sees it, as JSON text. Shared parts are built once per tick.
  stateJSON(i) {
    const { width: W, height: H } = RULES;
    if (this.sharedAt !== this.tick) {
      const grid = [];
      for (let y = 0; y < H; y++) grid.push(Array.from(this.grid.subarray(y * W, y * W + W)));
      this.shared = JSON.stringify({
        tick: this.tick, width: W, height: H, grid,
        painters: this.painters.map((p, j) => ({ id: j + 1, x: p.x, y: p.y, cells: this.counts[j] })),
        bombs: this.bombs.map(b => ({ x: b.x, y: b.y })),
        bombSpots: this.spots.map(s => ({ x: s.x, y: s.y })),
        nextBomb: this.nextBomb(),
      });
      this.sharedAt = this.tick;
    }
    const p = this.painters[i];
    return `{"me":${JSON.stringify({ id: i + 1, x: p.x, y: p.y, cells: this.counts[i] })},${this.shared.slice(1)}`;
  }
  state(i) { return JSON.parse(this.stateJSON(i)); }
  frame(changes, events) {
    const f = { p: this.painters.map(p => [p.x, p.y]), n: this.counts.slice() };
    if (changes.length) f.c = changes;
    if (events.length) f.e = events;
    return f;
  }
  // Every painter moves at once. When several move into the same cell, the one with the fewest cells gets it
  // and the others stay; at equal cells the first in the order up, right, down, left gets it (two painters
  // entering one cell always come from different sides, so there is always one winner). A move also fails if
  // its cell is a wall or off the map, if two painters swap cells (both stay), or if the cell holds a painter
  // that is not leaving it. Nothing here depends on which player is which.
  move(actions, changes, events) {
    const ps = this.painters, n = ps.length;
    const target = actions.map((a, i) => {
      const [dx, dy] = MOVES[a] || MOVES.stay;
      if (!dx && !dy) return null;
      const x = ps[i].x + dx, y = ps[i].y + dy;
      return this.floor(x, y) ? { x, y } : null;
    });
    const stays = target.map(t => t === null);
    const same = (a, b) => a && b && a.x === b.x && a.y === b.y;
    for (let i = 0; i < n; i++) {
      if (!target[i]) continue;
      const rivals = [];
      for (let j = 0; j < n; j++) if (same(target[i], target[j])) rivals.push(j);
      if (rivals.length < 2 || rivals[0] !== i) continue;
      const winner = rivals.reduce((w, j) => (this.counts[j] < this.counts[w] ||
        (this.counts[j] === this.counts[w] && TIE_ORDER.indexOf(actions[j]) < TIE_ORDER.indexOf(actions[w])) ? j : w));
      for (const j of rivals) if (j !== winner) stays[j] = true;
      events.push({ k: 'clash', x: target[i].x, y: target[i].y, by: winner });
    }
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      if (same(target[i], ps[j]) && same(target[j], ps[i])) {
        stays[i] = stays[j] = true;
        events.push({ k: 'clash', x: (ps[i].x + ps[j].x) / 2, y: (ps[i].y + ps[j].y) / 2 });
      }
    }
    for (let changed = true; changed;) {
      changed = false;
      for (let i = 0; i < n; i++) {
        if (stays[i]) continue;
        for (let j = 0; j < n; j++) if (j !== i && stays[j] && same(target[i], ps[j])) { stays[i] = true; changed = true; }
      }
    }
    const moved = [];
    for (let i = 0; i < n; i++) if (!stays[i]) { ps[i].x = target[i].x; ps[i].y = target[i].y; this.paint(i, ps[i].x, ps[i].y, changes); moved.push(i); }
    // Bursts follow the moves. A cell two bursts reach takes the nearer one's colour (Chebyshev distance);
    // at equal distance from different painters' bursts it keeps the colour it had.
    const bursts = [];
    for (const i of moved) {
      const b = this.bombs.findIndex(q => q.x === ps[i].x && q.y === ps[i].y);
      if (b >= 0) { bursts.push({ x: ps[i].x, y: ps[i].y, by: i, gain: 0 }); this.bombs.splice(b, 1); }
    }
    if (!bursts.length) return;
    const R = RULES.blast, best = new Map();
    for (const b of bursts) for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const x = b.x + dx, y = b.y + dy;
      if (!this.floor(x, y)) continue;
      const k = y * RULES.width + x, d = Math.max(Math.abs(dx), Math.abs(dy)), cur = best.get(k);
      if (!cur || d < cur.d) best.set(k, { d, b, x, y, tie: false });
      else if (d === cur.d && cur.b.by !== b.by) cur.tie = true;
    }
    for (const c of [...best.values()].sort((p, q) => p.y - q.y || p.x - q.x)) {
      if (!c.tie && this.paint(c.b.by, c.x, c.y, changes)) c.b.gain++;
    }
    for (const b of bursts) { this.bursts[b.by]++; events.push({ k: 'burst', x: b.x, y: b.y, by: b.by, gain: b.gain }); }
  }
  ask(brain, i, t) {
    const a = brain.call(this.stateJSON(i));
    if (a === TIMEOUT) {
      const r = this.retry, limits = (r && r.limits) || RETRY, key = i + ':' + t, tries = r ? (r.tries.get(key) || 0) + 1 : limits.tries;
      if (r && tries < limits.tries && r.restarts < limits.restarts) { r.tries.set(key, tries); r.restarts++; throw new Restart(); }
      this.timeouts[i]++;
      return 'stay';
    }
    if (a === ERROR) { this.errors[i]++; return 'stay'; }
    return a;
  }
  spawn(events) {
    const s = this.spots[this.spawnIndex % this.spots.length];
    this.spawnIndex++;
    if (this.bombs.some(b => b.x === s.x && b.y === s.y)) return;
    this.bombs.push({ x: s.x, y: s.y });
    events.push({ k: 'spawn', x: s.x, y: s.y });
  }
  step() {
    if (this.result) return this.result;
    const t = this.tick, changes = [], events = [];
    if (t % RULES.moveEvery === 0) {
      const actions = this.brains.map((b, i) => this.ask(b, i, t));
      this.move(actions, changes, events);
    }
    if (t >= RULES.bombFirst && (t - RULES.bombFirst) % RULES.bombEvery === 0) this.spawn(events);
    this.tick++;
    this.frames.push(this.frame(changes, events));
    if (this.tick >= RULES.ticks) this.finish();
    return this.result;
  }
  finish() {
    const { places, points } = score(this.counts);
    const by = arr => Object.fromEntries(KEYS.map((k, i) => [k, arr[i]]));
    this.result = {
      map: this.map.id, rotation: this.rotation,
      starts: by(this.starts.map(s => s + 1)),
      cells: by(this.counts), places: by(places), points: by(points), bombs: by(this.bursts),
      loaded: by(this.brains.map(b => b.valid)), timeouts: by(this.timeouts), errors: by(this.errors),
      winner: KEYS.filter((k, i) => places[i] === 1), ticks: this.tick,
    };
  }
  run() { while (!this.result) this.step(); return this.result; }
  replay() {
    const { width, height, tps, ticks, moveEvery, blast, bombFirst, bombEvery } = RULES;
    return {
      version: 1, game: 'paint',
      rules: { width, height, tps, ticks, moveEvery, blast, bombFirst, bombEvery },
      map: this.map,
      players: KEYS.map((key, i) => ({ key, name: this.names[i], start: this.starts[i] + 1 })),
      result: this.result, frames: this.frames,
    };
  }
}

// A call that runs out of time restarts the round from tick 0, with fresh contexts. Everything is deterministic, so
// the replay reaches the same call; only a call that runs out of time on all three tries counts as a timeout.
// A pause of the machine (another process, garbage collection) therefore never changes a match: on 15 Nov, with
// other renders running, one round of the sample brains needed 8 restarts. After 60 restarts in one round a timeout
// counts at once, so a brain that is simply slow cannot stall the run. Under sustained load that is not enough: on 17
// Nov, with a video render and another project's job running (load average 20 to 47 on 12 cores), rounds needed up to
// 60 restarts and still counted up to 32 timeouts for one brain and 6 for another. `retryLimits` raises both for a
// match played on a busy Mac; a brain that is really slow still runs out of time on every try.
const RETRY = Object.freeze({ tries: 3, restarts: 60 });
class Restart extends Error {}
function playRound({ retryLimits, ...options }) {
  const retry = { tries: new Map(), restarts: 0, limits: retryLimits || RETRY };
  for (;;) {
    const sim = new Simulation({ ...options, retry });
    try { sim.run(); sim.restarts = retry.restarts; return sim; } catch (e) { if (!(e instanceof Restart)) throw e; }
  }
}

module.exports = { RULES, MOVES, KEYS, TIMEOUT, ERROR, RETRY, Simulation, playRound, createBrain, parseMap, score, startPlace, bombTicks };
