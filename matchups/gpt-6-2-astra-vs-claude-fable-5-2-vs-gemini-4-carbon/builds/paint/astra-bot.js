// Paint one cell per move while reserving a route to the next valuable burst.
const moves = ['up', 'right', 'down', 'left', 'stay'];
const { abs, min, max, floor } = Math;
const widthOfBeam = 34, lookahead = 15;

function prepare(state, m) {
  const w = state.width, h = state.height, stride = w + 2;
  const n = stride * (h + 2);
  m.stride = stride;
  m.delta = [-stride, 1, stride, -1, 0];
  m.n = n;
  m.floor = new Uint8Array(n);
  m.owner = new Int8Array(n);
  m.value = new Float32Array(n);
  m.region = new Float32Array(n);
  m.integral = new Float32Array(n);
  m.quiet = new Float32Array(n);
  m.growth = [0,0.5,0.5,0.5];
  m.prevCount = [1,1,1,1];
  m.losses = new Uint8Array(n);
  m.pursuit = [0,0,0,0];
  m.heat = new Float32Array(n);
  m.interest = [0,0.5,0.5,0.5];
  m.distanceReady = 0;
  m.blockedAt = -1;
  m.blockedSince = -1;
  m.corner = new Uint16Array(n * 4);
  m.lastBurst = new Int16Array(n);
  m.lastBurst.fill(-1);
  m.nextBurst = new Int16Array(n);
  m.nextBurst.fill(1000);
  m.cells = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (y+1)*stride + x+1;
      if (state.grid[y][x] < 0) continue;
      m.floor[p] = 1;
      m.cells.push(p);
      const left = max(0,x-4), right = min(w,x+5);
      const top = max(0,y-4)*stride, bottom = min(h,y+5)*stride;
      m.corner[4*p] = bottom+right;
      m.corner[4*p+1] = top+right;
      m.corner[4*p+2] = bottom+left;
      m.corner[4*p+3] = top+left;
    }
  }
  m.spots = state.bombSpots.map(s => ({
    p: (s.y+1)*stride+s.x+1, blast: [], dist: null
  }));
  for (const spot of m.spots) {
    const x=spot.p%stride, y=floor(spot.p/stride);
    for (let j=max(1,y-3);j<=min(h,y+3);j++) {
      for (let i=max(1,x-3);i<=min(w,x+3);i++) {
        const k=j*stride+i;
        if (m.floor[k]) spot.blast.push(k);
      }
    }
  }
  for (let i = 0; i < 11; i++) {
    for (const p of m.spots[i % m.spots.length].blast)
      m.lastBurst[p] = 50*(i+1)+1;
  }
  m.queue = new Uint16Array(n);
  m.enemyPrev = [-1,-1,-1,-1];
  m.rest = [0,0,0,0];
  m.stuck = new Int16Array(n);
  m.live = new Uint8Array(m.spots.length);
  m.future = new Uint8Array(lookahead);
  m.plan = new Uint8Array(lookahead);
  m.pathPos = new Uint16Array((lookahead+1)*widthOfBeam);
  m.parent = new Uint16Array(m.pathPos.length);
  m.pathDir = new Uint8Array(m.pathPos.length);
  m.pathScore = new Float64Array(m.pathPos.length);
  m.stamp = new Int32Array(n);
  m.layerStamp = new Int32Array(n);
  m.serial = 0;
  m.layer = 0;
  m.raw = new Float64Array(n);
  m.rank = new Float64Array(n);
  m.origin = new Uint16Array(n);
  m.via = new Uint8Array(n);
  m.candidate = new Uint16Array(n);
  m.best = new Uint16Array(widthOfBeam);
  m.ready = true;
  m.tried = -1;
  m.previous = -1;
}

function distances(m, s) {
  if (s.dist) return s.dist;
  const d = new Uint16Array(m.n), q = m.queue, delta = m.delta;
  d.fill(3000);
  q[0] = s.p;
  d[s.p] = 0;
  let count = 1;
  for (let i = 0; i < count; i++) {
    const p = q[i], cost = d[p]+1;
    for (let j = 0; j < 4; j++) {
      const k = p + delta[j];
      if (m.floor[k] && d[k] === 3000) {
        d[k] = cost;
        q[count++] = k;
      }
    }
  }
  s.dist = d;
  return d;
}

function goalFor(state,m,turn,me,rivals) {
  const next = state.nextBomb;
  let goal = null, best = 0;
  const reserve = 24+m.liveCount*24;
  const late = 600-turn <= reserve;
  const hunted=max(m.interest[rivals[0].id],m.interest[rivals[1].id],
    0.44*m.pursuit[rivals[0].id],0.44*m.pursuit[rivals[1].id]);
  for (let i=0;i<m.spots.length;i++) {
    const spot=m.spots[i];
    const live=m.live[i];
    const scheduled=next && next.x+1+(next.y+1)*m.stride===spot.p;
    if (!scheduled && !live) continue;
    const d=distances(m,spot);
    const until=live ? 1 : next.tick/3+2-turn;
    const eta=max(until,d[me] || 2);
    if (turn+eta>600) continue;
    let chance=1, threat=0, nearest=1000, preserve=0, avoid=0;
    for (const r of rivals) {
      let take=d[r.p]||2;
      if (r.p===spot.p && m.rest[r.id]>5 && live && m.blockedAt===spot.p) take=1;
      if (m.rest[r.id]<8) nearest=min(nearest,take);
      const contests = m.interest[r.id];
      let intent=contests;
      if (live) {
        intent=d[r.p]<=3 ? 0.93 : max(0.38,contests,m.pursuit[r.id]);
        if (m.rest[r.id]>7 && d[r.p]>2) intent*=0.15;
      } else if (until<10 && take<=until) {
        intent=max(intent,1-take*0.08);
      }
      threat=max(threat,max(intent,m.pursuit[r.id])*max(0,1-max(0,take-eta)/16));
      if (take>eta) continue;
      const margin=state.me.cells-r.cells;
      const winsTie=margin===0 ? 0.5 : min(0.97,max(0.03,0.5+margin/(4+until*0.32)));
      let canBeat=eta>until && take<eta ? 1 : winsTie;
      // A small deficit can buy an entire burst. Preserve it on the approach.
      if (!live && until<=16 && until>=2 && d[me]<=until && intent>0.54) {
        const expected=r.cells+max(-0.3,min(0.85,m.growth[r.id]))*min(until-1,take+2);
        const room=expected-state.me.cells;
        if (room>=-0.1 && room<until*0.88) {
          const tax=1.8*(1-max(0,room)/until);
          preserve=max(preserve,tax);
          avoid |= 1<<r.id;
          canBeat=min(canBeat,0.28);
        }
      }
      chance*=1-intent*canBeat;
    }
    let prize=0;
    for (const k of spot.blast) {
      const c=m.owner[k];
      const benefit=(c===state.me.id ? 0 : c ? 1.65 : 1);
      const denied=(c===state.me.id ? 1.65 : c ? 0.2 : 0.65);
      const repeats=m.lastBurst[k]>turn+eta-1;
      prize+=(benefit+threat*denied)*(repeats ? 0.31 : 1);
    }
    const trip=d[me]||2;
    const cost=(live ? 1.05 : 1.15+0.70*m.predation)*trip + (live ? 0.9 : 6);
    const safe = nearest>max(5,15*hunted);
    const bank = !late && (live ? safe && (hunted<0.30 || nearest>trip+15) : hunted<0.37);
    if (bank) continue;
    let utility=chance*prize-cost;
    if (live && trip===1 && !(m.blockedAt===spot.p && turn-m.blockedSince>2))
      utility=max(2,utility);
    if (m.blockedAt===spot.p && turn-m.blockedSince>2 && rivals.some(r=>r.p===spot.p))
      utility=-1;
    if (utility>best) {
      best=utility;
      let time=eta;
      if (live && trip>1 && nearest>trip+3) {
        const slack=min(13,nearest-trip-2,600-turn-trip);
        time=min(600-turn,trip+slack);
        if (m.goalPos===spot.p) time=max(trip,min(time,m.due-turn));
      }
      goal={spot,dist:d,time,live,preserve,avoid};
    }
  }
  m.goalPos=goal ? goal.spot.p : -1;
  m.due=goal ? turn+goal.time : 0;
  return goal;
}

function paintValues(state,m,turn,rivals) {
  const me=state.me.id, w=state.width, h=state.height, s=m.stride;
  const holdings=m.holdings || [0,0,0,0];
  const split=abs(m.interest[rivals[0].id]-m.interest[rivals[1].id]);
  const predation=min(1,max(0,(split-0.25)*2.4));
  m.predation=predation;
  const balance = 0.35*(rivals[0].cells-rivals[1].cells) + 0.65*(holdings[rivals[0].id]-holdings[rivals[1].id]);
  const horizon=600-turn;
  let edge = (0.75+1.7*predation)*balance/(abs(balance)+min(33,horizon*0.40));
  if (max(rivals[0].cells,rivals[1].cells)-state.me.cells>horizon*1.7+4 &&
      min(rivals[0].cells,rivals[1].cells)<state.me.cells+horizon) edge=-edge;
  const worth = [1,1,1,1];
  worth[me] = 0;
  worth[rivals[0].id]=1.65+1.9*predation+edge;
  worth[rivals[1].id]=1.65+1.9*predation-edge;
  const next = state.nextBomb;
  let mask=0;
  for (let i=0;i<m.spots.length;i++) {
    const p=m.spots[i].p;
    const previous=m.live[i];
    m.live[i]=state.bombs.some(b=>(b.y+1)*s+b.x+1===p) ? 1 : 0;
    if (previous && !m.live[i]) {
      for (const r of rivals) {
        m.pursuit[r.id]*=0.9;
        if (p===r.p) m.pursuit[r.id]=min(1,m.pursuit[r.id]+0.53);
      }
    }
    mask |= m.live[i]<<i;
  }
  m.liveCount=state.bombs.length;
  if (m.scheduled !== (next && next.tick) || m.liveMask!==mask) {
    m.liveMask=mask;
    m.nextBurst.fill(1000);
    for (let i = 10; next && i >= next.tick/150-1; i--)
      for (const p of m.spots[i%m.spots.length].blast) m.nextBurst[p] = (i+1)*50+1;
    for (let i=0;i<m.spots.length;i++) if (m.live[i]) {
      for (const p of m.spots[i].blast) m.nextBurst[p]=0;
    }
    m.scheduled = next && next.tick;
  }
  if (m.distanceReady<m.spots.length) {
    distances(m,m.spots[m.distanceReady++]);
    if (m.distanceReady===m.spots.length) {
      for (const p of m.cells) {
        let nearest=100, total=0;
        for (const spot of m.spots) {
          nearest=min(nearest,spot.dist[p]);
          total+=spot.dist[p];
        }
        m.quiet[p]=min(1,0.045*nearest+0.015*(total/m.spots.length-9));
      }
    }
  }
  for (const r of rivals) {
    if (r.dir && turn) {
      const x=r.p%s;
      for (let dy=-2;dy<=2;dy++) for (let dx=max(-2,1-x);dx<=min(2,w-x);dx++) {
        const k=r.p+dy*s+dx;
        if (m.floor[k]) m.heat[k]+=0.09/(1+abs(dx)+abs(dy));
      }
    }
  }
  const integral = m.integral, val = m.value, own = m.owner, time = m.nextBurst;
  const refresh = turn % 4 === 0 || !m.refreshed;
  const remaining=min(1,(600-turn)/80);
  const stable = [0,0,0,0];
  const x1=rivals[0].p%s-1,y1=floor(rivals[0].p/s)-1;
  const x2=rivals[1].p%s-1,y2=floor(rivals[1].p/s)-1;
  for (let y = 0; y < h; y++) {
    const row=state.grid[y], dy1=abs(y1-y), dy2=abs(y2-y);
    let sum=0;
    for (let x=0,p=(y+1)*s+1; x<w; x++,p++) {
      const c = row[x];
      if (own[p]===me && c>0 && c!==me) m.losses[p]++;
      own[p]=c;
      if (c>=0) {
        const until = time[p]-turn;
        const range=min(abs(x1-x)+dy1,abs(x2-x)+dy2);
        const danger=0.42*(1-m.quiet[p])+(0.42-0.20*predation)*max(0,1-range/19)
          +min(0.28,m.heat[p]*0.5);
        val[p] = worth[c] * max(0.08,1-remaining*danger) / (1+remaining*0.65*max(0,m.losses[p]-1))
          * (time[p]===1000 ? 1 : min(0.45,0.04+max(0,until)*0.00125));
        sum += val[p];
        if(c) stable[c] += time[p]===1000 ? 1 : 0.15;
      }
      if (refresh) integral[p]=sum+integral[p-s];
    }
  }
  m.holdings=stable;
  if (refresh) {
    const corners=m.corner, field=m.region;
    for (const p of m.cells) {
      const a=p*4;
      const box=(integral[corners[a]]-integral[corners[a+1]]-
        integral[corners[a+2]]+integral[corners[a+3]]);
      field[p]=box / max(28,(corners[a]%s-corners[a+2]%s)*(corners[a]-corners[a+1])/s);
    }
    // Extend the influence of a productive patch through nearby passages.
    for (const p of m.cells) field[p]=max(field[p],0.971*max(field[p-1],field[p-s])+0.029*field[p]-0.006);
    for (let i=m.cells.length-1;i>=0;i--) {
      const p=m.cells[i];
      field[p]=max(field[p],0.971*max(field[p+1],field[p+s])+0.029*field[p]-0.006);
    }
    m.refreshed=true;
  }
}

function choose(state,m,turn,me,goal,rivals) {
  const {pathPos,parent,pathDir,pathScore,rank,raw,origin,via,stamp,layerStamp,
    candidate,best,delta,region,value} = m;
  const depth = min(lookahead,600-turn,goal ? goal.time : 600);
  const d = goal && goal.dist;
  const target = goal && goal.spot.p;
  const limit = goal ? goal.time : 1000;
  const regionScale=9+5*m.predation;
  const firstCost = [0,0,0,0,0];
  for (let a=0;a<5;a++) {
    const p=me+delta[a];
    if (m.stuck[p]>turn) firstCost[a]+=3;
    for (const r of rivals) {
      if (r.p===p) firstCost[a]+=m.rest[r.id] >= 2 ? 5 : 0.8;
      if (r.p+r.dir===p && r.cells<state.me.cells) firstCost[a]+=0.45;
    }
  }
  let size=1,offset=0,discount=1;
  pathPos[0]=me;
  pathScore[0]=0;
  for (let step=1;step<=depth;step++) {
    const layer=++m.layer;
    const tailValue=regionScale*min(1,(600-turn-step)/11);
    let count=0;
    const left=limit-step, nextOffset=step*widthOfBeam;
    for (let b=offset;b<offset+size;b++) {
      const p=pathPos[b], visit=++m.serial;
      for (let node=b; ; node=parent[node]) {
        stamp[pathPos[node]]=visit;
        if (!node) break;
      }
      for (let a=0;a<5;a++) {
        const k=p+delta[a];
        if (!m.floor[k]) continue;
        if (a===4 && !(goal && (left<=3 || goal.preserve))) continue;
        if (goal && !left && k===target && p===target) continue;
        if (goal && left===1 && k===target) continue;
        let reward=stamp[k]===visit ? -0.08 : value[k];
        if (goal && goal.preserve && step<limit && stamp[k]!==visit && m.owner[k]!==state.me.id) {
          reward-=goal.preserve*(goal.avoid & (1<<m.owner[k]) ? 2 : 1);
        }
        if (goal && !left && k===target) reward+=(3-a)*0.13;
        if (a===4) reward-=0.08;
        if (step===1) reward-=firstCost[a];
        if (step<m.planLength && m.plan[step]===a) reward+=0.013;
        const score=pathScore[b]+discount*reward;
        let guidance=tailValue*region[k];
        if (goal) {
          let needed=d[k];
          guidance -= 12*max(0,needed-left);
          if (left<=2 && needed<=1 && !goal.live) {
            // Entering from the south wins a tied race.
            if (k===target+m.stride) guidance+=0.24;
          }
        }
        const rating=score+discount*guidance;
        if (layerStamp[k]!==layer) {
          candidate[count++]=k;
          layerStamp[k]=layer;
        } else if (rank[k]>=rating) continue;
        rank[k]=rating; raw[k]=score; via[k]=a; origin[k]=b;
      }
    }
    size=0;
    for (let i=0;i<count;i++) {
      const k=candidate[i], score=rank[k];
      if (size===widthOfBeam && score<=rank[best[size-1]]) continue;
      let slot=min(size,widthOfBeam-1);
      while (slot>0 && rank[best[slot-1]]<score) {
        best[slot]=best[slot-1];
        slot--;
      }
      best[slot]=k;
      if (size<widthOfBeam) size++;
    }
    for (let i=0;i<size;i++) {
      const k=best[i], n=nextOffset+i;
      pathPos[n]=k; pathScore[n]=raw[k]; parent[n]=origin[k]; pathDir[n]=via[k];
    }
    offset=nextOffset;
    discount*=0.961;
  }
  let node=offset;
  for (let i=depth-1;i>=0;i--) {
    m.future[i]=pathDir[node];
    node=parent[node];
  }
  m.plan.set(m.future);
  m.planLength=depth;
  return m.plan[0];
}

// In a close finish, evaluate the places awarded for all legal final moves.
function finish(state,m,me,rivals) {
  const mine=state.me.id, order=[mine,rivals[0].id,rivals[1].id];
  const pos=[me,rivals[0].p,rivals[1].p];
  const cells=[state.me.cells,rivals[0].cells,rivals[1].cells];
  const choices=[[],[],[]];
  for (let i=0;i<3;i++) {
    for (let dir=0;dir<5;dir++) {
      const p=pos[i]+m.delta[dir];
      if (!m.floor[p]) continue;
      // The route search already accounts for bursts in reach of a painter.
      if (m.liveCount && m.spots.some((s,j)=>m.live[j] && s.p===p)) return -1;
      const color=m.owner[p];
      let weight=color===order[i] ? 0.22 : color===0 ? 1 : 1.7;
      if (dir===4) weight=i && m.rest[order[i]]>2 ? 4 : 0.05;
      if (i && m.delta[dir]===rivals[i-1].dir) weight*=1.6;
      choices[i].push({p,dir,weight});
    }
  }
  let best=-Infinity, action=4;
  const counts=[0,0,0], dest=[0,0,0], dirs=[0,0,0];
  for (const a of choices[0]) {
    let total=0;
    for (const b of choices[1]) for (const c of choices[2]) {
      dest[0]=a.p; dest[1]=b.p; dest[2]=c.p;
      dirs[0]=a.dir; dirs[1]=b.dir; dirs[2]=c.dir;
      let stopped=0;
      for (let i=0;i<3;i++) {
        if (dest[i]===pos[i]) stopped |= 1<<i;
        for (let j=i+1;j<3;j++) {
          if (dest[i]===pos[j] && dest[j]===pos[i]) stopped |= (1<<i)|(1<<j);
          if (dest[i]===dest[j] && dirs[i]!==4 && dirs[j]!==4) {
            const loser=cells[i]<cells[j] || (cells[i]===cells[j] && dirs[i]<dirs[j]) ? j : i;
            stopped |= 1<<loser;
          }
        }
      }
      for (let pass=0;pass<2;pass++) for (let i=0;i<3;i++) for (let j=0;j<3;j++) {
        if ((stopped & (1<<j)) && dest[i]===pos[j]) stopped |= 1<<i;
      }
      for (let i=0;i<3;i++) counts[i]=cells[i];
      for (let i=0;i<3;i++) if (!(stopped & (1<<i))) {
        const old=m.owner[dest[i]];
        counts[i]++;
        for (let j=0;j<3;j++) if (order[j]===old) counts[j]--;
      }
      const above=(counts[1]>counts[0])+(counts[2]>counts[0]);
      const points=above===0 ? 3 : above===1 ? 1 : 0;
      total+=b.weight*c.weight*(points*100+counts[0]-cells[0]+
        0.05*(counts[0]-max(counts[1],counts[2])));
    }
    if (total>best) { best=total; action=a.dir; }
  }
  return action;
}

function brain(state,m) {
  // Keep initialization separate from the first search. A fresh context is cold.
  if (!m.ready) {
    prepare(state,m);
    const start=(state.me.y+1)*m.stride+state.me.x+1;
    for (let a=0;a<4;a++) if (m.floor[start+m.delta[a]]) return moves[a];
  }
  const turn=state.tick/3, stride=m.stride;
  const me=(state.me.y+1)*stride+state.me.x+1;
  const rivals=[];
  for (const p of state.painters) {
    if (p.id===state.me.id) continue;
    const pos=(p.y+1)*stride+p.x+1, prev=m.enemyPrev[p.id];
    const change=p.cells-m.prevCount[p.id];
    if (abs(change)<=3) m.growth[p.id]=0.82*m.growth[p.id]+0.18*change;
    m.prevCount[p.id]=p.cells;
    m.rest[p.id] = prev===pos ? m.rest[p.id]+1 : 0;
    rivals.push({p:pos, id:p.id, cells:p.cells, dir:pos-prev});
    m.enemyPrev[p.id]=pos;
  }
  if (me===m.previous && m.tried!==me && m.tried>0) {
    m.stuck[m.tried]=turn+3;
    if (m.tried!==m.blockedAt) m.blockedSince=turn;
    m.blockedAt=m.tried;
  } else if (!rivals.some(r=>r.p===m.blockedAt)) m.blockedAt=-1;
  if (turn%50===1 && turn>=51) {
    const spot=m.spots[(floor(turn/50)-1)%m.spots.length];
    const d=distances(m,spot);
    for (const r of rivals) m.interest[r.id]=0.52*m.interest[r.id]+0.48*(d[r.p]<=2 ? 1 : d[r.p]<=5 ? 0.65 : 0);
  }
  paintValues(state,m,turn,rivals);
  if (turn===599 && rivals.some(r=>abs(r.cells-state.me.cells)<=4)) {
    const last=finish(state,m,me,rivals);
    if (last>=0) return moves[last];
  }
  const goal=goalFor(state,m,turn,me,rivals);
  const a=choose(state,m,turn,me,goal,rivals);
  m.previous=me;
  m.tried=me+m.delta[a];
  return moves[a];
}
