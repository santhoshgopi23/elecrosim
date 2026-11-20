/* ElectroSim v8.65 – RS232 and RS422 serial links (library group "Communication").  Loaded after modbus.js, before view.js.
   Two parts, same style as the RS485 node (rs485.js): own supply on L+ / M, the WIRING is the link, the simulator judges it like a real installation.
   RS232  terminals (fixed index): 0 L+  1 M  2 TX  3 RX  4 GND  5 RTS  6 CTS      single-ended, point-to-point, full duplex, 15 m, +/-12 V
   RS422  terminals (fixed index): 0 L+  1 M  2 TX+ 3 TX- 4 RX+ 5 RX- 6 GND        4-wire full duplex, differential, 1200 m, ONE driver -> up to 10 receivers
   Properties (both): baud rate, data bits (5-8), parity (None / Even / Odd / Mark / Space), stop bits (1 / 1.5 / 2).  A MISMATCH IS REAL: the receiver
   samples the line with ITS OWN settings (sxDecode: start-bit edge, middle of every bit, data LSB first, parity check, stop bit), so a wrong baud rate,
   data length, parity or stop setting really produces wrong bytes, parity errors (PE) and framing errors (FE).
   Wiring checks: TX wired to TX (cross them), one direction only, no common GND (RS232), RTS/CTS flow control not wired, TTL levels against RS232 levels,
   cable longer than the limit (RS232: 15 m up to 19200 baud, shorter above; RS422: min(1200 m, 1e8 / baud) like rs485.js), termination of the last receiver,
   more than 10 receivers on one driver, TX+/TX- swapped (every bit inverted), two masters (collision), no master, no way back for the answer.
   Animation: the symbol is a two-trace oscilloscope (top = what this node sends, bottom = what arrives): a real frame (idle, start bit, data bits LSB first,
   parity, stop bits) at 5 bit/s.  Both directions run at the same time (full duplex).  RS422: the master sends every slot, the slaves answer in turn.
   Properties -> "Serial Viewer" opens the big picture: the waveform with every bit named, the receiver's sampling points and the byte it really decodes.
   State: c.s.x (see sxAnalyse).  Reused from rs485.js: rsMax, rsLc, rsH, RS_RL, RS_RS, RS_VS, RS_VN, and the supply (el) and Properties of the RS485 node. */
'use strict';
const SXB2=['300','1200','2400','4800','9600','19200','38400','57600','115200','230400','460800','921600'],
 SXB4=['1200','2400','4800','9600','19200','38400','57600','115200','250000','500000','1000000','2500000','10000000'],
 SXDB=['5','6','7','8'],SXPA=['None','Even','Odd','Mark','Space'],SXSB=['1','1.5','2'],SXFL=['None','RTS/CTS'],SXO=['OFF','ON'],SXRO=['Master','Slave'],
 SXLV=['±12 V (RS232 standard)','±9 V (MAX232 chip)','±5 V (lowest allowed)','0 / 5 V TTL (NOT RS232)'];
const SX={st:-1,g:[]},SX_BPS=5,SX_FR=16,SX_FS=2,SX_RL=15,SX_LB=19200;   /* scope bits/s · bits per slot · frame starts 2 bits into the slot · RS232 limit (m) · baud up to which that limit holds */
const sxIs=q=>q.type==='rs232'||q.type==='rs422',sx2=c=>c.type==='rs232',sxM=c=>c.type==='rs422'&&c.p.role!=='Slave',sxHx=v=>(v&255).toString(16).toUpperCase().padStart(2,'0');
const sxCf=c=>({bd:Math.max(50,+c.p.baud||9600),db:SXDB.includes(String(c.p.db))?+c.p.db:8,par:SXPA.includes(c.p.par)?c.p.par:'None',sb:{'1':1,'1.5':1.5,'2':2}[String(c.p.sb)]||1}),
 sxLen=c=>Math.max(.1,+c.p.len||1),sxFm=c=>{const q=sxCf(c);return q.db+q.par[0]+q.sb},
 sxLvl=c=>{const s=String(c.p.vl||''),t=s.indexOf('TTL')>=0;return{ttl:t,V:t?5:(+(s.match(/±(\d+)/)||[])[1]||12)}},
 sxByte=c=>{const v=parseInt(String(c.p.by==null?'':c.p.by).replace(/^0x/i,'').trim(),16);return(isNaN(v)?0:v&255)&((1<<sxCf(c).db)-1)},
 sxSl=()=>Math.floor(S.time*SX_BPS/SX_FR),sxPb=(n,p)=>p==='Even'?n&1:p==='Odd'?1-(n&1):p==='Mark'?1:0;

/* ---------- one serial character: [START][D0 .. Dn-1][PARITY][STOP] ---------- */
function sxFrame(by,cf){const n=cf.db;by&=(1<<n)-1;const B=[{n:'START',v:0,w:1}];let o=0;
 for(let i=0;i<n;i++){const v=(by>>i)&1;o+=v;B.push({n:'D'+i,v,w:1})}
 if(cf.par!=='None')B.push({n:'P',v:sxPb(o,cf.par),w:1});
 B.push({n:'STOP',v:1,w:cf.sb});let t=0;B.forEach(b=>{b.t=t;t+=b.w});return{by,B,len:t,cf}}
const sxLv=(F,j)=>{if(j<0||j>=F.len)return 1;for(const b of F.B)if(j<b.t+b.w)return b.v;return 1};   /* line level (1 = mark / idle) at bit-time j of a frame */
/* what a receiver with settings rx really reads: it starts on the falling edge, then looks at the middle of ITS OWN bit periods (Tr, in sender bit times) */
function sxDecode(F,rx){const Tr=F.cf.bd/rx.bd,n=rx.db,hp=rx.par!=='None',sm=[],at=k=>{const t=(k+.5)*Tr,v=sxLv(F,t);sm.push({t,v,k});return v};
 at(0);let by=0,o=0;for(let i=0;i<n;i++){const v=at(1+i);by|=v<<i;o+=v}
 let pe=0;if(hp){const p=at(1+n);pe=p!==sxPb(o,rx.par)?1:0}
 const fe=at(1+n+(hp?1:0))?0:1;return{by,pe,fe,sm,Tr,n,hp}}

/* ---------- analysis of every link (once per tick) ---------- */
function sxAnalyse(){
 const ns=S.comps.filter(sxIs),net=typeof S.net==='function'?S.net:k=>k;SX.g=[];
 ns.forEach(c=>{const r=c.s.x=c.s.x||{};if(!r.toJSON)Object.defineProperty(r,'toJSON',{value:()=>undefined,enumerable:false});const V=Math.max(1,+c.p.V||24),v=c.o?Math.abs(c.o.v):0,I=sx2(c)?{tx:2,rx:3,gd:4,rt:5,ct:6}:{tp:2,tn:3,rp:4,rn:5,gd:6},N={};
  for(const k in I)N[k]=net(c.id+'.'+I[k]);
  Object.assign(r,{N,pw:v>=.7*V?1:0,ov:v>1.3*V?1:0,gp:null,nq:0,nm:'',src:null,sw:0,hold:0,dn:'',up:'',upsw:0})});
 [232,422].forEach(k=>{const L=ns.filter(c=>sx2(c)===(k===232)),by={},seen=new Set(),sig=c=>{const N=c.s.x.N;return k===232?[N.tx,N.rx]:[N.tp,N.tn,N.rp,N.rn]};
  L.forEach(c=>sig(c).forEach(n=>(by[n]=by[n]||[]).push(c)));
  L.forEach(c0=>{if(seen.has(c0))return;const g=[],q=[c0];seen.add(c0);
   while(q.length){const x=q.pop();g.push(x);sig(x).forEach(n=>(by[n]||[]).forEach(y=>{if(!seen.has(y)){seen.add(y);q.push(y)}}))}
   g.sort((a,b)=>L.indexOf(a)-L.indexOf(b));k===232?sxG232(g):sxG422(g)})});
 SX.st=S.time}
/* serial settings of two ends must be equal */
function sxCmp(G,A,B){const x=sxCf(A),y=sxCf(B),d=[],q=(t,a,b)=>{if(a!==b)d.push(`${t} ${A.label} ${a} ≠ ${B.label} ${b}`)};
 q('baud rate',x.bd,y.bd);q('data bits',x.db,y.db);q('parity',x.par,y.par);q('stop bits',x.sb,y.sb);
 if(d.length){(G.mm=G.mm||[]).push(...d);G.mmc=1;G.iss.push([2,`serial settings differ (${d.join('; ')}) – the receiver looks at the line at the wrong moments or with the wrong frame layout, so the bytes arrive garbled or with parity (PE) / framing (FE) errors`])}}
/* cable length against the limit, picture of the edges */
function sxCable(G,L,mx,hard,name){const I=G.iss,b=G.bm;G.L=L;G.mx=mx;
 if(hard&&L>hard){I.push([2,`the cable is ${L} m – ${name} allows at most ${hard} m; use ${name==='RS232'?'RS422 or RS485':'a repeater'} or shorten it`]);G.cor=1}
 else if(L>mx*1.3){I.push([2,`a ${L} m cable is far too long for ${b} baud on ${name} (limit about ${+mx.toFixed(1)} m) – the edges blur and bits are lost; lower the baud rate or shorten the cable`]);G.cor=1}
 else if(L>mx)I.push([1,`a ${L} m cable is slightly too long for ${b} baud on ${name} (limit about ${+mx.toFixed(1)} m) – errors are likely; lower the baud rate or shorten the cable`]);
 G.sl=L>mx?Math.min(1,.3+(L/mx-1)*1.5):Math.min(.15,L/mx*.15);G.nz=L>mx?(G.k===232?.3:.25):0}

function sxG232(g){
 const G={k:232,nodes:g,iss:[],ld:g[0],q:0,rg:0,nm:'RS232 link ('+g.map(c=>c.label).join(' – ')+')'},I=G.iss,add=(q,t)=>I.push([q,t]);SX.g.push(G);g.forEach(c=>c.s.x.gp=G);
 if(g.length===1){const r=g[0].s.x;if(r.N.tx===r.N.rx){G.loop=1;r.src=g[0];G.nm='RS232 loop-back ('+g[0].label+')'}else{G.alone=1;return}}
 else if(g.length>2){add(2,`${g.length} devices share these wires – RS232 is a point-to-point link (one transmitter and one receiver per wire); use RS422 or RS485 for more devices`);
  g.forEach(c=>{c.s.x.nq=2;c.s.x.nm='is on a wire shared by more than two devices – RS232 links only two devices'});G.bad=1}
 else{const[A,B]=g,a=A.s.x,b=B.s.x,tt=a.N.tx===b.N.tx,rr=a.N.rx===b.N.rx,ab=a.N.tx===b.N.rx,ba=b.N.tx===a.N.rx;
  if(ab)b.src=A;if(ba)a.src=B;
  if(tt){add(2,`TX of ${A.label} is wired to TX of ${B.label} – two transmitters drive one wire and nobody listens; between two devices the wires must be crossed (TX → RX and RX → TX, a “null modem” cable)`);a.nq=b.nq=2;a.nm=b.nm='has its TX wired to the TX of the other device – cross the cable: TX to RX'}
  if(rr){add(2,`RX of ${A.label} is wired to RX of ${B.label} – nobody sends on that wire; cross the cable (TX → RX and RX → TX)`);a.nq=b.nq=2;a.nm=a.nm||'has its RX wired to the RX of the other device – cross the cable: RX to TX';b.nm=b.nm||a.nm}
  if(!tt&&!rr&&ab!==ba){const w=ab?B:A,o=ab?A:B;add(1,`one direction only: ${w.label} cannot reach ${o.label} – wire TX of ${w.label} to RX of ${o.label}`)}
  if(a.N.gd!==b.N.gd){add(2,`GND of ${A.label} and ${B.label} are not wired together – RS232 measures every voltage against GND, so without it the receiver sees nothing; wire GND to GND`);G.ng=1}
  [[A,B,a,b],[B,A,b,a]].forEach(([X,Y,x,y])=>{if(X.p.flow!=='RTS/CTS')return;const w=x.N.ct===y.N.rt;x.hold=!w||!y.pw?1:0;
   if(!w)add(2,`${X.label} uses RTS/CTS flow control but its CTS is not wired to the RTS of ${Y.label} – it waits for ever for “clear to send” and never transmits`)})}
 const bm=Math.max(...g.map(c=>sxCf(c).bd)),L=Math.max(...g.map(sxLen)),ttl=g.map(c=>sxLvl(c).ttl);G.bm=bm;
 if(g.length===2)sxCmp(G,g[0],g[1]);
 if(g.length===2&&ttl[0]!==ttl[1]){add(2,`one device sends 0 / 5 V TTL levels and the other expects RS232 levels (±3 V to ±15 V): a TTL “1” never gets below −3 V, so the RS232 side reads garbage – and ±12 V can destroy a TTL input; fit a level converter (MAX232)`);G.lvx=1}
 else if(ttl.every(x=>x)&&ttl.length)add(1,'0 / 5 V TTL levels are not RS232 – this works only over a very short wire (about 1 m); real RS232 uses ±5 V to ±15 V');
 sxCable(G,L,bm<=SX_LB?SX_RL:Math.max(.3,SX_RL*SX_LB/bm),0,'RS232');
 G.q=Math.max(0,...I.map(i=>i[0]))}

function sxG422(g){
 const G={k:422,nodes:g,iss:[],ld:g[0],q:0,rep:[],pm:[],nm:'RS422 bus ('+g.slice(0,4).map(c=>c.label).join(', ')+(g.length>4?' …':'')+')'},I=G.iss,add=(q,t)=>I.push([q,t]);SX.g.push(G);g.forEach(c=>c.s.x.gp=G);
 if(g.length<2){G.alone=1;return}
 const mas=g.filter(sxM),ref=mas.find(c=>c.s.x.pw)||mas[0],pr=(c,a,b)=>[c.s.x.N[a],c.s.x.N[b]],
  rel=(p,q)=>p[0]===p[1]?'short':p[0]===q[0]&&p[1]===q[1]?'ok':p[0]===q[1]&&p[1]===q[0]?'sw':(p[0]===q[0]||p[1]===q[1]||p[0]===q[1]||p[1]===q[0])?'part':'none';
 G.ref=ref;G.pm=mas.filter(c=>c.s.x.pw);G.col=G.pm.length>1;G.bm=Math.max(...g.map(c=>sxCf(c).bd));
 if(ref){const mt=pr(ref,'tp','tn'),mr=pr(ref,'rp','rn');
  g.forEach(X=>{if(X===ref||sxM(X))return;const x=X.s.x,xt=pr(X,'tp','tn'),xr=pr(X,'rp','rn'),dn=rel(xr,mt),up=rel(xt,mr),tt=rel(xt,mt);x.dn=dn;x.up=up;
   if(xt[0]===xt[1]||xr[0]===xr[1]){x.nq=2;x.nm='has the two wires of a pair shorted together (TX+ to TX−, or RX+ to RX−)'}
   else if(tt!=='none'){x.nq=2;x.nm='has its TX wired to the TX of the master – two drivers on one pair; wire TX+ / TX− of a slave to RX+ / RX− of the master'}
   else if(dn==='part'||up==='part'){x.nq=2;x.nm='has only one wire of a pair connected – each pair needs both wires (+ and −)'}
   else{
    if(dn==='none'){x.nq=2;x.nm='hears nothing: its RX+ / RX− are not wired to TX+ / TX− of the master'}
    else if(dn==='sw'){x.sw=1;x.nq=2;x.nm='has RX+ and RX− swapped – it sees every bit upside down and cannot understand the master'}
    if(up==='none'){x.nq=x.nq||1;x.nm=x.nm||'cannot answer: its TX+ / TX− are not wired to RX+ / RX− of the master'}
    else if(up==='sw'){x.upsw=1;x.nq=2;x.nm=x.nm||'has TX+ and TX− swapped – the master sees every answer upside down'}
    if(dn==='ok'||dn==='sw')x.src=ref;
    if((dn==='ok'||dn==='sw')&&(up==='ok'||up==='sw'))G.rep.push(X)}
   if(X.s.x.pw)sxCmp(G,ref,X)})}
 const sl=g.filter(c=>c.s.x.src),nRx=sl.length,nT=sl.filter(c=>c.p.term==='ON').length,mT=ref&&ref.p.term==='ON',L=Math.max(...(mas.length?mas:g).map(sxLen)),b=G.bm,mx=rsMax(b),lc=rsLc(b),
  Rin=4000/Math.max(1,nRx),Rd=nT?1/(1/Rin+nT/120):Rin,Ru=mT?1/(1/4000+1/120):4000,Rl=RS_RL*L;
 G.vd=RS_VS*Rd/(Rd+RS_RS+Rl);G.vu=RS_VS*Ru/(Ru+RS_RS+Rl);Object.assign(G,{nRx,nT,mT,lc});
 sxCable(G,L,mx,1200,'RS422');
 if(Math.min(G.vd,G.vu)<.2){add(2,`the signal at the far end is only ${Math.min(G.vd,G.vu).toFixed(2)} V (a receiver needs at least 0.2 V) – the cable is too long or the terminations load the driver too much`);G.cor=1}
 else if(Math.min(G.vd,G.vu)<.5)add(1,`the signal at the far end is weak (${Math.min(G.vd,G.vu).toFixed(2)} V, receivers need 0.2 V) – shorten the cable or check the terminations`);
 if(L>lc){if(nT===0)add(1,`no termination: at ${b} baud a ${L} m cable needs 100–120 Ω across RX+ / RX− of the LAST slave, otherwise the signal bounces back (ringing) and bits are damaged`);
  if(!mT)add(1,'the RX pair of the master is not terminated – the answers bounce at the master end; switch Termination ON on the master (it is the far end of the answer pair)')}
 if(nT>1)add(1,`${nT} slaves have termination ON – only the LAST receiver on the cable is terminated; ${nT} × 120 Ω in parallel overload the driver`);
 if(nRx>10)add(1,`${nRx} receivers on one driver – RS422 allows 10 (4 kΩ each); use fewer slaves or RS485`);
 if(!mas.length)add(1,'there is no master on this bus – nobody sends');
 else if(!G.pm.length)add(1,'the master has no power – nobody sends');
 else if(G.col)add(2,`${G.pm.length} masters are powered – two drivers on one pair send at the same time (collision) and every byte is destroyed; RS422 has one driver`);
 else if(!G.rep.length)add(1,'the master gets no answer – no powered slave has both its RX pair and its TX pair wired to the master');
 const gw=g.filter(c=>S.wires.some(w=>w.a===c.id+'.6'||w.b===c.id+'.6')),com=gw.length===g.length&&new Set(g.map(c=>c.s.x.N.gd)).size===1;
 if(!com&&L>100)add(1,'the GND terminals (signal ground / shield) are not all wired together – on a long cable the devices sit at different ground voltages (receivers tolerate only ±7 V)');
 const r=L/lc;G.rg=r>1?Math.min(1,.15+.1*r)*((nT===1&&mT)?.08:(nT===0&&!mT)?1:.55):0;
 G.q=Math.max(0,...I.map(i=>i[0]))}

/* ---------- what is on the wire in slot k ---------- */
function sxDrv(c,k){const r=c.s.x;if(!r||!r.pw)return null;const G=r.gp;
 if(sx2(c)){if(r.hold)return null}
 else{if(!G||G.alone)return null;if(sxM(c)){if(!G.pm.includes(c))return null}else if(!(G.rep.length&&G.rep[k%G.rep.length]===c))return null}
 return sxFrame(sxByte(c),sxCf(c))}
function sxFrom(c,k){const r=c.s.x,G=r&&r.gp;if(!G||G.alone)return null;
 if(sx2(c))return r.src&&sxDrv(r.src,k)?r.src:null;
 if(sxM(c))return G.pm.length===1&&G.pm[0]===c&&G.rep.length?G.rep[k%G.rep.length]:null;
 return r.src&&sxDrv(r.src,k)?r.src:null}
/* damage done by the wiring to a byte going from "from" to c */
function sxWire(from,c){const r=c.s.x,G=r&&r.gp,o={bad:0,dead:0,txt:[]};if(!G||!from)return o;
 if(G.cor){o.bad|=1;o.txt.push('the cable is too long – the edges blur and bits are damaged')}
 if(G.col){o.bad|=2;o.txt.push('two masters sent together (collision)')}
 if(G.k===232){if(G.ng){o.dead=1;o.txt.push('no common GND – the receiver sees nothing')}if(G.lvx){o.bad|=4;o.txt.push('TTL levels against RS232 levels')}}
 else if(sxM(c)?from.s.x.upsw:r.sw){o.bad|=8;o.txt.push('the wires of the pair are swapped – every bit is inverted')}
 return o}
/* what node c really receives from "from": decode with its own settings, then the damage of the wiring */
function sxEval(from,c,k,live){const F=sxFrame(sxByte(from),sxCf(from)),cf=sxCf(c),d=sxDecode(F,cf),w=live?sxWire(from,c):{bad:0,dead:0,txt:[]},m=(1<<cf.db)-1;
 if(w.dead)return{from,F,d,w,dead:1,ok:0,by:0,pe:0,fe:0};
 let by=d.by,pe=d.pe,fe=d.fe;
 if(w.bad&1)by=(by^(1+((k*37+5)%254)))&m;
 if(w.bad&6)by=(by*37+11+k*29)&m;
 if(w.bad&8){by=~by&m;fe=1}
 return{from,F,d,w,by,pe,fe,ok:!(pe||fe)&&by===F.by&&!w.bad?1:0}}
const sxRecv=(c,k)=>{const f=sxFrom(c,k);return f?sxEval(f,c,k,1):null};
/* short state text + colour class of a node */
function sxNow(c){const r=c.s.x;if(!r)return['starting','mu'];if(!r.pw)return['NO POWER','er'];const G=r.gp,k=sxSl(),F=sxDrv(c,k);
 if(!G||(G.alone&&!(F&&sx2(c))))return['not linked','mu'];if(G.alone)return['TX '+sxHx(F.by)+' · not linked','mu'];
 const x=sxRecv(c,k),t=[];let cl='ok';
 if(F)t.push('TX '+sxHx(F.by));else if(r.hold){t.push('WAIT CTS');cl='wa'}
 if(x){if(x.dead){t.push('NO SIGNAL');cl='er'}else{t.push('RX '+sxHx(x.by)+(x.ok?' ✓':x.pe?' ✗ PE':x.fe?' ✗ FE':' ✗'));if(!x.ok)cl='er'}}
 else if(!sx2(c)&&sxM(c)&&G.col){t.push('COLLISION');cl='er'}
 if(!t.length){t.push(sx2(c)?'idle':sxM(c)?'NO ANSWER':'listening');cl=sxM(c)&&!sx2(c)?'wa':'mu'}
 return[t.join(' · '),cl]}
const sxCol=k=>k==='ok'?'var(--ok)':k==='er'?'var(--er)':k==='wa'?'#e08a00':'';

/* ---------- the little oscilloscope on the symbol ---------- */
/* normalised level (about -1.3 … +1.3) of one bit as the driver of node c makes it;  rxn = the node that listens (RS422: signal after the cable), null = at the driver */
function sxNorm(c,bit,rxn){
 if(sx2(c)){const q=sxLvl(c);return q.ttl?(bit?5:0)/12:(bit?-q.V:q.V)/12}          /* RS232: mark (1) = negative voltage, space (0) = positive; TTL: mark = 5 V */
 const G=c.s.x&&c.s.x.gp,a=rxn&&G?Math.min(1.3,(sxM(rxn)?G.vu:G.vd)/RS_VN):1;return(bit?1:-1)*a}   /* RS422: TX+ above TX- = 1 */
/* second-order line model: sharp edges on a good cable, round edges on a long one (w), ringing without termination (z < 1), noise */
function sxSim(lv,t,sh){const NW=12,dt=.04,w=sh.w,z=sh.z,o=[],u0=t-NW-2,n=Math.round((NW+2)/dt);let y=lv(u0),v=0;
 for(let i=0;i<=n;i++){const u=u0+i*dt;v+=(w*w*(lv(u)-y)-2*z*w*v)*dt;y+=v*dt;if(i%2===0&&u>=t-NW)o.push(y+(sh.nz?sh.nz*(rsH(u*8)-.5):0))}return o}
function sxScope(c,pv){
 const r=c.s.x,G=pv?null:r.gp,t=pv?14:S.time*SX_BPS,dif=!sx2(c),hh=5,x0=-36,W=78,
  sh=G&&!G.alone?{w:24*(1-.9*G.sl),z:G.rg?Math.max(.15,1-G.rg*1.2):1,nz:G.nz}:{w:24,z:1,nz:0};
 let ltx,lrx;
 if(pv){const F=sxFrame(sxByte(c),sxCf(c)),f=u=>{const k=Math.floor(u/SX_FR);return sxLv(F,u-k*SX_FR-SX_FS)};ltx=u=>sxNorm(c,f(u),null);lrx=u=>sxNorm(c,f(u),c)}
 else{ltx=u=>{const k=Math.floor(u/SX_FR),F=sxDrv(c,k);return sxNorm(c,F?sxLv(F,u-k*SX_FR-SX_FS):1,null)};
  lrx=u=>{const k=Math.floor(u/SX_FR),f=sxFrom(c,k);if(!f||(G&&G.k===232&&G.ng))return 0;const F=sxFrame(sxByte(f),sxCf(f));let n=sxNorm(f,sxLv(F,u-k*SX_FR-SX_FS),c);
   if(dif&&(sxM(c)?f.s.x.upsw:r.sw))n=-n;return n}}
 const tr=(lv,cy,col)=>{const o=sxSim(lv,t,sh);let a='',b='';
  o.forEach((v,i)=>{const x=(x0+W*i/(o.length-1)).toFixed(1),y=Math.max(-1.35,Math.min(1.35,v))*hh;a+=(i?'L':'M')+x+' '+(cy-y).toFixed(1);if(dif)b+=(i?'L':'M')+x+' '+(cy+y).toFixed(1)});
  return`<path d="M${x0} ${cy}H${x0+W}" style="stroke:#c8d3dc;stroke-width:.5;stroke-dasharray:2 2;fill:none"/>`+(dif?`<path d="${b}" style="fill:none;stroke:${col};stroke-opacity:.5;stroke-width:.9;stroke-linejoin:round"/>`:'')+`<path d="${a}" style="fill:none;stroke:${col};stroke-width:1;stroke-linejoin:round"/>`};
 const flat=cy=>`<path d="M${x0} ${cy}H${x0+W}" style="stroke:#c8d3dc;stroke-width:.6;stroke-dasharray:2 2;fill:none"/>`,live=pv||(r.pw&&!(G&&G.alone&&!sx2(c)));
 return`<rect x="${x0}" y="-12.5" width="${W}" height="25" style="fill:var(--gd);stroke:none"/>`+
  (live?tr(ltx,-6.5,'#e08a00')+tr(lrx,6.5,'#2f7fae'):flat(-6.5)+flat(6.5))+
  `<text x="-47" y="-4.5" class="mt" style="font-size:6px;text-anchor:start;fill:#e08a00;font-weight:700">TX</text><text x="-47" y="8.5" class="mt" style="font-size:6px;text-anchor:start;fill:#2f7fae;font-weight:700">RX</text>`}
function sxSym(c,o,cl){const r=c.s.x,a=!!S.run&&!!c.o&&!!r&&!!r.gp,pv=!a,nw=pv?['','']:sxNow(c),L=(x,y,t)=>`<text x="${x}" y="${y}" class="mt" style="font-size:7px">${t}</text>`,
  ti=sx2(c)?'RS232':'RS422 '+(sxM(c)?'MASTER':'SLAVE'),nm=D[c.type].t.slice(2).map(q=>q[2]);
 return`<rect x="-50" y="-34" width="100" height="68" rx="3" class="s"/><text y="-18" class="tx" style="font-size:8.5px">${ti}</text>`+sxScope(c,pv)+
  `<text x="-47" y="21" class="mt" style="font-size:7px;text-anchor:start${nw[1]?';fill:'+sxCol(nw[1])+';font-weight:700':''}">${esc(pv?c.p.baud+' baud':nw[0])}</text>`+
  `<text x="47" y="21" class="mt" style="font-size:7px;text-anchor:end">${sxFm(c)}</text>`+
  `<text x="0" y="-27" class="mt" style="font-size:6.5px">${c.p.baud} bd</text>`+L(-20,-27,'L+')+L(20,-27,'M')+nm.map((n,i)=>L(-40+20*i,31,n)).join('')}

/* ---------- Properties text ---------- */
function sxNote(c){const r=c.s.x,G=r&&r.gp,on=S.run&&c.o;if(!on||!G||!r.pw)return'';
 let h=`<p class=mu><b>Now:</b> ${esc(sxNow(c)[0])}`;
 if(G.alone)return h+'</p>';
 h+=` · link ${G.q===0?'OK':G.q===1?'MARGINAL':'BAD'}<br>Cable ${G.L} m (limit ≈ ${+G.mx.toFixed(1)} m at ${G.bm} baud)`;
 if(G.k===422)h+=`<br>Receivers on the master’s pair ${G.nRx} (max 10) · last slave terminated ${G.nT===1?'yes':G.nT?G.nT+' (too many)':'no'} · master RX terminated ${G.mT?'yes':'no'}<br>Signal at the far end ${G.vd.toFixed(2)} V / back at the master ${G.vu.toFixed(2)} V (receivers need ≥ 0.2 V)`;
 else h+=`<br>Driver level ±${sxLvl(c).V} V · receiver threshold ±3 V · ${c.p.flow==='RTS/CTS'?'RTS/CTS flow control '+(r.hold?'<b>waiting</b>':'ready'):'no flow control'}`;
 if(G.mmc)h+=`<br><b>Settings differ:</b> ${esc(G.mm.slice(0,3).join('; '))}`;
 return h+'<br><span class=mu>Select the part again to refresh these numbers.</span></p>'}
const sxBtn='<div class=row><button data-clk=sv>▶ Serial Viewer</button></div>';

/* ---------- the parts ---------- */
const sxT2=[[-20,-40,'L+'],[20,-40,'M'],[-40,40,'TX'],[-20,40,'RX'],[0,40,'GND'],[20,40,'RTS','o'],[40,40,'CTS','o']],
 sxT4=[[-20,-40,'L+'],[20,-40,'M'],[-40,40,'TX+'],[-20,40,'TX-'],[0,40,'RX+'],[20,40,'RX-'],[40,40,'GND','o']];
const sxP=(bd,def)=>({baud:[def,'','Baud rate (bits per second) – must be the same at both ends',bd],db:['8','','Data bits per character (5–8)',SXDB],par:['None','','Parity bit: None, Even, Odd, Mark (always 1) or Space (always 0)',SXPA],sb:['1','','Stop bits (1, 1.5 or 2)',SXSB]});
const sxCm={cat:'Communication',sy:34,vs:1,bb:[-56,-52,112,104],cl:c=>false,el:D.rs485.el,tk:c=>{if(SX.st!==S.time)sxAnalyse()},rst:c=>{c.s.x=null;SX.st=-1},g:sxSym,clk:(c,a)=>{if(a==='sv')sxvOpen(c)}};
D.rs232={...sxCm,n:'RS232 serial link (DB9: TX, RX, GND, RTS, CTS)',ds:'RS232 serial port COM DB9 TX RX GND RTS CTS flow control baud rate parity data bits stop bits null modem 15 m +12 V -12 V UART point-to-point oscilloscope',pre:'SL',t:sxT2,
 p:{...sxP(SXB2,'9600'),flow:[SXFL[0],'','Flow control: RTS/CTS = send only when the other side asserts CTS',SXFL],vl:[SXLV[0],'','Driver output voltage (RS232 = ±5 … ±15 V, usually ±12 V)',SXLV],
  len:[5,'m','Cable length of the link (m) – the longer of the two ends counts (RS232 limit 15 m)'],by:['41','txt','Byte this device sends (hex 00–FF, 41 = “A”)'],V:D.rs485.p.V},
 st:c=>{const r=c.s.x;if(!c.o)return'STOPPED';if(!r||!r.gp)return'STARTING';if(!r.pw)return'NO POWER – needs '+c.p.V+' V on L+ / M';const G=r.gp,n=sxNow(c)[0];
  if(G.alone)return n+' – wire TX and RX to another RS232 device (TX → RX, RX → TX) and GND to GND';
  if(r.nq)return`${n} – ${r.nm}`;return`${n} – ${G.q===0?'link OK':G.q===1?'link MARGINAL':'link BAD'} · ${c.p.baud} baud ${sxFm(c)} · ${G.L} m (limit ${+G.mx.toFixed(1)} m)${G.mmc?' · SETTINGS DIFFER':''}`},
 msg:c=>sxMsg(c),
 pp:c=>`<p class=mu><b>RS232</b> links <b>two</b> devices with three wires: <b>TX</b> to the <b>RX</b> of the other device, <b>RX</b> to its <b>TX</b> (crossed), and <b>GND</b> to <b>GND</b>. <b>RTS / CTS</b> are optional (flow control). Maximum cable length <b>15 m</b>, voltage about <b>±12 V</b>. Give the part power on <b>L+ / M</b>. Baud rate, data bits, parity and stop bits must be the <b>same at both ends</b> – otherwise the data is garbled. A wire from TX to RX of the same device is a <b>loop-back</b> test. Make the symbol bigger (Size %) to read the scope; press <b>Help</b> for the full explanation.</p>`+sxBtn+sxNote(c)};
D.rs422={...sxCm,n:'RS422 serial link (4-wire full-duplex: TX+, TX−, RX+, RX−)',ds:'RS422 serial 4-wire full duplex differential TX+ TX- RX+ RX- point-to-multipoint 1200 m baud rate parity data bits stop bits termination 10 receivers UART oscilloscope',pre:'SQ',t:sxT4,
 p:{role:[SXRO[0],'','Role: Master (the one driver, sends every request) or Slave (receives, answers when polled)',SXRO],...sxP(SXB4,'9600'),term:[SXO[0],'','Termination 120 Ω across RX+ / RX− (only at the LAST receiver; on the master for the answer pair)',SXO],
  len:[300,'m','Cable length of the WHOLE bus (m) (RS422 limit 1200 m)'],by:['41','txt','Byte this device sends (hex 00–FF, 41 = “A”)'],V:D.rs485.p.V},
 pv:c=>{const q={...D.rs422.p};if(!sxM(c))delete q.len;return q},chg:(c,k)=>k==='role',
 st:c=>{const r=c.s.x;if(!c.o)return'STOPPED';if(!r||!r.gp)return'STARTING';if(!r.pw)return'NO POWER – needs '+c.p.V+' V on L+ / M';const G=r.gp,n=sxNow(c)[0];
  if(G.alone)return'NOT ON A BUS – wire TX+ / TX− and RX+ / RX− to other RS422 devices';
  if(r.nq)return`${n} – ${r.nm}`;return`${n} – ${G.q===0?'bus OK':G.q===1?'bus MARGINAL':'bus BAD'} · ${G.nodes.length} devices · ${c.p.baud} baud ${sxFm(c)} · ${G.L} m (limit ${Math.round(G.mx)} m)${G.mmc?' · SETTINGS DIFFER':''}`},
 msg:c=>sxMsg(c),
 pp:c=>`<p class=mu>${sxM(c)?'This device is the <b>master</b>: the only driver. Its <b>TX+ / TX−</b> go to <b>RX+ / RX−</b> of every slave (up to 10); its <b>RX+ / RX−</b> take the answers from the <b>TX+ / TX−</b> of the slaves. Set the cable length of the <b>whole bus</b> here.':'This device is a <b>slave</b>: <b>RX+ / RX−</b> to <b>TX+ / TX−</b> of the master, <b>TX+ / TX−</b> to <b>RX+ / RX−</b> of the master. Switch <b>Termination ON</b> only at the <b>last</b> slave.'} <b>Four wires, full duplex</b>, up to <b>1200 m</b>. Power on <b>L+ / M</b>. Baud rate, data bits, parity and stop bits must match at every device, or the data is garbled. Press <b>Help</b> for the full explanation.</p>`+sxBtn+sxNote(c)};
function sxMsg(c){const r=c.s.x,o=[];if(!c.o||!r)return o;
 if(r.ov)o.push(['wa',`${c.label}: supply ${Math.abs(c.o.v).toFixed(0)} V is above the rating (${c.p.V} V) – the line driver could be damaged`]);
 if(!r.pw)o.push(['wa',`${c.label}: ${sx2(c)?'RS232':'RS422'} part has no power (needs ${c.p.V} V on L+ / M) – it is silent and deaf`]);
 const G=r.gp;if(!G||G.alone)return o;
 if(r.nm&&r.pw)o.push(['wa',`${c.label}: ${r.nm}`]);
 if(G.ld===c)G.iss.forEach(i=>o.push(['wa',`${G.nm}: ${i[1]}`]));return o}

/* ================= SERIAL VIEWER: one byte as a waveform, with the receiver's sampling points ================= */
const SXV={d:null,s:0,r:0,sp:'n',pz:0,el:0,last:0,raf:0,key:''},SXSP={s:700,n:380,f:160},SXC={START:'#2f7fae',D:'#e08a00',P:'#8e5bd6',STOP:'#12a36b'};
const sxvNodes=()=>S.comps.filter(sxIs),sxAs=v=>v>=33&&v<127?`“${esc(String.fromCharCode(v))}”`:v===32?'space':v===13?'CR':v===10?'LF':'',sxCl=n=>n==='START'||n==='P'||n==='STOP'?SXC[n]:SXC.D;
function sxvPeers(c){const G=c.s.x&&c.s.x.gp;if(G&&!G.alone){const p=G.nodes.filter(x=>x!==c);if(p.length)return p}return sxvNodes().filter(x=>x!==c)}
/* is there a real wire path from s to r that the running simulation knows about? */
function sxvValid(s,r){if(!S.run||!s.s.x||!r.s.x||!s.s.x.gp||s.s.x.gp!==r.s.x.gp||s.s.x.gp.alone)return 0;const G=s.s.x.gp;
 if(sx2(s))return r.s.x.src===s?1:0;return sxM(s)?(!sxM(r)&&r.s.x.src===s?1:0):(sxM(r)&&G.rep.includes(s)?1:0)}
function sxvModel(){const ns=sxvNodes(),s=ns.find(x=>x.id===SXV.s)||ns[0];if(!s)return null;SXV.s=s.id;
 const pe=sxvPeers(s);let r=ns.find(x=>x.id===SXV.r);if(!r)r=pe[0]||s;
 const ok=sxvValid(s,r),ev=sxEval(s,r,sxSl(),ok);return{ns,s,r,pe,ok,ev}}
function sxvSvg(M){const{s,r,ok,ev}=M,F=ev.F,d=ev.d,rx=sxCf(r),W=1000,X0=118,X1=W-24,smax=Math.max(...d.sm.map(q=>q.t)),T=Math.min(42,Math.max(F.len+3,smax+2)),px=(X1-X0)/T,X=t=>X0+(t+1.5)*px,
  q=sx2(s)?sxLvl(s):{ttl:0,V:0},inv=sx2(s)&&!q.ttl,yH=95,yL=145,Y=b=>inv?(b?yL:yH):(b?yH:yL),Y2=b=>Y(b)+140,tx=(x,y,t,st)=>`<text x="${x}" y="${y}" style="fill:var(--tx);font-size:12px;text-anchor:middle;${st||''}">${t}</text>`;
 let g='',w='',z='';
 /* sender cells */
 F.B.forEach(b=>{const c=sxCl(b.n),x1=X(b.t),x2=X(b.t+b.w);g+=`<rect x="${x1}" y="62" width="${x2-x1}" height="118" style="fill:${c};fill-opacity:.09"/><path d="M${x1} 56V182" style="stroke:${c};stroke-width:.8;stroke-dasharray:3 3"/>`+tx((x1+x2)/2,50,b.n,`font-weight:700;fill:${c}`)+tx((x1+x2)/2,200,b.v,'font-size:14px;font-weight:700')});
 g+=`<path d="M${X(F.len)} 56V182" style="stroke:#999;stroke-width:.8;stroke-dasharray:3 3"/>`+tx(X(-.75),200,'idle 1','font-size:11px;fill:var(--mu)')+tx(X(F.len+.9),200,'idle 1','font-size:11px;fill:var(--mu)');
 const pts=[[X(-1.5),Y(1)]];let cur=1;F.B.forEach(b=>{if(b.v!==cur){pts.push([X(b.t),Y(cur)],[X(b.t),Y(b.v)]);cur=b.v}});pts.push([X(F.len),Y(cur)],[X(F.len),Y(1)],[X(T-1.5),Y(1)]);
 w+=`<path d="${pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join('')}" style="fill:none;stroke:#e08a00;stroke-width:2.6;stroke-linejoin:round"/>`;
 /* receiver cells (its own bit time Tr) and sampling points */
 const rl=1+rx.db+(rx.par!=='None'?1:0)+rx.sb,nm=['START',...Array.from({length:rx.db},(_,i)=>'D'+i),...(rx.par!=='None'?['P']:[]),'STOP'];
 for(let k=0;k<=Math.ceil(rl);k++){const x=X(k*d.Tr);if(x<=X1+1)z+=`<path d="M${x} 232V330" style="stroke:var(--mu);stroke-width:.6;stroke-dasharray:2 4"/>`}
 nm.forEach((n,k)=>{const x=X((k+.5)*d.Tr),bad=(n==='P'&&d.pe)||(n==='STOP'&&d.fe);if(x<X1)g+=tx(x,346,n,`font-weight:700;fill:${bad?'var(--er)':sxCl(n)}`)});
 d.sm.forEach((m,k)=>{const x=X(m.t);if(x>X1)return;const bad=(nm[k]==='P'&&d.pe)||(nm[k]==='STOP'&&d.fe);
  z+=`<path d="M${x} 62V${Y2(m.v)}" style="stroke:${bad?'var(--er)':'#12a36b'};stroke-width:1;stroke-dasharray:1 3"/><circle cx="${x}" cy="${Y2(m.v)}" r="6" style="fill:${bad?'var(--er)':'#12a36b'}"/>`+tx(x,320,m.v,`font-size:14px;font-weight:700;fill:${bad?'var(--er)':'var(--tx)'}`)});
 g+=`<path d="M${X0} ${Y2(1)}H${X1}M${X0} ${Y2(0)}H${X1}" style="stroke:var(--mu);stroke-width:.5;opacity:.5"/>`;
 const lab=inv?['+'+q.V+' V = 0','−'+q.V+' V = 1']:q.ttl?['5 V = 1','0 V = 0']:['TX+>TX− = 1','TX+<TX− = 0'];
 const la=(y,t)=>`<text x="${X0-6}" y="${y+4}" style="fill:var(--mu);font-size:11px;text-anchor:end">${t}</text>`;
 g+=la(yH,lab[0])+la(yL,lab[1])+la(Y2(1),'1')+la(Y2(0),'0')+
  `<text x="${X0}" y="22" style="fill:var(--tx);font-size:13px;font-weight:700">Line: ${esc(s.label)} sends ${sxHx(F.by)} ${sxAs(F.by)} as ${sxFm(s)} at ${F.cf.bd} baud</text>`+
  `<text x="${X0}" y="226" style="fill:var(--tx);font-size:13px;font-weight:700">${esc(r.label)} (${sxFm(r)} at ${rx.bd} baud) looks at the line in the middle of ITS OWN bits (green dots):</text>`;
 return`<svg viewBox="0 0 ${W} 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="serial byte waveform"><defs><clipPath id="sxvC"><rect id="sxvR" x="0" y="0" width="0" height="360"/></clipPath></defs>${g}<g clip-path="url(#sxvC)">${w}${z}</g><path id="sxvL" d="M${X0} 56V330" style="stroke:var(--er);stroke-width:1.5;opacity:.8"/></svg>`.replace(/(\d+\.\d{2})\d+/g,'$1')+`<!--${X0}|${X1}|${T}-->`}
function sxvInfo(M){const{s,r,ok,ev}=M,F=ev.F,d=ev.d,a=sxCf(s),b=sxCf(r),m=(1<<b.db)-1,row=(t,x,y)=>`<tr${x!==y?' class=sxd':''}><td>${t}</td><td>${x}</td><td>${y}</td></tr>`,
  bits=F.B.map(x=>x.v).join(' '),why=[];
 if(a.bd!==b.bd)why.push(`<b>Baud rate:</b> one bit of the sender lasts ${(1e6/a.bd).toFixed(1)} µs but the receiver looks at the line every ${(1e6/b.bd).toFixed(1)} µs – it ${b.bd>a.bd?'looks too often and reads the same bit several times':'looks too rarely and skips bits'}, so the bits it collects belong to other positions of the frame.`);
 if(a.db!==b.db)why.push(`<b>Data bits:</b> the sender sends ${a.db} data bits, the receiver takes ${b.db}. ${b.db>a.db?'It swallows the parity or stop bit as data':'It stops early and takes data bits for parity and stop bit'}.`);
 if(a.par!==b.par)why.push(`<b>Parity:</b> the sender uses ${a.par}, the receiver expects ${b.par}. ${a.par==='None'?'It reads the stop bit as parity.':b.par==='None'?'It reads the parity bit as stop bit or as data.':'It calculates a different parity and reports a parity error (PE).'}`);
 if(a.sb!==b.sb)why.push(`<b>Stop bits:</b> the sender uses ${a.sb}, the receiver ${b.sb}. With fewer stop bits at the receiver the next character starts too early; with more it may find a 0 where it expects the stop bit (framing error, FE).`);
 let v;
 if(ev.dead)v=`<div class="sxvk er"><b>✗ Nothing arrives.</b> ${esc(ev.w.txt.join('; '))}.</div>`;
 else{const st=ev.ok?'ok':'er',got=`<b>${sxHx(ev.by)}</b> ${sxAs(ev.by)} = bits ${Array.from({length:b.db},(_,i)=>(ev.by>>i)&1).join(' ')} (D0 first)`;
  v=`<div class="sxvk ${st}"><b>${ev.ok?'✓ Received correctly':'✗ Garbled'}:</b> ${esc(r.label)} reads ${got}${ev.pe?' · <b style="color:var(--er)">PE parity error</b>':''}${ev.fe?' · <b style="color:var(--er)">FE framing error</b>':''}${ev.ok?' – the same as the byte that was sent.':` – the sender sent <b>${sxHx(F.by)}</b> ${sxAs(F.by)}.`}`+
   (ev.w.txt.length?`<br><b>Wiring:</b> ${esc(ev.w.txt.join('; '))}.`:'')+(why.length&&!ev.ok?`<ul>${why.map(x=>`<li>${x}</li>`).join('')}</ul>`:'')+
   (why.length&&ev.ok?'<br><span class=mu>The settings differ, but this particular byte survives by luck (for example the parity bit equals the stop-bit value) – other bytes will be damaged.</span>':'')+'</div>'}
 return`<div class=sxvk><b>${esc(s.label)} → ${esc(r.label)}</b>: ${ok?'these two devices are wired to each other in the simulation':'<span class=mu>not wired to each other (or ▶ Run is not pressed) – the picture shows the byte as if the wire were perfect</span>'}.<br>`+
  `<b>The character on the wire</b> (${F.len} bits = ${(F.len/a.bd*1000).toFixed(2)} ms at ${a.bd} baud, 1 bit = ${(1e6/a.bd).toFixed(1)} µs): START <b>0</b> · data ${F.B.filter(x=>/^D/.test(x.n)).map(x=>x.v).join(' ')} (D0 first) · ${a.par!=='None'?`parity ${F.B.find(x=>x.n==='P').v} (${a.par.toLowerCase()}) · `:''}STOP <b>1</b>. The animation is about ${Math.round(SXSP[SXV.sp]*a.bd/1000).toLocaleString('en')}× slower than real life.</div>`+v+
  `<table><tr><th>Setting</th><th>Sender ${esc(s.label)}</th><th>Receiver ${esc(r.label)}</th></tr>${row('Baud rate',a.bd,b.bd)}${row('Data bits',a.db,b.db)}${row('Parity',a.par,b.par)}${row('Stop bits',a.sb,b.sb)}</table>`+
  `<p class=mu>Red rows = the settings differ. Change them in Properties of either device and watch the green dots move away from the middle of the bits.</p>`}
function sxvOpen(c){let d=SXV.d;
 if(!d){d=SXV.d=document.createElement('dialog');d.className='lc sxv';document.body.appendChild(d);
  d.innerHTML=`<div class=lc-h><div><b>Serial Viewer – one byte on the wire</b><small>start bit · data bits · parity · stop bit, and what the receiver really reads</small></div><button class="lc-c" data-x title=Close>✕</button></div><div class=lc-b><div class=sxvr><label>Sender <select data-a=snd></select></label><label>Receiver <select data-a=rcv></select></label></div><div id=sxvW></div><div id=sxvI></div></div>
  <div class=lc-f><button data-a=pz title="Pause / play">⏸ Pause</button><button data-a=rp title="Play the byte again">↺ Replay</button><label>Speed <select data-a=sp><option value=s>Slow</option><option value=n selected>Normal</option><option value=f>Fast</option></select></label><span style="flex:1"></span><button class=pri data-x>Close</button></div>`;
  d.addEventListener('click',e=>{if(e.target.closest('[data-x]'))return d.close();const b=e.target.closest('button[data-a]');if(!b)return;if(b.dataset.a==='pz'){SXV.pz=!SXV.pz;b.textContent=SXV.pz?'▶ Play':'⏸ Pause'}else if(b.dataset.a==='rp'){SXV.el=0;SXV.pz=0;d.querySelector('[data-a=pz]').textContent='⏸ Pause'}});
  d.addEventListener('change',e=>{const a=e.target.dataset.a;if(a==='snd'){SXV.s=+e.target.value;SXV.r=0;SXV.el=0}else if(a==='rcv'){SXV.r=+e.target.value;SXV.el=0}else if(a==='sp')SXV.sp=e.target.value});
  d.addEventListener('close',()=>{SXV.raf=0})}
 SXV.s=c&&sxIs(c)?c.id:0;SXV.r=0;SXV.el=0;SXV.pz=0;SXV.key='';d.querySelector('[data-a=pz]').textContent='⏸ Pause';d.showModal();if(!SXV.raf){SXV.last=0;SXV.raf=requestAnimationFrame(sxvLoop)}}
function sxvLoop(ts){const d=SXV.d;if(!d||!d.open){SXV.raf=0;return}SXV.raf=requestAnimationFrame(sxvLoop);
 const M=sxvModel(),W=d.querySelector('#sxvW'),I=d.querySelector('#sxvI');
 if(!M){W.innerHTML='<p class=mu>Place an RS232 or RS422 part on the sheet first.</p>';I.innerHTML='';SXV.key='';return}
 const ev=M.ev,key=[M.s.id,M.r.id,M.ns.map(x=>x.id+x.label).join(),JSON.stringify([sxCf(M.s),sxCf(M.r),sxByte(M.s),sxLvl(M.s)]),M.ok,ev.by,ev.pe,ev.fe,ev.dead,ev.w.bad,!!S.run].join('|');
 if(key!==SXV.key){SXV.key=key;const sel=(a,v,all)=>d.querySelector('[data-a='+a+']').innerHTML=all.map(x=>`<option value=${x.id}${x.id===v?' selected':''}>${esc(x.label)} – ${sx2(x)?'RS232':sxM(x)?'RS422 master':'RS422 slave'} (${x.p.baud} ${sxFm(x)})</option>`).join('');
  sel('snd',M.s.id,M.ns);sel('rcv',M.r.id,M.ns);const h=sxvSvg(M);W.innerHTML=h;I.innerHTML=sxvInfo(M)}
 const m=(W.innerHTML.match(/<!--(\d+)\|(\d+)\|(\d+)-->/)||[0,118,976,14]).map(Number),T=m[3],tot=T*SXSP[SXV.sp];
 if(SXV.last&&!SXV.pz)SXV.el+=Math.min(100,ts-SXV.last);SXV.last=ts;if(SXV.el>tot+1500)SXV.el=0;
 const p=Math.min(1,SXV.el/tot),x=m[1]+p*(m[2]-m[1]),R=W.querySelector('#sxvR'),L=W.querySelector('#sxvL');
 if(R)R.setAttribute('width',x.toFixed(1));if(L)L.setAttribute('d',`M${x.toFixed(1)} 56V330`)}

/* ================= HELP (child first, then technical), wiring guide, easy words, panel size ================= */
const SXFR='<h4>Technical: one serial character (a UART frame)</h4>When nobody sends, the line rests at logic <b>1</b> (<i>mark</i>, the idle state). A character is sent as:'+
 '<table><tr><th>Part</th><th>Bits</th><th>Value</th></tr><tr><td>Start bit</td><td>1</td><td>always <b>0</b> (space) – its falling edge wakes the receiver</td></tr>'+
 '<tr><td>Data bits</td><td>5 to 8</td><td>the byte, <b>least significant bit (D0) first</b></td></tr>'+
 '<tr><td>Parity bit</td><td>0 or 1</td><td><b>Even</b>: the number of 1s (data + parity) becomes even · <b>Odd</b>: odd · <b>Mark</b>: always 1 · <b>Space</b>: always 0 · <b>None</b>: no parity bit</td></tr>'+
 '<tr><td>Stop bit(s)</td><td>1, 1.5 or 2</td><td>always <b>1</b> (mark) – gives the receiver time to finish and proves that the frame is aligned</td></tr></table>'+
 '<b>Baud rate</b> = bits per second; one bit lasts 1 ÷ baud (9600 baud → 104 µs, 115 200 baud → 8.7 µs). “8N1” = 8 data bits, no parity, 1 stop bit = <b>10 bits per character</b>, so 9600 baud carries 960 characters per second; 8E1 needs 11 bits.<br>'+
 '<b>Example:</b> the letter “A” = 0x41 = 01000001 as 8E1. D0 first: 1 0 0 0 0 0 1 0. Two 1s → the even-parity bit is 0. On the line: <code>0 | 1 0 0 0 0 0 1 0 | 0 | 1</code> (start | D0 … D7 | parity | stop).'+
 '<h4>Why the settings must match (garbled data)</h4>There is <b>no clock wire</b>. The receiver waits for the falling edge of the start bit and then looks at the line <b>in the middle of each bit time of its OWN settings</b>: the data bits, then parity, then the stop bit. If the settings differ it looks at the wrong moments or expects a different pattern:'+
 '<ul><li><b>Different baud rate</b> → it samples at the wrong times and reads bits from other positions: wrong characters and framing errors. About 2 % difference is tolerated, a factor of 2 is not.</li>'+
 '<li><b>Different number of data bits</b> → it takes the parity or stop bit as data (or the other way round).</li>'+
 '<li><b>Different parity</b> → <b>PE</b>, a parity error, when the parity it calculates differs from the bit it received; “None” against “Even” shifts everything by one bit.</li>'+
 '<li><b>Different stop bits</b> → <b>FE</b>, a framing error, when it finds a 0 where the stop bit (1) must be, or the next character starts too early.</li></ul>'+
 'Some combinations look right <i>by luck</i>: “A” sent as 7E1 and read as 8N1 arrives correctly because its parity bit happens to be 0 – other letters are damaged. The <b>Serial Viewer</b> (button in Properties) draws the receiver’s sampling points on the real waveform, so you can see why.';
const SXCMP='<h4>Comparison: RS232 vs RS422 vs RS485</h4><table style="width:100%;table-layout:fixed;font-size:12px;overflow-wrap:anywhere"><tr><th style="width:15%"></th><th>RS232</th><th>RS422</th><th>RS485</th></tr>'+
 '<tr><td>Standard</td><td>TIA/EIA-232</td><td>TIA/EIA-422</td><td>TIA/EIA-485</td></tr>'+
 '<tr><td>Signalling</td><td>single-ended (voltage against GND)</td><td>differential (balanced pair)</td><td>differential (balanced pair)</td></tr>'+
 '<tr><td>Wires</td><td>TX, RX, GND (+ RTS, CTS …)</td><td>2 pairs = 4 wires (+ GND / shield)</td><td>1 pair = 2 wires (+ GND), or 2 pairs in 4-wire mode</td></tr>'+
 '<tr><td>Direction</td><td>full duplex</td><td>full duplex (one pair per direction)</td><td>half duplex on 2 wires, full duplex on 4 wires</td></tr>'+
 '<tr><td>Topology</td><td>point-to-point: 1 driver, 1 receiver</td><td>point-to-multipoint: 1 driver, up to 10 receivers</td><td>multi-drop: up to 32 drivers and 32 receivers (unit loads)</td></tr>'+
 '<tr><td>Max. cable length</td><td><b>15 m</b> (50 ft, 2500 pF)</td><td><b>1200 m</b> (4000 ft) at ≤ 100 kbit/s</td><td><b>1200 m</b> at ≤ 100 kbit/s</td></tr>'+
 '<tr><td>Max. speed</td><td>20 kbit/s in the standard; 115.2 kbit/s common</td><td>10 Mbit/s up to about 12 m</td><td>10 Mbit/s up to about 12 m</td></tr>'+
 '<tr><td>Signal level</td><td>driver ±5 … ±15 V (usually <b>±12 V</b>); receiver threshold ±3 V; 1 = negative, 0 = positive</td><td>driver ≥ ±2 V differential (max. 6 V); receiver threshold ±200 mV</td><td>driver ≥ ±1.5 V differential into 54 Ω; receiver threshold ±200 mV</td></tr>'+
 '<tr><td>Common-mode range</td><td>needs a common GND</td><td>±7 V</td><td>−7 … +12 V</td></tr>'+
 '<tr><td>Receiver input</td><td>3 – 7 kΩ</td><td>4 kΩ minimum</td><td>12 kΩ minimum (1 unit load)</td></tr>'+
 '<tr><td>Termination</td><td>none</td><td>100 – 120 Ω at the last receiver</td><td>120 Ω at both ends of the cable</td></tr>'+
 '<tr><td>Bias (fail-safe)</td><td>not needed</td><td>not needed (driver always on)</td><td>needed on the idle bus (one set)</td></tr>'+
 '<tr><td>Noise immunity</td><td>poor</td><td>very good</td><td>very good</td></tr>'+
 '<tr><td>Typical use</td><td>PC COM port, console ports, modems, GPS, barcode readers</td><td>long point-to-point and one-to-many links, CNC, broadcast / machine control</td><td>Modbus RTU, PROFIBUS DP, BACnet MS/TP, DMX512</td></tr></table>'+
 '<p class=mu>Rule of thumb: <b>RS232</b> for a short cable between two devices, <b>RS422</b> when the cable is long or noisy or when one device talks to several listeners, <b>RS485</b> when many devices share one cable (see the <i>RS485 node</i> and <i>Modbus RTU</i> parts).</p>';
const SXDB9='<h4>DB9 (DE-9) connector – pin table</h4>A PC or terminal is a <b>DTE</b> (data terminal equipment) with a <b>male</b> 9-pin connector; a modem is a <b>DCE</b> with a female connector, and a straight cable (pin 1 to 1 … 9 to 9) joins them. Between two DTEs (PC to PC, PC to the console of a PLC) you need a <b>null-modem (crossover) cable</b>: 2 ↔ 3, 7 ↔ 8, 5 ↔ 5 (usually also 4 ↔ 6). In this simulator the terminals are named by function, so you <b>always wire TX to RX</b> – that is the crossover. The minimum is three wires: pins 2, 3 and 5.'+
 '<table><tr><th>Pin</th><th>Signal</th><th>Name</th><th>Direction (DTE)</th><th>In this simulator</th></tr>'+
 '<tr><td>1</td><td>DCD</td><td>Data carrier detect</td><td>in</td><td>not simulated</td></tr><tr><td><b>2</b></td><td><b>RXD</b></td><td>Receive data</td><td>in</td><td><b>RX</b></td></tr>'+
 '<tr><td><b>3</b></td><td><b>TXD</b></td><td>Transmit data</td><td>out</td><td><b>TX</b></td></tr><tr><td>4</td><td>DTR</td><td>Data terminal ready</td><td>out</td><td>not simulated</td></tr>'+
 '<tr><td><b>5</b></td><td><b>GND</b></td><td>Signal ground</td><td>–</td><td><b>GND</b></td></tr><tr><td>6</td><td>DSR</td><td>Data set ready</td><td>in</td><td>not simulated</td></tr>'+
 '<tr><td><b>7</b></td><td><b>RTS</b></td><td>Request to send</td><td>out</td><td><b>RTS</b> (optional)</td></tr><tr><td><b>8</b></td><td><b>CTS</b></td><td>Clear to send</td><td>in</td><td><b>CTS</b> (optional)</td></tr>'+
 '<tr><td>9</td><td>RI</td><td>Ring indicator</td><td>in</td><td>not simulated</td></tr></table>';
const SXH232='<b>RS232</b> is the oldest and simplest way for <b>two devices</b> to talk to each other over a cable. It is the “COM port” of older PCs, the console port of switches and PLCs, and the plug of modems, barcode readers and GPS boxes.'+
 '<h4>Explained for a child</h4><div class=whone>Two friends sit far apart. Each holds <b>two tin-can phones</b>: one string is for <b>talking</b> (<b>TX</b>), one is for <b>listening</b> (<b>RX</b>). The talking string of friend A goes to the listening can of friend B and the other way round – the strings are <b>crossed</b>. Both friends also stand on the <b>same floor</b> (<b>GND</b>), so they agree what “up” and “down” mean.</div>'+
 '<ul><li>They do not say words. They send each letter as a <b>row of flashes</b>: first one “get ready” flash (the <i>start bit</i>), then <b>8 flashes that spell the letter</b> (the <i>data bits</i>), maybe one “check” flash (<i>parity</i>) so the listener can notice a mistake, and one “I am done” flash (the <i>stop bit</i>).</li>'+
 '<li>A flash is a <b>big voltage</b>: about <b>+12 volts</b> for a 0 and <b>−12 volts</b> for a 1 – a loud shout. It is fine for a few metres, but a shout fades: after about <b>15 metres</b> the words get blurry.</li>'+
 '<li>The friends must agree on the <b>speed</b> (baud), on <b>how many flashes</b> make a letter, on <b>whether there is a check flash</b> and on <b>how long the “done” flash lasts</b>. If one friend talks slowly and the other listens fast, or they expect different numbers of flashes, the letters turn into <b>gibberish</b>. The simulator shows exactly that when the settings do not match.</li>'+
 '<li><b>RTS</b> and <b>CTS</b> are two little signs: “<i>May I talk?</i>” (request to send) and “<i>Yes, go ahead</i>” (clear to send) – a slow listener can say “wait a moment”.</li></ul>'+
 SXFR+
 '<h4>Technical: RS232 (TIA/EIA-232)</h4><ul><li><b>Single-ended:</b> every signal is a voltage on one wire, measured against the common <b>GND</b>. Without GND the receiver has no reference – the simulator reports “no common GND”.</li>'+
 '<li><b>Voltage levels</b> (inverted logic!): logic <b>1 (mark)</b> = <b>−3 V … −15 V</b>, logic <b>0 (space)</b> = <b>+3 V … +15 V</b>; the range −3 … +3 V is undefined. Drivers give ±5 V … ±15 V, normally <b>±12 V</b> (about ±9 V from a MAX232 chip); receivers switch at about ±3 V. A 0 / 5 V <b>TTL</b> UART pin is <b>not</b> RS232 – it needs a level converter such as the MAX232.</li>'+
 '<li><b>Control lines</b> (RTS, CTS …) use the same levels: asserted = positive, off = negative.</li>'+
 '<li><b>Point-to-point:</b> one driver and one receiver per wire; <b>full duplex</b> – TX and RX work at the same time.</li>'+
 '<li><b>Distance:</b> the standard limits the cable capacitance to <b>2500 pF</b>, about <b>15 m (50 ft)</b> of ordinary cable at up to 19 200 baud; the faster, the shorter. The simulator uses 15 m up to 19 200 baud and 15 m × 19 200 ÷ baud above (2.5 m at 115 200 baud).</li>'+
 '<li><b>Speed:</b> 20 kbit/s in the original standard, 115.2 kbit/s very common, up to about 1 Mbit/s over a metre or two.</li></ul>'+
 SXDB9+
 '<h4>Flow control (RTS / CTS)</h4>Without it a fast sender can overrun a slow receiver. With <b>hardware flow control</b> each side sends only while the other side holds its <b>CTS</b> line asserted. Wire <b>RTS → CTS of the other device</b> and <b>CTS ← RTS of the other device</b>, and set <i>Flow control = RTS/CTS</i>. If the wires are missing the sender waits for ever (<b>WAIT CTS</b>). Software flow control (XON / XOFF characters) needs no extra wires and is not simulated.'+SXCMP;
const SXH422='<b>RS422</b> is a <b>four-wire, full-duplex</b> serial link for <b>long and noisy</b> cables: one device (the master) can send to <b>up to 10 receivers</b> over as much as <b>1200 m</b>.'+
 '<h4>Explained for a child</h4><div class=whone>Think of a teacher with a megaphone and ten students far away. The teacher talks through <b>two ropes that are wiggled in opposite directions</b> – when one goes up the other goes down. A student does not look at one rope, only at the <b>difference between the two</b>. A storm shakes both ropes the same way, so the difference stays the same and the message gets through – even <b>1200 metres</b> away.</div>'+
 '<ul><li><b>Four wires</b> = two pairs: one pair for the teacher’s voice (<b>TX+ / TX−</b> → every student’s <b>RX+ / RX−</b>) and one pair for the students’ answers (<b>TX+ / TX−</b> of the students → <b>RX+ / RX−</b> of the teacher). Both pairs work at the same time – that is <b>full duplex</b>, like a telephone.</li>'+
 '<li>The teacher sends letters as <b>rows of flashes</b>: a “get ready” flash (start bit), flashes that spell the letter (data bits), maybe a “check” flash (parity) and an “I am done” flash (stop bit).</li>'+
 '<li>All students must listen at the <b>same speed and in the same way</b> as the teacher talks. If a student expects another speed, another number of flashes, other parity or another stop bit, the letters turn into <b>gibberish</b>.</li>'+
 '<li>At the far end of the rope a small <b>curtain (a 120 Ω resistor)</b> soaks up the echo so it does not bounce back. Only the <b>last</b> student has it.</li>'+
 '<li>If the two ropes are <b>swapped</b> (+ and −), the student understands everything upside down.</li></ul>'+
 SXFR+
 '<h4>Technical: RS422 (TIA/EIA-422)</h4><ul><li><b>Balanced differential signalling:</b> every signal travels on a <b>twisted pair</b> driven in opposite directions; the receiver looks only at the <b>difference</b> (TX+ above TX− = logic 1, below = 0). Noise hits both wires equally and cancels out.</li>'+
 '<li><b>Levels:</b> driver output at least <b>±2 V</b> differential (up to 6 V) into 100 Ω; receivers switch at <b>±200 mV</b>; the common-mode voltage between the devices may be up to <b>±7 V</b>, so a ground reference (GND or the cable shield) is still recommended.</li>'+
 '<li><b>Four wires, full duplex:</b> one pair per direction (TX+ / TX− and RX+ / RX−) – both sides can talk at the same time. GND / shield is the fifth conductor.</li>'+
 '<li><b>Point-to-multipoint:</b> <b>one driver</b> (the master) feeds up to <b>10 receivers</b> (4 kΩ each) on the same pair. The slaves’ answers use a second pair that all slave drivers share; that needs drivers that switch off when they are not talking (<i>tri-state</i>) – exactly what <b>4-wire RS485</b> does. A plain RS422 driver is always on, so only one device may talk on a pair; two masters on one pair = collision.</li>'+
 '<li><b>Distance and speed:</b> up to <b>1200 m (4000 ft)</b> at up to about 100 kbit/s, 10 Mbit/s over about 12 m. The simulator uses min(1200 m, 100 000 000 ÷ baud).</li>'+
 '<li><b>Termination:</b> 100 – 120 Ω across the pair at the <b>far end</b> – the <b>last receiver</b> on the master’s pair, and the master’s own RX pair for the answers. It is needed on long cables or fast edges (the simulator asks for it above 2·10⁷ ÷ baud metres); only the last receiver is terminated, not every slave.</li>'+
 '<li><b>Wrong polarity:</b> + and − swapped inverts every bit – the receiver reads garbage and framing errors.</li></ul>'+
 '<h4>Wiring (this simulator)</h4><table><tr><th>Master</th><th>Slave 1, 2 … (up to 10)</th></tr><tr><td>TX+</td><td>RX+ (all slaves in parallel, daisy chain)</td></tr><tr><td>TX−</td><td>RX− (all slaves in parallel)</td></tr>'+
 '<tr><td>RX+</td><td>TX+ (all slaves in parallel)</td></tr><tr><td>RX−</td><td>TX− (all slaves in parallel)</td></tr><tr><td>GND</td><td>GND</td></tr></table>'+SXCMP;
const sxN=(k)=>['The symbol is a <b>two-trace oscilloscope</b>: <b style="color:#e08a00">orange</b> (top) = what this device <b>sends</b>, <b style="color:#2f7fae">blue</b> (bottom) = what <b>arrives</b>. '+(k===232?'RS232 rests at the <b>negative</b> level (−12 V = 1); the start bit jumps up to +12 V.':'Each trace is a pair: the second wire is drawn pale and mirrored; TX+ above TX− = 1.')+' Both directions run at the same time (full duplex)'+(k===232?'.':'; the master sends in every slot and the slaves answer in turn.')+' Make the part bigger (Size %) to read it.',
 'Under the scope: <b>TX 41</b> = this device is sending that byte, <b>RX 41 ✓</b> = received correctly, <b>RX 3F ✗ PE / FE</b> = garbled (parity or framing error)'+(k===232?', <b>WAIT CTS</b> = flow control is waiting, <b>NO SIGNAL</b> = no common GND.':', <b>NO ANSWER</b> = the master gets no reply, <b>COLLISION</b> = two masters.'),
 'Properties → <b>▶ Serial Viewer</b> draws one byte big: <b>start bit, data bits (D0 first), parity, stop bit</b> as a waveform, and the receiver’s own sampling points (green dots) with the byte it really decodes.',
 'Try it: give one device another <b>baud rate</b>, <b>parity</b>, number of <b>data bits</b> or <b>stop bits</b> – the received byte turns into garbage and the results table names the setting. '+(k===232?'Wire TX to TX, take away GND, set a 30 m cable, or choose TTL levels on one device. Wire TX to RX of the same device for a loop-back test.':'Swap TX+ and TX− on one slave, remove the termination of the last slave on a 1000 m cable, add two masters, or connect more than 10 slaves.')];
if(typeof HLP!=='undefined'){
 HLP.rs232=HL(SXH232,['Give each device 24 V on <b>L+</b> and <b>M</b>.','Wire <b>TX</b> of one device to <b>RX</b> of the other and <b>RX</b> to <b>TX</b> (crossed), and <b>GND</b> to <b>GND</b>.','Optional: <b>RTS</b> to <b>CTS</b> of the other device and <b>CTS</b> to its <b>RTS</b>, then set Flow control = RTS/CTS.','Set the same <b>baud rate, data bits, parity and stop bits</b> on both devices and keep the cable at 15 m or less.','Press <b>▶ Run</b>, then open the <b>Serial Viewer</b> in Properties.'],sxN(232),
  ['PC COM ports, console ports of switches, routers and PLCs, modems, barcode readers, GPS receivers, laboratory instruments, short CNC links.']);
 HLP.rs422=HL(SXH422,['Give every device 24 V on <b>L+</b> and <b>M</b>; one device is the <b>Master</b>, the others <b>Slaves</b> (up to 10).','Master <b>TX+ / TX−</b> to <b>RX+ / RX−</b> of every slave; <b>TX+ / TX−</b> of every slave to <b>RX+ / RX−</b> of the master; <b>GND</b> to <b>GND</b>.','Switch <b>Termination ON</b> at the <b>last slave</b> and on the <b>master</b> (for the answer pair) when the cable is long; set the cable length on the master.','Set the same <b>baud rate, data bits, parity and stop bits</b> on every device.','Press <b>▶ Run</b>, then open the <b>Serial Viewer</b> in Properties.'],sxN(422),
  ['Long point-to-point links (a PLC to a display or drive 500 m away), one controller talking to several receivers, CNC and machine control, broadcast video control; 4-wire RS485 uses the same wiring.']);
}
if(typeof WIR!=='undefined'){
 WIR.rs232={s:'Three wires link two devices: TX to RX (crossed), RX to TX, and GND to GND. RTS / CTS are optional. 24 V powers the box.',
  rows:[['l','L+','+24 V from the power supply','r',null,0],['l','M','0 V','b',null,1],['r','TX','RX of the other RS232 device (crossed)','o',null,2],['r','RX','TX of the other RS232 device (crossed)','o',null,3],['r','GND','GND of the other device (required)','pe',null,4],['r','RTS','CTS of the other device (optional)','o',null,5],['r','CTS','RTS of the other device (optional)','o',null,6]],
  tip:['<b>Cross the cable:</b> TX goes to RX and RX goes to TX – TX to TX gives nothing.','Always wire <b>GND</b>: RS232 measures every voltage against it.','Keep the cable at <b>15 m</b> or less (shorter at high baud rates).','Same baud rate, data bits, parity and stop bits at both ends; use RTS/CTS only if both ends support it and the two extra wires are fitted.']};
 WIR.rs422={s:'Four wires (two twisted pairs) give full duplex: TX± of the master to RX± of the slaves, TX± of the slaves to RX± of the master. 24 V powers the box.',
  rows:[['l','L+','+24 V from the power supply','r',null,0],['l','M','0 V','b',null,1],['r','TX+','RX+ of the other device(s)','o',null,2],['r','TX-','RX− of the other device(s)','o',null,3],['r','RX+','TX+ of the other device(s)','o',null,4],['r','RX-','TX− of the other device(s)','o',null,5],['r','GND','GND / shield of the other devices (recommended)','pe',null,6]],
  tip:['Use <b>twisted pairs</b>: TX+ with TX−, RX+ with RX−. + to + and − to − everywhere; one swapped device reads garbage.','One <b>master</b> (the only driver on its pair), up to <b>10</b> slaves; run the cable as one line, no stars.','Termination ON at the <b>last slave</b> and at the master (answer pair) on long cables; the cable length is set on the master.','Same baud rate, data bits, parity and stop bits on every device.']}}
if(typeof hlTerm==='function'){const _h=hlTerm,T={'L+':'Supply + (the part needs its own power)','M':'0 V of the supply','GND':'Signal ground: the common 0 V reference (required for RS232, recommended for RS422)',
  TX:'Transmit data (DB9 pin 3): the data this device sends – wire it to RX of the other device',RX:'Receive data (DB9 pin 2): the data this device receives – wire it to TX of the other device',RTS:'Request to send (DB9 pin 7): output of the handshake – wire it to CTS of the other device (optional)',CTS:'Clear to send (DB9 pin 8): input of the handshake – wire it to RTS of the other device (optional)'},
  T4={'L+':T['L+'],M:T.M,GND:T.GND,'TX+':'Transmit + (non-inverting): TX+ above TX− is a 1 – wire to RX+ of the receiver','TX-':'Transmit − (inverting) – wire to RX− of the receiver','RX+':'Receive + (non-inverting) – wire to TX+ of the sender','RX-':'Receive − (inverting) – wire to TX− of the sender'};
 hlTerm=(type,n)=>type==='rs232'?(T[String(n).trim()]||''):type==='rs422'?(T4[String(n).trim()]||''):_h(type,n)}
if(typeof CET!=='undefined'){CET.rs232='two friends with string phones – one string for talking, one for listening, crossed – sending each letter as a row of flashes (+12 V and −12 V).';
 CET.rs422='a teacher with a megaphone and up to ten students: the message travels on two ropes wiggled in opposite directions, so a storm cannot spoil it even 1200 m away.'}
if(typeof PNL_MAP!=='undefined'){PNL_MAP.rs232=PNL_MAP.rs422=PNL_MAP.rs485}
