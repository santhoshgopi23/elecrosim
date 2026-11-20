/* ElectroSim v8.30 – Single-phase induction motor (L N PE)
   Capacitor run / capacitor start / split-phase.  Draws a high START current until it reaches ~75 % of rated speed (then drops to the running current),
   spins up and coasts down with inertia, turns CW or CCW, warns about low voltage (cannot start) and overvoltage.  Physical look: see phys.js (ph.mot1). */
'use strict';
const MOT1_LEADS='<path d="M-20 -22V-16.6M20 -22V-16.6M22 0H26" class=s />';
const m1k={'Capacitor run':3,'Capacitor start':5,'Split phase':6};
D.mot1={n:'Motor 1-phase (L N PE)',cat:'Motors & Drives',pre:'M',sx:26,
 t:[[-20,-40,'L'],[20,-40,'N'],[40,0,'PE','o']],
 p:{V:[230,'V','Rated voltage'],P:[750,'W','Rated output power'],fn:[50,'Hz','Rated frequency'],rpm:[1440,'rpm','Rated speed'],load:[70,'%','Load torque (of rated)'],
  mt:['Capacitor run','','Motor type',['Capacitor run','Capacitor start','Split phase']],C:[20,'µF','Run / start capacitor'],dr:['Clockwise','','Rotation',['Clockwise','Counter-clockwise']]},
 /* running: input power follows the load (η ≈ 70 %); starting (below 75 % speed): R falls, so the current is 3–6× higher */
 el:c=>{const T=Math.max(.05,c.p.load/100),Pin=c.p.P/.7*(.25+.75*T),Rn=c.p.V*c.p.V/Pin,k=(c.s.rpm||0)<.75*c.p.rpm?(m1k[c.p.mt]||4):1;return[R(c,Rn/k)]},
 tk:c=>{const s=c.s,p=c.p,o=c.o;if(!o||!S.run){return}
  const v=Math.abs(o.v),ok=v>=.8*p.V&&o.p>.02*p.P,tg=ok?p.rpm*Math.min(1.03,Math.max(.8,v/p.V)):0;
  s.rpm=(s.rpm||0)+(tg-(s.rpm||0))*DT/(ok?(p.mt==='Capacitor run'?.9:.6):3.5);if(s.rpm<.5&&!tg)s.rpm=0;
  s.dir=p.dr==='Clockwise'?1:-1;s.ang=((s.ang||0)+s.dir*14.4*s.rpm/p.rpm+360)%360},
 st:c=>{const s=c.s,o=c.o,p=c.p;if(!o)return'STOPPED';const v=Math.abs(o.v);
  if((s.rpm||0)>1)return(s.rpm<.75*p.rpm?'STARTING ':'RUNNING ')+Math.round(s.rpm)+' rpm'+(p.dr!=='Clockwise'?' · CCW':'');
  return v>.5*p.V&&v<.8*p.V?'LOW VOLTAGE – cannot start':o.p>.05*p.P?'STALLED / STARTING':'STOPPED'},
 msg:c=>{const r=[],o=c.o;if(!o||!S.run)return r;const v=Math.abs(o.v);
  if(v>1.15*c.p.V)r.push(['wa',`${c.label}: overvoltage ${v.toFixed(0)} V (rated ${c.p.V} V)`]);
  else if(v>.5*c.p.V&&v<.8*c.p.V)r.push(['wa',`${c.label}: low voltage ${v.toFixed(0)} V – a single-phase motor cannot start below 80 % of ${c.p.V} V`]);
  if((c.s.rpm||0)<.5*c.p.rpm&&o.p>.3*c.p.P&&v>=.8*c.p.V&&(c.s.stall=(c.s.stall||0)+DT)>5)r.push(['wa',`${c.label}: still on its START current after 5 s – overload / jammed rotor`]);else if((c.s.rpm||0)>=.5*c.p.rpm)c.s.stall=0;
  return r},
 g:c=>{const rp=c.s.rpm||0;return`${MOT1_LEADS}<circle r=26 class=s /><g transform="rotate(${c.s.ang||0})"><circle cy=-19 r=2.5 class=f /></g><text y=-5 class=tx>M</text><text y=9 class=tx style="font-size:12px">1~</text>`+
  (rp>1?`<text y=20 class=mt style="fill:var(--ok);font-weight:700;font-size:7.5px">${Math.round(rp)}rpm</text><text x=15 y=-3 class=mt style="font-size:10px">${c.s.dir<0?'\u27f2':'\u27f3'}</text>`:'')}};
/* tooltip + help text */
if(typeof HLP!=='undefined')HLP.mot1=HL('A <b>single-phase induction motor</b> for household / small machines: fans, pumps, compressors, garage doors. A capacitor (or a start winding) makes the second phase that gets the rotor turning.',
 ['<b>L</b> to the live (through the switch / MCB / contactor), <b>N</b> to neutral, <b>PE</b> to earth.','Pick the <i>Motor type</i> and the matching voltage (230 V) and frequency. <i>Rotation</i> sets CW / CCW (in real life you swap the two ends of the start winding).'],
 ['At start it draws 3–6× its running current until it reaches about 75 % of rated speed – size the MCB / overload for that (use a C-curve MCB).','Below 80 % of rated voltage it cannot start and just hums on a high current. Shows speed, STARTING / RUNNING and the direction.'],['Fans, pumps, small compressors, workshop tools.']);
DS.mot1='Single-phase induction motor (capacitor run / start, split-phase)';
