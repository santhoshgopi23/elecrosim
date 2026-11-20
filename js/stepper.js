/* ElectroSim v8.38 – Stepper motor with built-in driver, library group "Motors & Drives". Loaded after motor1.js.
   Terminals (fixed index):  0 V+ (supply, e.g. 24 V)   1 V− (0 V, also the reference of the signals)   2 PUL (step)   3 DIR (optional, high = counter-clockwise, open = clockwise)   4 DIS (optional, high = motor released).
   A signal counts as ON at 12 V or more above V−.  Mode "Step on each rising edge": one step per PUL pulse, at most one per 20 ms scan (50 steps/s);
   mode "Run while PUL is on": steps at the speed set in Properties for as long as PUL is held on (easy to drive from a switch or a PLC output).
   The shaft angle = steps × 360 / (full steps per rev × microstepping). Too much load or too high a speed makes it stall (steps are lost). */
'use strict';
D.stp={n:'Stepper Motor + Driver (PUL / DIR)',ds:'Stepper motor with a built-in driver: V+ / V− supply, PUL step input, DIR direction, DIS release; counts steps and shows the shaft angle',
 cat:'Motors & Drives',pre:'M',sx:40,sy:46,
 t:[[-20,-60,'V+'],[20,-60,'V−'],[-60,-20,'PUL'],[-60,0,'DIR','o'],[-60,20,'DIS','o']],
 p:{V:[24,'V','Supply voltage'],I:[2,'A','Motor current setting (per phase)'],spr:['200','','Full steps per revolution',['200','400']],ms:['1','','Microstepping (divide each step by)',['1','2','4','8','16','32']],
  md:['Step on each rising edge','','Step input mode',['Step on each rising edge','Run while PUL is on']],rate:[200,'steps/s','Speed (run-while-on mode)'],
  vmax:[1000,'steps/s','Speed above which it stalls'],load:[50,'%','Load torque (of holding torque)']},
 /* supply draw: small when released or idle-off, about 30 % of the set current + 50 mA when holding */
 el:c=>{const s=c.s,i=s.act?.3*c.p.I+.05:.03;return[R(c,c.p.V/i),RR(2,1,4700),RR(3,1,4700),RR(4,1,4700)]},
 sim:(c,E)=>{const s=c.s,p=c.p,on=q=>Math.abs(q.v2)>=12,pw=Math.abs(E[0].v2)>=.7*p.V,dis=on(E[3]),act=pw&&!dis;
  s.lv={pw,pul:on(E[1]),dir:on(E[2]),dis};const ch=act!==!!s.act;s.act=act;return ch},
 tk:c=>{const s=c.s,p=c.p,L=s.lv;if(!L||!S.run)return;
  const a1=360/(+p.spr*+p.ms);let n=0;
  s.stall=0;
  if(L.pw&&!L.dis){
   if(p.md==='Run while PUL is on'){if(L.pul){s.acc=(s.acc||0)+p.rate*DT;n=Math.floor(s.acc);s.acc-=n;if(p.rate>p.vmax)s.stall=1}else s.acc=0}
   else if(L.pul&&!s.pp)n=1;
   if(p.load>100)s.stall=1;
   if(s.stall)n=0;
   const d=L.dir?-1:1;s.n=(s.n||0)+d*n;s.ang=(((s.ang||0)+d*n*a1)%360+360)%360;s.dr=d}
  s.pp=L.pul;s.sps=(s.sps||0)+(n/DT-(s.sps||0))*.15;if(!n&&s.sps<.5)s.sps=0},
 st:c=>{const s=c.s,L=s.lv;if(!L||!L.pw)return'NO POWER';if(L.dis)return'RELEASED';if(s.stall)return'STALLED';return(s.sps||0)>.5?`${Math.round(s.sps)} steps/s ${s.dr<0?'CCW':'CW'}`:`HOLDING · ${s.n||0} steps`},
 msg:c=>{const s=c.s,p=c.p,m=[],v=c.o?Math.abs(c.o.v):0;
  if(v>1.2*p.V)m.push(['wa',`${c.label}: supply ${f(v)} V is above the rated ${p.V} V`]);
  else if(v>5&&s.lv&&!s.lv.pw)m.push(['wa',`${c.label}: supply ${f(v)} V is too low – the driver needs at least ${(.7*p.V).toFixed(0)} V`]);
  if(s.stall)m.push(['wa',`${c.label}: motor stalled – ${p.load>100?'load torque is above the holding torque':'speed is above the pull-out speed'} (steps are lost)`]);
  return m},
 pp:()=>'<p class=mu><b>V+</b> / <b>V−</b> supply. <b>PUL</b> = step pulses, <b>DIR</b> = direction (open = clockwise, high = counter-clockwise), <b>DIS</b> = release (high = motor free, open = motor held). A signal is ON from 12 V above V−. The shaft angle and the step counter are shown on the symbol.</p>',
 g:c=>{const s=c.s,L=s.lv||{},a=s.ang||0,ok=L.pw&&!L.dis&&!s.stall,col=s.stall?'#ff6b6b':ok?'#6cf5a4':'currentColor',T=(t,x,y,an)=>`<text x=${x} y=${y} class=mt style="font-size:8px;text-anchor:${an||'middle'}">${t}</text>`;
  let h=`<rect x=-40 y=-46 width=80 height=92 rx=3 class="s ${ok?'on':''}" /><circle cy=6 r=24 class=s />`+
   `<g transform="rotate(${a} 0 6)"><path d="M0 6V-14" class=s style="stroke-width:2.4;stroke:${col}" /><circle cy=-14 r=2.5 class=f /></g><circle cy=6 r=3 class=f />`+
   T('V+',-20,-32)+T('V−',20,-32)+T('PUL',-36,-17,'start')+T('DIR',-36,3,'start')+T('DIS',-36,23,'start')+`<text x=20 y=-12 class=mt style="font-size:8px">STEP</text>`;
  h+=`<text y=40 class=mt style="font-size:9px;font-weight:700;fill:${col}">${s.n||0} steps</text>`;
  return h}};

/* ---- help: plain text + wiring diagram (wiring.js reads WIR) ---- */
if(typeof WIR!=='undefined')WIR.stp={s:'A motor that turns a small fixed angle for every pulse you send, so you can position it exactly. This one has its driver built in.',
 rows:[['c',0,'Power'],['l','V+','+24 V','r','Fuse',1],['l','V−','0 V','b',null,2],['c',3,'Control signals'],
  ['l','PUL','PLC output Q0.0 (+24 V pulses)','g',null,4],['l','DIR','PLC output Q0.1 (on = counter-clockwise)','g',null,5],['l','DIS','+24 V via switch (releases the motor)','g',null,6]],
 tip:['<b>V−</b> is also the 0 V reference of PUL, DIR and DIS. A signal is ON from 12 V above V−.','<b>DIR</b> and <b>DIS</b> are optional. Open DIR = clockwise (DIR on = counter-clockwise), open DIS = motor held (holding torque).','Easy test without a PLC: set <i>Step input mode</i> to “Run while PUL is on”, wire +24 V through a switch to PUL and close the switch.']};
if(typeof HLP!=='undefined')HLP.stp=HL('A <b>stepper motor</b> turns in small equal steps (for example 1.8°, which is 200 steps per turn). Each pulse on <b>PUL</b> makes one step, so by counting pulses you know exactly how far the shaft has turned, without a sensor. This part includes its <b>driver</b>: you give it a supply and simple step / direction signals. While powered it also <b>holds</b> its position (holding torque).',
 [],
 ['<b>Step on each rising edge</b>: one step each time PUL goes from off to on. The simulator scans every 20 ms, so it can follow up to 50 pulses per second.','<b>Run while PUL is on</b>: steps continuously at the <i>Speed</i> you set, for as long as PUL is on.','Angle per step = 360° ÷ (full steps per turn × microstepping). With 200 steps and microstepping 16, one pulse = 0.1125°.','<b>Stall</b>: if the load is above 100 % of the holding torque, or the speed is above the pull-out speed, the motor loses steps and a warning is shown.','The shaft pointer and the step counter on the symbol follow the motor while it runs.'],
 ['Positioning axes, 3D-printer and CNC axes, dosing pumps, valve and damper actuators.']);
