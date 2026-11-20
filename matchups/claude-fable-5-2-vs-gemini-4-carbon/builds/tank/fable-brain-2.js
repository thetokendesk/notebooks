var W=960,H=600,D=Math.PI/180,HZ=45,NE=50,E=2,WL=[],G=[],MX=0,MY=0,EX=0,EY=0,RNG=250,LB=30,FH=0,sx=0,sy=0,svx=0,svy=0,sb=0,TX=[],TY=[],TW=[],NT=0,AX=[],AY=[],EPX=[],EPY=[],PL=[];

function nrm(a){a%=360;return a>180?a-360:a<-180?a+360:a;}
function cl(v,a,b){return v<a?a:v>b?b:v;}

// point inside a wall grown by e (or outside the arena shrunk by e): 0 none, 1 outer edge, i+4 inner wall
function hitW(x,y,e){
  if(x<e||y<e||x>W-e||y>H-e)return 1;
  for(var i=0;i<WL.length;i+=4)if(x>WL[i]-e&&x<WL[i+2]+e&&y>WL[i+1]-e&&y<WL[i+3]+e)return i+4;
  return 0;
}

// advance the global shell (sx,sy,svx,svy,sb) one tick; sb<0 means gone
function stepS(){
  var nx=sx+svx,ny=sy+svy,k=hitW(nx,ny,E),hx,hy,j;
  if(k){
    if(sb<=0){sb=-1;return;}
    hx=hitW(nx,sy,E);hy=hitW(sx,ny,E);
    if(hx||!hy){j=hx||k;nx=2*(svx>0?(j<2?W-E:WL[j-4]-E):(j<2?E:WL[j-2]+E))-nx;svx=-svx;}
    if(hy||!hx){j=hy||k;ny=2*(svy>0?(j<2?H-E:WL[j-3]-E):(j<2?E:WL[j-1]+E))-ny;svy=-svy;}
    sb--;
  }
  sx=nx;sy=ny;
}

// tank circle blocked by a wall
function blk(x,y){
  if(x<17.5||y<17.5||x>W-17.5||y>H-17.5)return 1;
  for(var i=0,dx,dy;i<WL.length;i+=4){
    dx=x<WL[i]?WL[i]-x:x>WL[i+2]?x-WL[i+2]:0;
    dy=y<WL[i+1]?WL[i+1]-y:y>WL[i+3]?y-WL[i+3]:0;
    if(dx*dx+dy*dy<306)return 1;
  }
  return 0;
}

// simulate a tank holding (mv,tr) with turning limited to tn ticks; fills ox/oy[0..n]; returns blocked ticks
function simT(x,y,h,mv,tr,tn,n,ox,oy,qx,qy){
  var bc=0,c=Math.cos(h*D)*3*mv,s=Math.sin(h*D)*3*mv,t,nx,ny,d,od=(x-qx)*(x-qx)+(y-qy)*(y-qy);
  ox[0]=x;oy[0]=y;
  for(t=1;t<=n;t++){
    if(tr&&t<=tn){h+=tr*4;c=Math.cos(h*D)*3*mv;s=Math.sin(h*D)*3*mv;}
    if(mv){
      nx=x+c;ny=y+s;d=(nx-qx)*(nx-qx)+(ny-qy)*(ny-qy);
      if(blk(nx,ny)||(d<1296&&d<od))bc++;else{x=nx;y=ny;od=d;}
    }
    ox[t]=x;oy[t]=y;
  }
  FH=h;return bc;
}

// register a shell's future path as a threat
function addT(x,y,vx,vy,b,mine,dl,w){
  var ax=TX[NT]||(TX[NT]=[]),ay=TY[NT]||(TY[NT]=[]),t;
  sx=x;sy=y;svx=vx;svy=vy;sb=b;
  for(t=0;t<=HZ;t++){
    if(t>dl&&sb>=0)stepS();
    if(sb<0||t<dl||(mine&&sb>1)){ax[t]=-1e4;ay[t]=-1e4;}else{ax[t]=sx;ay[t]=sy;}
  }
  TW[NT++]=w;
}

// simulate my shot at angle a against a target path; >0 hit tick+1, 0 miss, -1 unsafe
function shot(a,px,py,n,mt,th){
  var c=Math.cos(a*D),s=Math.sin(a*D),t,i,dx,dy;
  sx=MX+25*c;sy=MY+25*s;svx=9*c;svy=9*s;sb=2;
  if(hitW(sx,sy,E))return -1;
  for(t=0;t<=mt;t++){
    i=t<n?t:n;dx=sx-px[i];dy=sy-py[i];
    if(dx*dx+dy*dy<th)return t+1;
    if(sb<2&&t<60){dx=sx-MX;dy=sy-MY;if(dx*dx+dy*dy<1600)return -1;}
    stepS();if(sb<0)return 0;
  }
  return 0;
}

// would my shot at angle a collide with the shell following path ax/ay
function icp(a,ax,ay,n){
  var c=Math.cos(a*D),s=Math.sin(a*D),t,rx,ry,qx,qy,ux,uy,l,k,cx,cy;
  sx=MX+25*c;sy=MY+25*s;svx=9*c;svy=9*s;sb=2;
  if(hitW(sx,sy,E))return 0;
  rx=sx-ax[0];ry=sy-ay[0];
  for(t=1;t<=n;t++){
    stepS();if(sb<0)return 0;
    qx=sx-ax[t];qy=sy-ay[t];ux=qx-rx;uy=qy-ry;l=ux*ux+uy*uy;
    k=l?cl(-(rx*ux+ry*uy)/l,0,1):0;cx=rx+k*ux;cy=ry+k*uy;
    if(cx*cx+cy*cy<16)return 1;
    rx=qx;ry=qy;
  }
  return 0;
}

function aimAt(px,py,n){
  var t,dx,dy;
  for(t=0;t<n;t++){dx=px[t]-MX;dy=py[t]-MY;if(Math.sqrt(dx*dx+dy*dy)-25<=9*t)break;}
  return Math.atan2(py[t]-MY,px[t]-MX)/D;
}

function los(x1,y1,x2,y2){
  var dx=x2-x1,dy=y2-y1,i,t0,t1,a,b,q;
  for(i=0;i<WL.length;i+=4){
    t0=0;t1=1;
    if(dx){a=(WL[i]-x1)/dx;b=(WL[i+2]-x1)/dx;if(a>b){q=a;a=b;b=q;}if(a>t0)t0=a;if(b<t1)t1=b;}
    else if(x1<WL[i]||x1>WL[i+2])continue;
    if(dy){a=(WL[i+1]-y1)/dy;b=(WL[i+3]-y1)/dy;if(a>b){q=a;a=b;b=q;}if(a>t0)t0=a;if(b<t1)t1=b;}
    else if(y1<WL[i+1]||y1>WL[i+3])continue;
    if(t0<=t1)return 0;
  }
  return 1;
}

// path-distance field from the enemy on a 32x20 grid of 30-unit cells
function field(){
  var i,p,s,k,x,y,n,v,c,dx,dy,nx,ny;
  for(i=0;i<640;i++)G[i]=hitW((i&31)*30+15,(i>>5)*30+15,14)?-1:1e6;
  G[cl(EY/30|0,0,19)*32+cl(EX/30|0,0,31)]=0;
  for(p=0;p<4;p++){
    s=p&1?1:-1;
    for(k=0;k<640;k++){
      i=s<0?k:639-k;v=G[i];if(v<0)continue;x=i&31;y=i>>5;
      for(n=0;n<4;n++){
        dx=n==1?0:n==3?-s:s;dy=n?s:0;nx=x+dx;ny=y+dy;
        if(nx<0||nx>31||ny<0||ny>19)continue;
        c=G[ny*32+nx];if(c>=0){c+=dx&&dy?42:30;if(c<v)v=c;}
      }
      G[i]=v;
    }
  }
}

function ed(v){return v<75?(75-v)*1.2:0;}

// how good is standing at (x,y) with body heading h
function pos(x,y,h){
  var dx=EX-x,dy=EY-y,d=Math.sqrt(dx*dx+dy*dy),s=-ed(x)-ed(y)-ed(W-x)-ed(H-y),i,ax,ay,g,l=los(x,y,EX,EY);
  if(d<100)s-=(100-d)*2;
  for(i=0;i<WL.length;i+=4){
    ax=x<WL[i]?WL[i]-x:x>WL[i+2]?x-WL[i+2]:0;
    ay=y<WL[i+1]?WL[i+1]-y:y>WL[i+3]?y-WL[i+3]:0;
    ax=Math.sqrt(ax*ax+ay*ay);if(ax<50)s-=50-ax;
  }
  if(l)s+=LB+50*Math.abs(Math.sin(h*D-Math.atan2(dy,dx)));
  else{g=G[cl(y/30|0,0,19)*32+cl(x/30|0,0,31)];d=(g===undefined||g<0||g>1e5)?d+150:(g>d?g:d);}
  return s-Math.abs(d-RNG)*0.8;
}

function core(state,m){
  var me=state.me,en=state.enemy,i,t,p,a,h,s,dx,dy,d;
  if(!PL.length){
    PL.push([1,0,0],[-1,0,0],[0,0,0],[0,1,HZ],[0,-1,HZ]);
    var du=[6,14,24,HZ];
    for(a=-1;a<2;a+=2)for(h=-1;h<2;h+=2)for(i=0;i<4;i++)PL.push([a,h,du[i]]);
  }
  WL.length=0;
  for(i=0;i<state.walls.length;i++){s=state.walls[i];WL.push(s.x,s.y,s.x+s.w,s.y+s.h);}
  MX=me.x;MY=me.y;EX=en.x;EY=en.y;
  if(m.ex===undefined){
    m.ex=EX;m.ey=EY;m.eh=en.heading;m.ax=EX;m.ay=EY;m.fl=0;m.pm=0;m.ms=0;m.mh=me.health;m.nh=en.health;
    m.cd=me.cooldown;m.lm=0;m.ba=null;m.rel=0;m.jf=0;m.ft=0;m.fh=0;
  }
  var fld=!m.G||state.tick%8==0;
  if(!m.G)m.G=[];
  G=m.G;
  if(fld)field();

  // check whether the turret angle is absolute or relative to the body (from my own fresh shell)
  if(m.jf){
    for(i=0;i<state.shells.length;i++){
      s=state.shells[i];
      if(s.mine&&s.bouncesLeft>1&&Math.abs(s.x-MX)+Math.abs(s.y-MY)<70){
        a=Math.atan2(s.vy,s.vx)/D;h=Math.abs(nrm(a-m.ft));t=Math.abs(nrm(a-m.ft-m.fh));
        if(h>9&&t<6)m.rel=1;else if(t>9&&h<6)m.rel=0;
      }
    }
    m.jf=0;
  }
  var TA=me.turret+(m.rel?me.heading:0),ETA=en.turret+(m.rel?en.heading:0);

  // estimate what the enemy is doing
  var vx=EX-m.ex,vy=EY-m.ey,er=en.heading*D;
  var emv=cl((vx*Math.cos(er)+vy*Math.sin(er))/3,-1,1),etr=cl(nrm(en.heading-m.eh)/4,-1,1);
  m.fl*=0.96;if(emv*m.pm<-0.2)m.fl++;if(Math.abs(emv)>0.3)m.pm=emv;
  m.ax+=(EX-m.ax)*0.1;m.ay+=(EY-m.ay)*0.1;m.ex=EX;m.ey=EY;m.eh=en.heading;
  if(me.cooldown>m.cd)m.ms++;
  m.cd=me.cooldown;
  if(en.health<m.nh){m.ms=0;m.nh=en.health;}
  if(me.health<m.mh){m.ms=Math.max(0,m.ms-2);m.mh=me.health;}

  // stance
  var hd=me.health-en.health;
  if(hd>0){RNG=430;LB=-120;}
  else if(hd<0){RNG=170;LB=60;}
  else{RNG=cl(250-25*Math.max(0,m.ms-1),150,250);if(state.tick>900&&RNG>180)RNG=180;LB=30;}

  // predicted enemy path
  if(m.fl>1.6)for(t=0;t<=NE;t++){EPX[t]=m.ax;EPY[t]=m.ay;}
  else simT(EX,EY,en.heading,emv,etr,10,NE,EPX,EPY,MX,MY);

  // threats: every shell, plus the shot the enemy could fire along its barrel
  NT=0;var es=0;
  for(i=0;i<state.shells.length;i++){
    s=state.shells[i];if(!s.mine)es++;
    addT(s.x,s.y,s.vx,s.vy,s.bouncesLeft,s.mine,0,1);
  }
  if(es<2&&en.cooldown<10){
    a=Math.cos(ETA*D);h=Math.sin(ETA*D);
    addT(EX+25*a,EY+25*h,9*a,9*h,2,0,en.cooldown,0);
  }

  // choose movement by simulating candidate plans
  var best=-1e18,bp=PL[0],bh=99,bi=-1,pl,sc,ht,hi,ax,ay,md,f;
  for(p=0;p<PL.length;p++){
    pl=PL[p];
    sc=-6*simT(MX,MY,me.heading,pl[0],pl[1],pl[2],HZ,AX,AY,EX,EY);h=FH;ht=99;hi=-1;
    for(i=0;i<NT;i++){
      ax=TX[i];ay=TY[i];md=1e9;f=0;
      for(t=1;t<=HZ;t++){
        dx=AX[t]-ax[t];dy=AY[t]-ay[t];d=dx*dx+dy*dy;
        if(d<md){md=d;if(d<676){f=t;break;}}
      }
      if(TW[i]){
        if(f){sc-=12000-f*60;if(f<ht){ht=f;hi=i;}}
        else if(md<1764)sc-=(42-Math.sqrt(md))*8;
      }else if(md<900)sc-=350;
    }
    sc+=pos(AX[HZ],AY[HZ],h)+0.5*pos(AX[18],AY[18],me.heading+pl[1]*4*Math.min(18,pl[2]));
    if(pl[0]==m.lm)sc+=12;
    if(!pl[0])sc-=25;
    if(sc>best){best=sc;bp=pl;bh=ht;bi=hi;}
  }
  m.lm=bp[0];

  // aiming
  var can=me.cooldown<=0&&me.shellsOut<2,fire=false,aim=aimAt(EPX,EPY,NE),tgt=aim;
  var dr=shot(aim,EPX,EPY,NE,60,256)>0&&sb>1,ba=m.ba,bt=1e9;
  if(!dr&&state.tick>2&&!fld){
    ba=null;
    if(m.ba!==null)for(i=-1;i<2;i++){
      a=m.ba+i*2;h=shot(a,EPX,EPY,15,100,196);
      if(h>0&&h-(i?0:10)<bt){bt=h-(i?0:10);ba=a;}
    }
    s=state.tick*3.7%15;
    for(i=0;i<24;i++){
      a=s+i*15;h=shot(a,EPX,EPY,15,100,196);
      if(h>0&&h+15<bt){bt=h;ba=a;}
    }
  }
  if(dr)ba=null;
  m.ba=ba;
  if(ba!==null)tgt=ba;
  if(can&&(dr||me.shellsOut<1)&&shot(TA,EPX,EPY,dr?NE:15,dr?70:100,dr?256:196)>0)fire=true;

  // last resort: shoot down a shell I cannot dodge
  if(bi>=0&&bh<30&&me.shellsOut<2&&me.cooldown<bh-2){
    tgt=aimAt(TX[bi],TY[bi],bh);
    if(can&&icp(TA,TX[bi],TY[bi],bh))fire=true;
  }

  if(fire){m.jf=1;m.ft=me.turret;m.fh=me.heading;}
  var td=nrm(tgt-TA)-(m.rel?bp[1]*4:0);
  return{move:bp[0],turn:bp[1],turret:fire?0:cl(td/6,-1,1),fire:fire};
}

function brain(state,m){
  try{
    return core(state,m);
  }catch(e){
    // safety net: never lose a tick to an exception
    try{
      var me=state.me,en=state.enemy;
      var a=Math.atan2(en.y-me.y,en.x-me.x)/D,td=nrm(a-me.turret-(m&&m.rel?me.heading:0));
      return{move:0,turn:0,turret:cl(td/6,-1,1),fire:Math.abs(td)<3&&los(me.x,me.y,en.x,en.y)===1};
    }catch(e2){
      return{move:0,turn:0,turret:0,fire:false};
    }
  }
}