const TANK_R = 18;
const SHELL_SPEED = 9;
const TURRET_TIP = 25;
const MAX_TICKS = 150;
const MOVE_SPEED = 3;
const TURN_SPEED = 4;
const TURRET_SPEED = 6;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function normAngle(a) {
  a = a % 360;
  return a < 0 ? a + 360 : a;
}

function angleDiff(target, current) {
  let d = (target - current) % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

function clamp(v, min, max) {
  return v < min ? min : (v > max ? max : v);
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
  const bx = x1 + b * vx, by = y1 + b * vy;
  const dx = px - bx, dy = py - by;
  return dx * dx + dy * dy;
}

function isTankBlocked(x, y, arena, walls, otherX, otherY) {
  if (x - TANK_R < 0 || x + TANK_R > arena.w || y - TANK_R < 0 || y + TANK_R > arena.h) return true;
  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    const cx = clamp(x, w.x, w.x + w.w);
    const cy = clamp(y, w.y, w.y + w.h);
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy < TANK_R * TANK_R) return true;
  }
  if (otherX !== undefined) {
    const dx = x - otherX, dy = y - otherY;
    if (dx * dx + dy * dy < (2 * TANK_R) * (2 * TANK_R)) return true;
  }
  return false;
}

function moveTankStep(x, y, vx, vy, arena, walls, otherX, otherY) {
  let nx = x + vx;
  let ny = y + vy;
  if (!isTankBlocked(nx, ny, arena, walls, otherX, otherY)) {
    return { x: nx, y: ny };
  }
  let lo = 0, hi = 1;
  for (let k = 0; k < 5; k++) {
    const mid = (lo + hi) * 0.5;
    if (!isTankBlocked(x + vx * mid, y + vy * mid, arena, walls, otherX, otherY)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return { x: x + vx * lo, y: y + vy * lo };
}

function advanceShellStep(sx, sy, vx, vy, bouncesLeft, arena, walls) {
  let rem = 1.0;
  let curX = sx, curY = sy, curVx = vx, curVy = vy, bLeft = bouncesLeft;

  for (let iter = 0; iter < 4 && rem > 1e-5; iter++) {
    let minT = rem;
    let hitAxis = 0; // 1 for X, 2 for Y

    // Arena outer bounds
    if (curVx < 0) {
      const t = (0 - curX) / curVx;
      if (t >= -1e-7 && t < minT) { minT = Math.max(0, t); hitAxis = 1; }
    } else if (curVx > 0) {
      const t = (arena.w - curX) / curVx;
      if (t >= -1e-7 && t < minT) { minT = Math.max(0, t); hitAxis = 1; }
    }
    if (curVy < 0) {
      const t = (0 - curY) / curVy;
      if (t >= -1e-7 && t < minT) { minT = Math.max(0, t); hitAxis = 2; }
    } else if (curVy > 0) {
      const t = (arena.h - curY) / curVy;
      if (t >= -1e-7 && t < minT) { minT = Math.max(0, t); hitAxis = 2; }
    }

    // Inner rectangular walls
    for (let i = 0; i < walls.length; i++) {
      const w = walls[i];
      if (curVx > 0 && curX <= w.x + 1e-7) {
        const t = (w.x - curX) / curVx;
        if (t >= -1e-7 && t < minT) {
          const yAt = curY + curVy * t;
          if (yAt >= w.y - 1e-5 && yAt <= w.y + w.h + 1e-5) { minT = Math.max(0, t); hitAxis = 1; }
        }
      } else if (curVx < 0 && curX >= w.x + w.w - 1e-7) {
        const t = (w.x + w.w - curX) / curVx;
        if (t >= -1e-7 && t < minT) {
          const yAt = curY + curVy * t;
          if (yAt >= w.y - 1e-5 && yAt <= w.y + w.h + 1e-5) { minT = Math.max(0, t); hitAxis = 1; }
        }
      }
      if (curVy > 0 && curY <= w.y + 1e-7) {
        const t = (w.y - curY) / curVy;
        if (t >= -1e-7 && t < minT) {
          const xAt = curX + curVx * t;
          if (xAt >= w.x - 1e-5 && xAt <= w.x + w.w + 1e-5) { minT = Math.max(0, t); hitAxis = 2; }
        }
      } else if (curVy < 0 && curY >= w.y + w.h - 1e-7) {
        const t = (w.y + w.h - curY) / curVy;
        if (t >= -1e-7 && t < minT) {
          const xAt = curX + curVx * t;
          if (xAt >= w.x - 1e-5 && xAt <= w.x + w.w + 1e-5) { minT = Math.max(0, t); hitAxis = 2; }
        }
      }
    }

    curX += curVx * minT;
    curY += curVy * minT;
    rem -= minT;

    if (hitAxis !== 0) {
      if (bLeft <= 0) {
        return { x: curX, y: curY, vx: curVx, vy: curVy, bouncesLeft: -1, dead: true };
      }
      bLeft--;
      if (hitAxis === 1) {
        curVx = -curVx;
        curX += curVx > 0 ? 1e-4 : -1e-4;
      } else {
        curVy = -curVy;
        curY += curVy > 0 ? 1e-4 : -1e-4;
      }
    } else {
      break;
    }
  }
  return { x: curX, y: curY, vx: curVx, vy: curVy, bouncesLeft: bLeft, dead: false };
}

function isPointInsideWall(x, y, arena, walls) {
  if (x <= 0 || x >= arena.w || y <= 0 || y >= arena.h) return true;
  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    if (x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h) return true;
  }
  return false;
}

function hasDirectLOS(x1, y1, x2, y2, walls) {
  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    let t0 = 0, t1 = 1;
    const dx = x2 - x1, dy = y2 - y1;
    const p = [-dx, dx, -dy, dy];
    const q = [x1 - w.x, w.x + w.w - x1, y1 - w.y, w.y + w.h - y1];
    let hit = true;
    for (let k = 0; k < 4; k++) {
      if (Math.abs(p[k]) < 1e-8) {
        if (q[k] < 0) { hit = false; break; }
      } else {
        const t = q[k] / p[k];
        if (p[k] < 0) {
          if (t > t1) { hit = false; break; }
          if (t > t0) t0 = t;
        } else {
          if (t < t0) { hit = false; break; }
          if (t < t1) t1 = t;
        }
      }
    }
    if (hit && t0 <= t1) return false;
  }
  return true;
}

function buildNavGrid(arena, walls) {
  const step = 30;
  const cols = Math.floor(arena.w / step);
  const rows = Math.floor(arena.h / step);
  const passable = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    const y = (r + 0.5) * step;
    for (let c = 0; c < cols; c++) {
      const x = (c + 0.5) * step;
      if (!isTankBlocked(x, y, arena, walls)) {
        passable[r * cols + c] = 1;
      }
    }
  }
  return { step, cols, rows, passable };
}

function getNextNavDirection(nav, startX, startY, goalX, goalY) {
  const { step, cols, rows, passable } = nav;
  const sc = clamp(Math.floor(startX / step), 0, cols - 1);
  const sr = clamp(Math.floor(startY / step), 0, rows - 1);
  let gc = clamp(Math.floor(goalX / step), 0, cols - 1);
  let gr = clamp(Math.floor(goalY / step), 0, rows - 1);

  if (!passable[gr * cols + gc]) {
    let bestD = 1e9, bc = gc, br = gr;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (passable[r * cols + c]) {
          const d = (c - gc) * (c - gc) + (r - gr) * (r - gr);
          if (d < bestD) { bestD = d; bc = c; br = r; }
        }
      }
    }
    gc = bc; gr = br;
  }

  const dist = new Int16Array(cols * rows);
  dist.fill(-1);
  const queue = new Int16Array(cols * rows);
  let qHead = 0, qTail = 0;

  const gIdx = gr * cols + gc;
  dist[gIdx] = 0;
  queue[qTail++] = gIdx;

  const dirs = [-1, 0, 1, 0, 0, -1, 0, 1, -1, -1, 1, -1, -1, 1, 1, 1];
  while (qHead < qTail) {
    const cur = queue[qHead++];
    if (cur === sr * cols + sc) break;
    const cr = Math.floor(cur / cols);
    const cc = cur % cols;
    const cd = dist[cur];

    for (let d = 0; d < 16; d += 2) {
      const nc = cc + dirs[d];
      const nr = cr + dirs[d + 1];
      if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
        const nIdx = nr * cols + nc;
        if (passable[nIdx] && dist[nIdx] === -1) {
          if (d >= 8) {
            if (!passable[cr * cols + nc] || !passable[nr * cols + cc]) continue;
          }
          dist[nIdx] = cd + 1;
          queue[qTail++] = nIdx;
        }
      }
    }
  }

  let bestIdx = sr * cols + sc;
  let bestVal = dist[bestIdx] === -1 ? 1e9 : dist[bestIdx];
  for (let d = 0; d < 16; d += 2) {
    const nc = sc + dirs[d];
    const nr = sr + dirs[d + 1];
    if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
      const nIdx = nr * cols + nc;
      if (dist[nIdx] !== -1 && dist[nIdx] < bestVal) {
        bestVal = dist[nIdx];
        bestIdx = nIdx;
      }
    }
  }

  const tr = Math.floor(bestIdx / cols);
  const tc = bestIdx % cols;
  return { x: (tc + 0.5) * step, y: (tr + 0.5) * step };
}

function predictEnemyPositions(enemy, memory, arena, walls, maxTicks) {
  const preds = new Array(maxTicks + 1);
  let ex = enemy.x, ey = enemy.y;
  let eHead = enemy.heading;
  const vxRaw = memory.enemyVx || 0;
  const vyRaw = memory.enemyVy || 0;
  const speed = Math.min(MOVE_SPEED, Math.hypot(vxRaw, vyRaw));
  const turnRate = clamp(memory.enemyTurnRate || 0, -TURN_SPEED, TURN_SPEED);

  const headRad = eHead * DEG2RAD;
  const forwardDot = vxRaw * Math.cos(headRad) + vyRaw * Math.sin(headRad);
  const moveSign = Math.abs(speed) < 0.2 ? 0 : (forwardDot >= 0 ? 1 : -1);

  // Blend linear velocity and turn-model velocity, decaying over time
  preds[0] = { x: ex, y: ey };
  let curSpeed = speed;
  let curTurn = turnRate * 0.7;

  for (let t = 1; t <= maxTicks; t++) {
    if (t > 25) {
      curSpeed *= 0.96;
      curTurn *= 0.92;
    }
    eHead = normAngle(eHead + curTurn);
    const rad = eHead * DEG2RAD;
    const stepVx = Math.cos(rad) * curSpeed * moveSign;
    const stepVy = Math.sin(rad) * curSpeed * moveSign;
    const nextPos = moveTankStep(ex, ey, stepVx, stepVy, arena, walls);
    if (distSq(ex, ey, nextPos.x, nextPos.y) < 0.05) {
      curSpeed *= 0.5;
    }
    ex = nextPos.x;
    ey = nextPos.y;
    preds[t] = { x: ex, y: ey };
  }
  return preds;
}

function simulateCandidateShot(angleDeg, me, enemyPreds, myFuturePos, shells, arena, walls, maxSimTicks) {
  const rad = angleDeg * DEG2RAD;
  const cosA = Math.cos(rad), sinA = Math.sin(rad);
  let sx = me.x + cosA * TURRET_TIP;
  let sy = me.y + sinA * TURRET_TIP;

  if (isPointInsideWall(sx, sy, arena, walls)) {
    return null;
  }

  // Immediate hit check at spawn
  if (distSq(sx, sy, enemyPreds[0].x, enemyPreds[0].y) <= (TANK_R + 1) * (TANK_R + 1)) {
    return { hitEnemy: true, tick: 0, bounces: 0, hitMargin: TANK_R, intercept: false };
  }

  let vx = cosA * SHELL_SPEED;
  let vy = sinA * SHELL_SPEED;
  let bLeft = 2;

  // Check shell interception capability against dangerous incoming enemy shells
  let interceptsThreat = false;
  let interceptTick = 999;

  for (let t = 1; t <= maxSimTicks; t++) {
    const prevX = sx, prevY = sy;
    const step = advanceShellStep(sx, sy, vx, vy, bLeft, arena, walls);
    sx = step.x; sy = step.y; vx = step.vx; vy = step.vy; bLeft = step.bouncesLeft;

    const bouncesUsed = 2 - Math.max(0, bLeft);

    // Self-hit check after bounce!
    if (bouncesUsed >= 1) {
      const mPos = myFuturePos[Math.min(t, myFuturePos.length - 1)];
      const selfSafeR = TANK_R + 8;
      if (distSegPointSq(prevX, prevY, sx, sy, mPos.x, mPos.y) < selfSafeR * selfSafeR) {
        return null; // Dangerous to ourselves!
      }
      if (distSq(sx, sy, me.x, me.y) < (TANK_R + 10) * (TANK_R + 10)) {
        return null;
      }
    }

    // Check interception with incoming enemy shell trajectories
    if (!interceptsThreat && shells.length > 0 && t <= 35) {
      for (let s = 0; s < shells.length; s++) {
        const sh = shells[s];
        if (!sh.mine && sh.threatensMe && t < sh.traj.length) {
          const sp = sh.traj[t];
          if (distSegPointSq(prevX, prevY, sx, sy, sp.x, sp.y) < 16) {
            interceptsThreat = true;
            interceptTick = t;
          }
        }
      }
    }

    // Enemy hit check
    const ePos = enemyPreds[Math.min(t, enemyPreds.length - 1)];
    // Shrink effective target radius slightly over time & bounces to ensure accuracy
    const shrink = Math.min(10, t * 0.11 + bouncesUsed * 2.5);
    const effR = Math.max(6, TANK_R - shrink);
    const d2 = distSegPointSq(prevX, prevY, sx, sy, ePos.x, ePos.y);
    if (d2 <= effR * effR) {
      return {
        hitEnemy: true,
        tick: t,
        bounces: bouncesUsed,
        hitMargin: effR - Math.sqrt(d2),
        intercept: interceptsThreat
      };
    }

    if (step.dead) break;
  }

  if (interceptsThreat) {
    return { hitEnemy: false, tick: interceptTick, bounces: 0, hitMargin: 0, intercept: true };
  }
  return null;
}

function precomputeShellTrajectories(shells, me, arena, walls) {
  const list = [];
  for (let i = 0; i < shells.length; i++) {
    const s = shells[i];
    const traj = [{ x: s.x, y: s.y, bouncesLeft: s.bouncesLeft }];
    let cx = s.x, cy = s.y, cvx = s.vx, cvy = s.vy, cb = s.bouncesLeft;
    let threatensMe = false;

    for (let t = 1; t <= 90; t++) {
      const step = advanceShellStep(cx, cy, cvx, cvy, cb, arena, walls);
      cx = step.x; cy = step.y; cvx = step.vx; cvy = step.vy; cb = step.bouncesLeft;
      const canHurtMe = !s.mine || cb < 2;
      traj.push({ x: cx, y: cy, canHurtMe });
      if (canHurtMe && t <= 45) {
        if (distSq(cx, cy, me.x, me.y) < (TANK_R + 28) * (TANK_R + 28)) {
          threatensMe = true;
        }
      }
      if (step.dead) break;
    }
    list.push({
      mine: s.mine,
      x: s.x,
      y: s.y,
      vx: s.vx,
      vy: s.vy,
      bouncesLeft: s.bouncesLeft,
      traj,
      threatensMe
    });
  }
  return list;
}

function brain(state, memory) {
  const { tick, arena, walls, me, enemy, shells } = state;

  // 1. Initialize per-round memory & navigation map
  if (!memory.initialized) {
    memory.initialized = true;
    memory.nav = buildNavGrid(arena, walls);
    memory.prevEnemyX = enemy.x;
    memory.prevEnemyY = enemy.y;
    memory.prevEnemyHeading = enemy.heading;
    memory.enemyVx = 0;
    memory.enemyVy = 0;
    memory.enemyTurnRate = 0;
    memory.strafeDir = (me.x + me.y) % 2 === 0 ? 1 : -1;
    memory.strafeTimer = 0;
  }

  // 2. Track & smooth enemy kinematics
  if (tick > 0) {
    const rawVx = enemy.x - memory.prevEnemyX;
    const rawVy = enemy.y - memory.prevEnemyY;
    const rawTurn = angleDiff(enemy.heading, memory.prevEnemyHeading);
    memory.enemyVx = memory.enemyVx * 0.65 + rawVx * 0.35;
    memory.enemyVy = memory.enemyVy * 0.65 + rawVy * 0.35;
    memory.enemyTurnRate = memory.enemyTurnRate * 0.6 + rawTurn * 0.4;
    memory.prevEnemyX = enemy.x;
    memory.prevEnemyY = enemy.y;
    memory.prevEnemyHeading = enemy.heading;
  }

  // 3. Precompute active shell paths (including virtual shell if enemy is about to shoot!)
  const simShells = precomputeShellTrajectories(shells, me, arena, walls);

  const distToEnemy = Math.hypot(enemy.x - me.x, enemy.y - me.y);
  const directLOS = hasDirectLOS(me.x, me.y, enemy.x, enemy.y, walls);

  // Add virtual ghost shell if enemy can shoot soon and aims near us
  let ghostShell = null;
  if (enemy.cooldown <= 8 && directLOS) {
    const angleEnemyToMe = normAngle(Math.atan2(me.y - enemy.y, me.x - enemy.x) * RAD2DEG);
    const enemyAimDiff = Math.abs(angleDiff(angleEnemyToMe, enemy.turret));
    if (enemyAimDiff < 35) {
      const fireAngle = enemyAimDiff < 12 ? angleEnemyToMe : enemy.turret;
      const fRad = fireAngle * DEG2RAD;
      const gsx = enemy.x + Math.cos(fRad) * TURRET_TIP;
      const gsy = enemy.y + Math.sin(fRad) * TURRET_TIP;
      if (!isPointInsideWall(gsx, gsy, arena, walls)) {
        const traj = [];
        const delay = enemy.cooldown;
        for (let d = 0; d <= delay; d++) traj.push({ x: gsx, y: gsy, canHurtMe: false });
        let cx = gsx, cy = gsy, cvx = Math.cos(fRad) * SHELL_SPEED, cvy = Math.sin(fRad) * SHELL_SPEED, cb = 2;
        for (let t = delay + 1; t <= 65; t++) {
          const step = advanceShellStep(cx, cy, cvx, cvy, cb, arena, walls);
          cx = step.x; cy = step.y; cvx = step.vx; cvy = step.vy; cb = step.bouncesLeft;
          traj.push({ x: cx, y: cy, canHurtMe: true });
          if (step.dead) break;
        }
        ghostShell = { traj };
      }
    }
  }

  // 4. Tactical Positioning Goal
  memory.strafeTimer++;
  if (memory.strafeTimer > 55) {
    memory.strafeTimer = 0;
    memory.strafeDir = -memory.strafeDir;
  }

  const winning = me.health > enemy.health;
  const losing = me.health < enemy.health;
  const lateGame = tick > 950;

  let desiredDist = 300;
  if (winning && (lateGame || me.health === 1)) desiredDist = 440;
  else if (losing && lateGame) desiredDist = 210;
  else if (me.cooldown > 20 && enemy.cooldown < 10) desiredDist = 360;

  let goalX = me.x, goalY = me.y;
  if (!directLOS) {
    if (winning && tick > 1050) {
      // Force enemy to come around corners into our ambush while keeping distance
      goalX = clamp(arena.w - enemy.x, 80, arena.w - 80);
      goalY = clamp(arena.h - enemy.y, 80, arena.h - 80);
    } else {
      // Navigate toward enemy to gain line of sight
      const wp = getNextNavDirection(memory.nav, me.x, me.y, enemy.x, enemy.y);
      goalX = wp.x;
      goalY = wp.y;
    }
  } else {
    // Strafe perpendicular to enemy at desired engagement range
    const angFromEnemy = Math.atan2(me.y - enemy.y, me.x - enemy.x);
    const orbitAng = angFromEnemy + memory.strafeDir * 0.65;
    goalX = clamp(enemy.x + Math.cos(orbitAng) * desiredDist, 60, arena.w - 60);
    goalY = clamp(enemy.y + Math.sin(orbitAng) * desiredDist, 60, arena.h - 60);
  }

  // 5. Evaluate Movement Candidates (Dodge + Tactical Positioning)
  // Actions: [move, turn]
  const moveActions = [
    [1, 0], [1, -1], [1, 1],
    [-1, 0], [-1, -1], [-1, 1],
    [0, -1], [0, 1], [0, 0]
  ];

  const horizon = 34;
  let bestAction = moveActions[0];
  let bestScore = -1e12;
  let bestFuturePath = null;

  for (let a = 0; a < moveActions.length; a++) {
    const mv = moveActions[a][0];
    const tr = moveActions[a][1];

    let mx = me.x, my = me.y, mHead = me.heading;
    let score = 0;
    let hitTick = 999;
    let minShellClearanceSq = 1e9;
    let ghostClearanceSq = 1e9;
    let wallStuckTicks = 0;

    const path = new Array(horizon + 1);
    path[0] = { x: mx, y: my };

    for (let t = 1; t <= horizon; t++) {
      // Smoothly straighten out after initial turn impulse (ticks 1..12 turn, 13..horizon straight)
      const effTurn = t <= 12 ? tr * TURN_SPEED : 0;
      mHead = normAngle(mHead + effTurn);
      if (mv !== 0) {
        const rad = mHead * DEG2RAD;
        const vx = Math.cos(rad) * MOVE_SPEED * mv;
        const vy = Math.sin(rad) * MOVE_SPEED * mv;
        const nextP = moveTankStep(mx, my, vx, vy, arena, walls, enemy.x, enemy.y);
        if (distSq(mx, my, nextP.x, nextP.y) < 1.0) {
          wallStuckTicks++;
        }
        mx = nextP.x;
        my = nextP.y;
      }
      path[t] = { x: mx, y: my };

      // Check active shells collision & clearance
      for (let s = 0; s < simShells.length; s++) {
        const sh = simShells[s];
        if (t < sh.traj.length) {
          const pt = sh.traj[t];
          if (pt.canHurtMe) {
            const prevPt = sh.traj[t - 1];
            const dSq = distSegPointSq(prevPt.x, prevPt.y, pt.x, pt.y, mx, my);
            const hitR = TANK_R + 2.5; // safety buffer
            if (dSq <= hitR * hitR) {
              if (t < hitTick) hitTick = t;
            }
            if (dSq < minShellClearanceSq) {
              minShellClearanceSq = dSq;
            }
          }
        }
      }

      // Check ghost shell clearance (anticipatory dodging)
      if (ghostShell && t < ghostShell.traj.length) {
        const gpt = ghostShell.traj[t];
        if (gpt.canHurtMe) {
          const gPrev = ghostShell.traj[t - 1];
          const gdSq = distSegPointSq(gPrev.x, gPrev.y, gpt.x, gpt.y, mx, my);
          if (gdSq < ghostClearanceSq) ghostClearanceSq = gdSq;
        }
      }
    }

    // Scoring safety first!
    if (hitTick < 999) {
      // Massive penalty for getting hit; prefer surviving longer if all paths get hit
      score -= 1000000 - hitTick * 10000;
    }

    const minClear = Math.sqrt(minShellClearanceSq);
    if (minClear < TANK_R + 36) {
      const danger = (TANK_R + 36 - minClear);
      score -= danger * danger * 35;
    }

    if (ghostShell) {
      const gClear = Math.sqrt(ghostClearanceSq);
      if (gClear < TANK_R + 16) {
        score -= (TANK_R + 16 - gClear) * 140;
      }
    }

    // Tactical goal scoring
    const finalDistToGoal = Math.hypot(mx - goalX, my - goalY);
    score -= finalDistToGoal * 1.6;

    // Maintain healthy distance from walls & corners so we aren't pinned
    const edgeMargin = 45;
    if (mx < edgeMargin) score -= (edgeMargin - mx) * 3;
    if (mx > arena.w - edgeMargin) score -= (mx - (arena.w - edgeMargin)) * 3;
    if (my < edgeMargin) score -= (edgeMargin - my) * 3;
    if (my > arena.h - edgeMargin) score -= (my - (arena.h - edgeMargin)) * 3;

    // Penalize grinding against walls
    score -= wallStuckTicks * 12;

    // Keep moving perpendicular to enemy line of fire when enemy is ready
    if (directLOS && enemy.cooldown < 15) {
      const angToEnemyRad = Math.atan2(enemy.y - my, enemy.x - mx);
      const bodyRad = mHead * DEG2RAD;
      const perpness = Math.abs(Math.sin(bodyRad - angToEnemyRad));
      score += perpness * 28;
      if (mv !== 0 && wallStuckTicks < 3) score += 22;
    }

    // Slight hysteresis bonus for continuing smooth movement
    if (memory.lastMove === mv) score += 6;
    if (memory.lastTurn === tr) score += 3;

    if (score > bestScore) {
      bestScore = score;
      bestAction = moveActions[a];
      bestFuturePath = path;
    }
  }

  const chosenMove = bestAction[0];
  const chosenTurn = bestAction[1];
  memory.lastMove = chosenMove;
  memory.lastTurn = chosenTurn;

  // Compute exact tank state after THIS tick's movement (in case firing occurs post-move or pre-move)
  const myPredPath = bestFuturePath;

  // 6. Offensive Aiming, Ricochet Solver, & Shell Interception
  const enemyPreds = predictEnemyPositions(enemy, memory, arena, walls, 115);

  // Candidate angles to evaluate
  const candAngles = [];

  // A. Direct & Lead angles around enemy
  const baseDirectAngle = normAngle(Math.atan2(enemy.y - me.y, enemy.x - me.x) * RAD2DEG);
  const estFlightTicks = clamp(Math.round((distToEnemy - TURRET_TIP) / SHELL_SPEED), 1, 90);
  const leadPos = enemyPreds[estFlightTicks];
  const baseLeadAngle = normAngle(Math.atan2(leadPos.y - me.y, leadPos.x - me.x) * RAD2DEG);

  candAngles.push(me.turret);
  candAngles.push(baseDirectAngle);
  candAngles.push(baseLeadAngle);

  for (let offset = -18; offset <= 18; offset += 2) {
    if (offset !== 0) {
      candAngles.push(normAngle(baseLeadAngle + offset));
    }
  }

  // B. Intercept incoming lethal shells if we're in grave danger
  for (let s = 0; s < simShells.length; s++) {
    const sh = simShells[s];
    if (!sh.mine && sh.threatensMe && sh.traj.length > 3) {
      for (let t = 2; t < Math.min(20, sh.traj.length); t += 3) {
        const sp = sh.traj[t];
        candAngles.push(normAngle(Math.atan2(sp.y - me.y, sp.x - me.x) * RAD2DEG));
      }
    }
  }

  // C. 360-degree scan for bank / ricochet shots (coarse 4-deg sweep + fine refinement)
  for (let deg = 0; deg < 360; deg += 4) {
    candAngles.push(deg);
  }

  let bestShot = null;
  let bestShotScore = -1e9;
  let bestShotAngle = baseLeadAngle;

  const maxSimTicks = 110;

  for (let i = 0; i < candAngles.length; i++) {
    const ang = candAngles[i];
    const res = simulateCandidateShot(ang, me, enemyPreds, myPredPath, simShells, arena, walls, maxSimTicks);
    if (!res) continue;

    let sScore = 0;
    const turretTurnTicks = Math.abs(angleDiff(ang, me.turret)) / TURRET_SPEED;

    if (res.hitEnemy) {
      // Prefer fast, low-bounce, center-of-mass hits that require minimal turret rotation
      sScore = 1000 - res.tick * 5.5 - res.bounces * 85 + res.hitMargin * 8 - turretTurnTicks * 4;
      if (res.intercept) sScore += 250;
    } else if (res.intercept && bestScore < -500000) {
      // Only prioritize pure defensive shell interception if our dodge simulation says we're getting hit!
      sScore = 600 - res.tick * 8 - turretTurnTicks * 12;
    } else {
      continue;
    }

    if (sScore > bestShotScore) {
      bestShotScore = sScore;
      bestShot = res;
      bestShotAngle = ang;
    }
  }

  // Fine-tune around the best found angle (+/- 3.5 degrees in 0.5 deg increments)
  if (bestShot) {
    const centerAng = bestShotAngle;
    for (let delta = -3.5; delta <= 3.5; delta += 0.5) {
      if (delta === 0) continue;
      const ang = normAngle(centerAng + delta);
      const res = simulateCandidateShot(ang, me, enemyPreds, myPredPath, simShells, arena, walls, maxSimTicks);
      if (!res) continue;

      let sScore = 0;
      const turretTurnTicks = Math.abs(angleDiff(ang, me.turret)) / TURRET_SPEED;
      if (res.hitEnemy) {
        sScore = 1000 - res.tick * 5.5 - res.bounces * 85 + res.hitMargin * 8 - turretTurnTicks * 4;
        if (res.intercept) sScore += 250;
      } else if (res.intercept && bestScore < -500000) {
        sScore = 600 - res.tick * 8 - turretTurnTicks * 12;
      } else {
        continue;
      }

      if (sScore > bestShotScore) {
        bestShotScore = sScore;
        bestShot = res;
        bestShotAngle = ang;
      }
    }
  }

  // Determine target turret angle
  let targetTurretAngle = bestShot ? bestShotAngle : baseLeadAngle;

  // Account for our own body turning if turret is independent?
  // Note: In the rules: "Turret: turns separately from the body, at up to 6 degrees per tick."
  const tDiff = angleDiff(targetTurretAngle, me.turret);
  const turretCmd = clamp(tDiff / TURRET_SPEED, -1, 1);

  // 7. Fire Decision Logic
  let shouldFire = false;
  if (me.cooldown === 0 && me.shellsOut < 2) {
    // Evaluate exact shot from the turret angle we will have (both current me.turret and post-turn turret)
    const nextTurretAngle = normAngle(me.turret + turretCmd * TURRET_SPEED);

    const shotNow = simulateCandidateShot(me.turret, me, enemyPreds, myPredPath, simShells, arena, walls, maxSimTicks);
    const shotNext = simulateCandidateShot(nextTurretAngle, me, enemyPreds, myPredPath, simShells, arena, walls, maxSimTicks);

    // Ensure neither current nor next-tick angle causes self-harm
    if (shotNow || shotNext) {
      // Verify the other one isn't a lethal self-hit
      const checkOtherSafe = (ang) => {
        const rad = ang * DEG2RAD;
        let sx = me.x + Math.cos(rad) * TURRET_TIP;
        let sy = me.y + Math.sin(rad) * TURRET_TIP;
        if (isPointInsideWall(sx, sy, arena, walls)) return false;
        let vx = Math.cos(rad) * SHELL_SPEED;
        let vy = Math.sin(rad) * SHELL_SPEED;
        let bLeft = 2;
        for (let t = 1; t <= 85; t++) {
          const px = sx, py = sy;
          const st = advanceShellStep(sx, sy, vx, vy, bLeft, arena, walls);
          sx = st.x; sy = st.y; vx = st.vx; vy = st.vy; bLeft = st.bouncesLeft;
          if (bLeft < 2) {
            const mp = myPredPath[Math.min(t, myPredPath.length - 1)];
            if (distSegPointSq(px, py, sx, sy, mp.x, mp.y) < (TANK_R + 7) * (TANK_R + 7)) return false;
          }
          if (st.dead) break;
        }
        return true;
      };

      const cand = shotNext && shotNext.hitEnemy ? shotNext : shotNow;
      if (cand && checkOtherSafe(me.turret) && checkOtherSafe(nextTurretAngle)) {
        if (cand.intercept && bestScore < -500000) {
          // Emergency defensive shot to destroy incoming shell!
          shouldFire = true;
        } else if (cand.hitEnemy) {
          const aimErr = Math.abs(tDiff);
          if (me.shellsOut === 0) {
            // First shell: fire generously on good direct shots or high-quality bank shots
            if (cand.bounces === 0 && cand.tick <= 82 && aimErr <= 7.5) {
              shouldFire = true;
            } else if (cand.bounces === 1 && cand.tick <= 78 && cand.hitMargin >= 2.5 && aimErr <= 4.5) {
              shouldFire = true;
            } else if (cand.bounces === 2 && cand.tick <= 70 && cand.hitMargin >= 4.0 && aimErr <= 3.0) {
              shouldFire = true;
            }
          } else {
            // Second shell (only 2 allowed in flight!): keep in reserve unless high-probability shot or close range
            if (cand.bounces === 0 && cand.tick <= 52 && cand.hitMargin >= 3.0 && aimErr <= 5.5) {
              shouldFire = true;
            } else if (cand.bounces === 1 && cand.tick <= 48 && cand.hitMargin >= 5.5 && aimErr <= 3.0) {
              shouldFire = true;
            } else if (distToEnemy < 160 && cand.bounces === 0 && aimErr <= 9.0) {
              shouldFire = true;
            }
          }
        }
      }
    }
  }

  return {
    move: chosenMove,
    turn: chosenTurn,
    turret: turretCmd,
    fire: shouldFire
  };
}