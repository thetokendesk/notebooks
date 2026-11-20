const TANK_R = 18;
const SHELL_SPEED = 9;
const TURRET_TIP = 25;
const MOVE_SPEED = 3;
const TURN_SPEED = 4;
const TURRET_SPEED = 6;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

let SX = 0, SY = 0, SVX = 0, SVY = 0, SB = 0, SDEAD = false;
let MX = 0, MY = 0;

function normAngle(a) {
  a %= 360;
  return a < 0 ? a + 360 : a;
}

function angleDiff(target, current) {
  let d = (target - current) % 360;
  if (d > 180) d -= 360;
  else if (d <= -180) d += 360;
  return d;
}

function clamp(v, lo, hi) {
  return v < lo ? lo : (v > hi ? hi : v);
}

function distSq(x1, y1, x2, y2) {
  const dx = x1 - x2, dy = y1 - y2;
  return dx * dx + dy * dy;
}

function distSegPointSq(x1, y1, x2, y2, px, py) {
  const vx = x2 - x1, vy = y2 - y1;
  const wx = px - x1, wy = py - y1;
  const c1 = wx * vx + wy * vy;
  if (c1 <= 0) return wx * wx + wy * wy;
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) {
    const dx = px - x2, dy = py - y2;
    return dx * dx + dy * dy;
  }
  const b = c1 / c2;
  const dx = px - (x1 + b * vx), dy = py - (y1 + b * vy);
  return dx * dx + dy * dy;
}

function segHitsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
  let t0 = 0, t1 = 1;
  const dx = x2 - x1, dy = y2 - y1;
  for (let k = 0; k < 4; k++) {
    const p = k === 0 ? -dx : (k === 1 ? dx : (k === 2 ? -dy : dy));
    const q = k === 0 ? x1 - rx : (k === 1 ? rx + rw - x1 : (k === 2 ? y1 - ry : ry + rh - y1));
    if (Math.abs(p) < 1e-8) {
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return t0 <= t1;
}

function hasDirectLOS(x1, y1, x2, y2, walls) {
  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    if (segHitsRect(x1, y1, x2, y2, w.x, w.y, w.w, w.h)) return false;
  }
  return true;
}

function isTipBlocked(mx, my, tx, ty, arena, walls) {
  if (tx <= 0.5 || tx >= arena.w - 0.5 || ty <= 0.5 || ty >= arena.h - 0.5) return true;
  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    if (tx >= w.x && tx <= w.x + w.w && ty >= w.y && ty <= w.y + w.h) return true;
    if (segHitsRect(mx, my, tx, ty, w.x, w.y, w.w, w.h)) return true;
  }
  return false;
}

function isTankBlocked(x, y, arena, walls, ox, oy) {
  if (x < TANK_R || x > arena.w - TANK_R || y < TANK_R || y > arena.h - TANK_R) return true;
  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    const cx = clamp(x, w.x, w.x + w.w);
    const cy = clamp(y, w.y, w.y + w.h);
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy < TANK_R * TANK_R) return true;
  }
  if (ox !== undefined) {
    const dx = x - ox, dy = y - oy;
    if (dx * dx + dy * dy < 1296) return true;
  }
  return false;
}

function moveTankFast(x, y, vx, vy, arena, walls, ox, oy) {
  const nx = x + vx, ny = y + vy;
  if (!isTankBlocked(nx, ny, arena, walls, ox, oy)) {
    MX = nx; MY = ny;
    return;
  }
  let lo = 0, hi = 1;
  for (let k = 0; k < 5; k++) {
    const mid = (lo + hi) * 0.5;
    if (!isTankBlocked(x + vx * mid, y + vy * mid, arena, walls, ox, oy)) lo = mid;
    else hi = mid;
  }
  MX = x + vx * lo;
  MY = y + vy * lo;
}

function stepShellFast(sx, sy, vx, vy, bLeft, arena, walls) {
  let rem = 1.0;
  let cx = sx, cy = sy, cvx = vx, cvy = vy, cb = bLeft;
  for (let iter = 0; iter < 4 && rem > 1e-5; iter++) {
    let minT = rem, axis = 0;
    if (cvx < 0) {
      const t = -cx / cvx;
      if (t >= -1e-7 && t < minT) { minT = t > 0 ? t : 0; axis = 1; }
    } else if (cvx > 0) {
      const t = (arena.w - cx) / cvx;
      if (t >= -1e-7 && t < minT) { minT = t > 0 ? t : 0; axis = 1; }
    }
    if (cvy < 0) {
      const t = -cy / cvy;
      if (t >= -1e-7 && t < minT) { minT = t > 0 ? t : 0; axis = 2; }
    } else if (cvy > 0) {
      const t = (arena.h - cy) / cvy;
      if (t >= -1e-7 && t < minT) { minT = t > 0 ? t : 0; axis = 2; }
    }
    for (let i = 0; i < walls.length; i++) {
      const w = walls[i];
      if (cvx > 0 && cx <= w.x + 1e-6) {
        const t = (w.x - cx) / cvx;
        if (t >= -1e-7 && t < minT) {
          const yAt = cy + cvy * t;
          if (yAt >= w.y - 1e-5 && yAt <= w.y + w.h + 1e-5) { minT = t > 0 ? t : 0; axis = 1; }
        }
      } else if (cvx < 0 && cx >= w.x + w.w - 1e-6) {
        const t = (w.x + w.w - cx) / cvx;
        if (t >= -1e-7 && t < minT) {
          const yAt = cy + cvy * t;
          if (yAt >= w.y - 1e-5 && yAt <= w.y + w.h + 1e-5) { minT = t > 0 ? t : 0; axis = 1; }
        }
      }
      if (cvy > 0 && cy <= w.y + 1e-6) {
        const t = (w.y - cy) / cvy;
        if (t >= -1e-7 && t < minT) {
          const xAt = cx + cvx * t;
          if (xAt >= w.x - 1e-5 && xAt <= w.x + w.w + 1e-5) { minT = t > 0 ? t : 0; axis = 2; }
        }
      } else if (cvy < 0 && cy >= w.y + w.h - 1e-6) {
        const t = (w.y + w.h - cy) / cvy;
        if (t >= -1e-7 && t < minT) {
          const xAt = cx + cvx * t;
          if (xAt >= w.x - 1e-5 && xAt <= w.x + w.w + 1e-5) { minT = t > 0 ? t : 0; axis = 2; }
        }
      }
    }
    cx += cvx * minT;
    cy += cvy * minT;
    rem -= minT;
    if (axis !== 0) {
      if (cb <= 0) {
        SX = cx; SY = cy; SVX = cvx; SVY = cvy; SB = -1; SDEAD = true;
        return;
      }
      cb--;
      if (axis === 1) { cvx = -cvx; cx += cvx > 0 ? 1e-4 : -1e-4; }
      else { cvy = -cvy; cy += cvy > 0 ? 1e-4 : -1e-4; }
    } else break;
  }
  SX = cx; SY = cy; SVX = cvx; SVY = cvy; SB = cb; SDEAD = false;
}

function buildNavGrid(arena, walls) {
  const step = 24;
  const cols = Math.floor(arena.w / step);
  const rows = Math.floor(arena.h / step);
  const pass = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    const y = (r + 0.5) * step;
    for (let c = 0; c < cols; c++) {
      const x = (c + 0.5) * step;
      if (!isTankBlocked(x, y, arena, walls)) pass[r * cols + c] = 1;
    }
  }
  return { step, cols, rows, pass, dist: new Int16Array(cols * rows), q: new Int16Array(cols * rows) };
}

function getNavTarget(nav, sx, sy, gx, gy) {
  const { step, cols, rows, pass, dist, q } = nav;
  const sc = clamp(Math.floor(sx / step), 0, cols - 1);
  const sr = clamp(Math.floor(sy / step), 0, rows - 1);
  let gc = clamp(Math.floor(gx / step), 0, cols - 1);
  let gr = clamp(Math.floor(gy / step), 0, rows - 1);

  if (!pass[gr * cols + gc]) {
    let bestD = 1e9, bc = gc, br = gr;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (pass[r * cols + c]) {
          const d = (c - gc) * (c - gc) + (r - gr) * (r - gr);
          if (d < bestD) { bestD = d; bc = c; br = r; }
        }
      }
    }
    gc = bc; gr = br;
  }

  dist.fill(-1);
  let head = 0, tail = 0;
  const gIdx = gr * cols + gc;
  dist[gIdx] = 0;
  q[tail++] = gIdx;
  const dirs = [-1, 0, 1, 0, 0, -1, 0, 1, -1, -1, 1, -1, -1, 1, 1, 1];

  while (head < tail) {
    const cur = q[head++];
    const cr = (cur / cols) | 0;
    const cc = cur % cols;
    const cd = dist[cur];
    for (let d = 0; d < 16; d += 2) {
      const nc = cc + dirs[d], nr = cr + dirs[d + 1];
      if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
        const nIdx = nr * cols + nc;
        if (pass[nIdx] && dist[nIdx] === -1) {
          if (d >= 8 && (!pass[cr * cols + nc] || !pass[nr * cols + cc])) continue;
          dist[nIdx] = cd + (d >= 8 ? 14 : 10);
          q[tail++] = nIdx;
        }
      }
    }
  }

  let curR = sr, curC = sc;
  for (let stepCnt = 0; stepCnt < 3; stepCnt++) {
    let bIdx = curR * cols + curC;
    let bVal = dist[bIdx] === -1 ? 1e9 : dist[bIdx];
    for (let d = 0; d < 16; d += 2) {
      const nc = curC + dirs[d], nr = curR + dirs[d + 1];
      if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
        const nIdx = nr * cols + nc;
        if (dist[nIdx] !== -1 && dist[nIdx] < bVal) {
          bVal = dist[nIdx]; bIdx = nIdx;
        }
      }
    }
    curR = (bIdx / cols) | 0;
    curC = bIdx % cols;
  }
  return { x: (curC + 0.5) * step, y: (curR + 0.5) * step };
}

function predictEnemy(enemy, mem, arena, walls, maxT) {
  const px = new Float32Array(maxT + 1);
  const py = new Float32Array(maxT + 1);
  let ex = enemy.x, ey = enemy.y, eh = enemy.heading;
  const vx = mem.evx, vy = mem.evy;
  const spd = Math.min(MOVE_SPEED, Math.hypot(vx, vy));
  const hRad = eh * DEG2RAD;
  const dot = vx * Math.cos(hRad) + vy * Math.sin(hRad);
  const dir = spd < 0.15 ? 0 : (dot >= 0 ? 1 : -1);

  const damp = mem.jitter > 0.35 ? 0.91 : 0.97;
  let curSpd = spd;
  let curTurn = clamp(mem.eturn, -TURN_SPEED, TURN_SPEED) * 0.65;

  px[0] = ex; py[0] = ey;
  for (let t = 1; t <= maxT; t++) {
    if (t > 16 || mem.jitter > 0.35) {
      curSpd *= damp;
      curTurn *= 0.9;
    }
    eh = normAngle(eh + curTurn);
    const r = eh * DEG2RAD;
    moveTankFast(ex, ey, Math.cos(r) * curSpd * dir, Math.sin(r) * curSpd * dir, arena, walls);
    if (distSq(ex, ey, MX, MY) < 0.05) curSpd *= 0.5;
    ex = MX; ey = MY;
    // Blend slightly toward smoothed anchor when jittery
    if (mem.jitter > 0.4 && t > 12) {
      ex = ex * 0.92 + mem.anchorX * 0.08;
      ey = ey * 0.92 + mem.anchorY * 0.08;
    }
    px[t] = ex; py[t] = ey;
  }
  return { px, py };
}

function precomputeShells(shells, me, arena, walls) {
  const out = [];
  for (let i = 0; i < shells.length; i++) {
    const s = shells[i];
    const tx = new Float32Array(95);
    const ty = new Float32Array(95);
    const hurt = new Uint8Array(95);
    tx[0] = s.x; ty[0] = s.y; hurt[0] = s.mine ? (s.bouncesLeft < 2 ? 1 : 0) : 1;
    let cx = s.x, cy = s.y, cvx = s.vx, cvy = s.vy, cb = s.bouncesLeft;
    let len = 1, threat = false;
    for (let t = 1; t < 95; t++) {
      stepShellFast(cx, cy, cvx, cvy, cb, arena, walls);
      cx = SX; cy = SY; cvx = SVX; cvy = SVY; cb = SB;
      const canHurt = (!s.mine || cb < 2) ? 1 : 0;
      tx[t] = cx; ty[t] = cy; hurt[t] = canHurt;
      len = t + 1;
      if (canHurt && t <= 48 && distSq(cx, cy, me.x, me.y) < 2200) threat = true;
      if (SDEAD) break;
    }
    out.push({ mine: s.mine, tx, ty, hurt, len, threat });
  }
  return out;
}

function evalShot(ang, me, ePred, myX, myY, myLen, simShells, arena, walls, maxT) {
  const rad = ang * DEG2RAD;
  const ca = Math.cos(rad), sa = Math.sin(rad);
  let sx = me.x + ca * TURRET_TIP;
  let sy = me.y + sa * TURRET_TIP;
  if (isTipBlocked(me.x, me.y, sx, sy, arena, walls)) return null;

  if (distSq(sx, sy, ePred.px[0], ePred.py[0]) <= 361) {
    return { hit: true, tick: 0, bounces: 0, margin: TANK_R, intercept: false };
  }

  let vx = ca * SHELL_SPEED, vy = sa * SHELL_SPEED, bLeft = 2;
  let intercepts = false, intTick = 999;

  for (let t = 1; t <= maxT; t++) {
    const px = sx, py = sy;
    stepShellFast(sx, sy, vx, vy, bLeft, arena, walls);
    sx = SX; sy = SY; vx = SVX; vy = SVY; bLeft = SB;
    const used = 2 - (bLeft > 0 ? bLeft : 0);

    if (used >= 1) {
      const mi = t < myLen ? t : myLen - 1;
      if (distSegPointSq(px, py, sx, sy, myX[mi], myY[mi]) < 676) return null;
      if (distSq(sx, sy, me.x, me.y) < 729) return null;
    }

    if (!intercepts && t <= 32) {
      for (let i = 0; i < simShells.length; i++) {
        const sh = simShells[i];
        if (!sh.mine && sh.threat && t < sh.len) {
          if (distSegPointSq(px, py, sx, sy, sh.tx[t], sh.ty[t]) < 16) {
            intercepts = true; intTick = t;
          }
        }
      }
    }

    const ei = t < ePred.px.length ? t : ePred.px.length - 1;
    const shrink = Math.min(10.5, t * 0.11 + used * 2.4);
    const effR = Math.max(6.0, TANK_R - shrink);
    const d2 = distSegPointSq(px, py, sx, sy, ePred.px[ei], ePred.py[ei]);
    if (d2 <= effR * effR) {
      return { hit: true, tick: t, bounces: used, margin: effR - Math.sqrt(d2), intercept: intercepts };
    }
    if (SDEAD) break;
  }
  if (intercepts) return { hit: false, tick: intTick, bounces: 0, margin: 0, intercept: true };
  return null;
}

function brain(state, memory) {
  const { tick, arena, walls, me, enemy, shells } = state;

  if (!memory.init) {
    memory.init = true;
    memory.nav = buildNavGrid(arena, walls);
    memory.pex = enemy.x;
    memory.pey = enemy.y;
    memory.peh = enemy.heading;
    memory.evx = 0;
    memory.evy = 0;
    memory.eturn = 0;
    memory.anchorX = enemy.x;
    memory.anchorY = enemy.y;
    memory.jitter = 0;
    memory.strafeDir = me.x < arena.w * 0.5 ? 1 : -1;
    memory.strafeTicks = 0;
    memory.lastMove = 1;
    memory.lastTurn = 0;
  }

  if (tick > 0) {
    const rvx = enemy.x - memory.pex;
    const rvy = enemy.y - memory.pey;
    const rturn = angleDiff(enemy.heading, memory.peh);
    const prevDot = rvx * memory.evx + rvy * memory.evy;
    if (prevDot < -0.5) memory.jitter = Math.min(1, memory.jitter + 0.35);
    else memory.jitter *= 0.95;

    memory.evx = memory.evx * 0.62 + rvx * 0.38;
    memory.evy = memory.evy * 0.62 + rvy * 0.38;
    memory.eturn = memory.eturn * 0.6 + rturn * 0.4;
    memory.anchorX = memory.anchorX * 0.88 + enemy.x * 0.12;
    memory.anchorY = memory.anchorY * 0.88 + enemy.y * 0.12;
    memory.pex = enemy.x;
    memory.pey = enemy.y;
    memory.peh = enemy.heading;
  }

  const simShells = precomputeShells(shells, me, arena, walls);
  const distE = Math.hypot(enemy.x - me.x, enemy.y - me.y);
  const los = hasDirectLOS(me.x, me.y, enemy.x, enemy.y, walls);

  // Anticipatory ghost shell when enemy can shoot soon
  let gTx = null, gTy = null, gStart = 0, gLen = 0;
  if (enemy.cooldown <= 9 && los) {
    const angToMe = normAngle(Math.atan2(me.y - enemy.y, me.x - enemy.x) * RAD2DEG);
    const aimDiff = Math.abs(angleDiff(angToMe, enemy.turret));
    if (aimDiff < 36) {
      const fAng = (aimDiff < 14 ? angToMe : enemy.turret) * DEG2RAD;
      let cx = enemy.x + Math.cos(fAng) * TURRET_TIP;
      let cy = enemy.y + Math.sin(fAng) * TURRET_TIP;
      if (!isTipBlocked(enemy.x, enemy.y, cx, cy, arena, walls)) {
        gTx = new Float32Array(65);
        gTy = new Float32Array(65);
        gStart = enemy.cooldown;
        for (let i = 0; i <= gStart; i++) { gTx[i] = cx; gTy[i] = cy; }
        let cvx = Math.cos(fAng) * SHELL_SPEED, cvy = Math.sin(fAng) * SHELL_SPEED, cb = 2;
        gLen = gStart + 1;
        for (let t = gStart + 1; t < 65; t++) {
          stepShellFast(cx, cy, cvx, cvy, cb, arena, walls);
          cx = SX; cy = SY; cvx = SVX; cvy = SVY; cb = SB;
          gTx[t] = cx; gTy[t] = cy; gLen = t + 1;
          if (SDEAD) break;
        }
      }
    }
  }

  // Tactical Goal
  memory.strafeTicks++;
  if (memory.strafeTicks > 52 || (enemy.cooldown === 39 && los)) {
    memory.strafeTicks = 0;
    memory.strafeDir = -memory.strafeDir;
  }

  const winning = me.health > enemy.health;
  const losing = me.health < enemy.health;
  let desiredDist = 290;
  if (winning && (tick > 900 || me.health === 1)) desiredDist = 430;
  else if (losing && tick > 900) desiredDist = 200;
  else if (me.cooldown > 20 && enemy.cooldown < 10) desiredDist = 350;

  let goalX = me.x, goalY = me.y;
  if (!los) {
    if (winning && tick > 1050) {
      const wp = getNavTarget(memory.nav, me.x, me.y, arena.w - enemy.x, arena.h - enemy.y);
      goalX = wp.x; goalY = wp.y;
    } else {
      const wp = getNavTarget(memory.nav, me.x, me.y, enemy.x, enemy.y);
      goalX = wp.x; goalY = wp.y;
    }
  } else {
    const ang = Math.atan2(me.y - enemy.y, me.x - enemy.x) + memory.strafeDir * 0.7;
    goalX = clamp(enemy.x + Math.cos(ang) * desiredDist, 55, arena.w - 55);
    goalY = clamp(enemy.y + Math.sin(ang) * desiredDist, 55, arena.h - 55);
  }

  // Movement Evaluation: [move, turn, turnCutoffTick]
  const cands = [
    [1, 0, 0], [1, -1, 10], [1, 1, 10], [1, -1, 28], [1, 1, 28],
    [-1, 0, 0], [-1, -1, 10], [-1, 1, 10], [-1, -1, 28], [-1, 1, 28],
    [0, -1, 15], [0, 1, 15], [0, 0, 0]
  ];

  const H = 36;
  let bestAct = cands[0], bestScore = -1e12;
  const bestX = new Float32Array(H + 1), bestY = new Float32Array(H + 1);
  const tmpX = new Float32Array(H + 1), tmpY = new Float32Array(H + 1);

  for (let a = 0; a < cands.length; a++) {
    const mv = cands[a][0], tr = cands[a][1], cut = cands[a][2];
    let mx = me.x, my = me.y, mh = me.heading;
    let hitT = 999, minClearSq = 1e9, gClearSq = 1e9, stuck = 0;
    tmpX[0] = mx; tmpY[0] = my;

    for (let t = 1; t <= H; t++) {
      if (t <= cut) mh = normAngle(mh + tr * TURN_SPEED);
      if (mv !== 0) {
        const r = mh * DEG2RAD;
        moveTankFast(mx, my, Math.cos(r) * MOVE_SPEED * mv, Math.sin(r) * MOVE_SPEED * mv, arena, walls, enemy.x, enemy.y);
        if (distSq(mx, my, MX, MY) < 1.0) stuck++;
        mx = MX; my = MY;
      }
      tmpX[t] = mx; tmpY[t] = my;

      for (let s = 0; s < simShells.length; s++) {
        const sh = simShells[s];
        if (t < sh.len && sh.hurt[t]) {
          const d2 = distSegPointSq(sh.tx[t - 1], sh.ty[t - 1], sh.tx[t], sh.ty[t], mx, my);
          if (d2 <= 420.25 && t < hitT) hitT = t; // (18 + 2.5)^2
          if (d2 < minClearSq) minClearSq = d2;
        }
      }
      if (gTx && t > gStart && t < gLen) {
        const gd2 = distSegPointSq(gTx[t - 1], gTy[t - 1], gTx[t], gTy[t], mx, my);
        if (gd2 < gClearSq) gClearSq = gd2;
      }
    }

    let sc = 0;
    if (hitT < 999) sc -= 1000000 - hitT * 10000;
    const minC = Math.sqrt(minClearSq);
    if (minC < 54) {
      const d = 54 - minC;
      sc -= d * d * 36;
    }
    if (gTx) {
      const gc = Math.sqrt(gClearSq);
      if (gc < 35) sc -= (35 - gc) * 145;
    }

    sc -= Math.hypot(mx - goalX, my - goalY) * 1.7;
    if (mx < 45) sc -= (45 - mx) * 3;
    else if (mx > arena.w - 45) sc -= (mx - (arena.w - 45)) * 3;
    if (my < 45) sc -= (45 - my) * 3;
    else if (my > arena.h - 45) sc -= (my - (arena.h - 45)) * 3;
    sc -= stuck * 12;

    if (los && enemy.cooldown < 16) {
      const angE = Math.atan2(enemy.y - my, enemy.x - mx);
      sc += Math.abs(Math.sin(mh * DEG2RAD - angE)) * 28;
      if (mv !== 0 && stuck < 3) sc += 20;
    }
    if (memory.lastMove === mv) sc += 6;
    if (memory.lastTurn === tr) sc += 3;

    if (sc > bestScore) {
      bestScore = sc;
      bestAct = cands[a];
      bestX.set(tmpX);
      bestY.set(tmpY);
    }
  }

  const chosenMove = bestAct[0], chosenTurn = bestAct[1];
  memory.lastMove = chosenMove;
  memory.lastTurn = chosenTurn;

  // Aiming & Ricochet Solver
  const maxSim = 112;
  const ePred = predictEnemy(enemy, memory, arena, walls, maxSim);
  const directAng = normAngle(Math.atan2(enemy.y - me.y, enemy.x - me.x) * RAD2DEG);
  const leadT = clamp(Math.round((distE - TURRET_TIP) / SHELL_SPEED), 1, 95);
  const leadAng = normAngle(Math.atan2(ePred.py[leadT] - me.y, ePred.px[leadT] - me.x) * RAD2DEG);

  const angles = [me.turret, directAng, leadAng];
  for (let o = -20; o <= 20; o += 2) {
    if (o !== 0) angles.push(normAngle(leadAng + o));
  }
  for (let s = 0; s < simShells.length; s++) {
    const sh = simShells[s];
    if (!sh.mine && sh.threat) {
      for (let t = 2; t < Math.min(20, sh.len); t += 3) {
        angles.push(normAngle(Math.atan2(sh.ty[t] - me.y, sh.tx[t] - me.x) * RAD2DEG));
      }
    }
  }
  for (let deg = 0; deg < 360; deg += 3) angles.push(deg);

  let bestShot = null, bestShotScore = -1e9, bestAng = leadAng;
  const inGraveDanger = bestScore < -500000;

  const scoreShot = (res, ang) => {
    const tTicks = Math.abs(angleDiff(ang, me.turret)) / TURRET_SPEED;
    if (res.hit) {
      return 1000 - res.tick * 5.5 - res.bounces * 80 + res.margin * 8 - tTicks * 4 + (res.intercept ? 250 : 0);
    }
    if (res.intercept && inGraveDanger) return 620 - res.tick * 8 - tTicks * 12;
    return -1e9;
  };

  for (let i = 0; i < angles.length; i++) {
    const ang = angles[i];
    const res = evalShot(ang, me, ePred, bestX, bestY, H + 1, simShells, arena, walls, maxSim);
    if (!res) continue;
    const sc = scoreShot(res, ang);
    if (sc > bestShotScore) { bestShotScore = sc; bestShot = res; bestAng = ang; }
  }

  if (bestShot) {
    const cAng = bestAng;
    for (let d = -3.0; d <= 3.0; d += 0.5) {
      if (d === 0) continue;
      const ang = normAngle(cAng + d);
      const res = evalShot(ang, me, ePred, bestX, bestY, H + 1, simShells, arena, walls, maxSim);
      if (!res) continue;
      const sc = scoreShot(res, ang);
      if (sc > bestShotScore) { bestShotScore = sc; bestShot = res; bestAng = ang; }
    }
  }

  let targetTurret = bestShot ? bestAng : (los ? leadAng : normAngle(Math.atan2(goalY - me.y, goalX - me.x) * RAD2DEG));
  const tDiff = angleDiff(targetTurret, me.turret);
  const turretCmd = clamp(tDiff / TURRET_SPEED, -1, 1);

  let shouldFire = false;
  if (me.cooldown === 0 && me.shellsOut < 2) {
    const nextTurret = normAngle(me.turret + turretCmd * TURRET_SPEED);
    const sNow = evalShot(me.turret, me, ePred, bestX, bestY, H + 1, simShells, arena, walls, maxSim);
    const sNext = evalShot(nextTurret, me, ePred, bestX, bestY, H + 1, simShells, arena, walls, maxSim);

    const isSafe = (ang) => {
      const r = ang * DEG2RAD;
      let sx = me.x + Math.cos(r) * TURRET_TIP, sy = me.y + Math.sin(r) * TURRET_TIP;
      if (isTipBlocked(me.x, me.y, sx, sy, arena, walls)) return false;
      let vx = Math.cos(r) * SHELL_SPEED, vy = Math.sin(r) * SHELL_SPEED, cb = 2;
      for (let t = 1; t <= 85; t++) {
        const px = sx, py = sy;
        stepShellFast(sx, sy, vx, vy, cb, arena, walls);
        sx = SX; sy = SY; vx = SVX; vy = SVY; cb = SB;
        if (cb < 2) {
          const mi = t <= H ? t : H;
          if (distSegPointSq(px, py, sx, sy, bestX[mi], bestY[mi]) < 625) return false;
        }
        if (SDEAD) break;
      }
      return true;
    };

    const cand = (sNext && sNext.hit) ? sNext : sNow;
    if (cand && isSafe(me.turret) && isSafe(nextTurret)) {
      if (cand.intercept && inGraveDanger) {
        shouldFire = true;
      } else if (cand.hit) {
        const err = Math.abs(tDiff);
        if (me.shellsOut === 0) {
          if (cand.bounces === 0 && cand.tick <= 88 && err <= 7.5) shouldFire = true;
          else if (cand.bounces === 1 && cand.tick <= 85 && cand.margin >= 2.0 && err <= 4.5) shouldFire = true;
          else if (cand.bounces === 2 && cand.tick <= 78 && cand.margin >= 3.5 && err <= 3.0) shouldFire = true;
        } else {
          if (cand.bounces === 0 && cand.tick <= 55 && cand.margin >= 2.5 && err <= 5.5) shouldFire = true;
          else if (cand.bounces === 1 && cand.tick <= 50 && cand.margin >= 5.0 && err <= 3.0) shouldFire = true;
          else if (distE < 165 && cand.bounces === 0 && err <= 9.0) shouldFire = true;
        }
      }
    }
  }

  return { move: chosenMove, turn: chosenTurn, turret: turretCmd, fire: shouldFire };
}