/* ElectroSim v8.39 – Flow switch, Vacuum switch and Speed / Zero-speed switch, library group "Switching". Loaded after stepper.js.
   All three have one changeover contact (terminals fixed: 0 COM  1 NC  2 NO). At rest COM–NC is closed; when ACTUATED COM–NO is closed (like the pressure switches).
   The process value is typed in Properties ("… now") – change it while the simulation runs to test the contact. A switch actuates at the set point and resets at
   set point ∓ differential (hysteresis), so the contact does not chatter.
   Flow / vacuum : "Actuates when" the value RISES to (or FALLS to) the set point.
   Speed switch  : actuates at or above the set speed.   Zero-speed switch: actuated while the shaft turns, drops at standstill (≤ zero-speed threshold) after the start-up delay.
   Speed can be read from a 1-phase or 3-phase motor in the drawing: type that motor's label (e.g. M1) in "Read speed from motor". */
'use strict';
const PSW_ACT=['Value rises to the set point','Value falls to the set point'];
const pswMotor=c=>{const l=String(c.p.src||'').trim().toUpperCase();return l?S.comps.find(q=>String(q.label).toUpperCase()===l&&(q.type==='mot3'||q.type==='mot1')):null};
const pswVal=c=>{if(c.type==='sps'){const m=pswMotor(c);if(m)return Math.abs(m.s.rpm||0)}return +c.p.v||0};
function pswAct(c){const p=c.p,s=c.s,v=pswVal(c),t=c.type;
 if(t==='sps'){
  if(p.md==='Zero-speed switch'){if((s.t||0)<p.dl)return 1;const z=+p.zs;return s.act?v>z:v>z+Math.max(1,.2*z)}   /* above zero = actuated, standstill = drops */
  return s.act?v>=p.sp-p.hy:v>=p.sp}
 if(p.act===PSW_ACT[1])return s.act?v<=p.sp+p.hy:v<=p.sp;
 return s.act?v>=p.sp-p.hy:v>=p.sp}
function pswMake(kind,o){
 const p=Object.assign({},o.p);
 return{n:o.n,ds:o.ds,cat:'Switching',pre:o.pre,
  t:[[0,-40,'COM'],[-20,40,'NC','o'],[20,40,'NO','o']],p,
  el:c=>{const a=!!c.s.act;return[RR(0,2,a?.005:1e9),RR(0,1,a?1e9:.005)]},
  tk:c=>{const s=c.s;if(!S.run)return;s.t=(s.t||0)+DT;s.act=pswAct(c)?1:0;s.val=pswVal(c)},
  st:c=>`${c.s.act?'ACTUATED':'AT REST'} · ${pswFmt(c)}`,
  msg:c=>{const m=[];if(c.type==='sps'&&String(c.p.src||'').trim()&&!pswMotor(c))m.push(['wa',`${c.label}: no 1-phase or 3-phase motor labelled “${c.p.src}” – using the typed speed`]);return m},
  pp:()=>o.pp,
  g:c=>{const a=!!c.s.act,T=(t,x,y)=>`<text x=${x} y=${y} class=mt style="font-size:8px">${t}</text>`;
   return`<circle cx=0 cy=-22 r=2.5 class=f /><circle cx=-20 cy=22 r=2.5 class=f /><circle cx=20 cy=22 r=2.5 class=f />`+
    `<path d="M0 -22L${a?20:-20} 22" class="s ${a?'on':''}" /><path d="M0 -22V-40M-20 22V40M20 22V40" class=s />`+
    `<path d="M${a?10:-10} 0H28" class=s ${DASH} />`+o.sym(c)+T('COM',8,-30)+T('NC',-20,52)+T('NO',20,52)}}}
const pswFmt=c=>{const v=pswVal(c),u=c.type==='fls'?'m³/h':c.type==='vcs'?'kPa vac':'rpm';return(v>=100?Math.round(v):(+v).toFixed(1))+' '+u};
const PSW_BOX=(t,x)=>`<rect x=${x||28} y=-14 width=34 height=28 class=s /><text x=${(x||28)+17} y=4 class=tx style="font-size:11px">${t}</text>`;
D.fls=pswMake('fls',{n:'Flow Switch',pre:'FS',ds:'Flow switch with a changeover contact: actuates when the flow reaches (or falls to) the set point, with a differential',
 p:{sp:[10,'m³/h','Set point'],hy:[1,'m³/h','Differential (resets at set point ∓ this)'],act:[PSW_ACT[0],'','Actuates when',PSW_ACT],v:[0,'m³/h','Flow now (type a value to test)']},
 sym:c=>PSW_BOX('FS'),pp:'<p class=mu>Changeover contact <b>COM – NC – NO</b>. Type the flow in <i>Flow now</i> while the simulation runs. At rest COM–NC is closed; when actuated COM–NO closes. Use “falls to the set point” for a <b>low-flow / no-flow</b> protection (pump running dry).</p>'});
D.vcs=pswMake('vcs',{n:'Vacuum Switch',pre:'VS',ds:'Vacuum switch with a changeover contact: actuates when the vacuum reaches (or falls to) the set point, with a differential',
 p:{sp:[40,'kPa vac','Set point'],hy:[5,'kPa vac','Differential (resets at set point ∓ this)'],act:[PSW_ACT[0],'','Actuates when',PSW_ACT],v:[0,'kPa vac','Vacuum now (0 = atmosphere, 100 = full vacuum)']},
 sym:c=>PSW_BOX('VS'),pp:'<p class=mu>Changeover contact <b>COM – NC – NO</b>. Type the vacuum in <i>Vacuum now</i> (0 = atmosphere, larger = deeper vacuum). With “rises to the set point” it actuates when the vacuum is deep enough – for example to stop a vacuum pump.</p>'});
D.sps=pswMake('sps',{n:'Speed / Zero-speed Switch',pre:'SS',ds:'Speed switch or zero-speed (standstill) switch with a changeover contact; can read the speed of a motor in the drawing',
 p:{md:['Speed switch','','Function',['Speed switch','Zero-speed switch']],sp:[1500,'rpm','Set speed (speed switch)'],hy:[50,'rpm','Differential (speed switch)'],zs:[5,'rpm','Zero-speed threshold (zero-speed switch)'],dl:[3,'s','Start-up delay (zero-speed switch)'],src:['','txt','Read speed from motor (label, e.g. M1)'],v:[0,'rpm','Speed now (when no motor is named)']},
 sym:c=>PSW_BOX(c.p.md==='Zero-speed switch'?'ZS':'SS'),pp:'<p class=mu>Changeover contact <b>COM – NC – NO</b>. <b>Speed switch</b>: actuates at or above the <i>Set speed</i> (over-speed). <b>Zero-speed switch</b>: actuated while the shaft turns and <b>drops at standstill</b> – used to detect a stopped conveyor or a broken belt; the <i>Start-up delay</i> keeps it actuated while the machine is starting. Type a motor label in <i>Read speed from motor</i>, or type the speed in <i>Speed now</i>.</p>'});

if(typeof WIR!=='undefined'){const rows=(no,nc)=>[['l','COM','Supply (+24 V)','r',null,0],['r','NO',no,'g',null,0],['r','NC',nc,'o',null,1]];
 WIR.fls={s:'A switch that reacts to liquid or air flow. Typical use: stop a pump if there is no flow.',rows:rows('Pump / lamp (closes when flow reaches the set point)','Alarm lamp (closed at rest)'),
  tip:['Choose “Value falls to the set point” for a low-flow alarm.','Type a value in <i>Flow now</i> while running to test it.']};
 WIR.vcs={s:'A switch that reacts to vacuum (suction). Typical use: start or stop a vacuum pump.',rows:rows('Pump contactor / lamp (closes at the set vacuum)','Alarm lamp (closed at rest)'),tip:['Type a value in <i>Vacuum now</i> while running to test it.']};
 WIR.sps={s:'Detects over-speed, or that a shaft has stopped (zero speed), for example a stopped conveyor.',rows:rows('Contactor / lamp (closes when actuated)','Alarm lamp (closed at rest)'),
  tip:['Zero-speed switch: actuated while the shaft turns, drops at standstill.','Type a motor label (e.g. M1) in <i>Read speed from motor</i> to measure that motor.']}}
if(typeof HLP!=='undefined'){
 HLP.fls=HL('A <b>flow switch</b> senses liquid or air flowing in a pipe. Its changeover contact moves when the flow reaches the set point and moves back when it drops by the <b>differential</b>. The most common job is <b>protection</b>: if the flow stops, switch the pump or heater off.',[],
  ['Type the flow in <i>Flow now</i> while the simulation runs to see the contact move.','Rest state: COM–NC closed. Actuated: COM–NO closed.','Hysteresis: it resets at the set point minus (or plus) the differential, so it does not chatter.'],['Pump dry-run protection, heater flow interlock, cooling-water monitoring.']);
 HLP.vcs=HL('A <b>vacuum switch</b> senses vacuum (pressure below atmosphere). Its changeover contact moves when the vacuum reaches the set point and returns after the differential.',[],
  ['Type the vacuum in <i>Vacuum now</i> (0 = atmosphere, higher = deeper vacuum).','Rest state: COM–NC closed. Actuated: COM–NO closed.'],['Vacuum pumps and vacuum lifters, packaging machines, suction filters (blocked-filter alarm).']);
 HLP.sps=HL('A <b>speed switch</b> actuates when a shaft reaches a set speed (over-speed protection). A <b>zero-speed switch</b> does the opposite job: it tells you the shaft has <b>stopped</b>. It is actuated while the shaft turns and drops at standstill. The <b>start-up delay</b> keeps it actuated while the machine accelerates.',[],
  ['Name a motor in <i>Read speed from motor</i> (a 1-phase or 3-phase motor label, e.g. M1) to measure that motor, or type the speed in <i>Speed now</i>.','Rest state: COM–NC closed. Actuated: COM–NO closed.'],['Conveyor and belt failure detection, crusher and mixer over-speed, brake and door interlocks.'])}
