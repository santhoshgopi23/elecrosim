/* ElectroSim v8.66 – Ethernet cable, RJ45 plug and Ethernet device port (library group "Communication").  PHASE 1 of 2.  Loaded after rs232.js, before view.js.
   Three parts, same style as rs485.js / rs232.js (own supply on L+ / M of the device, the WIRING is the network, the simulator judges it like an installation):
     ethp  Ethernet device port (PC / PLC / switch port)   terminals: 0 L+  1 M  2 LAN        Properties: device type MDI / MDI-X, fastest speed (10 / 100 / 1000 / 10000 Mbps), Auto MDI-X
     rj45  RJ45 plug                                       terminals: 0 PORT (to the device LAN)  1 CABLE (to the cable)   Properties: wiring T568A / T568B / Custom (colour of each of the 8 pins), shielded
     ethc  Ethernet cable                                  terminals: 0 A  1 B                  Properties: category CAT5e / CAT6 / CAT6A / CAT7, length, shielded, straight-through / crossover, noise around the cable
   Chain to build:  device LAN – PORT RJ45 CABLE – cable A … B – CABLE RJ45 PORT – LAN device   (patch panels: several cables and plugs in a row, the lengths add up).
   What is simulated (etAnalyse, once per tick):  the 8 wires are followed from pin to pin through plug → cable → plug (colour of every pin, crossover swaps orange and green),
     so a WRONG ORDER really breaks the link: wires out of order, split pairs (pins 3 and 6 from different twisted pairs), a colour used twice, MDI to MDI with a straight cable,
     a plug the wrong way round, a cable without a plug.  Speed = the highest of 10 / 100 / 1000 / 10000 Mbps that both ports can do AND the wiring (10 / 100 use pins 1 2 3 6, 1000 uses
     all 8) AND the channel length (150 / 120 / 100 m, 10G: CAT6 55 m, CAT6A / CAT7 100 m) AND the noise margin (category + shielding - noise) allow.  Above 100 m a warning.
   The device port shows the link LED (up / down), the speed and an activity LED; the cable shows its 4 twisted pairs and moving pulses while the link is up.
   State: port c.s.e = {pw, ov, lk (link), why, walk};  every plug and cable c.s.e = {lk}.  Reused: the supply (el) and the V property of the RS485 node, rsH is not needed. */
'use strict';
const ETCN=['white/orange','orange','white/green','blue','white/blue','green','white/brown','brown'],      /* wire colour ids = T568B pin order */
 ETHX=['#f0902c','#f0902c','#2fa84f','#2f7fd0','#2f7fd0','#2fa84f','#8b5a2b','#8b5a2b'],ETWH=[1,0,1,0,1,0,1,0],   /* base colour of each id, white-striped ids */
 ETPR=[0,0,1,2,2,1,3,3],                                    /* twisted pair of each colour id: orange, green, blue, brown */
 ETA=[2,5,0,3,4,1,6,7],ETB=[0,1,2,3,4,5,6,7],ETSW=ETA,      /* T568A pin → colour, T568B pin → colour, colours swapped by a crossover cable (orange <-> green) */
 ETCT=['CAT5e','CAT6','CAT6A','CAT7'],ETST=['T568B','T568A','Custom (set each pin)'],ETRO=['PC / device (MDI)','Switch / hub (MDI-X)'],ETSP=['10','100','1000','10000'],
 ETNZ=['Low (office)','Medium (next to power cables)','High (next to a VFD / motor)'],ETWS=['Straight-through','Crossover'],ETSH=['Unshielded (UTP)','Shielded (foil / braid)'],
 ETSG=['TX+','TX−','RX+','BI_DC+','BI_DC−','RX−','BI_DD+','BI_DD−'],ETGR=[0,0,1,2,2,1,3,3],            /* signal of each pin, signal pair (group) of each pin */
 ETRC={10:150,100:120,1000:100},ETRX=[0,55,100,100],ETCM=[2,3,4,5],ETNE={10:-3,100:-1,1000:1,10000:4};  /* reach (m), 10G reach per category, category noise margin, margin needed per speed */
/* runtime state lives in c.s, which the project snapshot serialises: it must never be saved (it holds cross references) */
const etNoJ=o=>{if(!o.toJSON)Object.defineProperty(o,'toJSON',{value:()=>undefined,enumerable:false});return o};
const ET={st:-1,L:[]},etSp=s=>s>=1000?s/1000+' Gbps':s+' Mbps',etCol=i=>ETCN[i]||'?';
const etOrd=c=>c.p.std===ETST[1]?ETA:c.p.std===ETST[2]?[1,2,3,4,5,6,7,8].map(i=>{const k=ETCN.indexOf(c.p['c'+i]);return k<0?0:k}):ETB,etValid=o=>new Set(o).size===8;

/* ---------- analysis of every Ethernet link (once per tick) ---------- */
function etAnalyse(){
 const net=typeof S.net==='function'?S.net:k=>k,ds=S.comps.filter(c=>c.type==='ethp'),ws=S.comps.filter(c=>c.type==='ethsw'),es=S.comps.filter(c=>c.type==='rj45'||c.type==='ethc'),at={},add=(k,c,t)=>(at[k]=at[k]||[]).push([c,t]),ps=[],
  pwr=c=>{const V=Math.max(1,+c.p.V||24),v=c.o?Math.abs(c.o.v):0;return{pw:v>=.7*V?1:0,ov:v>1.3*V?1:0}};ET.L=[];
 /* endpoints = the LAN terminal of every device and every fitted port of every switch (Phase 2: each switch port is a proxy object with the switch's data) */
 ds.forEach(p=>{const r=p.s.e=etNoJ(p.s.e||{});Object.assign(r,pwr(p),{lk:null,why:'',walk:null,k:ps.length,key:'d'+p.id});ps.push(p);add(net(p.id+'.2'),p,'ep')});
 ws.forEach(w=>{const r=w.s.e=etNoJ(w.s.e||{}),n=+w.p.ports===8?8:5;Object.assign(r,pwr(w),{n,ports:[],mac:r.mac||{}});
  for(let i=0;i<n;i++){const px={swp:1,sw:w,pi:i,label:`${w.label} port ${i+1}`,p:{role:ETRO[1],speed:w.p.speed,amdix:'ON'},s:{e:{pw:r.pw,ov:0,lk:null,why:'',walk:null,k:ps.length,key:'s'+w.id+'.'+i}}};r.ports.push(px);ps.push(px);add(net(w.id+'.'+(2+i)),px,'ep')}});
 es.forEach(e=>{e.s.e=etNoJ({lk:null});add(net(e.id+'.0'),e,0);add(net(e.id+'.1'),e,1)});
 const isEp=c=>c.type==='ethp'||!!c.swp,tk=p=>p.swp?p.sw.id+'.'+(2+p.pi):p.id+'.2';
 /* walk from every endpoint through plugs and cables to the next endpoint */
 ps.forEach(p=>{let cur=net(tk(p)),from=[p,'ep'],st=[],seen=new Set(),end=null,why='';
  for(let n=0;n<40;n++){const nx=(at[cur]||[]).filter(x=>!(x[0]===from[0]&&x[1]===from[1]));
   if(!nx.length){why=st.length?'the cable is not connected at the far end – nothing is plugged in there':'nothing is wired to the LAN terminal';break}
   if(nx.length>1){why='the wire splits into more than one branch – a network cable cannot be split (use a switch)';break}
   const[c,t]=nx[0];if(isEp(c)){end=c;break}
   if(seen.has(c.id)){why='the cables form a loop';break}
   seen.add(c.id);st.push({c,t});from=[c,1-t];cur=net(c.id+'.'+(1-t))}
  p.s.e.walk={end,st,why};p.s.e.why=why});
 ps.forEach(p=>{const w=p.s.e.walk;if(!w.end)return;if(w.end===p){p.s.e.why='the LAN terminal is wired back to itself';return}
  if(p.s.e.k<w.end.s.e.k||w.end.s.e.walk.end!==p)etLink(p,w.end,w.st)});
 ET.st=S.time;if(typeof etNet==='function')etNet()}

function etLink(pa,pb,st){
 const L={a:pa,b:pb,els:st.map(s=>s.c),iss:[],up:0,speed:0,len:0,cap:Math.min(+pa.p.speed||1000,+pb.p.speed||1000),q:0,M:null,cat:0,mg:0,sh:0,spl:[]},I=L.iss,add=(q,t)=>I.push([q,t]);
 ET.L.push(L);L.key=pa.s.e.key+'|'+pb.s.e.key;st.forEach(s=>{s.c.s.e.lk=L;s.c.s.e.ent=s.t});pa.s.e.lk=pb.s.e.lk=L;
 /* follow the 8 wires: pin (at the port) → colour (inside the cable) → pin (at the far port) */
 let state='pin',pin=[0,1,2,3,4,5,6,7],col=[],bad='';const cabs=[],plugs=[];
 st.forEach(({c,t})=>{if(bad)return;
  if(c.type==='rj45'){const o=etOrd(c);plugs.push(c);
   if(!etValid(o)){bad=`${c.label}: a wire colour is used on two pins – every pin needs a different colour (a plug has 8 different wires)`;return}
   if(t===0){if(state!=='pin'){bad=`${c.label} is the wrong way round – its PORT side must face the device`;return}col=pin.map(p=>o[p]);state='col'}
   else{if(state!=='col'){bad=`${c.label} is the wrong way round – its CABLE side must face the cable`;return}pin=col.map(k=>o.indexOf(k));state='pin'}}
  else{cabs.push(c);if(state!=='col'){bad=`${c.label}: a cable must end in an RJ45 plug – wire device LAN → RJ45 plug (PORT) → CABLE → cable`;return}
   if(c.p.wire===ETWS[1])col=col.map(k=>ETSW[k]);L.len+=Math.max(0,+c.p.len||0)}});
 if(!bad&&state!=='pin')bad='the cable ends without an RJ45 plug at the far end';
 if(!bad&&!cabs.length)bad='there is no cable between the two RJ45 plugs';
 if(!bad&&plugs.length<2)bad='each end of the cable needs an RJ45 plug';
 L.len=+L.len.toFixed(2);
 if(bad){add(2,bad);L.q=2;return L}
 const M=L.M=pin,same=(pa.p.role===ETRO[1])===(pb.p.role===ETRO[1]),auto=pa.p.amdix==='ON'||pb.p.amdix==='ON',
  X2=same?{0:2,1:5,2:0,5:1}:{0:0,1:1,2:2,5:5},XG=same?{...X2,3:6,4:7,6:3,7:4}:{0:0,1:1,2:2,3:3,4:4,5:5,6:6,7:7},ex=X=>Object.keys(X).every(i=>M[i]===X[i]),
  gm=()=>{const g=[null,null,null,null];for(let i=0;i<8;i++){const a=ETGR[i],b=ETGR[M[i]];if(g[a]===null)g[a]=b;else if(g[a]!==b)return null}return new Set(g).size===4?g:null},
  g=gm(),ok2=ex(X2)||(auto&&g&&g[0]+g[1]===1&&g[0]<2&&g[1]<2),okG=ex(XG)||(auto&&!!g);
 /* split pairs: the two wires of a signal pair must be twisted together */
 const spl=new Set();plugs.forEach(c=>{const o=etOrd(c);[[0,1],[2,5],[3,4],[6,7]].forEach(([a,b],k)=>{if(ETPR[o[a]]!==ETPR[o[b]])spl.add(k)})});L.spl=[...spl];
 if(spl.size){const nm=[...spl].map(k=>['1 and 2','3 and 6','4 and 5','7 and 8'][k]);add(spl.has(0)||spl.has(1)?2:1,`split pair on pins ${nm.join(' / ')}: the two wires of that signal come from different twisted pairs, so they are not twisted together – crosstalk and errors (typical result of wiring the colours in the wrong order)`)}
 if(!ok2){const alt=same?{0:0,1:1,2:2,5:5}:{0:2,1:5,2:0,5:1};
  if(ex(alt))add(2,same?`both ports are the same type (${pa.p.role===ETRO[1]?'MDI-X':'MDI'} to ${pb.p.role===ETRO[1]?'MDI-X':'MDI'}) but the cable is straight-through – send meets send and nothing is heard; use a crossover cable (or T568A on one plug and T568B on the other) or switch Auto MDI-X ON`:`the cable is crossed (TX goes to TX) but one port is a device (MDI) and the other a switch (MDI-X) – use a straight-through cable`);
  else add(2,`the wiring order is wrong: ${Object.keys(X2).filter(i=>M[i]!==X2[i]).map(i=>`pin ${+i+1} (${ETSG[i]}) arrives at pin ${M[i]+1} instead of pin ${X2[i]+1}`).join('; ')} – check the colour order of both plugs (T568A / T568B)`)}
 /* shielding, category, noise */
 const sh=cabs.map(c=>c.p.shd===ETSH[1]||c.p.cat==='CAT7'),cabSh=sh.every(x=>x),anySh=sh.some(x=>x),plugSh=plugs.every(c=>c.p.sh===ETSH[1]),shE=cabSh&&plugSh;L.sh=shE?1:0;
 cabs.forEach(c=>{if(c.p.cat==='CAT7'&&c.p.shd!==ETSH[1])add(1,`${c.label}: CAT7 cable is always shielded – set it to “Shielded”`)});
 if(anySh&&!shE)add(1,cabSh?'the cable is shielded but a plug is not – the shield is not connected through the connector, so it does not protect; use shielded plugs on both ends':'shielded and unshielded cable are mixed – the unshielded part decides, the shield protects nothing');
 const cat=L.cat=Math.min(...cabs.map(c=>Math.max(0,ETCT.indexOf(c.p.cat)))),nz=Math.max(...cabs.map(c=>Math.max(0,ETNZ.indexOf(c.p.noise)))),mg=L.mg=ETCM[cat]+(shE?2:0)-2*nz;
 if(cabs.length>1&&new Set(cabs.map(c=>c.p.cat)).size>1)add(1,`different cable categories in one channel – the weakest (${ETCT[cat]}) decides`);
 if(L.len>100)add(1,`the channel is ${L.len} m long – Ethernet allows 100 m (90 m permanent cable + 10 m patch cords); the link may run slower or not at all`);
 /* the highest speed that works */
 const cands=[10000,1000,100,10].filter(s=>s<=L.cap),why=[];let sp=0,er=0;
 for(const s of cands){let r='';const rc=s===10000?ETRX[cat]:ETRC[s];
  if(!ok2)r='the wiring order is wrong (pins 1, 2, 3 and 6 must reach the right pins)';
  else if(s>=100&&(spl.has(0)||spl.has(1)))r='split pair on pins 1-2 / 3-6';
  else if(s>=1000&&!okG)r='the wiring does not allow 1000 Mbps (a gigabit link uses all four pairs; a 100 Mbit crossover cable only crosses two of them)';
  else if(s>=1000&&(spl.has(2)||spl.has(3)))r='split pair on pins 4-5 / 7-8 (gigabit uses all four pairs)';
  else if(s===10000&&cat===0)r='CAT5e cannot carry 10 Gbps';
  if(!r&&L.len>rc)r=rc?`${L.len} m is longer than ${etSp(s)} can reach on ${ETCT[cat]} (${rc} m)`:`${ETCT[cat]} cannot carry ${etSp(s)}`;
  if(!r&&mg<ETNE[s])r=`electrical noise: ${ETCT[cat]} ${shE?'shielded':'unshielded'} in a ${ETNZ[nz].split(' ')[0].toLowerCase()}-noise place has too little margin for ${etSp(s)}`;
  why.push(r);if(!r){sp=s;er=s===10&&(spl.has(0)||spl.has(1));break}}
 L.speed=sp;L.er=er;
 if(!sp){if(ok2)add(2,`no speed works: ${why[why.length-1]||'both ports are set to a speed that cannot be reached'}`)}
 else if(sp<L.cap)add(1,`the link runs at ${etSp(sp)} although both ports can do ${etSp(L.cap)}: ${why[0]}`);
 if(er)add(1,'10 Mbps with a split pair: the link comes up but many frames are damaged (errors, retransmissions)');
 if(!pa.s.e.pw||!pb.s.e.pw)add(1,`the link is down because ${!pa.s.e.pw?pa.label:pb.label} has no power`);
 L.up=sp&&pa.s.e.pw&&pb.s.e.pw?1:0;L.q=Math.max(0,...I.map(i=>i[0]));return L}

/* ---------- symbols ---------- */
const etPin=(x,y,w,h,i)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" style="fill:${ETWH[i]?'#fff':ETHX[i]};stroke:#6b7782;stroke-width:.4"/>`+(ETWH[i]?`<rect x="${x}" y="${y}" width="${w}" height="${h/5}" style="fill:${ETHX[i]}"/><rect x="${x}" y="${y+2*h/5}" width="${w}" height="${h/5}" style="fill:${ETHX[i]}"/><rect x="${x}" y="${y+4*h/5}" width="${w}" height="${h/5}" style="fill:${ETHX[i]}"/>`:'');
function etpSym(c){const r=c.s.e,a=!!S.run&&!!c.o&&!!r,L=a&&r.lk?r.lk:null,up=!!(L&&L.up),act=up&&(typeof etActive==='function'&&etActive(r)!==null?etActive(r):Math.floor(S.time*6)%2===0),sw=c.p.role===ETRO[1];
 const tx=(x,y,s,txt,st)=>`<text x="${x}" y="${y}" class="mt" style="font-size:${s}px;${st||''}">${txt}</text>`;
 return`<rect x="-50" y="-34" width="100" height="68" rx="3" class="s"/><text y="-18" class="tx" style="font-size:8.5px">ETHERNET ${sw?'SWITCH PORT':'DEVICE'}</text>`+
  tx(0,-7,6.5,(sw?'MDI-X':'MDI')+' · '+c.p.speed+' Mbps max'+(c.p.amdix==='ON'?' · auto':''))+
  `<circle cx="-40" cy="8" r="4" style="fill:${a?(up?'var(--ok)':'var(--er)'):'#c8d3dc'};stroke:#6b7782;stroke-width:.5"/><circle cx="-40" cy="20" r="4" style="fill:${act?'#e08a00':'#c8d3dc'};stroke:#6b7782;stroke-width:.5"/>`+
  tx(-32,10.5,7.5,a?(up?'LINK '+etSp(L.speed):'LINK DOWN'):'LINK',`text-anchor:start;font-weight:700${a?';fill:'+(up?'var(--ok)':'var(--er)'):''}`)+tx(-32,22.5,6.5,'ACT',`text-anchor:start`)+tx(47,22.5,6.5,typeof etIpTxt==='function'?esc(etIpTxt(c)):'','text-anchor:end')+
  tx(-20,-27,7,'L+')+tx(20,-27,7,'M')+tx(0,31,7,'LAN')}
function etjSym(c){const o=etOrd(c),ok=etValid(o),L=S.run&&c.s.e&&c.s.e.lk,red=!ok||(L&&L.q===2),sh=c.p.sh===ETSH[1];let h=`<rect x="-26" y="-34" width="52" height="68" rx="3" class="s"${red?' style="stroke:var(--er);stroke-width:1.6"':''}/>`+
  `<text y="-17" class="tx" style="font-size:8px">RJ45 ${c.p.std.split(' ')[0]}</text>`;
 for(let i=0;i<8;i++){h+=etPin(-20+5*i,-10,4.4,22,o[i]);h+=`<text x="${-17.8+5*i}" y="19.5" class="mt" style="font-size:5.5px">${i+1}</text>`}
 if(sh)h+='<text x="21" y="-17" class="mt" style="font-size:6px;text-anchor:end;font-weight:700">S</text>';
 if(!ok)h+='<text y="29" class="mt" style="font-size:6.5px;fill:var(--er);font-weight:700">COLOUR TWICE</text>';
 return h+`<text x="0" y="-27" class="mt" style="font-size:6.5px">PORT</text><text x="0" y="31" class="mt" style="font-size:6.5px">CABLE</text>`}
function etcSym(c){const L=S.run&&c.s.e&&c.s.e.lk,up=!!(L&&L.up),sh=c.p.shd===ETSH[1]||c.p.cat==='CAT7',lam=[10,12.5,14.5,17],xo=c.p.wire===ETWS[1];let h='';
 h+=`<rect x="-50" y="-16" width="100" height="32" rx="16" style="fill:#dfe7ee;stroke:${sh?'#6b7782':'#9aa7b3'};stroke-width:${sh?2.2:1}"${sh?' stroke-dasharray="0"':''}/>`;
 for(let k=0;k<4;k++){const by=-10.5+7*k;[0,1].forEach(w=>{const id=[0,2,4,6][k]+(w?1:0);let d='';
   for(let x=-38;x<=38;x+=2)d+=(x>-38?'L':'M')+x+' '+(by+2.3*Math.sin(6.2832*x/lam[k]+(w?3.1416:0))).toFixed(1);
   h+=`<path d="${d}" style="fill:none;stroke:${ETWH[id]?'#fff':ETHX[id]};stroke-width:1.5"/>`+(ETWH[id]?`<path d="${d}" style="fill:none;stroke:${ETHX[id]};stroke-width:1.5;stroke-dasharray:2.2 2.2"/>`:'')})}
 if(up){const pr=L.speed>=1000?[0,1,2,3]:[0,1];pr.forEach(k=>{[0,1].forEach(d=>{const x=((S.time*26+k*17+d*40)%80)-40,xx=d?-x:x;h+=`<circle cx="${xx.toFixed(1)}" cy="${-10.5+7*k}" r="1.8" style="fill:${d?'#e08a00':'var(--ok)'};stroke:#fff;stroke-width:.4"/>`})})}
 h+=typeof etFrames==='function'?etFrames(c,L):'';
 return h+`<text y="-22" class="tx" style="font-size:8px">${c.p.cat} · ${+c.p.len||0} m</text><text y="28" class="mt" style="font-size:7px">${sh?'shielded':'unshielded'} · ${xo?'crossover':'straight'}</text>`+(xo?'<path d="M-6 -4l12 8M6 -4l-12 8" style="stroke:var(--er);stroke-width:1.4;opacity:.8"/>':'')}

/* ---------- Properties text ---------- */
const etSw=(o,i)=>`<span style="display:inline-block;width:11px;height:11px;vertical-align:-1px;margin-right:4px;border:1px solid #6b7782;background:${ETWH[o]?'repeating-linear-gradient(90deg,#fff 0 3px,'+ETHX[o]+' 3px 5px)':ETHX[o]}"></span>`;
function etTable(c){const o=etOrd(c);return`<table style="font-size:12px;border-collapse:collapse;margin:4px 0"><tr><th>Pin</th><th>Wire colour</th><th>Signal</th></tr>${o.map((k,i)=>`<tr><td style="padding:1px 8px">${i+1}</td><td style="padding:1px 8px">${etSw(k,i)}${ETCN[k]}</td><td style="padding:1px 8px">${ETSG[i]}</td></tr>`).join('')}</table>`}
function etNote(c){const r=c.s.e,L=r&&r.lk;if(!(S.run&&c.o))return'';
 if(c.type==='ethp'){if(!r.pw)return'';if(!L)return`<p class=mu><b>Now:</b> LINK DOWN – ${esc(r.why||'nothing connected')}</p>`;
  return`<p class=mu><b>Now:</b> ${L.up?'<b style="color:var(--ok)">LINK UP '+etSp(L.speed)+'</b>':'<b style="color:var(--er)">LINK DOWN</b>'} · both ports can do ${etSp(L.cap)}<br>Channel ${L.len} m of ${ETCT[L.cat]}${L.sh?' (shielded)':''} · noise margin ${L.mg}${L.iss.length?'<br>'+L.iss.slice(0,3).map(i=>(i[0]===2?'✗ ':'⚠ ')+esc(i[1])).join('<br>'):''}<br><span class=mu>Select the part again to refresh these numbers.</span></p>`}
 return L?`<p class=mu><b>Link:</b> ${L.up?'UP '+etSp(L.speed):'DOWN'} · channel ${L.len} m</p>`:''}

/* ---------- the parts ---------- */
D.ethp={n:'Ethernet device port (PC / PLC / switch port, RJ45 LAN)',ds:'Ethernet device port LAN RJ45 PC PLC network card NIC switch port link LED speed 10 100 1000 Mbps MDI MDI-X auto negotiation',cat:'Communication',pre:'ETH',sy:34,sx:50,bb:[-56,-52,112,104],
 t:[[-20,-40,'L+'],[20,-40,'M'],[0,40,'LAN']],vs:1,
 p:{role:[ETRO[0],'','Device type: PC / PLC = MDI (sends on pins 1 and 2); switch = MDI-X (receives on pins 1 and 2)',ETRO],speed:['1000','','Fastest speed this port can do (Mbps)',ETSP],amdix:['ON','','Auto MDI-X: the port swaps its send and receive pins by itself, so a wrong cable type does not matter',['ON','OFF']],V:D.rs485.p.V},
 cl:c=>false,el:D.rs485.el,tk:c=>{if(ET.st!==S.time)etAnalyse()},rst:c=>{c.s.e=null;ET.st=-1},g:etpSym,
 st:c=>{const r=c.s.e;if(!c.o)return'STOPPED';if(!r)return'STARTING';if(!r.pw)return'NO POWER – needs '+c.p.V+' V on L+ / M';const L=r.lk;if(!L)return'LINK DOWN – '+(r.why||'nothing connected');
  const e=L.iss.find(i=>i[0]===2);return L.up?`LINK UP ${etSp(L.speed)} · ${L.len} m ${ETCT[L.cat]}${L.sh?' shielded':''}${L.q?' · '+(L.q===2?'PROBLEM':'WARNING'):''}`:'LINK DOWN – '+(e?e[1]:'see the results table')},
 msg:c=>{const r=c.s.e,o=[];if(!c.o||!r)return o;
  if(r.ov)o.push(['wa',`${c.label}: supply ${Math.abs(c.o.v).toFixed(0)} V is above the rating (${c.p.V} V)`]);
  if(!r.pw)o.push(['wa',`${c.label}: Ethernet port has no power (needs ${c.p.V} V on L+ / M) – no link`]);
  const L=r.lk;if(L&&L.a===c)L.iss.forEach(i=>o.push(['wa',`Ethernet link ${L.a.label} – ${L.b.label}: ${i[1]}`]));
  else if(!L&&r.walk&&r.walk.st.length&&r.why)o.push(['wa',`${c.label}: LINK DOWN – ${r.why}`]);return o},
 pp:c=>`<p class=mu>An <b>Ethernet port</b> of a PC, PLC or switch. Wire its <b>LAN</b> terminal to the <b>PORT</b> side of an <b>RJ45 plug</b>, the plug’s <b>CABLE</b> side to an <b>Ethernet cable</b>, and the same at the other end. Give the device power on <b>L+ / M</b>. Choose the device type (PC = MDI, switch = MDI-X), the fastest speed and Auto MDI-X. Press <b>Help</b> for the full explanation.</p>`+etNote(c)};
D.rj45={n:'RJ45 plug (8 pins, T568A / T568B colour code)',ds:'RJ45 plug connector 8P8C T568A T568B pin colour wiring order crossover white orange green blue brown pinout',cat:'Communication',pre:'RJ',sy:34,bb:[-32,-52,64,104],vs:1,nolbl:0,
 t:[[0,-40,'PORT'],[0,40,'CABLE']],
 p:{std:[ETST[0],'','Wiring standard of the 8 pins: T568B (usual in Europe / USA), T568A, or Custom to set the colour of every pin yourself (a wrong order breaks the link)',ETST],
  ...Object.fromEntries([1,2,3,4,5,6,7,8].map(i=>['c'+i,[ETCN[ETB[i-1]],'',`Pin ${i} wire colour (${ETSG[i-1]})`,ETCN]])),sh:[ETSH[0],'','Plug: unshielded, or shielded (metal) – a shielded cable needs shielded plugs',ETSH]},
 pv:c=>{const q={...D.rj45.p};if(c.p.std!==ETST[2])for(let i=1;i<=8;i++)delete q['c'+i];return q},chg:(c,k)=>k==='std',
 cl:c=>false,el:()=>[],rst:c=>{c.s.e=null},g:etjSym,
 st:c=>{if(!etValid(etOrd(c)))return'WIRING ERROR – a colour is used twice';const L=c.s.e&&c.s.e.lk;return L?(L.up?'in a working link ('+etSp(L.speed)+')':'in a link that is DOWN'):'standard '+c.p.std.split(' ')[0]},
 msg:c=>etValid(etOrd(c))?[]:[['wa',`${c.label}: a wire colour is used on two pins – every pin needs a different wire`]],
 pp:c=>`<p class=mu>An <b>RJ45 plug</b> with the 8 wires at their pins (looking at the contacts, pin 1 on the left). Wire <b>PORT</b> to the <b>LAN</b> of the device and <b>CABLE</b> to the cable. The colours decide which wire goes to which pin – <b>T568A</b> and <b>T568B</b> differ in the orange and green pairs (use both on one cable for a crossover). Choose <b>Custom</b> to put the wires in any order and see the link break. Press <b>Help</b> for the pin table.</p>${etTable(c)}`+etNote(c)};
D.ethc={n:'Ethernet cable (CAT5e / CAT6 / CAT6A / CAT7, 4 twisted pairs)',ds:'Ethernet cable CAT5e CAT6 CAT6A CAT7 patch cord twisted pair UTP shielded STP straight-through crossover length 100 m network',cat:'Communication',pre:'CAB',sy:34,sx:50,bb:[-66,-32,132,64],
 t:[[-60,0,'A'],[60,0,'B']],
 p:{cat:[ETCT[1],'','Cable category: CAT5e 100 MHz, CAT6 250 MHz, CAT6A 500 MHz, CAT7 600 MHz',ETCT],len:[30,'m','Length of this cable (m). The whole channel may be 100 m at most (90 m + 10 m of patch cords)'],shd:[ETSH[0],'','Shielding: unshielded (UTP) or shielded (foil / braid; needs shielded plugs). CAT7 is always shielded',ETSH],
  wire:[ETWS[0],'','Straight-through (pin 1 to pin 1 …) or crossover (orange and green pairs swapped: pin 1 ↔ 3, 2 ↔ 6)',ETWS],noise:[ETNZ[0],'','Electrical noise around the cable (power cables, drives, motors)',ETNZ]},
 cl:c=>false,el:()=>[],rst:c=>{c.s.e=null},g:etcSym,
 st:c=>{const L=c.s.e&&c.s.e.lk;return L?(L.up?`carrying a link: ${etSp(L.speed)}`:'part of a link that is DOWN')+` · channel ${L.len} m`:`${c.p.cat} ${c.p.len} m ${c.p.wire.toLowerCase()}`},
 msg:c=>{const L=c.s.e&&c.s.e.lk,o=[];if(+c.p.len>100)o.push(['wa',`${c.label}: ${c.p.len} m is longer than the 100 m Ethernet limit`]);return o},
 pp:c=>`<p class=mu>An <b>Ethernet cable</b> with 4 twisted pairs (orange, green, blue, brown). Wire its <b>A</b> and <b>B</b> ends to the <b>CABLE</b> side of an <b>RJ45 plug</b> each. Pick the category, the length (the whole channel may be <b>100 m</b>), shielded or unshielded, straight-through or crossover, and how noisy the place is. Higher category and shielding keep the speed up in a noisy place. Press <b>Help</b> for the full explanation.</p><p class=mu>Reach on this cable: 10 Mbps ${ETRC[10]} m · 100 Mbps ${ETRC[100]} m · 1 Gbps ${ETRC[1000]} m · 10 Gbps ${ETRX[Math.max(0,ETCT.indexOf(c.p.cat))]?ETRX[Math.max(0,ETCT.indexOf(c.p.cat))]+' m':'not possible'}</p>`+etNote(c)};

/* ================= HELP (child first, then technical), wiring guides, easy words, panel size ================= */
const ETKID='<h4>Explained for a child: a road with pairs of lanes</h4><div class=whone>An Ethernet cable is like a <b>road</b> between two houses (two devices). It is a special road with <b>8 lanes</b>, and the lanes come in <b>4 pairs</b> – four little two-lane streets. Each street has its own colour: <b>orange, green, blue and brown</b>. In every street one lane is plain and the other is striped with white. The <b>cars</b> on the road are your <b>data</b>.</div>'+
 '<ul><li><b>Slow road (10 and 100 Mbps)</b> only uses <b>two streets</b>: the <b>orange</b> street is where <i>my</i> cars leave and the <b>green</b> street is where <i>your</i> cars arrive. <b>Fast road (1 Gbps)</b> opens <b>all four streets</b>, and cars drive both ways on every one of them.</li>'+
 '<li><b>The crossing:</b> the street where my cars <i>leave</i> must be the street where your cars <i>arrive</i>. Between a computer and a switch the streets already meet correctly (a <b>straight-through</b> cable). Between two computers the streets must <b>cross over</b> – that is a <b>crossover</b> cable. Modern ports have a clever traffic officer (<b>Auto MDI-X</b>) who sorts it out by himself.</li>'+
 '<li><b>The junction (the RJ45 plug):</b> at each end of the road the workers connect the 8 lanes to the 8 gates of the house, in a fixed order given by the colours (<b>T568A</b> or <b>T568B</b>). If they connect the lanes in the <b>wrong order</b>, cars drive into the wrong gate or crash head-on – <b>traffic jam, the link is down</b>. If they split up the two lanes of one street, the cars on that street disturb each other and the road is slow and full of accidents.</li>'+
 '<li><b>Why the lanes are twisted:</b> the two lanes of a street are <b>twisted around each other like a rope</b>. A gust of wind (electrical noise from motors and power cables) pushes <b>both lanes the same way</b>, so the cars never get pushed off their lane.</li>'+
 '<li><b>A long road:</b> after <b>100 metres</b> the cars get tired and blurry – a road longer than that needs a rest station (a switch). A <b>better road</b> (CAT6, CAT6A, CAT7) is wider and a <b>shielded</b> road has walls against the wind, so the cars can drive faster and the road can lie next to a noisy highway (power cables).</li>'+
 '<li><b>The green light</b> on the house shows that the road is open (<b>link up</b>); it also shows how fast the cars may drive (10, 100, 1000 Mbps).</li></ul>';
const ETTW='<h4>Technical: twisted pairs and why twisting reduces noise</h4><ul><li><b>Differential signalling:</b> a signal is sent on <b>two wires</b> as opposite voltages (+ on one, − on the other); the receiver measures only the <b>difference</b>.</li>'+
 '<li><b>Noise is common-mode:</b> a nearby motor, power cable or radio wave induces about the <b>same</b> voltage in both wires of a pair. In the difference the two cancel – the signal is not touched.</li>'+
 '<li><b>Why the <i>twist</i> matters:</b> in a straight pair one wire is closer to the noise source than the other, so the two noise voltages differ and do not cancel. When the wires are twisted they swap places every few centimetres, so on average both are equally close; every half-twist also reverses the sign of the magnetic pick-up, so neighbouring loops cancel each other. The same works in the other direction: the magnetic fields the pair radiates cancel too, which keeps <b>crosstalk</b> into the neighbouring pairs low.</li>'+
 '<li><b>Different twist rates</b> (orange, green, blue and brown pairs are twisted at slightly different lengths, about 1.5 – 2 cm) stop two neighbouring pairs from coupling to each other. Higher categories twist tighter and add a cross-shaped filler.</li>'+
 '<li><b>Keep the twist:</b> at the plug the wires may be untwisted for only about <b>13 mm</b> (CAT5e) or less. A <b>split pair</b> (pins 3 and 6 taken from two different pairs, e.g. when the colours are wired in the wrong order) puts the two wires of one signal in different pairs: they are no longer twisted together, the noise does not cancel and crosstalk is large – the link may come up, but with errors or only at 10 Mbps.</li>'+
 '<li><b>Shielding</b> (foil <i>F/UTP</i>, braid, or foil around every pair <i>S/FTP</i>) stops noise from reaching the wires at all; it only works when the shield is connected through <b>shielded plugs</b> and grounded. UTP (unshielded) relies on the twist alone.</li></ul>';
const ETCAT='<h4>Cable categories – speed and frequency</h4><table><tr><th>Category</th><th>Max. frequency</th><th>Speed (100 m unless noted)</th><th>Shielding</th><th>Notes</th></tr>'+
 '<tr><td><b>CAT5e</b></td><td>100 MHz</td><td>10 / 100 Mbps, <b>1 Gbps</b></td><td>mostly UTP</td><td>minimum for gigabit; tests for crosstalk added to CAT5</td></tr>'+
 '<tr><td><b>CAT6</b></td><td>250 MHz</td><td>1 Gbps (100 m); <b>10 Gbps up to 55 m</b></td><td>UTP or shielded</td><td>tighter twist, filler between the pairs</td></tr>'+
 '<tr><td><b>CAT6A</b></td><td>500 MHz</td><td><b>10 Gbps</b> (100 m)</td><td>often shielded</td><td>“A” = augmented: crosstalk between cables (alien crosstalk) is specified</td></tr>'+
 '<tr><td><b>CAT7</b></td><td>600 MHz</td><td><b>10 Gbps</b> (100 m)</td><td>always shielded (S/FTP)</td><td>every pair has its own foil; made for GG45 / TERA connectors, often fitted with RJ45</td></tr></table>'+
 '<table><tr><th>Ethernet standard</th><th>Pairs used</th><th>RJ45 pins</th><th>Signal</th><th>Channel</th></tr>'+
 '<tr><td>10BASE-T (10 Mbps)</td><td>2 (one each way)</td><td>1 2 and 3 6</td><td>Manchester code, 10 MHz</td><td>100 m</td></tr>'+
 '<tr><td>100BASE-TX (100 Mbps)</td><td>2 (one each way)</td><td>1 2 and 3 6</td><td>MLT-3, 125 Mbaud, up to about 100 MHz band</td><td>100 m</td></tr>'+
 '<tr><td>1000BASE-T (1 Gbps)</td><td><b>4, both directions at once</b></td><td>all 8</td><td>PAM-5, 125 Mbaud per pair, about 100 MHz</td><td>100 m, CAT5e or better</td></tr>'+
 '<tr><td>10GBASE-T (10 Gbps)</td><td>4, both directions</td><td>all 8</td><td>PAM-16, 800 Mbaud per pair, about 400 MHz</td><td>CAT6 55 m, CAT6A / CAT7 100 m</td></tr></table>'+
 '<p class=mu>The <b>100 m rule</b> is for the whole channel: <b>90 m</b> fixed cable + <b>10 m</b> of patch cords (all patch panels and couplers included). Longer cables often still link at a lower speed, but nothing is guaranteed.</p>';
const ETPIN='<h4>RJ45 pin table: T568A and T568B</h4><table><tr><th>Pin</th><th>T568B (usual)</th><th>T568A</th><th>Pair</th><th>10/100 signal</th><th>1000 signal</th></tr>'+
 [0,1,2,3,4,5,6,7].map(i=>`<tr><td><b>${i+1}</b></td><td>${etSw(ETB[i])}${ETCN[ETB[i]]}</td><td>${etSw(ETA[i])}${ETCN[ETA[i]]}</td><td>${['1 (orange)','1 (orange)','2 (green)','3 (blue)','3 (blue)','2 (green)','4 (brown)','4 (brown)'][i]}</td><td>${['TX+','TX−','RX+','–','–','RX−','–','–'][i]}</td><td>${['BI_DA+','BI_DA−','BI_DB+','BI_DC+','BI_DC−','BI_DB−','BI_DD+','BI_DD−'][i]}</td></tr>`).join('')+'</table>'+
 '<p class=mu>Hold the plug with the contacts up and the latch away from you: pin 1 is on the left. <b>Pins 1-2, 3-6, 4-5 and 7-8 are the four twisted pairs</b> – pins 3 and 6 are <b>not</b> next to each other, which is why the order matters (the “split pair” mistake). T568A is T568B with the orange and green pairs swapped.</p>'+
 '<h4>Straight-through and crossover</h4><ul><li><b>Straight-through</b> (same standard on both plugs): pin 1 → 1 … 8 → 8. For <b>PC / PLC (MDI)</b> to <b>switch (MDI-X)</b>: the PC sends on 1-2 and the switch listens on 1-2.</li>'+
 '<li><b>Crossover</b> (T568A on one plug, T568B on the other): 1 ↔ 3 and 2 ↔ 6 (for gigabit also 4-5 ↔ 7-8). Needed between two PCs or two switches (MDI to MDI, MDI-X to MDI-X) when neither port has <b>Auto MDI-X</b> (mandatory for 1000BASE-T, so a modern gigabit link works with either cable).</li>'+
 '<li>A 100 Mbit crossover cable only crosses the orange and green pairs: two gigabit ports without Auto MDI-X fall back to <b>100 Mbps</b> on it.</li></ul>';
const ETSIM='<h4>What the simulator checks</h4><ul><li>The 8 wires are followed pin by pin through plug → cable → plug; wrong colour order, a colour used twice, split pairs, MDI to MDI on a straight cable, a plug the wrong way round and a cable without a plug break the link.</li>'+
 '<li>The speed is the highest of 10 / 100 / 1000 / 10000 Mbps that <b>both ports</b>, the <b>wiring</b> (10 and 100 use pins 1 2 3 6, 1000 all eight), the <b>length</b> (150 m / 120 m / 100 m; 10 Gbps: CAT6 55 m, CAT6A and CAT7 100 m) and the <b>noise margin</b> (category + shielding − noise around the cable) allow.</li>'+
 '<li>The weakest cable of the channel decides; lengths add up; a shielded cable needs shielded plugs at both ends.</li></ul>';
const ETH_=t=>({ethp:'An <b>Ethernet device port</b> is the RJ45 socket of a PC, PLC, camera or switch. Its <b>LAN</b> terminal is wired to an RJ45 plug; the port shows the <b>link LED</b> (green = link up, red = down), the <b>speed</b> and an <b>activity LED</b>. A PC / PLC is an <b>MDI</b> device (sends on pins 1-2), a switch is <b>MDI-X</b> (listens on pins 1-2); with <b>Auto MDI-X</b> the port swaps its pairs by itself. At start both ports <b>auto-negotiate</b>: they pick the fastest speed both can do and the cable allows.',
  rj45:'An <b>RJ45 plug</b> (8P8C) joins the 8 wires of the cable to the 8 contacts of the port. The <b>colour order</b> of the wires at the 8 pins decides whether the link works: the standards are <b>T568A</b> and <b>T568B</b> (the pin table below). In <i>Custom</i> you set the colour of every pin yourself – a wrong order breaks the link.',
  ethc:'An <b>Ethernet cable</b> carries data over <b>4 twisted pairs</b> (8 wires). Choose the <b>category</b> (CAT5e, CAT6, CAT6A, CAT7), the <b>length</b> (100 m for the whole channel), <b>shielded</b> or unshielded, and <b>straight-through</b> or <b>crossover</b>.'}[t]+'<br><br>')+ETKID+ETTW+ETCAT+ETPIN+ETSIM;
const ETN=['The <b>link LED</b> on the device port is <b style="color:var(--ok)">green</b> and shows the speed (<b>LINK 1 Gbps</b>) when the link is up, <b style="color:var(--er)">red</b> (<b>LINK DOWN</b>) when it is not. The <b>ACT</b> LED blinks while the link is up. The cable shows its 4 twisted pairs and little pulses travelling both ways: 2 pairs at 10 / 100 Mbps, all 4 pairs at 1 Gbps and more.','The RJ45 plug shows the <b>8 pins with their wire colours</b> (striped = white/colour); a red frame means a wiring error. The results table says exactly what is wrong: which pin arrives where, split pair, MDI to MDI, channel too long, noise, no power.','Try it: set a plug to <b>Custom</b> and swap two pins; make the cable 120 m; use a crossover cable between a PC and a switch (with Auto MDI-X OFF); use unshielded CAT5e next to a VFD (noise High); use a CAT6 cable for 10 Gbps over 70 m.'];
if(typeof HLP!=='undefined'){const cw=['Place two <b>Ethernet device ports</b> (PC and switch, or two PCs) and give each 24 V on <b>L+ / M</b>.','Wire <b>LAN</b> of each port to <b>PORT</b> of an <b>RJ45 plug</b>.','Wire the plugs’ <b>CABLE</b> side to <b>A</b> and <b>B</b> of an <b>Ethernet cable</b>.','Choose category, length, shielding and straight / crossover; leave both plugs on T568B for a straight-through cable.','Press <b>▶ Run</b> and read the link LED, the speed and the results table.'];
 HLP.ethp=HL(ETH_('ethp'),cw,ETN,['PCs, PLCs, HMIs, cameras and switches on an industrial or office network; PROFINET and Ethernet/IP use the same cable.']);
 HLP.rj45=HL(ETH_('rj45'),cw,ETN,['Every patch cord and wall outlet; field-terminated plugs on industrial cable.']);
 HLP.ethc=HL(ETH_('ethc'),cw,ETN,['Patch cords between PC and wall outlet, runs between switches (up to 100 m), industrial Ethernet to PLCs and drives.'])}
if(typeof WIR!=='undefined'){
 WIR.ethp={s:'The device’s network socket: LAN goes to the PORT side of an RJ45 plug. 24 V powers the box.',rows:[['l','L+','+24 V from the power supply','r',null,0],['l','M','0 V','b',null,1],['r','LAN','PORT of an RJ45 plug','o',null,2]],tip:['PC / PLC = MDI, switch = MDI-X; leave Auto MDI-X ON unless you want to test cable types.','The link comes up only if the cable, both plugs and the other port are right.']};
 WIR.rj45={s:'An RJ45 plug: PORT faces the device, CABLE faces the cable. The 8 colours at the 8 pins are fixed by the standard (T568A / T568B).',rows:[['l','PORT','LAN of the device (or the CABLE side of a coupler)','o',null,0],['r','CABLE','A or B end of the Ethernet cable','o',null,1]],tip:['Use T568B on both plugs for a straight-through cable; T568A on one plug and T568B on the other makes a crossover.','Every pin needs a different wire colour; pins 3 and 6 must be one twisted pair.']};
 WIR.ethc={s:'A cable with 4 twisted pairs; each end goes to the CABLE side of an RJ45 plug.',rows:[['l','A','CABLE side of the first RJ45 plug','o',null,0],['r','B','CABLE side of the second RJ45 plug','o',null,1]],tip:['Keep the whole channel at 100 m or less (90 m fixed + 10 m patch cords).','Several cables in a row (patch panel) are allowed: the lengths add up and the weakest category decides.']}}
if(typeof hlTerm==='function'){const _h=hlTerm,T={ethp:{'L+':'Supply + (the device needs its own power)',M:'0 V of the supply',LAN:'The RJ45 socket: wire it to the PORT side of an RJ45 plug'},rj45:{PORT:'Port side: wire it to the LAN of the device',CABLE:'Cable side: wire it to the Ethernet cable'},ethc:{A:'First end of the cable (to the CABLE side of a plug)',B:'Second end of the cable (to the CABLE side of a plug)'}};
 hlTerm=(type,n)=>T[type]?(T[type][String(n).trim()]||''):_h(type,n)}
if(typeof CET!=='undefined'){CET.ethp='a house with a gate to the road: a green light shows when the road to the next house is open and how fast the cars may drive.';CET.rj45='the junction where the 8 lanes of the road meet the 8 gates of the house – the colours tell which lane goes to which gate.';CET.ethc='a road with four little two-lane streets (orange, green, blue, brown), twisted together like a rope so the wind cannot push the cars off.'}
if(typeof PNL_MAP!=='undefined'){PNL_MAP.ethp=PNL_MAP.rs485;PNL_MAP.rj45=PNL_MAP.ethc=PNL_MAP.rs485}
