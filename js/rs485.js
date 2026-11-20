/* ElectroSim v8.60 – RS485 node (2-wire, half-duplex), library group "Communication".  Loaded after procsw.js, before view.js.
   One part, two roles (Properties → Role): MASTER (starts every conversation) or SLAVE (answers when asked).
   Terminals (fixed index):  0 L+   1 M   2 A (D-)   3 B (D+)   4 G (signal ground / shield, optional)
   The bus is the wiring: every node whose A and B are wired together (A-A, B-B) is on the same bus.  The solver exposes the net of every
   terminal as S.net(key); this file groups the nodes by those nets once per tick (rsAnalyse) and judges the bus like a real installation:
     - polarity (A/B swapped), a node on only one wire, A and B shorted, baud rate of each node vs the master
     - termination: 120 ohm at the two ends only (needed when the cable is longer than ~2e7 / baud metres, else reflections)
     - bias (fail-safe) resistors: ONE set on the bus keeps the idle line a clean "1" (>= 0.2 V); none = floating, noise looks like data
     - cable length vs baud (limit = 1e8 / baud metres, never above 1200 m), signal at the far end (24 AWG pair, 0.17 ohm/m loop, loaded by the
       terminations and 12 kohm unit loads), more than 32 nodes, two masters (collision), no master, no slave that can answer, no common G reference
   The symbol is a small oscilloscope: orange = wire B, blue = wire A (B above A = logic 1).  It scrolls a 5 bit/s picture of the real 8N1 frame
   (idle, start bit, 8 data bits LSB first, stop bit): first a REQUEST from the master, then a REPLY from one slave (slaves answer in turn).
   Ringing = no termination, noise on idle = no bias, round edges = cable too long, flat = short or no power, inverted = A/B swapped.
   Power: L+ / M must carry >= 70 % of the supply voltage (Properties) or the node is silent and deaf.   State: c.s.r (see rsAnalyse). */
'use strict';
const RSBD=['1200','2400','4800','9600','19200','38400','57600','115200','250000','500000','1000000'],RSRO=['Master','Slave'],RSOO=['OFF','ON'];
const RS_UL=12000,RS_RB=470,RS_RS=40,RS_RL=.17,RS_VS=5,RS_VN=2.8,RS_BPS=5,RS_FR=16;   /* unit load ohm · each bias resistor ohm · driver source ohm (both lines) · cable loop ohm per metre · driver swing V · nominal signal V · scope bits/s · bits per frame slot */
/* v8.62: the Modbus RTU master / slave parts (modbus.js) sit on the same bus: same terminals, same A/B/baud/termination/bias analysis */
const rsIs=q=>q.type==='rs485'||q.type==='mbm'||q.type==='mbs',rsM=c=>c.type==='mbm'||(c.type==='rs485'&&c.p.role!=='Slave');
const rsBaud=c=>Math.max(300,+c.p.baud||9600),rsLen=c=>Math.max(1,+c.p.len||1),rsMax=b=>Math.min(1200,1e8/b),rsLc=b=>2e7/b;
const rsByte=c=>{if(c.type!=='rs485')return(+(c.type==='mbm'?c.p.sa:c.p.addr)||0)&255;const v=parseInt(String(c.p.by==null?'':c.p.by).replace(/^0x/i,'').trim(),16);return isNaN(v)?0:v&255};
const rsHex=v=>(v&255).toString(16).toUpperCase().padStart(2,'0'),rsH=x=>{const s=Math.sin(x*127.1+311.7)*43758.5453;return s-Math.floor(s)};
const RS={st:-1,g:[]};

/* ---------- bus analysis (once per tick) ---------- */
function rsAnalyse(){
 const ns=S.comps.filter(rsIs),net=typeof S.net==='function'?S.net:k=>k;RS.g=[];
 ns.forEach(c=>{const r=c.s.r=c.s.r||{},V=Math.max(1,+c.p.V||24),v=c.o?Math.abs(c.o.v):0;
  Object.assign(r,{na:net(c.id+'.2'),nb:net(c.id+'.3'),ng:net(c.id+'.4'),pw:v>=.7*V?1:0,ov:v>1.3*V?1:0,gp:null,nq:0,nm:'',cn:0,sw:0,bm:0})});
 const by={};ns.forEach(c=>{const r=c.s.r;(by[r.na]=by[r.na]||[]).push(c);if(r.nb!==r.na)(by[r.nb]=by[r.nb]||[]).push(c)});
 const seen=new Set();
 ns.forEach(c0=>{if(seen.has(c0))return;const g=[],q=[c0];seen.add(c0);
  while(q.length){const x=q.pop();g.push(x);[x.s.r.na,x.s.r.nb].forEach(n=>(by[n]||[]).forEach(y=>{if(!seen.has(y)){seen.add(y);q.push(y)}}))}
  g.sort((a,b)=>ns.indexOf(a)-ns.indexOf(b));rsGroup(g)});
 RS.st=S.time}
function rsGroup(g){
 const G={nodes:g,ld:g[0],iss:[],q:0,fc:{},fn:0};RS.g.push(G);g.forEach(c=>c.s.r.gp=G);
 if(g.length<2){G.alone=1;return}
 const mas=g.filter(c=>rsM(c)),ref=mas.find(c=>c.s.r.pw)||mas[0]||g[0],bA=ref.s.r.na,bB=ref.s.r.nb;
 G.ref=ref;G.short=bA===bB;G.baud=rsBaud(ref);G.nm='RS485 bus ('+g.slice(0,4).map(c=>c.label).join(', ')+(g.length>4?' …':'')+')';
 g.forEach(c=>{const r=c.s.r;
  if(G.short){r.nq=2;r.nm='A and B are wired together (short)'}
  else if(r.na===bA&&r.nb===bB)r.cn=1;
  else if(r.na===bB&&r.nb===bA){r.cn=1;r.sw=1;r.nq=2;r.nm='has A and B swapped – it sees every bit upside down and cannot understand the others'}
  else{r.nq=2;r.nm='is on only one of the two bus wires – wire both A and B to the bus'}});
 const cn=g.filter(c=>c.s.r.cn);G.cn=cn;
 cn.forEach(c=>{const r=c.s.r;if(c!==ref&&rsBaud(c)!==G.baud){r.bm=1;if(!r.nm){r.nq=2;r.nm=`is set to ${rsBaud(c)} baud but the master uses ${G.baud} baud – it hears garbage`}}});
 G.pm=cn.filter(c=>rsM(c)&&c.s.r.pw);
 const sl=cn.filter(c=>!rsM(c)&&c.s.r.pw);G.rep=sl.filter(c=>!c.s.r.sw&&!c.s.r.bm);
 /* electrical picture of the bus */
 const nU=Math.max(1,cn.length),nT=cn.filter(c=>c.p.term==='ON').length,nB=cn.filter(c=>c.p.bias==='ON'&&c.s.r.pw).length,
  L=Math.max(...(mas.length?mas:g).map(rsLen)),Rin=RS_UL/nU,Req=nT?1/(1/Rin+nT/120):Rin,Rl=RS_RL*L;
 Object.assign(G,{nU,nT,nB,L,mx:rsMax(G.baud),lc:rsLc(G.baud),Req});
 G.vo=RS_VS*Req/(Req+RS_RS);G.vs=RS_VS*Req/(Req+RS_RS+Rl);G.vi=nB?RS_VS*Req/(Req+2*RS_RB/nB):0;
 const I=G.iss,b=G.baud;
 if(G.short){I.push([2,'A and B are connected together – the signal is shorted and nothing can be sent'])}
 else{
  if(L>1200){I.push([2,`the cable is ${L} m – RS485 allows at most 1200 m; add a repeater or shorten it`]);G.cor=1}
  else if(L>G.mx*1.3){I.push([2,`a ${L} m cable is far too long for ${b} baud (limit about ${Math.round(G.mx)} m) – the edges blur and bits are lost; lower the baud rate or shorten the cable`]);G.cor=1}
  else if(L>G.mx)I.push([1,`a ${L} m cable is slightly too long for ${b} baud (limit about ${Math.round(G.mx)} m) – errors are likely; lower the baud rate or shorten the cable`]);
  if(G.vs<.2){I.push([2,`the signal at the far end is only ${G.vs.toFixed(2)} V (a receiver needs at least 0.2 V) – the cable is too long or too many terminations load the driver`]);G.cor=1}
  else if(G.vs<.5)I.push([1,`the signal at the far end is weak (${G.vs.toFixed(2)} V, receivers need 0.2 V) – shorten the cable or check the terminations`]);
  if(L>G.lc){if(nT===0)I.push([1,`no termination: at ${b} baud a ${L} m cable needs a 120 Ω resistor at BOTH ends, otherwise the signal bounces back (ringing) and bits are damaged`]);
   else if(nT===1)I.push([1,'only one end is terminated – switch termination ON at the node at the other end of the cable too']);}
  if(nT>2)I.push([1,`${nT} termination resistors are ON – only the two ends of the cable may be terminated (the driver is overloaded)`]);
  if(nB===0)I.push([1,'no bias (fail-safe) resistors are ON – when nobody talks the wires float and noise can look like data; switch bias ON at ONE node (normally the master)']);
  else if(G.vi<.2)I.push([1,`the idle voltage is only ${G.vi.toFixed(2)} V (needs 0.2 V or more) – the bus is not a clean 1 when idle; check bias and terminations`]);
  else if(nB>2)I.push([1,`${nB} nodes have bias ON – one set is enough; many in parallel load the bus`]);
  const gw=cn.filter(c=>S.wires.some(w=>w.a===c.id+'.4'||w.b===c.id+'.4')),com=gw.length===cn.length&&new Set(cn.map(c=>c.s.r.ng)).size===1;
  if(!com&&L>100)I.push([1,'the G terminals (signal ground / shield) are not all wired together – on a long cable the nodes can sit at different ground voltages and the receivers fail']);
  if(cn.length>32)I.push([1,`${cn.length} nodes – RS485 is rated for 32 unit loads; use a repeater for more`]);
  if(!G.pm.length)I.push([1,mas.length?'the master has no power – nobody starts a conversation':'there is no master on this bus – nobody starts a conversation']);
  else if(G.pm.length>1)I.push([2,`${G.pm.length} masters are powered – they talk at the same time (collision) and every frame is destroyed; a Modbus bus has only one master`]);
  else if(!G.rep.length)I.push([1,'the master gets no reply – there is no powered slave on this bus that can answer (see the slave messages)']);}
 G.q=Math.max(0,...I.map(i=>i[0]));
 /* what the scope draws */
 const r=G.L/G.lc,tq=nT===2?.08:nT===1?.55:nT===0?1:.4;
 G.am=G.short?.02:Math.max(.04,Math.min(1.3,G.vs/RS_VN));G.ib=nB?Math.min(.45,G.vi/RS_VN):0;
 G.rg=r>1?Math.min(1,.15+.1*r)*tq:0;G.nz=Math.min(.6,(nB?(G.vi<.2?.25:0):.35)+(L>G.mx?.25:0));
 G.sl=L>G.mx?Math.min(1,.3+(L/G.mx-1)*1.5):Math.min(.15,L/G.mx*.15)}

/* ---------- what is on the wire right now ---------- */
function rsFrame(G,cy,req){const k=cy+(req?'q':'r');if(k in G.fc)return G.fc[k];if(G.fn++>80){G.fc={};G.fn=0}
 let F=null;
 if(G.pm&&G.pm.length){if(req)F=G.pm.length>1?{col:1,drv:G.pm[0]}:{by:rsByte(G.pm[0]),drv:G.pm[0]};
  else if(G.pm.length===1&&G.rep.length){const s=G.rep[cy%G.rep.length];F={by:rsByte(s),drv:s}}}
 return G.fc[k]=F}
const rsTalk=G=>{const t=S.time*RS_BPS,sl=Math.floor(t/RS_FR),req=sl%2===0,cy=Math.floor(sl/2);return{t,req,cy,F:rsFrame(G,cy,req)}};
/* level of bit i: +am = 1 (mark), -am = 0 (space), ib = idle bias */
function rsLev(G,i){if(i<0)return G.ib;const sl=Math.floor(i/RS_FR),j=i-sl*RS_FR,F=rsFrame(G,Math.floor(sl/2),sl%2===0);
 if(!F||j<3||j>12)return G.ib;const k=j-3;
 if(F.col)return rsH(i*3.7+sl)<.5?G.am*.6:-G.am*.6;
 const bit=k===0?0:k===9?1:(F.by>>(k-1))&1;return bit?G.am:-G.am}
function rsVal(G,t){const i=Math.floor(t),f=t-i,cur=rsLev(G,i),prv=rsLev(G,i-1);
 let s=Math.min(1,f/(.1+G.sl*.7));s=s*s*(3-2*s);let v=prv+(cur-prv)*s;
 if(G.rg&&cur!==prv)v+=G.rg*(cur-prv)/2*.55*Math.exp(-f*5)*Math.cos(f*26);
 if(G.nz)v+=G.nz*.7*(rsH(t*8)-.5);return v}
/* what a node got from the driver of a frame: [byte, ok] */
function rsRx(G,c,F,T){const r=c.s.r,d=F.drv.s.r;let by=F.by,ok=1;
 if(r.bm||rsBaud(c)!==rsBaud(F.drv)){ok=0;by=(by*37+11+T.cy*29)&255}
 else if(r.sw!==d.sw){ok=0;by=~by&255}
 else if(G.cor){ok=0;by=(by^(1+((T.cy*37+5)%254)))&255}
 return[by,ok]}
/* short status text + colour class for a node */
function rsNow(c){const r=c.s.r;if(!r)return['starting','mu'];if(!r.pw)return['NO POWER','er'];
 const G=r.gp;if(!G||G.alone)return['not on a bus','mu'];if(G.short)return['SHORT A-B','er'];if(!r.cn)return['NOT ON BUS','er'];
 const T=rsTalk(G),F=T.F,ms=rsM(c);
 if(T.req){if(!G.pm.length)return['NO MASTER','wa'];if(G.pm.length>1)return['COLLISION','er'];
  if(c===F.drv)return['TX '+rsHex(F.by),'ok'];const x=rsRx(G,c,F,T);return['RX '+rsHex(x[0])+(x[1]?' ✓':' ✗'),x[1]?'ok':'er']}
 if(!F)return[ms?(G.pm.length?'NO REPLY':'NO MASTER'):'idle',ms?'wa':'mu'];
 if(c===F.drv)return['TX '+rsHex(F.by),'ok'];
 if(c===G.pm[0]){const x=rsRx(G,c,F,T);return['RX '+rsHex(x[0])+(x[1]?' ✓':' ✗'),x[1]?'ok':'er']}
 return['idle','mu']}
const rsCol=k=>k==='ok'?'var(--ok)':k==='er'?'var(--er)':k==='wa'?'#e08a00':'';

/* ---------- the part ---------- */
D.rs485={n:'RS485 node (2-wire, half-duplex: master / slave)',ds:'RS485 serial communication node master slave A B differential bus modbus termination bias resistor baud rate cable length oscilloscope',
 cat:'Communication',pre:'RS',sy:34,bb:[-56,-52,112,104],
 t:[[-20,-40,'L+'],[20,-40,'M'],[-20,40,'A'],[0,40,'B'],[20,40,'G','o']],
 p:{role:[RSRO[0],'','Role on the bus',RSRO],baud:['9600','','Baud rate (bits per second)',RSBD],term:[RSOO[0],'','Termination resistor 120 Ω (A–B)',RSOO],bias:[RSOO[0],'','Bias (fail-safe) resistors',RSOO],
  len:[100,'m','Cable length of the WHOLE bus (m)'],by:['A5','txt','Byte this node sends (hex 00–FF)'],V:[24,'V','Supply voltage (L+ to M)']},
 pv:c=>{const q={...D.rs485.p};if(!rsM(c))delete q.len;return q},
 chg:(c,k)=>k==='role',
 cl:c=>false,
 el:c=>[RR(0,1,Math.pow(Math.max(1,+c.p.V||24),2)/.5)],
 tk:c=>{if(RS.st!==S.time)rsAnalyse()},
 rst:c=>{c.s.r=null;RS.st=-1},
 st:c=>{const r=c.s.r;if(!c.o)return'STOPPED';if(!r||!r.gp)return'STARTING';if(!r.pw)return'NO POWER – needs '+c.p.V+' V on L+ / M';const G=r.gp,n=rsNow(c)[0];
  if(G.alone)return'NOT ON A BUS – wire A and B to other RS485 nodes';
  if(r.nq&&!G.short)return`${n} – ${r.nm}`;
  return`${n} – ${G.q===0?'bus OK':G.q===1?'bus MARGINAL':'bus BAD'} · ${G.nU} nodes · ${G.baud} baud · ${G.L} m (limit ${Math.round(G.mx)} m) · term ${G.nT} · bias ${G.nB}`},
 msg:c=>{const r=c.s.r,o=[];if(!c.o||!r)return o;
  if(r.ov)o.push(['wa',`${c.label}: supply ${Math.abs(c.o.v).toFixed(0)} V is above the rating (${c.p.V} V) – the transceiver could be damaged`]);
  if(!r.pw)o.push(['wa',`${c.label}: RS485 node has no power (needs ${c.p.V} V on L+ / M) – it is silent and deaf`]);
  const G=r.gp;if(!G||G.alone)return o;
  if(r.nm&&r.pw&&!G.short)o.push(['wa',`${c.label}: ${r.nm}`]);
  if(G.ld===c)G.iss.forEach(i=>o.push(['wa',`${G.nm}: ${i[1]}`]));
  return o},
 pp:c=>{const r=c.s.r,G=r&&r.gp,on=S.run&&c.o,m=rsM(c);
  let h=`<p class=mu>${m?'This device is the <b>master</b>: it starts every conversation (asks) and the slaves answer.':'This device is a <b>slave</b>: it only answers when the master asks.'} Wire <b>A</b> to <b>A</b> and <b>B</b> to <b>B</b> of every other RS485 node (a daisy chain) and power it on <b>L+ / M</b>. ${m?'Set the cable length of the <b>whole bus</b> here.':'The cable length of the whole bus is set on the master.'} Switch <b>termination ON</b> at the two ends of the cable and <b>bias ON</b> at one node only. Make the symbol bigger (Size %) to read the scope; press <b>Help</b> for the full explanation.</p>`;
  if(on&&G&&!G.alone&&r.pw)h+=`<p class=mu><b>Now:</b> ${esc(rsNow(c)[0])} · bus ${G.q===0?'OK':G.q===1?'MARGINAL':'BAD'}<br>Nodes ${G.nU} · baud ${G.baud} · cable ${G.L} m (limit ≈ ${Math.round(G.mx)} m)<br>Terminations ON ${G.nT} (want 2) · bias ON ${G.nB} (want 1)<br>Signal at far end ${G.vs.toFixed(2)} V (needs ≥ 0.2 V) · idle ${G.nB?G.vi.toFixed(2)+' V':'floating'} (needs ≥ 0.2 V)<br><span class=mu>Select the part again to refresh these numbers.</span></p>`;
  return h},
 g:(c,o,cl)=>{const s=c.s,r=s.r,a=!!S.run&&!!c.o&&!!r&&!!r.gp,ms=rsM(c),pv=!a,G=pv?{pm:[c],rep:[c],fc:{},fn:0,am:1,rg:0,nz:0,sl:.05,ib:.05}:r.gp,
   live=pv||(r.pw&&!G.alone&&r.cn&&!G.short),t=pv?14:S.time*RS_BPS,sg=!pv&&r&&r.sw?-1:1,N=48,NW=12,W=84,hh=22;
  let dA='',dB='';
  if(live)for(let k=0;k<=N;k++){const v=Math.max(-1.4,Math.min(1.4,rsVal(G,t-NW+NW*k/N)*sg))*hh*.3,x=(-42+W*k/N).toFixed(1);dB+=(k?'L':'M')+x+' '+(-v).toFixed(1);dA+=(k?'L':'M')+x+' '+v.toFixed(1)}
  else dA=dB='M-42 0H42';
  const nw=pv?['','']:rsNow(c),txt=pv?`${c.p.baud} baud`:nw[0],cl2=pv?'':rsCol(nw[1]),
   L=(x,y,t2)=>`<text x="${x}" y="${y}" class="mt" style="font-size:7.5px">${t2}</text>`,
   tb=(k,on)=>`<tspan style="fill:${on?'var(--ok)':'#c8d3dc'};font-weight:700">${k}</tspan>`;
  return`<rect x="-50" y="-34" width="100" height="68" rx="3" class="s"/><text y="-18" class="tx" style="font-size:8.5px">RS485 ${ms?'MASTER':'SLAVE'}</text>`+
   `<rect x="-42" y="-11" width="84" height="22" style="fill:var(--gd);stroke:none"/><path d="M-42 0H42" style="stroke:#c8d3dc;stroke-width:.6;stroke-dasharray:2 2;fill:none"/>`+
   `<path d="${dB}" style="fill:none;stroke:#e08a00;stroke-width:1.1;stroke-linejoin:round"/><path d="${dA}" style="fill:none;stroke:#2f7fae;stroke-width:1.1;stroke-linejoin:round"/>`+
   `<text x="-42" y="20" class="mt" style="font-size:7.5px;text-anchor:start${cl2?';fill:'+cl2+';font-weight:700':''}">${esc(txt)}</text>`+
   `<text x="42" y="20" class="mt" style="font-size:7.5px;text-anchor:end">${tb('T',c.p.term==='ON')} ${tb('B',c.p.bias==='ON')}</text>`+
   L(-20,-27,'L+')+L(20,-27,'M')+`<text x="0" y="-27" class="mt" style="font-size:6.5px">${c.p.baud} bd</text>`+L(-20,31,'A')+L(0,31,'B')+L(20,31,'G')}};

/* ---------- help text, wiring guide, easy words, panel size ---------- */
if(typeof HLP!=='undefined')HLP.rs485=HL('<b>RS485</b> is a way for devices to <b>talk to each other over just two wires</b>. It is the most common industrial communication cable: PLCs, drives, energy meters and sensors that speak <b>Modbus</b> usually sit on an RS485 cable.<br><br>'+
 '<b>In very simple words:</b> imagine a long string with a tin can at each end. You can talk or listen, but <b>only one person talks at a time</b> (this is called <i>half-duplex</i>). One device is the <b>boss</b> – the <b>master</b> – who asks the questions. All the others are <b>helpers</b> – the <b>slaves</b> – who answer only when the boss asks them.<br><br>'+
 '<b>Why two wires, A and B?</b> The listener does not look at one wire alone – it looks at the <b>difference</b> between them. If <b>B is higher than A</b>, the bit is a <b>1</b>. If <b>B is lower than A</b>, the bit is a <b>0</b>. Electrical noise from big motors pushes both wires up or down by the same amount, so the <i>difference</i> does not change – that is why RS485 still works over <b>1200 m</b> in a noisy factory. The two wires are <b>twisted</b> together so the noise really does hit both of them equally.<br><br>'+
 '<b>One byte on the wire (8N1):</b> when nobody talks, the line rests at 1 (idle). A byte starts with one <b>start bit</b> (a 0), then <b>8 data bits</b> (the smallest bit first), then one <b>stop bit</b> (a 1). The <b>baud rate</b> is the number of bits per second – at 9600 baud one bit lasts 104 µs. Every device on the bus must use the <b>same baud rate</b>, like everybody in a room speaking at the same speed.<br><br>'+
 '<b>Termination (120 Ω):</b> a signal that reaches the end of a long cable bounces back like an <b>echo in a canyon</b> and damages the next bits. A 120 Ω resistor between A and B at <b>each of the two ends</b> of the cable soaks the signal up, like a curtain that stops the echo. Not in the middle – only the two ends.<br><br>'+
 '<b>Bias (fail-safe) resistors:</b> when nobody is talking, A and B are not driven and just float, and noise can look like a start bit. Bias resistors pull B up and A down a little (about 0.2–0.3 V) so the quiet bus is always a clean 1. Switch bias on at <b>one</b> node only – normally the master.<br><br>'+
 '<b>G (ground / shield):</b> a third wire or the cable shield that gives every device the same 0 V reference. It matters most on long cables.<br><br>'+
 '<b>The rules of a good bus:</b> 1) twisted pair, A to A and B to B everywhere · 2) one long line (daisy chain), no stars · 3) termination ON at the two ends only · 4) bias ON at one node · 5) cable no longer than the limit for the baud rate (the simulator uses about 100 000 000 ÷ baud metres, never more than 1200 m) and no more than 32 nodes.',
 ['Place one RS485 node as <b>Master</b> and one or more as <b>Slave</b>. Give each node 24 V on <b>L+</b> and <b>M</b>.','Wire <b>A</b> to <b>A</b> and <b>B</b> to <b>B</b> from node to node. Wire <b>G</b> to <b>G</b> as well.','Set the same <b>baud rate</b> on every node, termination ON at the first and last node, bias ON at the master, and the cable length on the master.'],
 ['The little screen is an <b>oscilloscope</b>: <b style="color:#e08a00">orange</b> = wire B, <b style="color:#2f7fae">blue</b> = wire A. B above A is a 1, B below A is a 0. Make the part bigger (Size % in Properties) to see more. Not running: it shows a sample frame of the byte this node sends.','The screen first shows a <b>request</b> from the master, then a <b>reply</b> from one slave, then again – only one device talks at a time. Under the screen: <b>TX</b> = this node is sending that byte, <b>RX</b> = it received a byte (✓ good, ✗ damaged), <b>NO REPLY</b> = the master is waiting but no slave can answer, <b>COLLISION</b> = two masters talk together.','<b>Wiggles at the edges</b> (ringing) = the cable is not terminated. <b>Fuzz on the quiet line</b> = no bias. <b>Rounded edges</b> and damaged bytes = the cable is too long for the baud rate. <b>Flat lines</b> = A and B shorted, or no power. <b>Upside-down picture</b> = A and B swapped on that node.','The letters <b>T</b> and <b>B</b> turn green when this node\'s termination / bias resistors are ON.','Warnings in the results table tell you exactly what is wrong and how to fix it. Try it: turn bias off, swap A and B on one slave, give a slave a different baud rate, or make the cable 3000 m long.'],
 ['Modbus RTU between a PLC and VFDs, energy meters, sensors and remote I/O; building automation (BACnet MS/TP); PROFIBUS DP uses the same electrical layer.']);
if(typeof WIR!=='undefined')WIR.rs485={s:'Two wires (A and B) carry the data from device to device; 24 V powers the box; G is the common ground / shield.',
 rows:[['l','L+','+24 V from the power supply','r',null,0],['l','M','0 V','b',null,1],['r','A','A of the next RS485 node (A to A)','o',null,2],['r','B','B of the next RS485 node (B to B)','o',null,3],['r','G','G / shield of the next node (optional, recommended)','pe',null,4]],
 tip:['Use a <b>twisted pair</b> for A and B. Connect A to A and B to B on every node – if one node has them swapped it understands nothing.','Run the bus as one long line from node to node (daisy chain), not as a star.','Termination ON only at the <b>two ends</b> of the cable; bias ON at <b>one</b> node (normally the master).','All nodes must use the same baud rate. Set the cable length of the whole bus on the master.']};
if(typeof hlTerm==='function'){const _h=hlTerm;hlTerm=(type,n)=>type==='rs485'?({'L+':'Supply + (the node needs its own power)','M':'0 V of the supply','A':'Data wire A (D−, inverting): B above A is a 1','B':'Data wire B (D+, non-inverting): B above A is a 1','G':'Signal ground / cable shield: the common 0 V reference of all nodes (optional)'}[String(n).trim()]||''):_h(type,n)}
if(typeof CET!=='undefined')CET.rs485='two friends talking through a long string: only one talks at a time, the other listens. The boss (master) asks, the helpers (slaves) answer.';
if(typeof CEC!=='undefined')CEC.Communication='the “talking” part: devices send numbers to each other over a cable instead of a signal wire per value.';
if(typeof CEF!=='undefined')CEF.Communication='Read the results table: every communication problem (wrong baud rate, swapped A/B, no termination, no bias, cable too long) is written there in plain words.';
if(typeof PNL_MAP!=='undefined')PNL_MAP.rs485=['p',45,90,2];
