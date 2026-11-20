/* ElectroSim v8.42 – Remote I/O / expansion module.
   A small field I/O station (like Siemens ET 200SP / Phoenix Contact Axioline / Wago 750) that gives a PLC more inputs and outputs, placed next to the machine.
   • Channels: digital in (DI), digital out (DO, relay contact to the common 1L), analog in (AI), analog out (AO) – counts in Properties (same presets as the PLC).
   • It is linked to a PLC by name (Properties → Master PLC; "Auto" = the first PLC). The data bus is not drawn as wires – the link is the setting.
   • Each module has a Node number 1-4. The PLC ladder program sees the channels under these addresses (the PLC's own I/O keep I0.x, Q0.x, AI0-7, AO0-3):
        node k   DI  I(2k).0 … I(2k+1).7     DO  Q(2k).0 … Q(2k+1).7     AI  AI(8k) … AI(8k+7)     AO  AO(4k) … AO(4k+3)
     e.g. node 1: DI I2.0-I3.7, DO Q2.0-Q3.7, AI8-AI15, AO4-AO7;  node 2: DI I4.x …  They appear in the ladder editor drop-downs, the watch / force bar, the HMI and the tag names.
   • The module needs its own 24 V (L+ / M). Without power, or when the master PLC is not powered / in STOP, the module is OFFLINE: its inputs read 0 and its outputs are off.
   • The terminals and the electrical model are the same as the PLC's I/O (TX / plLay from plc.js). Loaded after plc.js.
   Data: c.p.plc (label or 'Auto'), c.p.node, c.p.nDI/nDO/nAI/nAO. Runtime: c.s.link, c.s.out[], c.s.ao[]. */
'use strict';
const RNODE_MAX=4;
const rioNode=c=>Math.max(1,Math.min(RNODE_MAX,parseInt(c.p.node,10)||1));
const rI=(k,i)=>'I'+(2*k+(i>>3))+'.'+(i&7),rQ=(k,i)=>'Q'+(2*k+(i>>3))+'.'+(i&7),rAI=(k,i)=>'AI'+(8*k+i),rAO=(k,i)=>'AO'+(4*k+i);
const rioPlcs=()=>S.comps.filter(q=>q.type==='plc');
function rioPlc(c){const ps=rioPlcs(),l=String(c.p.plc||'');return ps.find(q=>q.label===l)||ps[0]||null}
const rioOf=P=>S.comps.filter(q=>q.type==='rio'&&rioPlc(q)===P);

/* ---------- layout (terminals use the same numbers as the PLC; only the printed names are the remote addresses) ---------- */
const RLAYS={};
function rioLay(cf,k){const key=[cf.DI,cf.DO,cf.AI,cf.AO,k].join('.');if(RLAYS[key])return RLAYS[key];
 const t=Array.from({length:NTERM},()=>[0,0,'','h']);
 t[0]=[-40,-60,'L+'];t[1]=[-40,-40,'M'];
 let y=-20;for(let i=0;i<cf.DI;i++,y+=20)t[TX.DI(i)]=[-40,y,rI(k,i),'o'];
 if(cf.DI&&cf.AI)y+=20;
 for(let i=0;i<cf.AI;i++)t[TX.AI(i)]=[-40,y,rAI(k,i),'o'],y+=20;
 let z=-40;if(cf.DO)t[10]=[40,-60,'1L','o'];
 for(let i=0;i<cf.DO;i++,z+=20)t[TX.DO(i)]=[40,z,rQ(k,i),'o'];
 if(cf.DO&&cf.AO)z+=20;
 for(let i=0;i<cf.AO;i++)t[TX.AO(i)]=[40,z,rAO(k,i),'o'],z+=20;
 const bot=Math.max(40,y,z);return RLAYS[key]={t,bot,bb:[-46,-106,92,bot+116]}}
const RL0=rioLay({DI:8,DO:8,AI:0,AO:0},1);

/* ---------- called from the PLC scan ---------- */
function rioAdrs(P,A){rioOf(P).forEach(r=>{const cf=plCfg(r),k=rioNode(r);
 for(let i=0;i<cf.DI;i++)if(!A.I.includes(rI(k,i)))A.I.push(rI(k,i));
 for(let i=0;i<cf.DO;i++)if(!A.Q.includes(rQ(k,i)))A.Q.push(rQ(k,i));
 for(let i=0;i<cf.AI;i++)if(!A.AI.includes(rAI(k,i)))A.AI.push(rAI(k,i));
 for(let i=0;i<cf.AO;i++)if(!A.AO.includes(rAO(k,i)))A.AO.push(rAO(k,i))})}
/* PLC scan: copy the module inputs into the PLC image (before the ladder runs) */
function rioPull(P,pl){rioOf(P).forEach(r=>{const cf=plCfg(r),k=rioNode(r),s=r.s,up=s.pw?1:0;
 for(let i=0;i<cf.DI;i++){const a=rI(k,i);pl.b[a]=(up&&s.in&&s.in[i])||pl.fr[a]?1:0}
 for(let i=0;i<cf.AI;i++){const a=rAI(k,i);pl.an[a]=typeof pl.fr[a]==='number'?pl.fr[a]:(up&&s.ai&&s.ai[i])||0}})}
/* the module's own tick: copy the PLC outputs (set by the last ladder scan) to the module outputs */
function rioTick(c){const P=rioPlc(c),s=c.s,cf=plCfg(c),k=rioNode(c),pl=P&&P.s.pl,live=!!(P&&P.s.pw&&P.p.mode==='RUN'&&pl&&pl.b&&s.pw);
 s.link=live?1:0;s.out=[];s.ao=[];
 for(let i=0;i<cf.DO;i++)s.out.push(live&&pl.b[rQ(k,i)]?1:0);
 for(let i=0;i<cf.AO;i++)s.ao.push(live?Math.max(0,Math.min(100,(pl.an&&pl.an[rAO(k,i)])||0)):0)}

/* ---------- the part ---------- */
D.rio={n:'Remote I/O module (expansion for a PLC: DI / DO / AI / AO)',ds:'remote io expansion module extra inputs outputs for a PLC, linked by name, node number 1-4',cat:'Automation',pre:'RIO',hs:1,sx:34,t:RL0.t,bb:RL0.bb,
 p:{V:[24,'V','Supply voltage'],plc:['Auto (first PLC)','','Master PLC',()=>['Auto (first PLC)',...rioPlcs().map(q=>q.label)]],node:[1,'','Node number (address block)',['1','2','3','4']],
  preset:[PPRE[0][0],'','I/O preset',PPRE.map(q=>q[0])],
  nDI:[8,'','Digital inputs (DI)',NOPT(PMAX.DI)],nDO:[8,'','Digital outputs (DO)',NOPT(PMAX.DO)],nAI:[0,'','Analog inputs (AI)',NOPT(PMAX.AI)],nAO:[0,'','Analog outputs (AO)',NOPT(PMAX.AO)],
  aiT:['0-10 V','','AI signal type',['0-10 V','4-20 mA']],aoT:['0-10 V','','AO signal type',['0-10 V','4-20 mA']]},
 dyn:c=>{const L=rioLay(plCfg(c),rioNode(c));return L.d||(L.d=Object.assign(Object.create(D.rio),{t:L.t,bb:L.bb}))},
 chg:(c,k)=>{if(k==='node'){S.dirty=1;if(typeof commit==='function')commit();return true}return plcChg(c,k)},
 el:c=>{const cf=plCfg(c),s=c.s,on=s.pw&&s.link,out=s.out||[],ao=s.ao||[],E=[RR(0,1,480)];
  for(let i=0;i<cf.DI;i++)E.push(RR(TX.DI(i),1,6000));
  for(let i=0;i<cf.DO;i++)E.push(RR(TX.DO(i),10,s.pw&&out[i]?.005:1e9));
  for(let i=0;i<cf.AI;i++)E.push(RR(TX.AI(i),1,cf.ai==='mA'?250:1e5));
  for(let i=0;i<cf.AO;i++){const t=TX.AO(i),pc=on?Math.max(0,Math.min(100,ao[i]||0)):0;
   if(cf.ao==='V')E.push({k:'V',a:t,b:1,v:pc/10});
   else E.push(s.al&&s.al[i]?{k:'V',a:t,b:1,v:AOLIM}:{k:'I',a:1,b:t,i:(on?4+pc*.16:0)/1e3});
   E.push(RR(t,1,1e9))}
  return E},
 sim:(c,E)=>{const cf=plCfg(c),s=c.s,V=c.p.V,pw=Math.abs(E[0].v2)>=.7*V,on=pw&&s.link,ao=s.ao||[];let ch=0,k=1;
  if(pw!==!!s.pw){s.pw=pw;ch=1}
  s.in=[];for(let i=0;i<cf.DI;i++)s.in.push(E[k++].v2>=.5*V);
  k+=cf.DO;s.ai=[];s.aiw=[];
  for(let i=0;i<cf.AI;i++){const v=E[k++].v2;let pc;if(cf.ai==='mA'){const mA=v/250*1e3;pc=(mA-4)/16*100;s.aiw[i]=mA<3.65}else pc=v/10*100;s.ai.push(Math.max(0,Math.min(100,pc)))}
  if(!Array.isArray(s.al))s.al=[];
  for(let i=0;i<cf.AO;i++){const src=E[k++],lk=E[k++];
   if(cf.ao==='mA'){const want=(on?4+Math.max(0,Math.min(100,ao[i]||0))*.16:0)/1e3,io=src.cur;let nl=s.al[i]?1:0;
    if(!nl&&Math.abs(lk.v2)>AOLIM+.01)nl=1;else if(nl&&Math.abs(io)>=want*.999)nl=0;
    if(nl!==(s.al[i]?1:0)){s.al[i]=nl;ch=1}}}
  return ch},
 tk:c=>rioTick(c),
 st:c=>{const s=c.s,cf=plCfg(c),k=rioNode(c),P=rioPlc(c),b=(P&&P.s.pl&&P.s.pl.b)||{},an=(P&&P.s.pl&&P.s.pl.an)||{};
  if(!s.pw)return'NO POWER';if(!s.link)return'OFFLINE';
  const bits=(f,n,src)=>n?Array.from({length:n},(_,i)=>src[f(k,i)]?1:0).join('').replace(/(.{8})(?=.)/g,'$1 '):'';
  return'ONLINE  node '+k+(cf.DI?'  DI '+bits(rI,cf.DI,b):'')+(cf.DO?'  DO '+bits(rQ,cf.DO,b):'')+(cf.AI?'  AI '+Array.from({length:cf.AI},(_,i)=>Math.round(an[rAI(k,i)]||0)+'%').join(' '):'')+(cf.AO?'  AO '+Array.from({length:cf.AO},(_,i)=>Math.round(an[rAO(k,i)]||0)+'%').join(' '):'')},
 msg:c=>{const r=[],s=c.s,P=rioPlc(c),k=rioNode(c),cf=plCfg(c);
  if(!P)r.push(['wa',`${c.label}: no PLC in the project – the remote I/O module has no master`]);
  else{if(String(c.p.plc||'')&&!/^Auto/.test(c.p.plc)&&!rioPlcs().some(q=>q.label===c.p.plc))r.push(['wa',`${c.label}: master PLC “${c.p.plc}” not found – using ${P.label}`]);
   if(s.pw&&!P.s.pw)r.push(['wa',`${c.label}: master ${P.label} has no power – module OFFLINE`]);
   else if(s.pw&&P.p.mode!=='RUN')r.push(['wa',`${c.label}: master ${P.label} is in STOP – module OFFLINE, outputs off`]);
   else if(!s.pw&&P.s.pw)r.push(['wa',`${c.label}: module has no 24 V power – the PLC reads its inputs as 0`]);
   const dup=rioOf(P).filter(q=>q!==c&&rioNode(q)===k);if(dup.length)r.push(['er',`${c.label}: node number ${k} is also used by ${dup.map(q=>q.label).join(', ')} – give every module on ${P.label} its own node number`]);
   if(P.prog&&P.prog.rungs&&s.pw&&s.link){const A=plAdrs(P),use=new Set();P.prog.rungs.forEach(q=>{plWalk(q.c,n=>{if(n.a)use.add(n.a)});q.o.forEach(n=>{if(n.a)use.add(n.a)})});
    const mine=[];for(let i=0;i<cf.DI;i++)mine.push(rI(k,i));for(let i=0;i<cf.DO;i++)mine.push(rQ(k,i));for(let i=0;i<cf.AI;i++)mine.push(rAI(k,i));for(let i=0;i<cf.AO;i++)mine.push(rAO(k,i));
    if(!mine.some(a=>use.has(a))&&A)r.push(['wa',`${c.label}: the ladder of ${P.label} does not use any channel of this module (${rI(k,0)}…) yet`])}}
  if(s.pw&&cf.ai==='mA'&&s.aiw)s.aiw.forEach((w,i)=>{if(w)r.push(['wa',`${c.label}: ${rAI(k,i)} at or below 3.6 mA – wire break or no 4-20 mA signal`])});
  s.al&&s.al.forEach((w,i)=>{if(w)r.push(['wa',`${c.label}: ${rAO(k,i)} cannot drive its 4-20 mA loop (load too high / open circuit)`])});
  return r},
 pp:c=>{const cf=plCfg(c),k=rioNode(c),P=rioPlc(c),rg=(n,f)=>n?(n>1?f(k,0)+' – '+f(k,n-1):f(k,0)):'none';
  return`<p class=mu>Master: <b>${P?esc(P.label):'none – add a PLC'}</b> · Node <b>${k}</b> · ${c.s.pw?(c.s.link?'<b style="color:var(--ok)">ONLINE</b>':'<b style="color:var(--wa)">OFFLINE</b>'):'no power'}</p>
  <div class=sec>Addresses in the PLC program</div><table class=iomap><tr><td>Digital in</td><td>${rg(cf.DI,rI)}</td></tr><tr><td>Digital out</td><td>${rg(cf.DO,rQ)}</td></tr><tr><td>Analog in</td><td>${cf.AI?rg(cf.AI,rAI)+' · '+(cf.ai==='mA'?'4-20 mA':'0-10 V'):'none'}</td></tr><tr><td>Analog out</td><td>${cf.AO?rg(cf.AO,rAO)+' · '+(cf.ao==='mA'?'4-20 mA':'0-10 V'):'none'}</td></tr></table>
  <p class=mu>Pick the <b>Master PLC</b> and a <b>Node number</b> (1-4, one per module). The channels then appear in that PLC's ladder editor (drop-downs, watch / force bar) – e.g. node 1 gives <b>I2.0…</b> and <b>Q2.0…</b>. Terminals appear / disappear with the channel counts (wires on removed terminals are deleted).</p>
  <p class=mu><b>Wiring:</b> L+ / M to 24 V DC (the module has its own supply). <b>DI</b>: 24 V through a switch to the input. <b>DO</b>: relay contact between Q and the common <b>1L</b> – feed 1L from the supply, wire each load from its Q terminal. <b>AI</b>: signal between AI and M (0-10 V, or 4-20 mA through the built-in 250 Ω shunt). <b>AO</b>: output between AO and M. No communication wires are needed.</p>`},
 g:c=>{const s=c.s,cf=plCfg(c),k=rioNode(c),L=rioLay(cf,k),P=rioPlc(c),pl=(P&&P.s.pl)||{},b=pl.b||{},an=pl.an||{},fr=pl.fr||{},up=s.pw,on=up&&s.link;
  let h=`<rect x=-34 y=-96 width=68 height=${L.bot+96} rx=3 class=s style="stroke-dasharray:0" /><rect x=-34 y=-96 width=68 height=14 rx=3 style="fill:var(--ac);opacity:.18" /><text y=-86 class=tx style="font-size:8.5px">REMOTE I/O</text>`+
   `<rect x=-20 y=-79 width=40 height=11 rx=3 style="fill:${on?'var(--ok)':up?'var(--wa)':'transparent'};stroke:${on?'var(--ok)':up?'var(--wa)':'var(--mu)'};stroke-width:1" /><text y=-70.5 class=mt style="font-size:7px;font-weight:700;pointer-events:none;fill:${up?'#fff':'var(--mu)'}">${on?'ONLINE':up?'OFFLINE':'NODE '+k}</text>`+
   (S.run&&!up?`<text y=-62 class=mt style="font-size:6.5px">no power</text>`:'');
  L.t.forEach(([x,y,n,fl])=>{if(fl&&fl.includes('h'))return;const lf=x<0;h+=`<text x=${lf?-30:30} y=${y+3} class=mt style="text-anchor:${lf?'start':'end'};font-size:9px">${n}</text>`;
   if(/^[IQ]\d+\./.test(n)){const v=b[n]&&(n[0]==='I'?(up||fr[n]):on),q=n[0]==='Q';h+=`<circle cx=${lf?-6:6} cy=${y} r=3.5 style="fill:${v?(q?'var(--ok)':'#f5c542'):'transparent'};stroke:${fr[n]?'var(--wa)':'var(--mu)'};stroke-width:${fr[n]?2.2:1}"/>`}
   else if(/^A[IO]\d/.test(n)){const p=(an[n]||0)/100;h+=`<circle cx=${lf?-6:6} cy=${y} r=3.5 style="fill:#4aa3ff;fill-opacity:${on?.12+.88*p:0};stroke:${typeof fr[n]==='number'?'var(--wa)':'var(--mu)'};stroke-width:${typeof fr[n]==='number'?2.2:1}"/>`}});
  return h+`<text y=${L.bot-8} class=mt style="font-size:7px">node ${k} · ${P?esc(P.label):'no master'}</text>`}};

/* the module channels in the ladder editor's watch / force bar */
function rioIO(P){return rioOf(P).map(r=>{const cf=plCfg(r),k=rioNode(r),tg=a=>plTag(P,a),
  ch=(a,cl,x)=>`<${x?'button':'span'} class="ioc ${cl}" ${x?'data-fi':'data-fo'}=${a} title="${esc(tg(a)||a)}">${a}${tg(a)?`<i>${esc(tg(a))}</i>`:''}</${x?'button':'span'}>`;let h=`<span class=iot><b>${esc(r.label)}</b> · node ${k}</span>`;
  if(cf.DI)h+=Array.from({length:cf.DI},(_,i)=>ch(rI(k,i),'',1)).join('');
  if(cf.AI)h+=Array.from({length:cf.AI},(_,i)=>{const a=rAI(k,i);return`<span class=aic data-ai=${a}><b>${a}</b>${tg(a)?`<i>${esc(tg(a))}</i>`:''}<input type=range min=0 max=100 step=1 value=0 data-fa=${a}><span data-av=${a}>0 %</span><button class=ioc data-fr=${a} title="Release the forced value" hidden>auto</button></span>`}).join('');
  if(cf.DO)h+=Array.from({length:cf.DO},(_,i)=>ch(rQ(k,i),'q',0)).join('');
  if(cf.AO)h+=Array.from({length:cf.AO},(_,i)=>`<span class="ioc q" data-ao=${rAO(k,i)}>${rAO(k,i)} <b>0 %</b></span>`).join('');
  return h}).join('')}

/* Help page: coloured wiring diagram (wiring.js) */
if(typeof WIR!=='undefined')WIR.rio={s:'A small I/O station you put near the machine. It adds more inputs and outputs to a PLC without wiring everything back to the main panel – you only link it to the PLC by name in Properties.',
 rows:[['l','L+','+24 V (module supply)','r',null,0],['l','M','0 V','b',null,1],['l','I2.0','Push button / sensor (24 V when active)','o','Switch',2],['r','1L','+24 V (feeds the output contacts)','r',null,0],['r','Q2.0','Lamp / relay coil / valve (other side to 0 V)','g','Load',1]],
 tip:['Set <i>Master PLC</i> and a <i>Node number</i> (1-4) in Properties. The addresses (node 1: I2.x, Q2.x, AI8…, AO4…) then appear in the PLC ladder editor.','The module has its own 24 V supply: no power = OFFLINE, inputs read 0.','If the master PLC is in STOP or off, the module outputs switch off.']};
