/* ElectroSim v8.36 – Voltage monitoring relay (single phase), library group "Protection". Loaded after alt.js, before view.js.
   Watches the voltage between L and N (it is also the relay's own supply) and switches one changeover output.
   Terminals (fixed index):  0 L   1 N   2 15 (COM)   3 16 (NC)   4 18 (NO)
   Modes: Window (under + over) | Undervoltage | Overvoltage.  Thresholds are % of the nominal voltage Un, with a hysteresis.
   Timing: a fault must last the TRIP delay before the relay trips; the voltage must be good for the RESTART delay before it recovers
   (the same restart delay runs after power-up).  Output: energised when the voltage is OK (fail-safe) or energised on fault.
   Fault memory: Auto reset | Latch (stays tripped until Reset is pressed or the supply is removed).
   Below 20 % of Un the relay has no power: the output is always de-energised.
   State (c.s):  vu measured volts · vA relay powered · hl voltage healthy right now · k 0 starting / 1 OK / 2 tripped · tg wanted state · tm timer · lat latched
                 uvF / ovF threshold flags (for the hysteresis) · en output relay energised (read by contacts that name this relay) */
'use strict';
const VMM=['Window (under + over)','Undervoltage','Overvoltage'],VMO=['Energised when voltage OK','Energised on fault'],VMA=['Auto reset','Latch (fault memory)'];
const vmUn=c=>Math.max(1,+c.p.Un||230);
/* output relay follows the monitoring state; no power = always off. Returns 1 if it changed. */
function vmOut(c){const s=c.s,x=!!s.vA&&(c.p.ro===VMO[1]?s.k===2:s.k===1);const ch=x!==!!s.en;s.en=x?1:0;return ch?1:0}
D.vmr={n:'Voltage Monitoring Relay (1-ph, under / over voltage)',ds:'Single-phase voltage monitoring relay: under-voltage, over-voltage or window, hysteresis, trip and restart delay, optional fault memory; 1 changeover output',
 cat:'Protection',pre:'KV',xr:1,sy:34,bb:[-40,-52,80,104],
 t:[[-20,-40,'L'],[20,-40,'N'],[-20,40,'15','o'],[0,40,'16','o'],[20,40,'18','o']],
 p:{Un:[230,'V','Nominal voltage Un'],md:[VMM[0],'','Monitoring mode',VMM],uv:[85,'%','Under-voltage threshold (% of Un)'],ov:[115,'%','Over-voltage threshold (% of Un)'],hy:[5,'%','Hysteresis (% of Un)'],
  Td:[1,'s','Trip delay (fault must last this long)'],Tr:[1,'s','Restart delay (voltage OK this long)'],ro:[VMO[0],'','Output relay',VMO],mem:[VMA[0],'','Fault memory',VMA]},
 cl:c=>!!c.s.en,
 el:c=>{const Un=vmUn(c);return[RR(0,1,Un*Un/1.5),RR(2,4,c.s.en?.005:1e9),RR(2,3,c.s.en?1e9:.005)]},
 sim:(c,E)=>{const p=c.p,s=c.s,Un=vmUn(c),U=Math.hypot(E[0].vr,E[0].vi),hy=Un*Math.max(0,+p.hy||0)/100,uvT=Un*(+p.uv||0)/100,ovT=Un*(+p.ov||0)/100,
   al=U>=.2*Un;if(s.k==null)s.k=0;let uv=p.md!==VMM[2]&&(s.uvF?U<uvT+hy:U<uvT),ov=p.md!==VMM[1]&&(s.ovF?U>ovT-hy:U>ovT);
  if(!al)uv=ov=false;
  s.vu=U;s.vA=al?1:0;s.uvF=uv?1:0;s.ovF=ov?1:0;s.hl=al&&!uv&&!ov?1:0;s.why=!al?'NO SUPPLY':uv?'UNDERVOLTAGE':ov?'OVERVOLTAGE':'';
  if(!al){s.k=0;s.tm=0;s.tg=0;s.lat=0}   /* no power: everything is forgotten, also the fault memory */
  return vmOut(c)},
 tk:c=>{const p=c.p,s=c.s;
  if(!s.vA){s.k=0;s.tm=0;s.tg=0;s.lat=0;vmOut(c);return}
  if(s.lat){s.k=2;s.tm=0;vmOut(c);return}
  const tg=s.hl?1:2;
  if(s.tg!==tg){s.tg=tg;s.tm=0}
  if(s.k!==tg){s.tm=(s.tm||0)+DT;if(s.tm>=Math.max(0,+(tg===1?p.Tr:p.Td)||0)-1e-9){s.k=tg;s.tm=0;if(tg===2){s.lw=s.why;if(p.mem===VMA[1])s.lat=1}}}else s.tm=0;
  vmOut(c)},
 rst:c=>{Object.assign(c.s,{vu:0,vA:0,hl:0,k:0,tg:0,tm:0,lat:0,uvF:0,ovF:0,lw:'',why:'',en:0})},
 clk:(c,a)=>{if(a==='reset'&&c.s.lat){const s=c.s;s.lat=0;s.k=0;s.tm=0;s.tg=0;vmOut(c)}},
 st:c=>{const s=c.s,p=c.p;if(!c.o)return'STOPPED';const U=(s.vu||0).toFixed(0)+' V',left=t=>Math.max(0,(+t||0)-(s.tm||0)).toFixed(1)+' s';
  if(!s.vA)return`NO SUPPLY (${U})`;
  if(s.lat)return`TRIPPED – ${s.lw||'FAULT'} – latched, press Reset`;
  if(s.k===1)return s.hl?`VOLTAGE OK ${U} – relay ${s.en?'ON':'OFF'}`:`${s.why} ${U} – trips in ${left(p.Td)}`;
  if(s.k===2)return s.hl?`TRIPPED (${s.lw||'FAULT'}) – recovering, restart in ${left(p.Tr)}`:`TRIPPED – ${s.why} ${U} – relay ${s.en?'ON':'OFF'}`;
  return s.hl?`STARTING – ready in ${left(p.Tr)}`:`${s.why} ${U} – trips in ${left(p.Td)}`},
 msg:c=>{const s=c.s,p=c.p,r=[];if(!c.o)return r;const Un=vmUn(c),U=(s.vu||0).toFixed(0);
  if(s.vA&&s.why)r.push(['wa',`${c.label}: ${s.why} ${U} V (${s.why==='UNDERVOLTAGE'?'threshold '+(Un*p.uv/100).toFixed(0):'threshold '+(Un*p.ov/100).toFixed(0)} V)${s.k===2?' – tripped, output relay '+(s.en?'ON':'OFF'):' – trip delay running'}`]);
  if(s.vA&&s.lat)r.push(['wa',`${c.label}: fault latched – press Reset (in its properties or on the device) or remove the supply`]);
  if(p.md===VMM[0]&&+p.uv+2*Math.max(0,+p.hy||0)>=+p.ov)r.push(['wa',`${c.label}: under-voltage threshold (${p.uv} %) + hysteresis is not below the over-voltage threshold (${p.ov} %) – check the settings`]);
  return r},
 pp:c=>{const s=c.s,on=S.run&&c.o;return`<p class=mu>Connect <b>L</b> and <b>N</b> to the voltage to be watched – this is also the relay's own supply. The changeover output <b>15 / 16 / 18</b> (15–18 normally open, 15–16 normally closed) shows the result: with <i>Energised when voltage OK</i> it is pulled in while the voltage is inside the limits. Use 15–18 in the contactor coil circuit, or name a contact after this relay's label (e.g. KV1) to use it elsewhere.${on?'<br><b>Now:</b> '+esc(D.vmr.st(c)):''}</p>`+
  (s.lat&&on?'<div class=row><button data-clk="reset">Reset fault</button></div>':'')},
 g:c=>{const s=c.s,p=c.p,a=!!S.run&&!!c.o,Un=vmUn(c),sc=v=>-26+52*Math.max(0,Math.min(1.5,v/Un))/1.5,
   un=p.md!==VMM[2],ov=p.md!==VMM[1],x1=un?sc(Un*(+p.uv||0)/100):-26,x2=ov?sc(Un*(+p.ov||0)/100):26,
   L=(t,x,y)=>`<text x="${x}" y="${y}" class="mt" style="font-size:8px">${t}</text>`,bl=Math.floor((S.time||0)*3)%2,
   trip=a&&s.k===2,pendT=a&&s.vA&&s.k!==2&&!s.hl&&!s.lat,pendS=a&&s.vA&&s.k!==1&&s.hl&&!s.lat,
   gr=a&&s.en?'var(--ok)':(pendS&&bl?'var(--ok)':'#c8d3dc'),rd=trip||(pendT&&bl)?'var(--er)':'#c8d3dc',
   txt=a&&s.vA?Math.round(s.vu)+' V':p.md===VMM[0]?`${p.uv}–${p.ov} %`:p.md===VMM[1]?`U< ${p.uv} %`:`U> ${p.ov} %`,
   nd=a&&s.vA?`<path d="M${sc(s.vu)} -1V8" style="stroke:${s.hl?'var(--tx)':'var(--er)'};stroke-width:1.6;stroke-linecap:round;fill:none" />`:'',
   rs=s.lat&&a?`<g data-clk="reset" style="cursor:pointer"><rect x="-13" y="-30" width="26" height="9" rx="2" style="fill:var(--er);stroke:none"/><text y="-23" class="mt" style="font-size:6.5px;font-weight:700;fill:#fff">RESET</text></g>`:'';
  return`<rect x="-34" y="-34" width="68" height="68" rx="3" class="s"/><text y="-15" class="tx" style="font-size:9.5px">VOLTAGE</text><text y="-6" class="tx" style="font-size:9.5px">RELAY</text>`+
   `<rect x="-26" y="1" width="52" height="4" style="fill:var(--gd);stroke:none"/><rect x="${x1}" y="1" width="${Math.max(0,x2-x1)}" height="4" style="fill:rgba(18,163,107,.55);stroke:none"/>`+nd+
   `<text y="15" class="mt" style="font-size:7.5px">${txt}</text>`+
   `<circle cx="-14" cy="22" r="3" style="fill:${gr};stroke:var(--w)"/><circle cx="14" cy="22" r="3" style="fill:${rd};stroke:var(--w)"/>`+
   (rs||L('L',-20,-27)+L('N',20,-27))+['15','16','18'].map((n,i)=>L(n,-20+i*20,32)).join('')}};

/* help text and terminal descriptions */
if(typeof HLP!=='undefined')HLP.vmr=HL('A <b>voltage monitoring relay</b> watches a single-phase supply and switches its output when the voltage leaves the allowed band. It protects equipment from <b>under-voltage</b> (brown-out: motors overheat, contactors chatter), <b>over-voltage</b> (insulation and electronics at risk), or both at once (<b>window</b> mode). It measures the voltage between <b>L</b> and <b>N</b> and is powered from the same two terminals.',
 ['Connect <b>L</b> and <b>N</b> to the supply to be monitored (after the MCB). Below about 20 % of Un the relay has no power and its output is always off.','Output changeover: <b>15</b> = common, <b>16</b> = normally closed, <b>18</b> = normally open. Wire <b>15–18</b> in series with a contactor coil so the load is only switched on while the voltage is good.','Name a contact after this relay\'s label (for example <b>KV1</b>) to use its output anywhere in the drawing.'],
 ['<b>Thresholds</b> are % of the nominal voltage Un. <b>Hysteresis</b> (% of Un) stops chattering: after an under-voltage trip the voltage must rise above the threshold <i>plus</i> the hysteresis before it counts as good again (and below the over-voltage threshold <i>minus</i> the hysteresis).','<b>Trip delay</b>: a fault must last this long before the relay trips, so short dips are ignored. <b>Restart delay</b>: the voltage must be good this long before the relay recovers; it also runs after power-up. The LED blinks while a delay runs (green = starting, red = about to trip).','<b>Output relay</b>: <i>Energised when voltage OK</i> is fail-safe – the relay also drops out when the supply is lost. <i>Energised on fault</i> pulls the relay in on a fault (for an alarm), but it is still off when there is no supply.','<b>Fault memory</b>: with <i>Latch</i> the relay stays tripped after the voltage returns, until you press <b>Reset</b> (Properties or the red button on the device) or remove the supply.','The bar on the device shows the green allowed window and a needle for the measured voltage; the numbers below it show the live voltage while running.'],
 ['Protecting single-phase motors, compressors and pumps, UPS and sensitive electronics, and generator or inverter supplies.']);
if(typeof hlTerm==='function'){const _ht=hlTerm;hlTerm=(type,n)=>type==='vmr'?({'L':'Live – the supply and the voltage being monitored','N':'Neutral – reference of the measured voltage','15':'Output relay – common','16':'Output relay – normally closed (closed when the relay is off)','18':'Output relay – normally open (closed when the relay is on)'}[String(n).trim()]||''):_ht(type,n)}
