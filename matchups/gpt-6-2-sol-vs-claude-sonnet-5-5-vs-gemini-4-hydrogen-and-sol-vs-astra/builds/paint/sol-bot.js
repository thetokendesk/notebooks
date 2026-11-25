const { max, min, abs, floor } = Math;
const directions = ['up', 'right', 'down', 'left'];
const beamWidth = 32;
const beamDepth = 11;
const crowdPenalty = 65;
const futureRisk = 0.32;
const rivalRisk = 0.046;
const startAttack = 0.01;
const lateAttack = 0.58;
const contestEdge = 0.75;
const routeRisk = 0.16;
const marginForecast = 0.32;
const lastBombBoost = 1.65;
const edgeSafety = 0.44;
const lateRange = 190;

function readColors(state, color) {
  const { grid, width, height } = state;
  let index = 0;
  for (let y = 0; y < height; y++) {
    const row = grid[y];
    for (let x = 0; x < width; x++) color[index++] = row[x];
  }
}

function makeBoard(state) {
  const w = state.width, h = state.height, n = w * h;
  const edge = new Int16Array(n * 4).fill(-1);
  const walls = new Uint8Array(n);
  const color = new Int8Array(n);
  readColors(state, color);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (color[p] < 0) continue;
      if (y > 0 && color[p - w] >= 0) edge[4 * p] = p - w;
      if (x + 1 < w && color[p + 1] >= 0) edge[4 * p + 1] = p + 1;
      if (y + 1 < h && color[p + w] >= 0) edge[4 * p + 2] = p + w;
      if (x > 0 && color[p - 1] >= 0) edge[4 * p + 3] = p - 1;
      for (let d = 0; d < 4; d++) walls[p] += edge[4 * p + d] < 0;
    }
  }
  return {
    w, n, edge, walls, queue: new Int16Array(n),
    spots: state.bombSpots.map(({ x, y }) => {
      const area = [];
      for (let j = max(0, y - 3); j <= min(h - 1, y + 3); j++) {
        for (let i = max(0, x - 3); i <= min(w - 1, x + 3); i++) {
          if (color[j * w + i] >= 0) area.push(j * w + i);
        }
      }
      return { p: y * w + x, area };
    }),
    color, reward: new Float32Array(n),
    heat: new Float32Array(n), smooth: new Float32Array(n),
    dist: new Int16Array(n), route: new Float32Array(n),
    first: new Int8Array(n), recent: new Int16Array(n).fill(-100),
    prev: new Int16Array(4).fill(-1), stalled: new Int16Array(4),
    contests: new Float32Array(4), bombRisk: new Float32Array(n),
    pace: new Float32Array(4), lastCounts: new Int16Array(4),
    rivalHistory: new Int16Array(4 * 8).fill(-1),
    bestAt: new Float32Array(n), path: new Int16Array(beamWidth * beamDepth),
    nextPath: new Int16Array(beamWidth * beamDepth),
    scores: new Float32Array(beamWidth), nextScores: new Float32Array(beamWidth),
    orders: new Int16Array(beamWidth),
    armed: new Uint8Array(beamWidth), nextArmed: new Uint8Array(beamWidth),
  };
}

function spotDistances(board, spot) {
  if (spot.dist) return spot.dist;
  const dist = new Int16Array(board.n).fill(2000);
  const { edge, queue } = board;
  queue[0] = spot.p;
  dist[spot.p] = 0;
  let last = 1;
  for (let i = 0; i < last; i++) {
    const p = queue[i], next = dist[p] + 1;
    for (let d = 0; d < 4; d++) {
      const q = edge[4 * p + d];
      if (q >= 0 && dist[q] === 2000) {
        dist[q] = next;
        queue[last++] = q;
      }
    }
  }
  spot.dist = dist;
  return dist;
}

function selectBomb(state, board, start, rivals, turn) {
  const { w, color } = board;
  const upcoming = state.nextBomb;
  const next = upcoming ? upcoming.y * w + upcoming.x : -1;
  // The spawn happens after the move on its tick.
  const until = upcoming ? (upcoming.tick - state.tick) / 3 + 2 : 1000;
  let best = null, bestValue = 4;
  for (const spot of board.spots) {
    const active = state.bombs.some(b => b.y * w + b.x === spot.p);
    if (!active && spot.p !== next) continue;
    const dist = spotDistances(board, spot);
    const distance = dist[start] || 2;
    const wait = active ? 0 : until;
    const arrival = max(distance, wait);
    const slack = wait - distance;
    if (arrival > 54 || turn + arrival > 600 || (!active && slack > 12)) continue;
    let gain = 0, denial = 0;
    for (const p of spot.area) {
      const c = color[p];
      if (c === 0) gain += 0.92;
      else if (c !== state.me.id) gain += board.weights[c];
      else denial += 0.76;
    }
    let opponentArrival = 2000, pressure = 0, converging = 0;
    let favorable = 0, unfavorable = 0;
    for (const r of rivals) {
      let theirDistance = dist[r.p];
      if (theirDistance === 0) theirDistance = 2;
      let theirArrival = max(wait, theirDistance);
      const difference = r.cells - state.me.cells;
      const priority = max(-1, min(1, difference / (4 + 0.55 * arrival)));
      if (theirArrival === arrival) theirArrival += priority * contestEdge;
      if (theirDistance <= wait + 2 || theirDistance <= distance + 1) {
        favorable += max(0, priority);
        unfavorable += max(0, -priority);
      }

      const approaching = r.history < 0 ? 0 : dist[r.history] - dist[r.p];
      if (r.stalled >= 5) theirArrival += min(24, r.stalled);
      else if (approaching < -1 && theirDistance > 2) theirArrival += 5;
      else if (approaching < 2 && theirDistance > 2) theirArrival += 2;
      opponentArrival = min(opponentArrival, theirArrival);
      if (r.stalled < 5) pressure = max(pressure, max(0, 1 - (theirDistance - wait) / 26));
      if (r.stalled < 5 && theirArrival < arrival + 4) {
        const interest = min(1, (board.contests[r.id] + 1) / (board.spawnCount + 2));
        if (theirDistance <= 4 || approaching >= 3) converging += 0.78 + interest * 0.22;
        else if (theirDistance <= 11 || !active) converging += interest * 0.78;
      }
    }
    const race = opponentArrival - arrival;
    const odds = race >= 1 ? 1 : race >= 0 ? 0.90 + min(0.09, favorable * 0.07) :
      race >= -1 ? 0.70 - min(0.45, unfavorable * 0.33) :
      race >= -4 ? 0.50 : race >= -9 ? 0.35 : 0.22;
    const contest = pressure * (denial + 0.40 * gain + 6);
    const walkingCost = (active ? 0.58 : 0.41) * distance;
    const crowded = crowdPenalty * converging * (active ? 0.58 : 1) *
      (1 - min(1, max(0, race) / 5 + max(0, favorable - unfavorable) * 0.60));
    const scarcity = active && distance <= 3 ? 7 : 0;
    const waitingCost = max(0, slack - 2) * 0.53;
    const urgency = turn > 512 ? lastBombBoost : 1;
    const value = scarcity + urgency * (gain + contest) * odds - walkingCost - waitingCost - crowded -
      max(0, -race - 2) * 0.65 + (spot.p === board.lastBomb ? 3 : 0);
    if (value > bestValue) {
      bestValue = value;
      best = { spot, active, wait, distance, dist, race, gain, slack, converging };
    }
  }
  return best;
}

function assessBombRisk(board, rivals, turn, bomb) {
  const { spots, bombRisk } = board;
  const index = max(0, floor((turn - 1) / 50));
  if (index > 0 && turn % 50 === 1 && index <= 11) {
    const spot = spots[(index - 1) % spots.length];
    const d = spotDistances(board, spot);
    for (const r of rivals) {
      if (d[r.p] <= 4) board.contests[r.id]++;
      else if (d[r.p] <= 10) board.contests[r.id] += 0.45;
    }
    board.spawnCount++;
  }
  bombRisk.fill(0);
  const interested = min(1, (board.contests[rivals[0].id] + board.contests[rivals[1].id] + 0.7) /
    (board.spawnCount + 1.8));
  for (let k = 0; k < 4 && index + k < 11; k++) {
    const spot = spots[(index + k) % spots.length];
    if (bomb && bomb.spot === spot) continue;
    const chance = interested * futureRisk / (1 + k * 0.65);
    for (const p of spot.area) bombRisk[p] = max(bombRisk[p], chance);
  }
}

function fillRewards(board, me, rivals, turn, bomb) {
  const { color, edge, reward, walls, recent, heat, smooth, n, w } = board;
  const home = rivals.map(r => ({
    x: r.p % w, y: (r.p / w) | 0, stalled: r.stalled,
    dx: r.history < 0 ? 0 : r.p % w - r.history % w,
    dy: r.history < 0 ? 0 : ((r.p / w) | 0) - ((r.history / w) | 0),
    interest: (board.contests[r.id] + 0.5) / (board.spawnCount + 1.5),
  }));
  const targetDist = board.nextSpot ? board.nextSpot.dist : null;
  const lastDist = board.lastSpotDist;
  const safety = min(1, (board.contests[rivals[0].id] + board.contests[rivals[1].id]) /
    (board.spawnCount + 1)) * edgeSafety;
  for (const r of home) {
    r.travel = targetDist ? targetDist[r.y * w + r.x] : 2000;
    r.threat = r.interest * routeRisk;
    if (r.travel > 40 || r.stalled > 4 || (bomb && bomb.spot === board.nextSpot)) r.threat = 0;
  }
  const early = min(1, (600 - turn) / 24);
  for (let p = 0; p < n; p++) {
    const c = color[p];
    if (c < 0 || c === me) {
      reward[p] = c < 0 ? 0 : -0.025 - 0.13 * max(0, 1 - (turn - recent[p]) / 9);
      heat[p] = 0;
      continue;
    }
    let border = walls[p];
    for (let d = 0; d < 4; d++) {
      const q = edge[4 * p + d];
      if (q >= 0 && color[q] === me) border++;
    }
    const x = p % w, y = (p / w) | 0;
    let risk = 0, corridor = 0;
    for (let i = 0; i < 2; i++) {
      const r = home[i];
      if (r.stalled >= 5) continue;
      const dx = x - r.x, dy = y - r.y;
      const separation = abs(dx) + abs(dy);
      const ahead = max(-2, min(3, (dx * r.dx + dy * r.dy) * 0.08));
      risk = max(risk, 10 - separation + ahead);
      if (r.threat > 0) {
        const detour = targetDist[p] + separation - r.travel;
        corridor = max(corridor, r.threat * max(0, 1 - (detour + separation * 0.10) / 7));
      }
    }
    reward[p] = (c === 0 ? 1 : board.weights[c]) + 0.052 * border
      - early * rivalRisk * risk - board.bombRisk[p] - corridor;
    if (bomb && bomb.dist[p] < 5) reward[p] += early * rivalRisk * risk * 0.65;
    if (lastDist && turn < 515) reward[p] += safety * min(1, lastDist[p] / 35);
    heat[p] = reward[p];
  }
  // Two small graph filters estimate whether a path ends in productive territory.
  for (let p = 0; p < n; p++) {
    let sum = 2 * heat[p], count = 2;
    for (let d = 0; d < 4; d++) {
      const q = edge[4 * p + d];
      if (q >= 0) { sum += heat[q]; count++; }
    }
    smooth[p] = sum / count;
  }
  for (let p = 0; p < n; p++) {
    let sum = 2 * smooth[p], count = 2;
    for (let d = 0; d < 4; d++) {
      const q = edge[4 * p + d];
      if (q >= 0) { sum += smooth[q]; count++; }
    }
    heat[p] = sum / count;
  }
  for (const r of rivals) {
    // The immediately contested squares are less reliable when losing a clash.
    for (let d = 0; d < 4; d++) {
      const q = edge[4 * r.p + d];
      if (q < 0) continue;
      reward[q] -= r.cells <= board.myCells && r.stalled < 3 ? 0.23 : 0.08;
    }
  }
}

// Compare productive shortest paths across the board before searching locally.
function routeSearch(board, start, blocked, horizon) {
  const { edge, queue, dist, route, first, reward, heat } = board;
  dist.fill(-1);
  dist[start] = 0;
  route[start] = 0;
  queue[0] = start;
  let count = 1, best = -1, bestScore = -10, bestDistance = 0;
  for (let i = 0; i < count; i++) {
    const p = queue[i], d = dist[p];
    if (d > 0) {
      const continuation = min(9, horizon - d);
      const rate = (route[p] + continuation * heat[p] * 0.95) / (d + continuation + 1.0);
      const value = rate - d * 0.0045;
      if (value > bestScore) {
        bestScore = value; best = first[p]; bestDistance = d;
      }
    }
    if (d >= horizon) continue;
    for (let k = 0; k < 4; k++) {
      const q = edge[4 * p + k];
      if (q < 0 || (d === 0 && blocked[k])) continue;
      if (dist[q] >= 0 && dist[q] !== d + 1) continue;
      const score = route[p] + reward[q];
      if (dist[q] === -1) {
        dist[q] = d + 1;
        route[q] = score;
        first[q] = d === 0 ? k : first[p];
        queue[count++] = q;
      } else if (score > route[q]) {
        route[q] = score;
        first[q] = d === 0 ? k : first[p];
      }
    }
  }
  return { move: best, rate: bestScore, distance: bestDistance };
}

function moveBeam(board, start, blocked, firstBonus, bomb, left, turn) {
  const { edge, reward, heat, bestAt, orders, armed, nextArmed } = board;
  // Keep the first few searches small while the arena warms up.
  const depth = min(beamDepth, left, 6 + turn);
  const width = min(beamWidth, 8 + 4 * turn);
  let paths = board.path, nextPaths = board.nextPath;
  let scores = board.scores, nextScores = board.nextScores;
  let count = 1, outcome = -1, rate = 0;
  scores[0] = 0;
  armed[0] = 0;
  const pursuing = !!bomb;
  const dist = pursuing ? bomb.dist : null;
  const active = pursuing && bomb.active;
  const wait = pursuing ? bomb.wait : 0;
  const target = pursuing ? bomb.spot.p : -1;
  const targetX = target % board.w, targetY = floor(target / board.w);
  const allowance = active ? max(0, min(4, floor(bomb.race - 1))) : 0;
  const deadline = pursuing ? max(wait, bomb.distance + allowance) : 1000;
  const urgency = pursuing ? (active ? 1.12 : bomb.slack <= 4 ? 0.91 : 0.49) : 0;
  let factor = 1;
  for (let step = 0; step < depth; step++) {
    bestAt.fill(-1000);
    let size = 0;
    for (let i = 0; i < count; i++) {
      const offset = i * beamDepth;
      const p = step === 0 ? start : paths[offset + step - 1];
      for (let d = 0; d < 5; d++) {
        if (d === 4 && (!pursuing || active || wait > depth + 2)) continue;
        if (step === 0 && d < 4 && blocked[d]) continue;
        const q = d === 4 ? p : edge[4 * p + d];
        if (q < 0) continue;
        const arrival = step + 1;
        let hit = false, progress = 0;
        if (pursuing && !armed[i]) {
          hit = q === target && d < 4 && arrival >= wait;
          const remaining = dist[q] || 2;
          if (!hit && step === 0 && arrival + remaining > deadline &&
              deadline <= depth + 2 && dist[q] >= dist[p] && dist[p] !== 0) continue;
          const prior = dist[p] || 2;
          if (arrival < wait) {
            const excess = max(0, remaining - (wait - arrival));
            const prevExcess = max(0, prior - (wait - step));
            progress = urgency * (prior - remaining) * 0.52 + 0.8 * (prevExcess - excess);
          } else {
            progress = urgency * (prior - remaining);
          }
          if (hit) progress += 9 + min(9, bomb.gain * 0.18);
          if (q === target && !hit && arrival === wait - 1) progress -= 2.5;
        }
        let fresh = d !== 4 && q !== start;
        for (let j = step - 1; j >= 0 && fresh; j--) {
          if (paths[offset + j] === q) fresh = false;
        }
        let gain = fresh ? reward[q] : -0.12;
        if (pursuing) {
          const inBlast = abs(q % board.w - targetX) <= 3 && abs(floor(q / board.w) - targetY) <= 3;
          if (inBlast && (hit || armed[i])) gain = -0.055;
          else if (inBlast && !active && wait - arrival < 12) gain *= 0.48;
        }
        const score = scores[i] + factor * (gain + progress) +
          (step === 0 && d < 4 ? firstBonus[d] : 0);
        const value = score + (left > arrival ? 0.53 * heat[q] : 0);
        if (value < bestAt[q] + 0.035 && step > 1) continue;
        bestAt[q] = value;
        if (size === width && value <= nextScores[orders[size - 1]]) continue;
        const slot = size === width ? orders[--size] : size;
        let at = size;
        while (at > 0 && value > nextScores[orders[at - 1]]) {
          orders[at] = orders[at - 1];
          at--;
        }
        orders[at] = slot;
        size++;
        nextScores[slot] = value;
        nextArmed[slot] = hit || armed[i];
        const base = slot * beamDepth;
        for (let j = 0; j < step; j++) nextPaths[base + j] = paths[offset + j];
        nextPaths[base + step] = q;
      }
    }
    if (!size) break;
    const top = orders[0];
    const first = nextPaths[top * beamDepth];
    outcome = 4;
    for (let d = 0; d < 4; d++) if (edge[4 * start + d] === first) outcome = d;
    rate = nextScores[top] / ((1 - factor * 0.94) / 0.06);
    // Compact into score order so that equal continuations favor stronger prefixes.
    for (let i = 0; i < size; i++) {
      const slot = orders[i];
      armed[i] = nextArmed[slot];
      scores[i] = nextScores[slot] - (left > step + 1 ? 0.53 * heat[nextPaths[slot * beamDepth + step]] : 0);
      for (let j = 0; j <= step; j++) paths[i * beamDepth + j] = nextPaths[slot * beamDepth + j];
    }
    count = size;
    factor *= 0.94;
  }
  return { move: outcome, rate };
}

function brain(state, memory) {
  const initializing = !memory.board;
  const b = memory.board || (memory.board = makeBoard(state));
  const { w, edge, color } = b;
  const { id, cells } = state.me;
  const start = state.me.y * w + state.me.x;
  const turn = state.tick / 3, left = 600 - turn;
  b.recent[start] = turn;
  b.myCells = cells;
  if (!initializing) readColors(state, color);
  const rivals = [];
  for (const r of state.painters) {
    if (r.id === id) continue;
    const p = r.y * w + r.x, old = b.prev[r.id];
    const track = r.id * 8 + turn % 8;
    const history = b.rivalHistory[track];
    b.rivalHistory[track] = p;
    b.stalled[r.id] = p === old ? b.stalled[r.id] + 1 : 0;
    rivals.push({ p, history, cells: r.cells, id: r.id, stalled: b.stalled[r.id] });
    b.prev[r.id] = p;
  }
  const weights = b.weights || (b.weights = new Float32Array(4));
  for (const painter of state.painters) {
    const i = painter.id;
    if (turn) b.pace[i] = b.pace[i] * 0.965 + (painter.cells - b.lastCounts[i]) * 0.035;
    b.lastCounts[i] = painter.cells;
  }
  const late = max(0, 1 - left / lateRange);
  const possibleBomb = turn <= 565 ? 21 : 0;
  const uncertainty = 5 + min(left, 200) * 0.62 + possibleBomb;
  const danger = rivals.map(r => ((r.cells - cells) +
    (b.pace[r.id] - b.pace[id]) * min(left, 60) * marginForecast) / uncertainty);
  // Put more weight on rivals whose score can change our finishing place.
  const chance = danger.map(x => 0.5 - 0.5 * x / (1 + abs(x)));
  const effect = danger.map((x, i) => (1 + chance[1 - i]) / ((1 + abs(x)) ** 2));
  const total = effect[0] + effect[1];
  for (let i = 0; i < 2; i++) {
    weights[rivals[i].id] = 1 + startAttack + lateAttack * late * (0.18 + 1.5 * effect[i] / total);
  }
  const blocked = [false, false, false, false];
  const bonus = [0, 0, 0, 0];
  if (b.spawnCount === undefined) b.spawnCount = 0;
  if (turn === 3 && edgeSafety > 0) b.lastSpotDist = spotDistances(b, b.spots[10 % b.spots.length]);
  const bomb = selectBomb(state, b, start, rivals, turn);
  b.nextSpot = state.nextBomb && b.spots.find(s => s.p === state.nextBomb.y * w + state.nextBomb.x);
  b.lastBomb = bomb ? bomb.spot.p : -1;
  assessBombRisk(b, rivals, turn, bomb);
  fillRewards(b, id, rivals, turn, bomb);
  for (let d = 0; d < 4; d++) {
    const q = edge[4 * start + d];
    if (q < 0 || rivals.some(r => r.p === q &&
        !(bomb && bomb.active && bomb.spot.p === q && r.stalled < 4 &&
          !(start === b.previous && b.lastMove === d)))) {
      blocked[d] = true;
      continue;
    }
    if (q === b.previous) bonus[d] -= 0.19;
    if (start === b.previous && d === b.lastMove) bonus[d] -= 1.8;
    if (bomb && q === bomb.spot.p && bomb.active) {
      b.previous = start; b.lastMove = d;
      return directions[d];
    }
    if (bomb && q === bomb.spot.p && bomb.wait === 2) bonus[d] -= 2.5;
    if (bomb && !bomb.active && bomb.wait <= 5 && bomb.dist[q] === 1) {
      for (let k = 0; k < 4; k++) {
        if (edge[4 * q + k] === bomb.spot.p) bonus[d] += (3 - k) * 0.085;
      }
    }
  }
  let route = null;
  if (!bomb) {
    route = routeSearch(b, start, blocked, min(32, left, 17 + 3 * turn));
    if (route.move >= 0 && left > 10) bonus[route.move] += 0.32;
  }
  const local = moveBeam(b, start, blocked, bonus, bomb, left, turn);
  let move = local.move;
  if (route && route.move >= 0 && route.distance > 6 && left > 9 &&
      (local.rate < 0.61 || route.rate > local.rate + 0.19)) move = route.move;
  if (move < 0 && bomb) {
    let value = -Infinity;
    for (let d = 0; d < 4; d++) {
      if (blocked[d]) continue;
      const q = edge[4 * start + d];
      const score = -1.5 * bomb.dist[q] + b.reward[q] + bonus[d];
      if (score > value) { move = d; value = score; }
    }
  }
  b.previous = start;
  b.lastMove = move;
  return directions[move] || 'stay';
}
