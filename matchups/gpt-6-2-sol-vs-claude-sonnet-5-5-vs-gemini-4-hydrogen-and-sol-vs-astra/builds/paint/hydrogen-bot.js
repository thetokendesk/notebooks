'use strict';

// Paint Bot v2: Zero-alloc Beam Search + Voronoi Contestedness + Exact Bomb Timing

const W = 48;
const H = 30;
const N = W * H;
const DIRS = [
  ['up', 0, -1],
  ['right', 1, 0],
  ['down', 0, 1],
  ['left', -1, 0],
];
const MAX_DEPTH = 12;
const BEAM_W = 28;
const MAX_NEXT = BEAM_W * 4;

function initMemory(state, memory) {
  const wall = new Uint8Array(N);
  const adj = new Int16Array(N * 4);
  adj.fill(-1);

  for (let y = 0; y < H; y++) {
    const row = state.grid[y];
    const off = y * W;
    for (let x = 0; x < W; x++) {
      if (row[x] === -1) wall[off + x] = 1;
    }
  }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (wall[i]) continue;
      for (let d = 0; d < 4; d++) {
        const nx = x + DIRS[d][1];
        const ny = y + DIRS[d][2];
        if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
          const ni = ny * W + nx;
          if (!wall[ni]) adj[i * 4 + d] = ni;
        }
      }
    }
  }

  const queue = new Int16Array(N);
  function bfsFrom(startIdx, out) {
    out.fill(-1);
    out[startIdx] = 0;
    let head = 0, tail = 0;
    queue[tail++] = startIdx;
    while (head < tail) {
      const cur = queue[head++];
      const nd = out[cur] + 1;
      const base = cur * 4;
      for (let d = 0; d < 4; d++) {
        const nb = adj[base + d];
        if (nb >= 0 && out[nb] === -1) {
          out[nb] = nd;
          queue[tail++] = nb;
        }
      }
    }
  }

  const spots = state.bombSpots;
  const spotDist = spots.map(s => {
    const d = new Int16Array(N);
    bfsFrom(s.y * W + s.x, d);
    return d;
  });

  const spotMask = spots.map(s => {
    const cells = [];
    for (let dy = -3; dy <= 3; dy++) {
      const yy = s.y + dy;
      if (yy < 0 || yy >= H) continue;
      for (let dx = -3; dx <= 3; dx++) {
        const xx = s.x + dx;
        if (xx < 0 || xx >= W) continue;
        const idx = yy * W + xx;
        if (!wall[idx]) cells.push(idx);
      }
    }
    return Int16Array.from(cells);
  });

  memory.init = true;
  memory.wall = wall;
  memory.adj = adj;
  memory.queue = queue;
  memory.spotDist = spotDist;
  memory.spotMask = spotMask;
  memory.spotIndexMap = new Map(spots.map((s, i) => [s.y * W + s.x, i]));

  // Reusable per-tick buffers
  memory.grid = new Int8Array(N);
  memory.val = new Float32Array(N);
  memory.myDist = new Int16Array(N);
  memory.oppDist0 = new Int16Array(N);
  memory.oppDist1 = new Int16Array(N);
  memory.distToVal = new Int16Array(N);
  memory.rowSum = new Float32Array(N);
  memory.localVal = new Float32Array(N);
  memory.tempDist = new Int16Array(N);

  // Zero-allocation beam search buffers
  memory.bPosA = new Int16Array(MAX_NEXT);
  memory.bDirA = new Int8Array(MAX_NEXT);
  memory.bScoreA = new Float32Array(MAX_NEXT);
  memory.bPathA = new Int16Array(MAX_NEXT * MAX_DEPTH);

  memory.bPosB = new Int16Array(MAX_NEXT);
  memory.bDirB = new Int8Array(MAX_NEXT);
  memory.bScoreB = new Float32Array(MAX_NEXT);
  memory.bTotalB = new Float32Array(MAX_NEXT);
  memory.bPathB = new Int16Array(MAX_NEXT * MAX_DEPTH);
  memory.bOrder = new Int16Array(MAX_NEXT);
}

function bfs(adj, queue, startIdx, out) {
  out.fill(-1);
  out[startIdx] = 0;
  let head = 0, tail = 0;
  queue[tail++] = startIdx;
  while (head < tail) {
    const cur = queue[head++];
    const nd = out[cur] + 1;
    const base = cur * 4;
    for (let d = 0; d < 4; d++) {
      const nb = adj[base + d];
      if (nb >= 0 && out[nb] === -1) {
        out[nb] = nd;
        queue[tail++] = nb;
      }
    }
  }
}

function brain(state, memory) {
  if (!memory.init) initMemory(state, memory);

  const {
    wall, adj, queue, spotDist, spotMask, spotIndexMap,
    grid, val, myDist, oppDist0, oppDist1, distToVal, rowSum, localVal, tempDist,
  } = memory;

  const me = state.me;
  const myId = me.id;
  const myIdx = me.y * W + me.x;
  const remainingMoves = ((1797 - state.tick) / 3 | 0) + 1;

  // Flatten grid
  for (let y = 0; y < H; y++) {
    const row = state.grid[y];
    const off = y * W;
    for (let x = 0; x < W; x++) grid[off + x] = row[x];
  }

  // Opponents & rival
  const opps = [];
  for (let i = 0; i < state.painters.length; i++) {
    if (state.painters[i].id !== myId) opps.push(state.painters[i]);
  }
  const rival = opps[0].cells >= opps[1].cells ? opps[0] : opps[1];
  const rivalId = rival.id;

  // BFS for all 3 painters
  bfs(adj, queue, myIdx, myDist);
  bfs(adj, queue, opps[0].y * W + opps[0].x, oppDist0);
  bfs(adj, queue, opps[1].y * W + opps[1].x, oppDist1);
  const oppDists = [oppDist0, oppDist1];

  // Threat-aware cell values
  const maxOppCells = opps[0].cells >= opps[1].cells ? opps[0].cells : opps[1].cells;
  const lead = me.cells - maxOppCells;
  const baseThreat = lead > 100 ? 1.4 : 1.92;
  const w0 = opps[0].cells >= maxOppCells - 20 ? baseThreat : 1.15;
  const w1 = opps[1].cells >= maxOppCells - 20 ? baseThreat : 1.15;
  const id0 = opps[0].id;

  for (let i = 0; i < N; i++) {
    const g = grid[i];
    if (g === -1 || g === myId) {
      val[i] = 0;
    } else if (g === 0) {
      val[i] = 1.0;
    } else if (g === id0) {
      val[i] = w0;
    } else {
      val[i] = w1;
    }
  }

  // Evaluate active bombs
  let targetBomb = null;
  for (let b = 0; b < state.bombs.length; b++) {
    const bomb = state.bombs[b];
    const bIdx = bomb.y * W + bomb.x;
    const myD = myDist[bIdx];
    if (myD < 0 || myD > remainingMoves) continue;

    // Immediate burst if adjacent (unless we just bounced on this exact move)
    if (myD === 1) {
      for (let d = 0; d < 4; d++) {
        if (adj[myIdx * 4 + d] === bIdx && !(memory.lastIdx === myIdx && memory.lastDir === d)) {
          memory.lastIdx = myIdx;
          memory.lastDir = d;
          return DIRS[d][0];
        }
      }
    }

    const sIdx = spotIndexMap.get(bIdx);
    let gain = 0;
    if (sIdx !== undefined) {
      const mask = spotMask[sIdx];
      for (let k = 0; k < mask.length; k++) gain += val[mask[k]];
    } else {
      for (let dy = -3; dy <= 3; dy++) {
        const yy = bomb.y + dy;
        if (yy < 0 || yy >= H) continue;
        for (let dx = -3; dx <= 3; dx++) {
          const xx = bomb.x + dx;
          if (xx >= 0 && xx < W) gain += val[yy * W + xx];
        }
      }
    }

    let winProb = 1.0;
    for (let o = 0; o < 2; o++) {
      const oD = oppDists[o][bIdx];
      if (oD < 0) continue;
      if (oD < myD) {
        const diff = myD - oD;
        winProb *= (oD <= 5 || diff >= 4) ? 0.05 : 0.25;
      } else if (oD === myD) {
        if (me.cells < opps[o].cells) winProb *= 0.95;
        else if (me.cells > opps[o].cells) winProb *= 0.2;
        else winProb *= 0.5;
      }
    }

    const score = (gain * winProb) / (myD > 1 ? myD : (myD === 0 ? 2 : 1));
    if (winProb >= 0.4 && score > 1.45 && (!targetBomb || score > targetBomb.score)) {
      targetBomb = {
        idx: bIdx,
        distArr: sIdx !== undefined ? spotDist[sIdx] : null,
        availMoves: myD === 0 ? 2 : myD,
        isNext: false,
        score,
        sIdx,
      };
    }
  }

  // Evaluate nextBomb
  let nextBombInfo = null;
  if (state.nextBomb) {
    const nb = state.nextBomb;
    const nbIdx = nb.y * W + nb.x;
    let occupied = false;
    for (let b = 0; b < state.bombs.length; b++) {
      if (state.bombs[b].x === nb.x && state.bombs[b].y === nb.y) { occupied = true; break; }
    }
    const availMoves = ((nb.tick - state.tick) / 3 | 0) + 2;
    if (!occupied && availMoves <= remainingMoves) {
      const sIdx = spotIndexMap.get(nbIdx);
      const distArr = spotDist[sIdx];
      const myD = distArr[myIdx];
      if (myD >= 0 && myD <= remainingMoves) {
        const myArrival = myD > availMoves ? myD : availMoves;
        let gain = 0;
        const mask = spotMask[sIdx];
        for (let k = 0; k < mask.length; k++) gain += val[mask[k]];

        let winProb = 1.0;
        let minOppArrival = 9999;
        for (let o = 0; o < 2; o++) {
          const oD = distArr[opps[o].y * W + opps[o].x];
          if (oD < 0) continue;
          const oArrival = oD > availMoves ? oD : availMoves;
          if (oArrival < minOppArrival) minOppArrival = oArrival;
          if (oArrival < myArrival) {
            winProb *= (myArrival - oArrival >= 2 ? 0.05 : 0.2);
          } else if (oArrival === myArrival) {
            if (me.cells < opps[o].cells) winProb *= 0.95;
            else if (me.cells > opps[o].cells) winProb *= 0.25;
            else winProb *= 0.5;
          }
        }

        const score = (gain * winProb) / (myArrival > 1 ? myArrival : 1);
        nextBombInfo = {
          idx: nbIdx,
          distArr,
          availMoves,
          isNext: true,
          score,
          winProb,
          sIdx,
        };

        if (!targetBomb && winProb >= 0.45 && myArrival <= minOppArrival && myD <= availMoves + 1 && (myD >= availMoves - 3 || availMoves <= 18)) {
          targetBomb = nextBombInfo;
        }
      }
    }
  }

  // Discount target bomb's 7x7 cells so we don't pre-paint what we're about to burst
  if (targetBomb && targetBomb.sIdx !== undefined) {
    const mask = spotMask[targetBomb.sIdx];
    const factor = (!targetBomb.isNext || targetBomb.availMoves <= 16) ? 0.08 : 0.35;
    for (let k = 0; k < mask.length; k++) {
      const ci = mask[k];
      if (ci !== targetBomb.idx) val[ci] *= factor;
    }
  }

  // Multi-source BFS for distToVal
  distToVal.fill(-1);
  let head = 0, tail = 0;
  for (let i = 0; i < N; i++) {
    if (val[i] >= 0.9) {
      distToVal[i] = 0;
      queue[tail++] = i;
    }
  }
  if (targetBomb && !targetBomb.isNext && distToVal[targetBomb.idx] === -1) {
    distToVal[targetBomb.idx] = 0;
    queue[tail++] = targetBomb.idx;
  }
  while (head < tail) {
    const cur = queue[head++];
    const nd = distToVal[cur] + 1;
    const base = cur * 4;
    for (let d = 0; d < 4; d++) {
      const nb = adj[base + d];
      if (nb >= 0 && distToVal[nb] === -1) {
        distToVal[nb] = nd;
        queue[tail++] = nb;
      }
    }
  }

  // O(N) Sliding-window 5x5 localVal
  for (let y = 0; y < H; y++) {
    const off = y * W;
    let s = val[off] + val[off + 1] + val[off + 2];
    rowSum[off] = s;
    s += val[off + 3];
    rowSum[off + 1] = s;
    s += val[off + 4];
    rowSum[off + 2] = s;
    for (let x = 3; x < W - 2; x++) {
      s += val[off + x + 2] - val[off + x - 3];
      rowSum[off + x] = s;
    }
    s -= val[off + W - 5];
    rowSum[off + W - 2] = s;
    s -= val[off + W - 4];
    rowSum[off + W - 1] = s;
  }
  for (let x = 0; x < W; x++) {
    let s = rowSum[x] + rowSum[W + x] + rowSum[2 * W + x];
    localVal[x] = wall[x] ? 0 : s;
    s += rowSum[3 * W + x];
    localVal[W + x] = wall[W + x] ? 0 : s;
    s += rowSum[4 * W + x];
    localVal[2 * W + x] = wall[2 * W + x] ? 0 : s;
    for (let y = 3; y < H - 2; y++) {
      s += rowSum[(y + 2) * W + x] - rowSum[(y - 3) * W + x];
      const idx = y * W + x;
      localVal[idx] = wall[idx] ? 0 : s;
    }
    s -= rowSum[(H - 5) * W + x];
    localVal[(H - 2) * W + x] = wall[(H - 2) * W + x] ? 0 : s;
    s -= rowSum[(H - 4) * W + x];
    localVal[(H - 1) * W + x] = wall[(H - 1) * W + x] ? 0 : s;
  }

  let targetDistArr = targetBomb ? targetBomb.distArr : null;
  if (targetBomb && !targetDistArr) {
    bfs(adj, queue, targetBomb.idx, tempDist);
    targetDistArr = tempDist;
  }

  // Track bounce / anti-deadlock in memory
  let bouncedDir = -1;
  if (memory.lastIdx === myIdx && memory.lastDir >= 0) {
    bouncedDir = memory.lastDir;
    memory.bounceStreak = (memory.bounceStreak || 0) + 1;
  } else {
    memory.bounceStreak = 0;
  }

  // Immediate clash risk for step 1
  const stepClashPenalty = [0, 0, 0, 0];
  if (bouncedDir >= 0) {
    stepClashPenalty[bouncedDir] -= 10.0 * memory.bounceStreak;
  }
  for (let d = 0; d < 4; d++) {
    const ni = adj[myIdx * 4 + d];
    if (ni < 0) continue;
    const nx = ni % W, ny = (ni / W) | 0;
    for (let o = 0; o < 2; o++) {
      const op = opps[o];
      const manh = Math.abs(op.x - nx) + Math.abs(op.y - ny);
      if (manh === 0) {
        stepClashPenalty[d] -= 1.6;
      } else if (manh === 1) {
        if (op.cells < me.cells) {
          stepClashPenalty[d] -= 0.95;
        } else if (op.cells === me.cells) {
          let oppDir = -1;
          if (op.x === nx && op.y === ny + 1) oppDir = 0;
          else if (op.x === nx - 1 && op.y === ny) oppDir = 1;
          else if (op.x === nx && op.y === ny - 1) oppDir = 2;
          else if (op.x === nx + 1 && op.y === ny) oppDir = 3;
          if (oppDir >= 0 && oppDir < d) stepClashPenalty[d] -= 0.95;
        }
      }
    }
  }

  // Zero-allocation Beam Search
  const DEPTH = remainingMoves < MAX_DEPTH ? remainingMoves : MAX_DEPTH;
  const DISCOUNT = remainingMoves <= 14 ? 0.985 : 0.93;
  const hScale = remainingMoves <= MAX_DEPTH ? 0 : 1;

  let bPos = memory.bPosA, bDir = memory.bDirA, bScore = memory.bScoreA, bPath = memory.bPathA;
  let nPos = memory.bPosB, nDir = memory.bDirB, nScore = memory.bScoreB, nTotal = memory.bTotalB, nPath = memory.bPathB;
  const bOrder = memory.bOrder;

  let beamLen = 0;
  for (let d = 0; d < 4; d++) {
    const ni = adj[myIdx * 4 + d];
    if (ni < 0) continue;
    if (bouncedDir === d) continue;
    if (targetBomb) {
      const maxD = targetBomb.isNext
        ? (targetBomb.availMoves <= 2 ? 1 : targetBomb.availMoves - 1)
        : (targetDistArr[myIdx] === 0 ? 1 : Math.max(0, targetBomb.availMoves - 1));
      if (targetDistArr[myIdx] <= targetBomb.availMoves && targetDistArr[ni] > maxD) continue;
    }
    bPos[beamLen] = ni;
    bDir[beamLen] = d;
    bScore[beamLen] = val[ni] * DISCOUNT + stepClashPenalty[d];
    bPath[beamLen * MAX_DEPTH] = ni;
    beamLen++;
  }

  if (beamLen === 0) {
    let bestD = -1, bestScore = -1e9;
    for (let d = 0; d < 4; d++) {
      const ni = adj[myIdx * 4 + d];
      if (ni < 0) continue;
      let sc = val[ni] + stepClashPenalty[d];
      if (targetBomb && targetDistArr) sc -= targetDistArr[ni] * 0.5;
      if (sc > bestScore) {
        bestScore = sc;
        bestD = d;
      }
    }
    if (bestD >= 0) {
      memory.lastIdx = myIdx;
      memory.lastDir = bestD;
      return DIRS[bestD][0];
    }
    memory.lastIdx = myIdx;
    memory.lastDir = -1;
    return 'stay';
  }

  let disc = DISCOUNT;
  for (let step = 2; step <= DEPTH; step++) {
    disc *= DISCOUNT;
    let nextLen = 0;
    const remB = targetBomb ? targetBomb.availMoves - step : -1;
    const maxD = targetBomb ? (targetBomb.isNext && remB === 0 ? 1 : (remB > 0 ? remB : 0)) : 0;

    for (let b = 0; b < beamLen; b++) {
      const curPos = bPos[b];
      const curDir = bDir[b];
      const curScore = bScore[b];
      const pOff = b * MAX_DEPTH;
      const base = curPos * 4;

      for (let d = 0; d < 4; d++) {
        const ni = adj[base + d];
        if (ni < 0) continue;

        if (targetBomb && remB >= 0) {
          if (targetDistArr[ni] > maxD && targetDistArr[curPos] <= maxD + 1) continue;
        }

        let seen = false;
        for (let k = 0; k < step - 1; k++) {
          if (bPath[pOff + k] === ni) { seen = true; break; }
        }
        const sc = curScore + (seen ? 0 : val[ni] * disc);

        nPos[nextLen] = ni;
        nDir[nextLen] = curDir;
        nScore[nextLen] = sc;

        const nOff = nextLen * MAX_DEPTH;
        for (let k = 0; k < step - 1; k++) nPath[nOff + k] = bPath[pOff + k];
        nPath[nOff + step - 1] = ni;

        let h = sc;
        if (step < DEPTH || hScale > 0) {
          const dVal = distToVal[ni];
          h -= dVal >= 0 ? dVal * 0.65 : 20;
          h += localVal[ni] * 0.06;
        }
        if (targetBomb) {
          h -= targetDistArr[ni] * (targetBomb.isNext ? 0.25 : 0.85);
          if (targetBomb.isNext && targetBomb.availMoves <= 5 && targetDistArr[ni] === 1) {
            // Prefer south neighbor (enters bomb with 'up', best clash tie-breaker)
            if (ni === targetBomb.idx + W) h += 0.15;
            else if (ni === targetBomb.idx - 1) h += 0.08;
          }
        } else if (nextBombInfo && nextBombInfo.winProb >= 0.3) {
          h -= nextBombInfo.distArr[ni] * 0.12;
        }
        nTotal[nextLen] = h;
        bOrder[nextLen] = nextLen;
        nextLen++;
      }
    }

    if (nextLen === 0) break;

    // Partial selection / sort of top BEAM_W
    const keep = nextLen < BEAM_W ? nextLen : BEAM_W;
    for (let i = 0; i < keep; i++) {
      let bestIdx = i;
      let bestVal = nTotal[bOrder[i]];
      for (let j = i + 1; j < nextLen; j++) {
        const v = nTotal[bOrder[j]];
        if (v > bestVal) { bestVal = v; bestIdx = j; }
      }
      if (bestIdx !== i) {
        const tmp = bOrder[i];
        bOrder[i] = bOrder[bestIdx];
        bOrder[bestIdx] = tmp;
      }
    }

    // Copy top `keep` into b* arrays
    for (let i = 0; i < keep; i++) {
      const idx = bOrder[i];
      bPos[i] = nPos[idx];
      bDir[i] = nDir[idx];
      bScore[i] = nScore[idx];
      const srcOff = idx * MAX_DEPTH;
      const dstOff = i * MAX_DEPTH;
      for (let k = 0; k < step; k++) bPath[dstOff + k] = nPath[srcOff + k];
    }
    beamLen = keep;
  }

  const chosenDir = bDir[0];
  memory.lastIdx = myIdx;
  memory.lastDir = chosenDir;
  return DIRS[chosenDir][0];
}
