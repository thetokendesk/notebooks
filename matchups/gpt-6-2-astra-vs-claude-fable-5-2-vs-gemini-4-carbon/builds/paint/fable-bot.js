const W = 48, H = 30, N = 1440, INF = 9999, GAM = 0.96;
const NAME = ['up', 'right', 'down', 'left'];
const g = new Int8Array(N), val = new Float32Array(N), dens = new Float32Array(N), tmp = new Float32Array(N);
const q = new Int16Array(N), dA = new Int16Array(N), dS = new Int16Array(N), dP = new Int16Array(N), dM = new Int16Array(N);
const vis = new Uint8Array(N), occ = new Uint8Array(N), nbr = new Int16Array(N * 4);
let ready = false, D = 8, cm = 0;

function bfs(dist, src) {
  dist.fill(INF); let h = 0, t = 0;
  dist[src] = 0; q[t++] = src;
  while (h < t) {
    const p = q[h++], d = dist[p] + 1, b = p * 4;
    for (let k = 0; k < 4; k++) { const n = nbr[b + k]; if (n >= 0 && dist[n] > d) { dist[n] = d; q[t++] = n; } }
  }
}

function leaf(p, j) {
  let v = 0.03 * dens[p] - 0.5 * dP[p];
  if (cm > 0 && j === cm && dS[p] === 1) v += 3;
  return v;
}

function rec(p, j, last) {
  if (j >= D) return leaf(p, j);
  let best = -1e9;
  const b = p * 4, lim = cm - j;
  for (let d = 0; d < 4; d++) {
    if (last >= 0 && d === (last ^ 2)) continue;
    const n = nbr[b + d]; if (n < 0) continue;
    if (cm > 0 && dS[n] > lim) continue;
    let r;
    if (vis[n]) r = GAM * rec(n, j + 1, d);
    else { vis[n] = 1; r = val[n] + GAM * rec(n, j + 1, d); vis[n] = 0; }
    if (r > best) best = r;
  }
  if (cm > 0 && cm <= 4 && dS[p] <= lim) { const r = GAM * rec(p, j + 1, -1); if (r > best) best = r; }
  if (best === -1e9) {
    if (last >= 0) {
      const n = nbr[b + (last ^ 2)];
      if (n >= 0 && !(cm > 0 && dS[n] > lim)) return GAM * rec(n, j + 1, -1);
    }
    if (cm > 0 && dS[p] > lim) return -1e6;
    return GAM * rec(p, j + 1, -1);
  }
  return best;
}

// step along a distance map toward its source
function stepTo(dist, pos, target, low) {
  let bd = -1, bs = -1e9;
  const d0 = dist[pos];
  for (let d = 0; d < 4; d++) {
    const n = nbr[pos * 4 + d]; if (n < 0 || dist[n] >= d0) continue;
    let s = low ? -val[n] : val[n];
    if (occ[n] && n !== target) s -= 10;
    if (s > bs) { bs = s; bd = d; }
  }
  return bd;
}

function brain(state, memory) {
  const me = state.me, tick = state.tick, G = state.grid, id = me.id;
  for (let y = 0, i = 0; y < H; y++) { const r = G[y]; for (let x = 0; x < W; x++, i++) g[i] = r[x]; }
  if (!ready) {
    for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
      nbr[i * 4] = y > 0 && g[i - W] >= 0 ? i - W : -1;
      nbr[i * 4 + 1] = x < W - 1 && g[i + 1] >= 0 ? i + 1 : -1;
      nbr[i * 4 + 2] = y < H - 1 && g[i + W] >= 0 ? i + W : -1;
      nbr[i * 4 + 3] = x > 0 && g[i - 1] >= 0 ? i - 1 : -1;
    }
    ready = true;
  }
  const pos = me.y * W + me.x;
  memory.n = (memory.n || 0) + 1;
  let banned = -1;
  if (memory.lp === pos && memory.ld >= 0) { memory.st = (memory.st || 0) + 1; banned = memory.ld; } else memory.st = 0;
  const ret = d => { memory.lp = pos; memory.ld = d; return d < 0 ? 'stay' : NAME[d]; };

  const riv = []; occ.fill(0);
  for (const p of state.painters) if (p.id !== id) { const rp = p.y * W + p.x; occ[rp] = 1; riv.push({ id: p.id, p: rp, c: p.cells }); }
  riv.sort((a, b) => b.c - a.c);
  let tg = riv[0].id;
  if (me.cells < riv[1].c && riv[0].c - me.cells > 2 * (riv[1].c - me.cells) + 20) tg = riv[1].id;
  for (let i = 0; i < N; i++) { const c = g[i]; val[i] = c < 0 || c === id ? 0 : c === 0 ? 1 : c === tg ? 1.6 : 1.25; }

  // ---- bombs lying on the map
  const tr = memory.tr || (memory.tr = {});
  let bestB = -1, bestD = INF, onBomb = false;
  for (const b of state.bombs) {
    const bp = b.y * W + b.x; bfs(dA, bp);
    const dm = dA[pos]; if (dm >= INF) continue;
    let minR = INF, minRc = 0, sitter = false, effR = INF, effC = 0;
    for (const r of riv) {
      const dr = dA[r.p], k = bp + ':' + r.id, o = tr[k];
      let idle = 0; if (o && o.t === tick - 3) idle = dr >= o.d ? o.i + 1 : 0;
      tr[k] = { d: dr, i: idle, t: tick };
      if (dr === 0) sitter = true;
      if (dr < minR || (dr === minR && r.c < minRc)) { minR = dr; minRc = r.c; }
      if (idle < 3 && (dr < effR || (dr === effR && r.c < effC))) { effR = dr; effC = r.c; }
    }
    if (dm === 0) {
      onBomb = true;
      const safe = minR >= 3 || (minR === 2 && me.cells + 1 < minRc);
      if (safe) {
        let bd = -1, bs = -1e9;
        for (let d = 0; d < 4; d++) { const n = nbr[pos * 4 + d]; if (n < 0 || occ[n]) continue; if (val[n] > bs) { bs = val[n]; bd = d; } }
        memory.sit = 0;
        return ret(bd);
      }
      if ((memory.sit || 0) < 6) { memory.sit = (memory.sit || 0) + 1; return ret(-1); }
      continue;
    }
    if (memory.st >= 4) continue;
    if (sitter) {
      const k = 's' + bp, n = memory[k] || 0;
      if (dm > 10 || n >= 8) continue;
      if (dm === 1) memory[k] = n + 1;
    } else if (!(dm <= 1 || dm < effR || (dm === effR && me.cells <= effC))) continue;
    if (dm < bestD) { bestD = dm; bestB = bp; }
  }
  if (!onBomb) memory.sit = 0;
  if (bestB >= 0) {
    bfs(dA, bestB);
    const d = stepTo(dA, pos, bestB, false);
    if (d >= 0) return ret(d);
  }

  // ---- next bomb: be next to its spot when it appears
  cm = 0;
  const nb = state.nextBomb;
  if (nb && !state.bombs.some(b => b.x === nb.x && b.y === nb.y)) {
    const sp = nb.y * W + nb.x, m = (nb.tick - tick) / 3 + 1;
    bfs(dS, sp);
    const ds = dS[pos];
    if (ds <= m) {
      cm = m;
      if (m <= 25) {
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
          const x = nb.x + dx, y = nb.y + dy;
          if (x >= 0 && y >= 0 && x < W && y < H) val[y * W + x] *= 0.15;
        }
      }
      let contest = false;
      if (m <= 5) for (const r of riv) if (dS[r.p] <= m + 1 && me.cells <= r.c + m + 1) contest = true;
      if (contest) {
        bfs(dM, pos);
        const ord = [2, 3, 0, 1];
        for (let k = 0; k < 4; k++) {
          const n = nbr[sp * 4 + ord[k]];
          if (n < 0 || occ[n] || dM[n] > m) continue;
          if (n === pos) return ret(-1);
          bfs(dA, n);
          const d = stepTo(dA, pos, n, true);
          if (d >= 0 && !occ[nbr[pos * 4 + d]]) return ret(d);
          break;
        }
      }
    } else if (ds < INF) {
      let near = true;
      for (const r of riv) if (dS[r.p] < ds) near = false;
      if (near || ds <= m + 4) {
        const d = stepTo(dS, pos, sp, false);
        if (d >= 0 && !occ[nbr[pos * 4 + d]]) return ret(d);
      }
    }
  }

  // ---- paint: depth-limited search for the richest walk
  for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
    let s = val[i];
    if (x > 0) s += val[i - 1]; if (x > 1) s += val[i - 2];
    if (x < W - 1) s += val[i + 1]; if (x < W - 2) s += val[i + 2];
    tmp[i] = s;
  }
  for (let i = 0; i < N; i++) {
    let s = tmp[i];
    if (i >= W) s += tmp[i - W]; if (i >= 2 * W) s += tmp[i - 2 * W];
    if (i < N - W) s += tmp[i + W]; if (i < N - 2 * W) s += tmp[i + 2 * W];
    dens[i] = s;
  }
  {
    dP.fill(INF); let h = 0, t = 0;
    for (let i = 0; i < N; i++) if (val[i] > 0.5) { dP[i] = 0; q[t++] = i; }
    while (h < t) {
      const p = q[h++], d = dP[p] + 1, b = p * 4;
      for (let k = 0; k < 4; k++) { const n = nbr[b + k]; if (n >= 0 && dP[n] > d) { dP[n] = d; q[t++] = n; } }
    }
    if (t === 0) dP.fill(0);
  }
  D = memory.n < 6 ? 4 : 7;
  if (cm > 0 && cm < D) D = cm;
  vis[pos] = 1;
  let best = -1e9, bd = -1;
  for (let d = 0; d < 4; d++) {
    const n = nbr[pos * 4 + d]; if (n < 0) continue;
    if (cm > 0 && dS[n] > cm) continue;
    vis[n] = 1;
    let r = val[n] + GAM * rec(n, 1, d);
    vis[n] = 0;
    if (occ[n]) r -= 5;
    else for (const rv of riv) {
      if (rv.c > me.cells) continue;
      for (let k = 0; k < 4; k++) if (nbr[n * 4 + k] === rv.p) r -= 0.4;
    }
    if (d === banned) r -= 3;
    if (r > best) { best = r; bd = d; }
  }
  if (cm > 0 && cm <= 4 && dS[pos] <= cm) {
    const r = GAM * rec(pos, 1, -1);
    if (r > best) { best = r; bd = -1; }
  }
  vis[pos] = 0;
  return ret(bd);
}
