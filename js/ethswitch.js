/* ElectroSim v8.67 – Ethernet switch and networks (library group "Communication").  PHASE 2 of 2.  Loaded after ethernet.js, before view.js.
   Adds to the Phase 1 parts (ethernet.js):
     ethsw  Ethernet switch (unmanaged, 5 / 8 ports)   terminals: 0 L+  1 M  2 … 9 = port 1 … 8 (fixed index; ports 6-8 are not fitted when "Number of ports" = 5)
            Properties: number of ports, fastest speed, supply.  Auto MDI-X is always ON (a straight cable to every device).
   Every fitted port is a link endpoint exactly like the LAN terminal of a device: etAnalyse (ethernet.js) walks plug + cable + plug from it and etLink decides up / down / speed,
   so every port has its own link LED and its own negotiated speed (10 / 100 / 1000 can run side by side on one switch).
   Devices (ethp) get a MAC address (02:E5:00:00:hi:lo from the part id), an IP address and subnet mask, and "Send ping to" (empty = silent).
   Network simulation (etNet, once per tick, a new "slot" of 4.5 s starts a new exchange):
     · ARP:  a device that does not know the MAC of the destination IP broadcasts "who has …?"; the switch FLOODS it to all other ports, the owner answers with a unicast frame.
     · MAC learning: every frame teaches the switch "source MAC is behind this port" (the learning happens when the frame arrives, the table in Properties grows during the animation);
       known destination → only the learned port, unknown / broadcast → all other ports, destination behind the ingress port → dropped.
     · Ping: unicast frame to the learned port, reply back; round trip time from the store-and-forward delay (84 byte frame, link speed, 5 ns/m, 5 µs per switch).
     · Subnets: a device only talks directly to its own subnet (IP and mask); another subnet needs a router → clear message.  Duplicate IP in one network, invalid IP / mask.
     · Loop: a ring of switch ports (graph cycle, also one cable between two ports of the same switch) = broadcast storm: red frame, flooding capped, communication fails, MAC table flaps.
   Animation: coloured frames move along the cables (orange = broadcast / ARP request, blue = unicast data, green = reply); activity LEDs follow the traffic.
   State: switch c.s.e = {pw, ov, n, ports[], mac{}, storm};  device c.s.e adds {arp{}, pg (ping result)};  ET.net = {slot, t0, ops[], hops[], iss[], storm{}, fd, nd}. */
'use strict';
const ETSL=4.5,ETHOP=.55,ETSWD=.08,ETFC={bc:'#e08a00',data:'#2f7fd0',rep:'#12a36b'};
const etIp=s=>{const m=/^\s*(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\s*$/.exec(String(s==null?'':s));if(!m)return null;const b=m.slice(1).map(Number);return b.some(x=>x>255)?null:(b[0]*16777216+b[1]*65536+b[2]*256+b[3])},
 etMk=s=>{const v=etIp(s);if(v===null)return null;let z=0;for(let i=31;i>=0;i--){if(!((v>>>i)&1))z=1;else if(z)return null}return v},
 etIpS=v=>[v>>>24,(v>>>16)&255,(v>>>8)&255,v&255].join('.'),
 etMac=c=>('02:E5:00:00:'+((c.id>>8)&255).toString(16).padStart(2,'0')+':'+(c.id&255).toString(16).padStart(2,'0')).toUpperCase(),
 etIpTxt=c=>c.p.ip&&String(c.p.ip).trim()?String(c.p.ip).trim():'192.168.1.'+(100+(c.id%150)),etIpOf=c=>etIp(etIpTxt(c)),
 etMask=c=>c.p.mask&&String(c.p.mask).trim()?c.p.mask:'255.255.255.0',
 etFmt=t=>t<1e-3?(t*1e6).toFixed(0)+' µs':(t*1e3).toFixed(2)+' ms',etSh=v=>v>=10000?'10G':v>=1000?'1G':v+'M';
const etIss=c=>((ET.net&&ET.net.iss)||[]).filter(i=>i.o===c.id).map(i=>['wa',i.t]);

/* ---------- the network (once per tick) ---------- */
function etNet(){
 const N=ET.net=ET.net||{slot:-1,t0:0,ops:[],hops:[],iss:[],storm:{}};
 if(S.time<N.t0-1e-6){N.slot=-1;N.ops=[];N.hops=[]}
 const devs=S.comps.filter(c=>c.type==='ethp'),sws=S.comps.filter(c=>c.type==='ethsw'),up=ET.L.filter(L=>L.up),par={};
 devs.forEach(c=>par['d'+c.id]='d'+c.id);sws.forEach(c=>par['s'+c.id]='s'+c.id);
 const fd=x=>par[x]===x?x:(par[x]=fd(par[x])),nd=ep=>ep.swp?'s'+ep.sw.id:'d'+ep.id,cyc=[];
 up.forEach(L=>{const a=nd(L.a),b=nd(L.b);if(!(a in par)||!(b in par))return;const ra=fd(a),rb=fd(b);if(ra===rb)cyc.push(a);else par[ra]=rb});   /* an edge inside one component = a ring */
 N.storm={};cyc.forEach(a=>N.storm[fd(a)]=1);N.fd=fd;N.nd=nd;sws.forEach(w=>{if(w.s.e)w.s.e.storm=!!N.storm[fd('s'+w.id)]});
 const k=Math.floor(S.time/ETSL);
 if(k!==N.slot){N.ops.forEach(o=>{if(!o.d){o.d=1;etOp(o)}});N.slot=k;N.t0=k*ETSL;etPlan(N,devs,sws)}
 const tt=S.time-N.t0;N.ops.forEach(o=>{if(!o.d&&tt>=o.t){o.d=1;etOp(o)}});
 /* messages */
 N.iss=[];devs.forEach(d=>{const g=d.s.e&&d.s.e.pg;if(g&&['subnet','noarp','lost','noreply','bad','storm'].includes(g.s))N.iss.push({o:d.id,t:`${d.label}: ${g.m}`})});
 const by={};devs.forEach(d=>{const lk=d.s.e&&d.s.e.lk;if(!lk||!lk.up)return;const ip=etIpOf(d);if(ip===null)return;(by[fd('d'+d.id)+'|'+ip]=by[fd('d'+d.id)+'|'+ip]||[]).push(d)});
 Object.values(by).forEach(g=>{if(g.length>1)N.iss.push({o:g[0].id,t:`IP conflict: ${g.map(x=>x.label).join(' and ')} use the same address ${etIpTxt(g[0])} in one network – both answer ARP requests and the frames go to either of them`})});
 const done={};sws.forEach(w=>{const c=fd('s'+w.id);if(N.storm[c]&&!done[c]){done[c]=1;N.iss.push({o:w.id,t:'loop: the cables form a ring between switch ports – broadcast storm: every broadcast frame circulates for ever, the MAC tables flap and the network is flooded. A managed switch breaks the ring with Spanning Tree (STP); an unmanaged switch cannot – remove one cable'})}})}
function etOp(o){if(o.sw){const w=S.comps.find(c=>c.id===o.sw);if(w&&w.s.e)(w.s.e.mac=w.s.e.mac||{})[o.mac]=o.pi}
 else{const d=S.comps.find(c=>c.id===o.dev);if(d&&d.s.e)(d.s.e.arp=d.s.e.arp||{})[o.ip]=o.mac}}
/* send one frame from endpoint src at time t0 (slot time): follows the cables, learns, floods or forwards at every switch */
function etProp(N,T,src,t0,F){const D=[],H=[],q=[{ep:src,t:t0,dp:0,par:-1}];
 while(q.length&&H.length<70){const{ep,t,dp,par:pr}=q.shift(),L=ep.s.e.lk;if(!L||!L.up)continue;
  const o=L.a===ep?L.b:L.a,h={lk:L.key,fk:ep.s.e.key,t0:t,t1:t+ETHOP,col:F.col,lab:F.lab,sp:L.speed,len:L.len,par:pr},hi=H.push(h)-1;
  if(o.type==='ethp'){D.push({dev:o,t:h.t1,h:hi});continue}
  const w=o.sw,tb=T[w.id];
  if(tb[F.sm]!==o.pi){tb[F.sm]=o.pi;N.ops.push({t:h.t1,sw:w.id,mac:F.sm,pi:o.pi})}                       /* learn: the source is behind this port */
  const ports=w.s.e.ports,dp2=tb[F.dm],outs=F.dm!=='FF'&&dp2!==undefined?(dp2===o.pi?[]:[ports[dp2]]):ports.filter(x=>x!==o);   /* known → one port, unknown / broadcast → flood */
  if(dp<9)outs.forEach(x=>x&&q.push({ep:x,t:h.t1+ETSWD,dp:dp+1,par:hi}))}
 return{D,H}}
function etPlan(N,devs,sws){
 N.hops=[];const T={};sws.forEach(w=>{T[w.id]=Object.assign({},w.s.e.mac)});
 const add=H=>H.forEach(h=>N.hops.push(h)),rtt=(H,hi)=>{let s=0,n=0;for(let i=hi;i>=0;i=H[i].par){const h=H[i];s+=84*8/((h.sp||100)*1e6)+h.len*5e-9;n++}return{n,t:2*(s+(n-1)*5e-6)}};let j=0;
 devs.forEach(d=>{const r=d.s.e;if(!r)return;r.pg=null;const dst=String(d.p.dst||'').trim();if(!dst)return;
  if(!r.pw||!r.lk||!r.lk.up){r.pg={s:'down',m:'the link is down – nothing can be sent'};return}
  const ip=etIpOf(d),mk=etMk(etMask(d)),dip=etIp(dst);
  if(ip===null||mk===null||dip===null){r.pg={s:'bad',m:ip===null?`the IP address “${etIpTxt(d)}” is not valid`:mk===null?`the subnet mask “${etMask(d)}” is not valid (for example 255.255.255.0)`:`the destination “${dst}” is not a valid IP address`};return}
  const t0=.2+.5*(j++),mac=etMac(d),comp=N.fd('d'+d.id),bc=dip===4294967295||dip===((((ip&mk)|(~mk))>>>0));
  if(!bc&&((dip&mk)>>>0)!==((ip&mk)>>>0)){r.pg={s:'subnet',m:`${dst} is in another subnet than ${etIpTxt(d)} / ${etMask(d)} – a switch only connects devices of the same subnet; a router is needed (the PC would send to its default gateway, but there is none)`};return}
  if(bc){const R=etProp(N,T,d,t0,{sm:mac,dm:'FF',col:ETFC.bc,lab:'broadcast'});add(R.H);r.pg={s:'bc',m:`broadcast sent – the switch floods it to every port; ${R.D.length} device(s) received it`};return}
  if(N.storm[comp]){const R=etProp(N,T,d,t0,{sm:mac,dm:'FF',col:'#d33',lab:'storm'});add(R.H);r.pg={s:'storm',m:'broadcast storm – the ring makes every broadcast circulate for ever; nothing gets through reliably'};return}
  const cache=r.arp=r.arp||{};
  if(!(dip in cache)){const R=etProp(N,T,d,t0,{sm:mac,dm:'FF',col:ETFC.bc,lab:'ARP'});add(R.H);let ok=0;
   R.D.filter(x=>etIpOf(x.dev)===dip&&x.dev.s.e.pw).forEach(x=>{const R2=etProp(N,T,x.dev,x.t+.15,{sm:etMac(x.dev),dm:mac,col:ETFC.rep,lab:'ARP reply'});add(R2.H);
    const b=R2.D.find(y=>y.dev===d);if(b){ok=1;N.ops.push({t:b.t,dev:d.id,ip:dip,mac:etMac(x.dev)})}});
   r.pg=ok?{s:'arp',m:`ARP: “who has ${dst}?” was broadcast to every port; the owner answered – now ${dst} is known and the next frames go straight to its port`}:{s:'noarp',m:`nobody answered “who has ${dst}?” – that host is not connected, has no power or is in another network`};return}
  const dm=cache[dip],R=etProp(N,T,d,t0,{sm:mac,dm,col:ETFC.data,lab:'data'});add(R.H);const tg=R.D.find(y=>etMac(y.dev)===dm);
  if(!tg){r.pg={s:'lost',m:'the frame did not reach the destination (cable, port or MAC table)'};return}
  const tmk=etMk(etMask(tg.dev));
  if(tmk===null||((ip&tmk)>>>0)!==((etIpOf(tg.dev)&tmk)>>>0)){r.pg={s:'noreply',m:`${tg.dev.label} received the frame but cannot answer: with its mask ${etMask(tg.dev)} it thinks ${etIpTxt(d)} is in another subnet`};return}
  const R3=etProp(N,T,tg.dev,tg.t+.15,{sm:dm,dm:mac,col:ETFC.rep,lab:'reply'});add(R3.H);
  if(!R3.D.some(y=>y.dev===d)){r.pg={s:'noreply',m:`${tg.dev.label} answered but the reply did not come back`};return}
  const q=rtt(R.H,tg.h);r.pg={s:'ok',m:`ping ${dst} answered by ${tg.dev.label} – round trip about ${etFmt(q.t)} over ${q.n} link${q.n>1?'s':''} (store-and-forward)`,rtt:q.t}})}
/* activity LED: lit while a frame is on the link of this endpoint (null = no traffic configured → the Phase 1 heartbeat) */
function etActive(r){const N=ET.net;if(!N||!N.hops.length||!r.lk)return null;const tt=S.time-N.t0;return N.hops.some(h=>h.lk===r.lk.key&&tt>=h.t0&&tt<=h.t1)}
/* frames travelling on a cable (SVG inside the cable symbol, x from -40 to 40) */
function etFrames(c,L){const N=ET.net;if(!L||!L.up||!N||!N.hops.length)return'';const tt=S.time-N.t0,cb=L.els.filter(e=>e.type==='ethc'),m=cb.length,k=cb.indexOf(c);let h='';
 N.hops.forEach(x=>{if(x.lk!==L.key||tt<x.t0||tt>x.t1)return;let u=(tt-x.t0)/(x.t1-x.t0);if(x.fk!==L.a.s.e.key)u=1-u;const l=u*m-k;if(l<0||l>1)return;
  const px=c.s.e.ent===1?40-80*l:-40+80*l;h+=`<rect x="${(px-4.5).toFixed(1)}" y="-3.5" width="9" height="7" rx="1.5" style="fill:${x.col};stroke:#fff;stroke-width:.9"/>`});return h}
const etPgS=(g,c)=>g.s==='ok'?`ping ${String(c.p.dst).trim()} ✓ ${etFmt(g.rtt)}`:g.s==='arp'?'ARP resolved':g.s==='bc'?'broadcast sent':g.s==='subnet'?'ping ✗ other subnet':g.s==='noarp'?'ping ✗ no ARP answer':g.s==='storm'?'STORM':g.s==='noreply'?'ping ✗ no reply':g.s==='lost'?'ping ✗ lost':g.s==='bad'?'ping ✗ invalid IP':'';

/* ---------- device: network properties added to the Phase 1 port ---------- */
Object.assign(D.ethp.p,{ip:['','txt','IP address of this device (empty = automatic 192.168.1.x)'],mask:['255.255.255.0','txt','Subnet mask (255.255.255.0 = the first three numbers must be equal to talk directly)'],dst:['','txt','Send a ping to this IP address every few seconds (empty = silent, 255.255.255.255 = broadcast)']});
const _ethpPp=D.ethp.pp,_ethpSt=D.ethp.st,_ethpMsg=D.ethp.msg;
D.ethp.pp=c=>{const g=S.run&&c.o&&c.s.e&&c.s.e.pg;return _ethpPp(c)+`<p class=mu><b>Network:</b> MAC <b>${etMac(c)}</b> (made from the part number) · IP <b>${esc(etIpTxt(c))}</b> / ${esc(etMask(c))}${g?`<br><b style="color:${g.s==='ok'||g.s==='arp'||g.s==='bc'?'var(--ok)':'var(--er)'}">${esc(etPgS(g,c))}</b> – ${esc(g.m)}`:''}<br><span class=mu>Give a device “Send ping to” and connect devices through a <b>switch</b>: the frames move along the cables and the switch learns the MAC addresses.</span></p>`};
D.ethp.st=c=>{const s=_ethpSt(c),g=c.s.e&&c.s.e.pg;return g&&g.s!=='down'&&S.run&&c.o&&c.s.e.lk&&c.s.e.lk.up?s+' · '+etPgS(g,c):s};
D.ethp.msg=c=>_ethpMsg(c).concat(etIss(c));
D.ethp.ds+=' IP address subnet mask ping MAC ARP';

/* ---------- the switch ---------- */
function etswSym(c){const r=c.s.e,a=!!S.run&&!!c.o&&!!r&&!!r.ports,n=+c.p.ports===8?8:5,mc=r&&r.mac?Object.keys(r.mac).length:0,sm=a&&r.storm,
  tx=(x,y,s,t,st)=>`<text x="${x}" y="${y}" class="mt" style="font-size:${s}px;${st||''}">${t}</text>`;
 let h=`<rect x="-90" y="-34" width="160" height="68" rx="3" class="s"${sm?' style="stroke:var(--er);stroke-width:1.8"':''}/><text x="-10" y="-18" class="tx" style="font-size:8.5px">ETHERNET SWITCH · UNMANAGED</text>`+
  tx(-10,-9,6.5,sm?'LOOP – BROADCAST STORM':`${n} ports · auto MDI-X · ${a?'MAC table: '+mc:'store-and-forward'}`,sm?'fill:var(--er);font-weight:700':'')+tx(-20,-27,7,'L+')+tx(20,-27,7,'M');
 for(let i=0;i<8;i++){const x=-80+20*i,fit=i<n,px=a&&fit?r.ports[i]:null,L=px&&px.s.e.lk,up=!!(L&&L.up),wired=!!(px&&px.s.e.walk&&(px.s.e.walk.st.length||px.s.e.walk.end)),ac=up&&(etActive(px.s.e)===null?Math.floor(S.time*6)%2===0:etActive(px.s.e));
  h+=tx(x,0,5.5,fit?(up?etSh(L.speed):''):'n/a',up?'fill:var(--ok);font-weight:700':'')+
   `<circle cx="${x}" cy="9" r="3.2" style="fill:${up?'var(--ok)':wired&&a?'var(--er)':'#c8d3dc'};stroke:#6b7782;stroke-width:.5${fit?'':';stroke-dasharray:1 1'}"/><circle cx="${x}" cy="18" r="2.6" style="fill:${ac?'#e08a00':'#c8d3dc'};stroke:#6b7782;stroke-width:.5"/>`+tx(x,29,6,i+1,fit?'':'fill:#9aa7b3')}
 return h}
function etSwNote(c){const r=c.s.e;if(!(S.run&&c.o&&r&&r.ports))return'';
 let h='<p class=mu><b>Ports</b><br>'+r.ports.map(px=>{const L=px.s.e.lk,pe=L?(L.a===px?L.b:L.a).label:'';return`${px.pi+1}: ${L?(L.up?'<b style="color:var(--ok)">'+etSp(L.speed)+'</b> → '+esc(pe):'<b style="color:var(--er)">down</b> → '+esc(pe)):'<span class=mu>nothing connected</span>'}`}).join('<br>')+'</p>';
 const m=Object.entries(r.mac||{});
 return h+'<p class=mu><b>MAC address table</b> – the switch learns the source address of every frame it receives (real switches forget an entry after about 5 minutes without traffic – not simulated)<br>'+(m.length?m.map(([mc,pi])=>{const d=S.comps.find(x=>x.type==='ethp'&&etMac(x)===mc);return`${mc} → port ${pi+1}${d?' ('+esc(d.label)+')':''}`}).join('<br>'):'empty – nothing learned yet; the first frames are flooded to all ports')+'</p>'}
D.ethsw={n:'Ethernet switch (unmanaged, 5 / 8 ports)',ds:'Ethernet switch unmanaged 5 port 8 port MAC address table learning flooding broadcast storm loop auto MDI-X auto-negotiation store and forward collision domain broadcast domain hub spanning tree',cat:'Communication',pre:'SW',sy:34,vs:1,bb:[-96,-52,172,104],
 t:[[-20,-40,'L+'],[20,-40,'M'],...[0,1,2,3,4,5,6,7].map(i=>[-80+20*i,40,'P'+(i+1),'o'])],
 p:{ports:['5','','Number of ports: 5 or 8 (ports 6 to 8 are not fitted on a 5-port switch)',['5','8']],speed:['1000','','Fastest speed of every port (Mbps); each port negotiates its own speed with the device',ETSP],V:D.rs485.p.V},
 cl:c=>false,el:D.rs485.el,tk:c=>{if(ET.st!==S.time)etAnalyse()},rst:c=>{c.s.e=null;ET.st=-1;ET.net=null},g:etswSym,
 st:c=>{const r=c.s.e;if(!c.o)return'STOPPED';if(!r||!r.ports)return'STARTING';if(!r.pw)return'NO POWER – needs '+c.p.V+' V on L+ / M';
  const u=r.ports.filter(px=>px.s.e.lk&&px.s.e.lk.up).length,m=Object.keys(r.mac||{}).length;return`${u} of ${r.n} ports up · ${m} MAC address${m===1?'':'es'} learned${r.storm?' · LOOP – BROADCAST STORM':''}`},
 msg:c=>{const r=c.s.e,o=[];if(!c.o||!r)return o;
  if(r.ov)o.push(['wa',`${c.label}: supply ${Math.abs(c.o.v).toFixed(0)} V is above the rating (${c.p.V} V)`]);
  if(!r.pw)o.push(['wa',`${c.label}: switch has no power (needs ${c.p.V} V on L+ / M) – every port is dead`]);
  const n=r.n||5;for(let i=n;i<8;i++){const k=c.id+'.'+(2+i);if(S.wires.some(w=>w.a===k||w.b===k))o.push(['wa',`${c.label}: a wire is connected to port ${i+1}, but this is a ${n}-port switch – ports ${n+1} to 8 are not fitted (set Number of ports = 8)`])}
  (r.ports||[]).forEach(px=>{const L=px.s.e.lk;if(L&&L.a===px)L.iss.forEach(i=>o.push(['wa',`Ethernet link ${L.a.label} – ${L.b.label}: ${i[1]}`]))});
  return o.concat(etIss(c))},
 pp:c=>`<p class=mu>An <b>unmanaged Ethernet switch</b>: it connects several devices in one network. Give it power on <b>L+ / M</b>. Wire each <b>port</b> terminal (P1 … P8) to the <b>PORT</b> side of an <b>RJ45 plug</b>, the plug to a cable, and the cable to a device – a normal <b>straight-through</b> cable (the switch has <b>Auto MDI-X</b> on every port). Every port has its own <b>link LED</b>, <b>speed</b> and <b>activity LED</b>. The switch <b>learns MAC addresses</b> and sends each frame only where it belongs; give devices <i>Send ping to</i> and watch the frames. Press <b>Help</b> for the full explanation.</p>`+etSwNote(c)};

/* ================= HELP (child first, then technical), wiring guide, easy words, panel size ================= */
const ETSWK='<h4>Explained for a child: the post office that learns the streets</h4><div class=whone>A town has a <b>post office in the middle</b> and a <b>street</b> for every house. The post office is the <b>switch</b>, a street is a <b>port</b>, and the houses are the computers. Every house has a <b>name on its door</b> that never changes – its <b>MAC address</b>. A letter is a <b>frame</b>: it says who it is for and who sent it.</div>'+
 '<ul><li><b>Learning:</b> when a letter arrives, the clerk looks at the <b>sender’s name</b> and writes in his notebook: “<i>Anna lives down street 2</i>”. After a while he knows where everybody lives. The notebook is the <b>MAC table</b>.</li>'+
 '<li><b>Delivering:</b> if he <b>knows</b> the street of the receiver he sends the letter <b>only down that street</b> – the other houses are not disturbed. If he does <b>not know</b> it yet (or the letter is for <i>everybody</i>), he makes a <b>copy for every street</b> and shouts it out: that is <b>flooding</b> / a <b>broadcast</b>.</li>'+
 '<li><b>“Who has number 20?”</b> Before you can write to a computer you only know its <b>number</b> (the IP address, like a house number), not the <b>name on the door</b>. So your computer shouts into all streets “<i>Who has number 20?</i>” (<b>ARP</b>); the owner answers “<i>Me, my name is Bob!</i>” Then you write to Bob’s name, and the post office already knows his street.</li>'+
 '<li><b>A roundabout instead of a post office</b> is a <b>hub</b>: every car (frame) is sent to everybody, so cars crash when two drive at once. The switch gives every house its own quiet street, so there are no crashes, and cars drive <b>both ways at once</b> (full duplex).</li>'+
 '<li><b>Different towns:</b> two streets with different <b>town numbers</b> (different <b>subnets</b>, e.g. 192.168.1.x and 192.168.2.x) are different towns. The post office of one town cannot deliver to the other – you need a <b>bus between the towns</b>, a <b>router</b>.</li>'+
 '<li><b>The traffic jam:</b> if you build <b>two roads between the same post offices</b> (a ring), a shouted letter runs round and round for ever and fills the whole town: a <b>broadcast storm</b>. Big post offices have a clever manager who closes one road (<b>Spanning Tree</b>); a small, unmanaged one does not – so never make a ring.</li></ul>';
const ETSWT='<h4>Technical: how an Ethernet switch works</h4><ul><li><b>Layer 2 device:</b> it forwards <b>Ethernet frames</b> by their <b>MAC addresses</b> (6 bytes, 48 bits; the first half identifies the manufacturer). A frame = preamble 8 + destination MAC 6 + source MAC 6 + type 2 + payload 46 – 1500 + FCS 4 bytes, followed by a 12-byte gap: at least <b>84 bytes</b> on the wire.</li>'+
 '<li><b>Store-and-forward:</b> the switch receives the <b>whole frame</b>, checks the CRC (FCS) and only then sends it on; damaged frames are dropped. It adds one frame time plus a few microseconds per switch (cut-through switches start sending after the destination address). A 84-byte frame needs 6.7 µs at 100 Mbps and 0.67 µs at 1 Gbps – the simulator uses this for the ping round-trip time.</li>'+
 '<li><b>MAC learning:</b> for every frame the switch stores <b>source MAC → ingress port</b> in its MAC (CAM) table and refreshes the entry; entries age out after about 300 s. <b>Known destination</b> → forwarded to that port only. <b>Unknown unicast or broadcast</b> (FF:FF:FF:FF:FF:FF) → <b>flooded</b> to all ports except the one it came in on. Destination behind the ingress port → the frame is filtered (dropped).</li>'+
 '<li><b>Collision domain vs broadcast domain:</b> in a <b>hub</b> all ports are <b>one collision domain</b> (half duplex, CSMA/CD). Every <b>switch port is its own collision domain</b> and, with a full-duplex link, has <b>no collisions at all</b>. But the whole switch (all its ports and every switch connected to it) is still <b>one broadcast domain</b> – a broadcast reaches everybody; only a <b>router</b> or a <b>VLAN</b> splits it.</li>'+
 '<li><b>Full duplex and auto-negotiation:</b> both ends of a link exchange fast link pulses (FLP) and agree on the best common <b>speed (10 / 100 / 1000 Mbps) and duplex</b>; every port negotiates alone, so one switch can run 1 Gbps to a PC and 100 Mbps to an old printer. A duplex mismatch (one side fixed to full, the other auto → half) causes late collisions and slow transfers. <b>Auto MDI-X</b> lets every port use straight or crossover cables.</li>'+
 '<li><b>IP and MAC:</b> the switch does not look at IP addresses. A device decides with its <b>IP address and subnet mask</b> whether the destination is in its own subnet (ARP, then send to the destination MAC) or not (send to the <b>default gateway</b>, a router). That is why devices of different subnets cannot talk through a switch alone.</li>'+
 '<li><b>Loops and Spanning Tree:</b> Ethernet frames have <b>no hop count</b> (no TTL). With a ring of switches a broadcast or unknown frame is flooded round for ever, copies multiply, the MAC tables flap (the same MAC is seen on different ports) and the network collapses – a <b>broadcast storm</b>. <b>STP</b> (IEEE 802.1D, faster: RSTP 802.1w) elects a root bridge by exchanging BPDUs and puts redundant ports in the <b>blocking</b> state, so the topology is a loop-free tree; if a link fails a blocked port takes over. <b>Unmanaged switches do not run STP – never connect two ports of the same network together.</b></li></ul>';
const ETSWC='<h4>Comparison: hub vs unmanaged switch vs managed switch</h4><table><tr><th></th><th>Hub</th><th>Unmanaged switch</th><th>Managed switch</th></tr>'+
 '<tr><td>OSI layer</td><td>1 (physical)</td><td>2 (data link)</td><td>2, often 3 (routing)</td></tr>'+
 '<tr><td>How it forwards</td><td>repeats every bit to all other ports</td><td>learns MAC addresses, forwards to the right port, floods unknown / broadcast</td><td>same, plus VLAN tags, priorities, filters</td></tr>'+
 '<tr><td>Collision domain</td><td>one for all ports</td><td>one per port (none in full duplex)</td><td>one per port</td></tr>'+
 '<tr><td>Bandwidth</td><td>shared between all devices</td><td>full speed per port</td><td>full speed per port</td></tr>'+
 '<tr><td>Duplex</td><td>half only (CSMA/CD)</td><td>full duplex, auto-negotiation</td><td>full duplex, configurable</td></tr>'+
 '<tr><td>Broadcast domain</td><td>one</td><td>one</td><td>split with VLANs</td></tr>'+
 '<tr><td>Loops</td><td>storm</td><td><b>storm</b> – no protection</td><td>STP / RSTP / MSTP block the loop</td></tr>'+
 '<tr><td>Configuration</td><td>none</td><td>none (plug and play)</td><td>web, CLI, SNMP</td></tr>'+
 '<tr><td>Monitoring</td><td>none</td><td>LEDs only</td><td>port statistics, port mirroring, logs, alarms</td></tr>'+
 '<tr><td>Security</td><td>everybody hears everything</td><td>frames only to their port (but flooded when unknown)</td><td>port security, 802.1X, ACLs, VLAN separation</td></tr>'+
 '<tr><td>Typical use</td><td>obsolete (old networks, protocol analysis)</td><td>small office or machine cell, a few devices</td><td>industrial and company networks, redundancy rings</td></tr></table>';
const ETSWS='<h4>What the simulator does with the network</h4><ul><li>Every device has a <b>MAC address</b> (from its part number), an <b>IP address</b>, a <b>subnet mask</b> and <i>Send ping to</i>. Frames are drawn travelling along the cables: <b style="color:#e08a00">orange</b> = broadcast / ARP request, <b style="color:#2f7fd0">blue</b> = unicast data, <b style="color:#12a36b">green</b> = reply. A new exchange starts every 4.5 s.</li>'+
 '<li>First exchange: an <b>ARP broadcast</b> that the switch floods to all other ports; next ones: the ping goes <b>only to the learned port</b>. Select the switch to see its <b>MAC table</b> grow.</li>'+
 '<li>Warnings: another subnet (a router is needed), duplicate IP address, invalid IP or mask, nobody answers ARP, a <b>ring of switch ports</b> (broadcast storm), wire on a port that is not fitted.</li></ul>';
if(typeof HLP!=='undefined'){const sw=['Give the switch and every device 24 V on <b>L+ / M</b>.','For each device: <b>LAN</b> → RJ45 plug <b>PORT</b>; plug <b>CABLE</b> → cable → second plug <b>CABLE</b>; second plug <b>PORT</b> → a switch port <b>P1 … P8</b> (use a straight-through cable, both plugs T568B).','Give every device an IP address in the same subnet (for example 192.168.1.10, .20, .30 with mask 255.255.255.0) and set <i>Send ping to</i> on one or two of them.','Press <b>▶ Run</b>: watch the ARP broadcast being flooded, the MAC table filling and the pings going to one port only.','Try a different subnet, the same IP twice, or a second cable between two switch ports (a ring).'],
  sn=['Each port has a <b>link LED</b> (green = up, red = wired but down), its <b>speed</b> above it (1G, 100M, 10M) and an <b>activity LED</b> that flashes when a frame passes. Select the switch to see the <b>MAC table</b> and the state of every port.','The cables show <b>coloured frames</b> moving: orange = broadcast / ARP, blue = data, green = reply. In a ring the frames pile up and the switch turns red (<b>LOOP – BROADCAST STORM</b>).','The device shows its IP address and the result of its ping (<b>ping 192.168.1.20 ✓ 0.05 ms</b>, <b>✗ other subnet</b>, <b>✗ no ARP answer</b>); the results table explains what is wrong.','Try it: ping a device in another subnet; give two devices the same IP; connect port 1 to port 2 with a cable; use a 120 m cable to one device (that port runs slower); switch the number of ports to 5 and wire port 7.'];
 HLP.ethsw=HL(ETSWK+ETSWT+ETSWC+ETSWS+ETKID+ETTW+ETCAT,sw,sn,['Small office and workshop networks, machine cells with several PLCs, HMIs and drives, labs; industrial installations use managed switches with rings.']);
 const ew=['Place two <b>Ethernet device ports</b> (PC and switch, or two PCs) and give each 24 V on <b>L+ / M</b>.','Wire <b>LAN</b> of each port to <b>PORT</b> of an <b>RJ45 plug</b>, the plugs’ <b>CABLE</b> side to <b>A</b> and <b>B</b> of an <b>Ethernet cable</b>.','Give each device an IP address (or leave it empty for an automatic one) and the same subnet mask; set <i>Send ping to</i> on one of them.','Choose category, length, shielding and straight / crossover.','Press <b>▶ Run</b> and read the link LED, the speed, the ping result and the results table.'];
 HLP.ethp=HL(ETH_('ethp')+ETSWS,ew,ETN,['PCs, PLCs, HMIs, cameras and switch ports on an industrial or office network; PROFINET and Ethernet/IP use the same cable.'])}
if(typeof WIR!=='undefined')WIR.ethsw={s:'A small switch: every port goes through an RJ45 plug and a cable to one device. 24 V powers the box.',rows:[['l','L+','+24 V from the power supply','r',null,0],['l','M','0 V','b',null,1],...[0,1,2,3,4,5,6,7].map(i=>['r','P'+(i+1),'PORT of the RJ45 plug of device '+(i+1),'o',null,2+i])],
 tip:['Straight-through cables to every device: the switch has Auto MDI-X on every port.','Never connect two ports of the same network with a cable (a ring = broadcast storm) – unmanaged switches have no Spanning Tree.','Every port negotiates its own speed; a long or noisy cable only slows that one port.']};
if(typeof hlTerm==='function'){const _h2=hlTerm;hlTerm=(type,n)=>{if(type==='ethsw'){n=String(n).trim();return n==='L+'?'Supply + (the switch needs its own power)':n==='M'?'0 V of the supply':/^P[1-8]$/.test(n)?`Port ${n.slice(1)}: wire it to the PORT side of an RJ45 plug (ports 6 to 8 only exist on the 8-port version)`:''}return _h2(type,n)}}
if(typeof CET!=='undefined')CET.ethsw='a post office in the middle of a town: it learns in which street every house lives (the MAC table) and delivers each letter only down the right street; two roads in a ring make letters run round for ever.';
if(typeof PNL_MAP!=='undefined')PNL_MAP.ethsw=PNL_MAP.rs485;
