'use strict';

const W = 48, H = 30, N = 1440;
const DX = [0, 1, 0, -1, 0];
const DY = [-1, 0, 1, 0, 0];
const MOVE_NAMES = ['up', 'right', 'down', 'left', 'stay'];

const wall = new Uint8Array(N);
const adj = new Int16Array(N * 4);
const adjDir = new Uint8Array(N * 4);
const adjCnt = new Uint8Array(N);
const wallAdj = new Uint8Array(N);

const MAX_SPOTS = 16;
const spotDist = new Int16Array(MAX_SPOTS * N);
const spotBlast = new Int16Array(MAX_SPOTS * 49);
const spotBlastLen = new Uint8Array(MAX_SPOTS);

const flatGrid = new Int8Array(N);
const cellVal = new Float32Array(N);
const directVal = new Float32Array(N);
const potA = new Float32Array(N);
const potB = new Float32Array(N);
const distPaint = new Int16Array(N);
const frontVal = new Float32Array(N);
const dE0 = new Int16Array(N);
const dE1 = new Int16Array(N);
const dFallback = new Int16Array(N);
const bfsQ = new Int16Array(N);
const cellBlastMask = new Uint8Array(N);

const BEAM_W = 36, BEAM_D = 12, MAX_CAND = 185;
const bPos = new Int16Array(BEAM_W);
const bFirst = new Int8Array(BEAM_W);
const bScore = new Float64Array(BEAM_W);
const bPop = new Uint8Array(BEAM_W);
const bC0 = new Float32Array(BEAM_W);
const bC1 = new Float32Array(BEAM_W);
const bVis = new Int16Array(BEAM_W * BEAM_D);

const cPos = new Int16Array(MAX_CAND);
const cFirst = new Int8Array(MAX_CAND);
const cScore = new Float64Array(MAX_CAND);
const cPop = new Uint8Array(MAX_CAND);
const cC0 = new Float32Array(MAX_CAND);
const cC1 = new Float32Array(MAX_CAND);
const cParent = new Int16Array(MAX_CAND);
const cAdded = new Int16Array(MAX_CAND);
const nVisTmp = new Int16Array(BEAM_W * BEAM_D);
const seenKey = new Int32Array(N * 5);
let seenStamp = 1;

const DISC = new Float64Array(32);
for (let i = 0; i < 32; i++) DISC[i] = Math.pow(0.935, i);

function runBfs(startIdx, out) {
  out.fill(999);
  if (startIdx < 0 || wall[startIdx]) return;
  let h = 0, t = 0;
  out[startIdx] = 0;
  bfsQ[t++] = startIdx;
  while (h < t) {
    const u = bfsQ[h++], nd = out[u] + 1, base = u * 4, cnt = adjCnt[u];
    for (let k = 0; k < cnt; k++) {
      const v = adj[base + k];
      if (out[v] === 999) { out[v] = nd; bfsQ[t++] = v; }
    }
  }
}

function initMap(state, memory) {
  const { grid, bombSpots } = state;
  for (let y = 0; y < H; y++) {
    const row = grid[y], yw = y * W;
    for (let x = 0; x < W; x++) wall[yw + x] = row[x] === -1 ? 1 : 0;
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (wall[i]) { adjCnt[i] = 0; wallAdj[i] = 4; continue; }
      let cnt = 0, wCnt = 0;
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d], ny = y + DY[d];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || wall[ny * W + nx]) wCnt++;
        else { adj[i * 4 + cnt] = ny * W + nx; adjDir[i * 4 + cnt] = d; cnt++; }
      }
      adjCnt[i] = cnt;
      wallAdj[i] = wCnt;
    }
  }
  const numSpots = Math.min(bombSpots.length, MAX_SPOTS);
  memory.numSpots = numSpots;
  memory.spotIdxByCell = new Int8Array(N);
  memory.spotIdxByCell.fill(-1);
  for (let s = 0; s < numSpots; s++) {
    const sx = bombSpots[s].x, sy = bombSpots[s].y, si = sy * W + sx;
    memory.spotIdxByCell[si] = s;
    runBfs(si, spotDist.subarray(s * N, (s + 1) * N));
    let bl = 0;
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const bx = sx + dx, by = sy + dy;
        if (bx >= 0 && by >= 0 && bx < W && by < H && !wall[by * W + bx]) {
          spotBlast[s * 49 + bl++] = by * W + bx;
        }
      }
    }
    spotBlastLen[s] = bl;
  }
  memory.prevPos = [-1, -1, -1, -1];
  memory.idle = [0, 0, 0, 0];
  memory.inited = true;
}

function brain(state, memory) {
  if (!memory.inited) initMap(state, memory);

  const { grid, me, painters, bombs, bombSpots, nextBomb, tick } = state;
  const myId = me.id, myIdx = me.y * W + me.x;
  const prog = tick / 1800;
  const movesLeftInRound = ((1797 - tick) / 3 | 0) + 1;

  for (let y = 0; y < H; y++) {
    const row = grid[y], yw = y * W;
    for (let x = 0; x < W; x++) flatGrid[yw + x] = row[x];
  }

  let e0 = null, e1 = null;
  for (let i = 0; i < painters.length; i++) {
    const p = painters[i], pid = p.id, pi = p.y * W + p.x;
    if (memory.prevPos[pid] === pi) memory.idle[pid]++;
    else memory.idle[pid] = 0;
    if (pid !== myId) { if (!e0) e0 = p; else e1 = p; }
  }

  const e0Idx = e0 ? e0.y * W + e0.x : -1;
  const e1Idx = e1 ? e1.y * W + e1.x : -1;
  runBfs(e0Idx, dE0);
  runBfs(e1Idx, dE1);

  const c0 = e0 ? e0.cells : 0, c1 = e1 ? e1.cells : 0, cMe = me.cells;
  const g0 = Math.abs(cMe - c0), g1 = Math.abs(cMe - c1);
  const t0 = (c0 >= c1 - 25 ? 2.0 : 1.0) * Math.exp(-Math.max(0, g0 - 20) / 140);
  const t1 = (c1 >= c0 - 25 ? 2.0 : 1.0) * Math.exp(-Math.max(0, g1 - 20) / 140);
  const tMax = Math.max(1.0, t0, t1);
  const wE0 = 0.18 + prog * (0.24 + 0.56 * (t0 / tMax));
  const wE1 = 0.18 + prog * (0.24 + 0.56 * (t1 / tMax));
  const valByOwner = [1.05, 0, 0, 0];
  valByOwner[myId] = 0;
  if (e0) valByOwner[e0.id] = 1.0 + wE0;
  if (e1) valByOwner[e1.id] = 1.0 + wE1;
  const maxEnemyW = Math.max(wE0, wE1);

  const candBombs = [];
  for (let i = 0; i < bombs.length; i++) {
    const b = bombs[i], bi = b.y * W + b.x;
    candBombs.push({ idx: bi, sIdx: memory.spotIdxByCell[bi], minBurstStep: 0 });
  }
  if (nextBomb) {
    const nbi = nextBomb.y * W + nextBomb.x;
    if (!candBombs.some(b => b.idx === nbi)) {
      const mbs = ((nextBomb.tick + 3 - tick) / 3) | 0;
      const sIdx = memory.spotIdxByCell[nbi];
      candBombs.push({ idx: nbi, sIdx, minBurstStep: mbs });
      if (sIdx >= 0 && nextBomb.tick + 150 < 1800 && bombSpots.length > 1) {
        const s2 = (sIdx + 1) % memory.numSpots;
        const b2 = bombSpots[s2], b2i = b2.y * W + b2.x;
        const mbs2 = ((nextBomb.tick + 153 - tick) / 3) | 0;
        if (mbs2 <= 65 && !candBombs.some(b => b.idx === b2i)) {
          candBombs.push({ idx: b2i, sIdx: s2, minBurstStep: mbs2 });
        }
      }
    }
  }

  const targetBombs = [];
  const enemyBlastZones = [];
  for (let i = 0; i < candBombs.length; i++) {
    const cb = candBombs[i];
    let dArr;
    if (cb.sIdx >= 0) dArr = spotDist.subarray(cb.sIdx * N, (cb.sIdx + 1) * N);
    else { runBfs(cb.idx, dFallback); dArr = dFallback; }

    const dm0 = dArr[myIdx];
    if (dm0 >= 999) continue;
    const reqMoves = cb.minBurstStep + 1;
    const etaMe = cb.minBurstStep === 0 ? (dm0 === 0 ? 2 : dm0) : Math.max(dm0, reqMoves);

    const calcEnemyEta = (e, eIdx) => {
      if (!e || eIdx < 0 || memory.idle[e.id] >= 3) return 999;
      const de0 = dArr[eIdx];
      let eta = cb.minBurstStep === 0 ? (de0 === 0 ? 2 : de0) : Math.max(de0, reqMoves);
      if (memory.idle[e.id] >= 1) eta += 1;
      return eta;
    };
    const eta0 = calcEnemyEta(e0, e0Idx), eta1 = calcEnemyEta(e1, e1Idx);
    const minEtaE = Math.min(eta0, eta1);
    const fastestE = eta0 <= eta1 ? e0 : e1;
    const enemyBestStep = minEtaE - 1;
    const winTie = fastestE ? (cMe < fastestE.cells - (etaMe > 2 ? 2 : 0)) : true;
    const maxSafeStep = winTie ? enemyBestStep : enemyBestStep - 1;

    let direct = 0, myCellsInBlast = 0;
    if (cb.sIdx >= 0) {
      const base = cb.sIdx * 49, len = spotBlastLen[cb.sIdx];
      for (let k = 0; k < len; k++) {
        const ci = spotBlast[base + k], own = flatGrid[ci];
        if (own === myId) myCellsInBlast++;
        else direct += valByOwner[own];
      }
    } else direct = 35;

    const enemyWillReach = minEtaE <= movesLeftInRound;
    const denialFactor = enemyWillReach ? Math.max(0.25, Math.min(1.0, 1.0 - (minEtaE - etaMe) / 38)) : 0;
    const rivalW = fastestE ? (fastestE === e0 ? wE0 : wE1) : maxEnemyW;
    const totalReward = direct + denialFactor * myCellsInBlast * (0.95 + rivalW * 0.9);

    if (etaMe - 1 <= maxSafeStep && etaMe <= movesLeftInRound && totalReward > 4.0) {
      targetBombs.push({
        idx: cb.idx, sIdx: cb.sIdx, dArr,
        minBurstStep: cb.minBurstStep,
        maxSafeStep: Math.min(maxSafeStep, movesLeftInRound - 1),
        etaMe, totalReward, direct,
      });
    } else if (cb.minBurstStep === 0 && dm0 === 1 && totalReward > 6.0) {
      targetBombs.push({
        idx: cb.idx, sIdx: cb.sIdx, dArr,
        minBurstStep: 0, maxSafeStep: 0,
        etaMe: 1, totalReward: totalReward * 0.35, direct: direct * 0.35,
      });
    } else if (minEtaE <= 6 && minEtaE < etaMe && cb.sIdx >= 0) {
      enemyBlastZones.push({ sIdx: cb.sIdx, eta: minEtaE });
    }
  }

  targetBombs.sort((a, b) => (b.totalReward * DISC[Math.min(31, b.etaMe)]) - (a.totalReward * DISC[Math.min(31, a.etaMe)]));
  const numTB = Math.min(2, targetBombs.length);
  cellBlastMask.fill(0);
  for (let k = 0; k < numTB; k++) {
    const sIdx = targetBombs[k].sIdx;
    if (sIdx >= 0) {
      const base = sIdx * 49, len = spotBlastLen[sIdx], bit = 1 << k;
      for (let j = 0; j < len; j++) cellBlastMask[spotBlast[base + j]] |= bit;
    }
  }

  for (let i = 0; i < N; i++) {
    if (wall[i]) { cellVal[i] = 0; directVal[i] = 0; continue; }
    const own = flatGrid[i];
    if (own === myId) { cellVal[i] = 0; directVal[i] = 0; continue; }
    let v = valByOwner[own];
    directVal[i] = v;
    if (tick < 1560) {
      if (e0 && memory.idle[e0.id] < 2 && dE0[i] <= 2) v *= (dE0[i] <= 1 ? 0.72 : 0.86);
      if (e1 && memory.idle[e1.id] < 2 && dE1[i] <= 2) v *= (dE1[i] <= 1 ? 0.72 : 0.86);
    }
    cellVal[i] = v;
  }

  for (let z = 0; z < enemyBlastZones.length; z++) {
    const { sIdx, eta } = enemyBlastZones[z];
    const mult = eta <= 2 ? 0.02 : 0.15;
    const base = sIdx * 49, len = spotBlastLen[sIdx];
    for (let j = 0; j < len; j++) cellVal[spotBlast[base + j]] *= mult;
  }

  for (let i = 0; i < N; i++) {
    potA[i] = (cellBlastMask[i] & 1) && targetBombs[0].etaMe <= 10 ? cellVal[i] * 0.25 : cellVal[i];
  }
  let srcP = potA, dstP = potB;
  for (let it = 0; it < 8; it++) {
    for (let i = 0; i < N; i++) {
      if (wall[i]) { dstP[i] = 0; continue; }
      const cnt = adjCnt[i], base = i * 4;
      let sum = srcP[i] * 2.0;
      for (let k = 0; k < cnt; k++) sum += srcP[adj[base + k]];
      dstP[i] = sum / (cnt + 2.0);
    }
    const tmp = srcP; srcP = dstP; dstP = tmp;
  }
  const pot = srcP;

  distPaint.fill(999);
  frontVal.fill(0);
  let qh = 0, qt = 0;
  for (let i = 0; i < N; i++) {
    if (!wall[i] && cellVal[i] > 0.3 && !((cellBlastMask[i] & 1) && targetBombs[0].etaMe <= 6)) {
      distPaint[i] = 0;
      frontVal[i] = pot[i];
      bfsQ[qt++] = i;
    }
  }
  while (qh < qt) {
    const u = bfsQ[qh++], nd = distPaint[u] + 1, fv = frontVal[u], base = u * 4, cnt = adjCnt[u];
    for (let k = 0; k < cnt; k++) {
      const v = adj[base + k];
      if (distPaint[v] === 999) { distPaint[v] = nd; frontVal[v] = fv; bfsQ[qt++] = v; }
      else if (distPaint[v] === nd && fv > frontVal[v]) frontVal[v] = fv;
    }
  }

  const step0Adj = [0, 0, 0, 0, -0.15];
  const step0Blocked = [0, 0, 0, 0, 0];
  for (let d = 0; d < 4; d++) {
    const nx = me.x + DX[d], ny = me.y + DY[d];
    if (nx < 0 || ny < 0 || nx >= W || ny >= H || wall[ny * W + nx]) { step0Blocked[d] = 1; continue; }
    const ni = ny * W + nx;
    const checkE = (e, eIdx) => {
      if (!e) return;
      if (eIdx === ni) {
        step0Adj[d] -= memory.idle[e.id] >= 2 ? 40.0 : (flatGrid[myIdx] !== e.id ? 1.35 : 0.85);
      } else if (Math.abs(e.x - nx) + Math.abs(e.y - ny) === 1 && memory.idle[e.id] < 2) {
        const edx = nx - e.x, edy = ny - e.y;
        const eDir = edy === -1 ? 0 : (edx === 1 ? 1 : (edy === 1 ? 2 : 3));
        const iWin = (cMe < e.cells) || (cMe === e.cells && d < eDir);
        const isBomb = numTB > 0 && targetBombs[0].idx === ni && targetBombs[0].minBurstStep === 0;
        if (iWin) {
          if (flatGrid[ni] !== e.id || isBomb) step0Adj[d] += 0.35 * (e === e0 ? wE0 : wE1);
        } else if (!isBomb) {
          step0Adj[d] -= (flatGrid[ni] !== e.id ? 0.48 : 0.14) * 2.1;
        }
      }
    };
    checkE(e0, e0Idx);
    checkE(e1, e1Idx);
  }

  const depth = Math.min(BEAM_D, movesLeftInRound);
  let beamLen = 1;
  bPos[0] = myIdx; bFirst[0] = -1; bScore[0] = 0; bPop[0] = 0; bC0[0] = 0; bC1[0] = 0;

  for (let step = 0; step < depth; step++) {
    let candLen = 0;
    const disc = DISC[step];
    for (let bi = 0; bi < beamLen; bi++) {
      const cur = bPos[bi], base = cur * 4, cnt = adjCnt[cur];
      const allowStay = (step === 0) ||
        (numTB > 0 && targetBombs[0].minBurstStep === step + 1 && targetBombs[0].dArr[cur] === 1);
      const totalMoves = cnt + (allowStay ? 1 : 0);

      for (let m = 0; m < totalMoves; m++) {
        const ni = m < cnt ? adj[base + m] : cur;
        const dir = m < cnt ? adjDir[base + m] : 4;
        if (step === 0 && dir < 4 && step0Blocked[dir]) continue;

        const firstMove = step === 0 ? dir : bFirst[bi];
        let pop = bPop[bi], cl0 = bC0[bi], cl1 = bC1[bi];
        let gain = step === 0 ? step0Adj[dir] : 0;
        let addedVis = -1;

        if (dir < 4) {
          const vBase = bi * BEAM_D;
          let seenInPath = false;
          for (let s = 0; s < step; s++) if (bVis[vBase + s] === ni) { seenInPath = true; break; }
          const bMask = cellBlastMask[ni];
          if (!seenInPath && (pop & bMask) === 0) {
            const cv = cellVal[ni];
            if (cv > 0) {
              let closed = wallAdj[ni];
              const nBase = ni * 4, nCnt = adjCnt[ni];
              for (let j = 0; j < nCnt; j++) {
                const nb = adj[nBase + j];
                if (flatGrid[nb] === myId || (pop & cellBlastMask[nb]) !== 0) closed++;
                else {
                  for (let s = 0; s < step; s++) if (bVis[vBase + s] === nb) { closed++; break; }
                }
              }
              gain += cv + closed * 0.075;
              if (bMask & 1) cl0 += directVal[ni];
              if (bMask & 2) cl1 += directVal[ni];
            } else gain -= 0.03;
            addedVis = ni;
          } else gain -= 0.04;

          for (let k = 0; k < numTB; k++) {
            const bit = 1 << k;
            if ((pop & bit) === 0) {
              const tb = targetBombs[k];
              if (ni === tb.idx && step >= tb.minBurstStep && step <= tb.maxSafeStep) {
                pop |= bit;
                gain += Math.max(2.0, tb.totalReward - (k === 0 ? cl0 : cl1));
              }
            }
          }
        } else gain -= 0.05;

        for (let k = 0; k < numTB; k++) {
          if ((pop & (1 << k)) === 0 && ni === targetBombs[k].idx && step === targetBombs[k].minBurstStep - 1) {
            gain -= 8.0;
          }
        }

        let sc = bScore[bi] + gain * disc;
        if (step === depth - 1) {
          let leafMacro = pot[ni] * 2.1;
          if (distPaint[ni] > 0 && distPaint[ni] < 999) leafMacro += frontVal[ni] * 1.4 - distPaint[ni] * 0.42;
          for (let k = 0; k < numTB; k++) {
            if ((pop & (1 << k)) === 0) {
              const tb = targetBombs[k], dLeaf = tb.dArr[ni], rem = tb.minBurstStep - step;
              const bs = rem <= 0 ? step + (dLeaf === 0 ? 2 : dLeaf)
                : (rem === 1 ? (dLeaf === 1 ? step + 1 : (dLeaf === 0 ? step + 2 : step + dLeaf)) : step + Math.max(dLeaf, rem));
              if (bs <= tb.maxSafeStep) {
                const bDisc = bs < 32 ? DISC[bs] : Math.pow(0.935, bs);
                sc += Math.max(2.0, tb.totalReward - (k === 0 ? cl0 : cl1)) * bDisc;
                if (rem >= 2 && dLeaf <= rem && dLeaf >= 1 && ((rem - dLeaf) & 1) === 0) sc += 0.45 * bDisc;
              }
            }
          }
          sc += leafMacro * disc;
        } else {
          let guide = pot[ni] * 0.10 - (distPaint[ni] > 0 && distPaint[ni] < 999 ? distPaint[ni] * 0.035 : 0);
          for (let k = 0; k < numTB; k++) {
            if ((pop & (1 << k)) === 0) {
              const tb = targetBombs[k], dN = tb.dArr[ni], rem = tb.minBurstStep - step;
              const est = rem <= 0 ? step + (dN === 0 ? 2 : dN) : step + Math.max(dN, rem);
              if (est <= tb.maxSafeStep) guide += (tb.totalReward * 0.09) * (est < 32 ? DISC[est] : 0.12);
            }
          }
          sc += guide * disc;
        }

        const ci = candLen++;
        cPos[ci] = ni; cFirst[ci] = firstMove; cScore[ci] = sc;
        cPop[ci] = pop; cC0[ci] = cl0; cC1[ci] = cl1; cParent[ci] = bi; cAdded[ci] = addedVis;
      }
    }

    if (candLen === 0) break;
    seenStamp++;
    if (seenStamp > 1e9) { seenKey.fill(0); seenStamp = 1; }

    let nextLen = 0;
    while (nextLen < BEAM_W) {
      let bestIdx = -1, bestSc = -1e18;
      for (let i = 0; i < candLen; i++) {
        if (cScore[i] > bestSc) {
          const key = cPos[i] * 5 + cFirst[i];
          if (seenKey[key] !== seenStamp) { bestSc = cScore[i]; bestIdx = i; }
          else cScore[i] = -1e19;
        }
      }
      if (bestIdx < 0) break;
      seenKey[cPos[bestIdx] * 5 + cFirst[bestIdx]] = seenStamp;
      cScore[bestIdx] = -1e19;

      const slot = nextLen++;
      bPos[slot] = cPos[bestIdx]; bFirst[slot] = cFirst[bestIdx]; bScore[slot] = bestSc;
      bPop[slot] = cPop[bestIdx]; bC0[slot] = cC0[bestIdx]; bC1[slot] = cC1[bestIdx];
      const pBase = cParent[bestIdx] * BEAM_D, dBase = slot * BEAM_D;
      for (let s = 0; s < step; s++) nVisTmp[dBase + s] = bVis[pBase + s];
      nVisTmp[dBase + step] = cAdded[bestIdx];
    }
    for (let slot = 0; slot < nextLen; slot++) {
      const base = slot * BEAM_D;
      for (let s = 0; s <= step; s++) bVis[base + s] = nVisTmp[base + s];
    }
    beamLen = nextLen;
  }

  for (let i = 0; i < painters.length; i++) {
    const p = painters[i];
    memory.prevPos[p.id] = p.y * W + p.x;
  }

  return MOVE_NAMES[beamLen > 0 && bFirst[0] >= 0 ? bFirst[0] : 4];
}
