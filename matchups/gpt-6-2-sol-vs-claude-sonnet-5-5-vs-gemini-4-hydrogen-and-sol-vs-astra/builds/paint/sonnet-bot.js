// Paint bot: bomb racing + efficient greedy painting.
const W = 48, H = 30, N = W * H;
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
const DIRS = ['up', 'right', 'down', 'left'];

const POOL = [0, 1, 2, 3, 4, 5].map(() => new Int16Array(N));
const QB = new Int16Array(N), QG = new Int16Array(N);
const GN = new Float32Array(N), FIRST = new Int8Array(N);
let poolUse = 0;
function bfs(grid, sx, sy) {
  const dist = POOL[poolUse++ % POOL.length].fill(-1);
  const q = QB;
  let h = 0, t = 0;
  const s = sy * W + sx;
  dist[s] = 0; q[t++] = s;
  while (h < t) {
    const u = q[h++], ux = u % W, uy = (u / W) | 0;
    for (let d = 0; d < 4; d++) {
      const x = ux + DX[d], y = uy + DY[d];
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const v = y * W + x;
      if (dist[v] >= 0 || grid[y][x] === -1) continue;
      dist[v] = dist[u] + 1; q[t++] = v;
    }
  }
  return dist;
}

function blastGain(grid, bx, by, me, oppBonus) {
  let g = 0;
  for (let y = Math.max(0, by - 3); y <= Math.min(H - 1, by + 3); y++)
    for (let x = Math.max(0, bx - 3); x <= Math.min(W - 1, bx + 3); x++) {
      const c = grid[y][x];
      if (c === -1 || c === me) continue;
      g += c === 0 ? 1 : oppBonus;
    }
  return g;
}

function brain(state, memory) {
  poolUse = 0;
  const { grid, me, painters, tick } = state;
  const mx = me.x, my = me.y, id = me.id;
  const opps = painters.filter(p => p.id !== id);
  const occupied = new Set(opps.map(p => p.y * W + p.x));
  const distMe = bfs(grid, mx, my);
  const distOpp = opps.map(p => bfs(grid, p.x, p.y));
  const movesLeft = (1800 - tick) / 3;
  const ENEMY = 1.4;

  // ---- bomb targets
  let best = null, bestScore = 0;
  const cand = [];
  for (const b of state.bombs) cand.push({ x: b.x, y: b.y, wait: 0 });
  // upcoming bombs (next two spawns)
  if (state.nextBomb) {
    const spots = state.bombSpots;
    let idx = state.bombs.length ? 0 : 0;
    // index of nextBomb in spot order
    const nb = state.nextBomb;
    let k = -1;
    for (let i = 0; i < spots.length; i++) if (spots[i].x === nb.x && spots[i].y === nb.y) { k = i; break; }
    for (let j = 0; j < 2 && k >= 0; j++) {
      const t = nb.tick + 150 * j;
      if (t > 1650) break;
      const s = spots[(k + j) % spots.length];
      if (state.bombs.some(b => b.x === s.x && b.y === s.y)) continue;
      cand.push({ x: s.x, y: s.y, wait: Math.max(1, Math.ceil((t - tick) / 3) + 1) });
    }
  }
  for (const c of cand) {
    const i = c.y * W + c.x;
    const dm = distMe[i];
    if (dm < 0) continue;
    const arr = Math.max(dm, c.wait);
    if (arr >= movesLeft) continue;
    let lost = false;
    for (let o = 0; o < opps.length; o++) {
      const dd = distOpp[o][i];
      if (dd < 0) continue;
      const oa = Math.max(dd, c.wait);
      if (oa < arr || (oa === arr && opps[o].cells <= me.cells)) { lost = true; break; }
    }
    if (lost) continue;
    const gain = blastGain(grid, c.x, c.y, id, ENEMY);
    const sc = gain / (arr + 4);
    if (sc > bestScore) { bestScore = sc; best = { c, dm, arr }; }
  }

  // ---- greedy painting BFS with path gain
  const dist = POOL[poolUse++ % POOL.length].fill(-1);
  const gn = GN, first = FIRST.fill(-1);
  const q = QG;
  let h = 0, t = 0;
  const s0 = my * W + mx;
  dist[s0] = 0; q[t++] = s0;
  const last = memory.last === undefined ? -1 : memory.last;
  const LIM = 24;
  while (h < t) {
    const u = q[h++], ux = u % W, uy = (u / W) | 0;
    if (dist[u] >= LIM) continue;
    for (let d = 0; d < 4; d++) {
      const x = ux + DX[d], y = uy + DY[d];
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const c = grid[y][x];
      if (c === -1) continue;
      const v = y * W + x;
      if (u === s0 && occupied.has(v)) continue;
      const val = c === id ? 0 : c === 0 ? 1 : ENEMY;
      const f = u === s0 ? d : first[u];
      if (dist[v] < 0) {
        dist[v] = dist[u] + 1; gn[v] = gn[u] + val; first[v] = f; q[t++] = v;
      } else if (dist[v] === dist[u] + 1 && (gn[u] + val > gn[v] + 1e-6 || (Math.abs(gn[u] + val - gn[v]) < 1e-6 && f === last))) {
        gn[v] = gn[u] + val; first[v] = f;
      }
    }
  }
  // avoid targeting cells near bombs we are racing? simple: best ratio
  let bd = -1, bs = -1;
  for (let i = 0; i < t; i++) {
    const v = q[i];
    if (v === s0) continue;
    const d = dist[v];
    const sc = gn[v] / (d + 0.2) + (first[v] === last ? 0.02 : 0) + gn[v] * 0.002;
    if (sc > bs) { bs = sc; bd = first[v]; }
  }

  let dir = bd;
  const greedyRate = bs;
  if (best && best.c) {
    // bomb: is it better than greedy? gain per move
    const bombRate = bestScore * (best.arr + 4) / (best.arr + 1);
    // path toward bomb: step along shortest path, tie-break by gain
    const useBomb = bombRate > greedyRate * 0.9 || best.dm >= best.c.wait - 3;
    if (best.c.wait > best.dm + 3 && !(bombRate > greedyRate * 1.5)) {
      // slack: paint nearby while waiting, constrained to staying within reach of the spot
      const dS = bfs(grid, best.c.x, best.c.y);
      let sd = -1, ss = -1;
      for (let i = 0; i < t; i++) {
        const v = q[i];
        if (v === s0) continue;
        if (dist[v] + dS[v] > best.c.wait - 1) continue;
        const sc = gn[v] / (dist[v] + 0.2);
        if (sc > ss) { ss = sc; sd = first[v]; }
      }
      if (sd >= 0) dir = sd;
    } else if (useBomb) {
      const dS = bfs(grid, best.c.x, best.c.y);
      let bg = -1, bgain = -1;
      for (let d = 0; d < 4; d++) {
        const x = mx + DX[d], y = my + DY[d];
        if (x < 0 || y < 0 || x >= W || y >= H || grid[y][x] === -1) continue;
        const v = y * W + x;
        if (occupied.has(v)) continue;
        if (dS[v] !== dS[s0] - 1) continue;
        const val = grid[y][x] === id ? 0 : 1;
        if (val > bgain) { bgain = val; bg = d; }
      }
      if (bg >= 0) dir = bg;
      else if (dS[s0] === 0) dir = -1; // standing on spot (bomb not yet there): step off? stay
    }
  }
  if (dir < 0) {
    // fallback: any free neighbour
    for (let d = 0; d < 4; d++) {
      const x = mx + DX[d], y = my + DY[d];
      if (x < 0 || y < 0 || x >= W || y >= H || grid[y][x] === -1 || occupied.has(y * W + x)) continue;
      dir = d; break;
    }
  }
  if (dir < 0) return 'stay';
  memory.last = dir;
  return DIRS[dir];
}
