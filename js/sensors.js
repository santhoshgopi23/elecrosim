/* ElectroSim v8.43 – raw temperature sensors: RTD (Pt100 / Pt500 / Pt1000) and thermocouple (types K J T E N R S B).
   "Raw" = the bare sensing element, with no electronics: you read it with a multimeter (Ω or mV) or wire it to an instrument input.
   RTD  (rtd): a resistance that follows the temperature (IEC 60751, Callendar–Van Dusen: Pt100 = 100.00 Ω at 0 °C, 138.51 Ω at 100 °C).
        Wiring 2-wire / 3-wire / 4-wire (R, R′ = the two red wires, W, W′ = the two white wires; wires of the same colour are joined inside the sensor).
        Measuring current above 2 mA warns about self-heating. Fault: normal / open (broken element) / short.
   Thermocouple (thc): a voltage source in mV between + and −. Voltage = E(hot junction) − E(cold junction), with E(T) interpolated (cubic) from the standard
        reference tables (ITS-90) every 100 °C. The cold junction (the terminals where the wires leave the sensor) is set in Properties – 0 °C by default, as in the tables.
        Fault: normal / open (burnout – the loop is open). Beyond the table range the part warns and holds the last value.
   Temperature is typed in Properties (°C / °F / K) or changed with the −10 −1 +1 +10 buttons, also while the simulation runs. Loaded after plc.js (uses plcPrune). */
'use strict';
const SN_TU=['°C','°F','K'];
const snC=(v,u)=>u==='°F'?(v-32)/1.8:u==='K'?v-273.15:v;                 /* typed value -> °C */
const snFmt=(c,t)=>{const u=c.p.u||'°C',v=u==='°F'?t*1.8+32:u==='K'?t+273.15:t;return(Math.abs(v)>=100?v.toFixed(1):v.toFixed(2))+' '+u};
const snNum=(c,k,d)=>{const v=parseFloat(c.p[k]);return Number.isFinite(v)?v:d};
const snClk=(c,a)=>{const u=c.p.u||'°C',st=+a;c.p.T=Math.round((snNum(c,'T',0)+st)*100)/100;S.dirty=1};
const snBtn='<div class=row><button data-clk=-10>−10</button><button data-clk=-1>−1</button><button data-clk=1>+1</button><button data-clk=10>+10</button></div>';

/* ---------- RTD ---------- */
const RTD_A=3.9083e-3,RTD_B=-5.775e-7,RTD_C=-4.183e-12,RTD_R0={'Pt100':100,'Pt500':500,'Pt1000':1000};
const rtdR=(t,r0)=>r0*(1+RTD_A*t+RTD_B*t*t+(t<0?RTD_C*(t-100)*t*t*t:0));
const rtdLay=w=>{const L={'2-wire':[[-40,0,'R'],[-40,12,'R′','h'],[40,0,'W'],[40,12,'W′','h']],
 '3-wire':[[-40,-12,'R'],[-40,12,'R′'],[40,0,'W'],[40,12,'W′','h']],'4-wire':[[-40,-12,'R'],[-40,12,'R′'],[40,-12,'W'],[40,12,'W′']]};return L[w]||L['2-wire']};
const RTDL={};
D.rtd={n:'RTD temperature sensor (Pt100 / Pt500 / Pt1000)',ds:'Raw RTD resistance temperature detector, Pt100, 2-wire 3-wire 4-wire, resistance follows temperature (measure with a multimeter in ohm)',cat:'Sensors',pre:'RT',hs:1,
 t:rtdLay('2-wire'),bb:[-46,-34,92,68],
 p:{T:[25,'','Temperature'],u:['°C','','Unit',SN_TU],ty:['Pt100','','Element',Object.keys(RTD_R0)],wr:['2-wire','','Wiring',['2-wire','3-wire','4-wire']],ft:['Normal','','Fault',['Normal','Open (broken element)','Short']]},
 dyn:c=>{const w=c.p.wr||'2-wire';return RTDL[w]||(RTDL[w]=Object.assign(Object.create(D.rtd),{t:rtdLay(w)}))},
 chg:(c,k)=>{if(k==='wr'){const n=plcPrune(c);if(n)toast(n+' wire'+(n>1?'s':'')+' on removed terminals deleted');S.dirty=1;if(typeof commit==='function')commit();return true}return false},
 clk:snClk,
 el:c=>{const s=c.s,t=Math.max(-200,Math.min(850,snC(snNum(c,'T',25),c.p.u))),r0=RTD_R0[c.p.ty]||100,f=String(c.p.ft||'Normal');
  s.R=f[0]==='O'?Infinity:f[0]==='S'?.01:rtdR(t,r0);s.t=t;
  return[RR(0,2,Math.min(1e9,s.R)),RR(0,1,.01),RR(2,3,.01)]},
 sim:()=>0,
 st:c=>{const s=c.s,r=s.R;return snFmt(c,s.t==null?snC(snNum(c,'T',25),c.p.u):s.t)+' → '+(r===Infinity?'OPEN':r<1?r.toFixed(2)+' Ω':r.toFixed(2)+' Ω')},
 msg:c=>{const m=[],t=snC(snNum(c,'T',25),c.p.u),i=Math.abs((c.o&&c.o.i)||0);
  if(t<-200||t>850)m.push(['wa',`${c.label}: ${snFmt(c,t)} is outside the range of a platinum RTD (−200 … 850 °C) – value limited`]);
  if(i>.002)m.push(['wa',`${c.label}: measuring current ${(i*1e3).toFixed(1)} mA – self-heating makes the reading wrong (keep it below 1 mA)`]);
  return m},
 pp:c=>{const t=snC(snNum(c,'T',25),c.p.u),r0=RTD_R0[c.p.ty]||100;
  return snBtn+`<table class=iomap><tr><td>Resistance now</td><td>${c.p.ft&&c.p.ft[0]==='O'?'open circuit':c.p.ft&&c.p.ft[0]==='S'?'≈ 0 Ω (short)':rtdR(Math.max(-200,Math.min(850,t)),r0).toFixed(2)+' Ω'}</td></tr><tr><td>At 0 °C / 100 °C</td><td>${r0} Ω / ${rtdR(100,r0).toFixed(2)} Ω</td></tr><tr><td>Sensitivity</td><td>≈ ${(r0*RTD_A).toFixed(3)} Ω per °C</td></tr></table>
  <p class=mu>Set the temperature (it can be changed while running). Measure it with a <b>multimeter in Ω</b> across <b>R</b> and <b>W</b>. <b>2-wire</b>: R, W. <b>3-wire</b>: R, R′ (same colour, one side) and W. <b>4-wire</b>: R, R′ and W, W′. Wires of the same colour are joined inside the sensor. A real RTD needs a small measuring current (≤ 1 mA) from an instrument input.</p>`},
 g:c=>{const w=c.p.wr||'2-wire',L=rtdLay(w).filter(q=>!(q[3]&&q[3].includes('h'))),s=c.s,bad=c.p.ft&&c.p.ft[0]!=='N',
  h=L.map(([x,y,n])=>`<path d="M${x} ${y}H${x<0?-24:24}" class=s /><text x=${x<0?-31:31} y=${y-3} class=mt style="font-size:7px">${n}</text>`).join('')+
  `<rect x=-24 y=-17 width=48 height=34 rx=2 class=s />`+
  `<path d="M-14 11L14 -11" class=s /><path d="M14 -11l-7 2.5M14 -11l-2.5 7" class=s /><text x=0 y=-5 class=mt style="font-size:9px;font-weight:700">t°</text><text x=6 y=14 class=mt style="font-size:8px">${esc(c.p.ty||'Pt100')}</text>`;
  return h+(bad?`<text x=0 y=-22 class=mt style="font-size:7px;fill:var(--wa)">${esc(c.p.ft[0]==='O'?'OPEN':'SHORT')}</text>`:'')+
   (S.run&&s.t!=null?`<text x=0 y=30 class=mt style="font-size:8px">${esc(snFmt(c,s.t))}</text>`:'')}};

/* ---------- thermocouple ---------- */
/* thermoelectric voltage in mV against a 0 °C reference junction, every 100 °C (ITS-90 tables), starting at the first temperature */
const TC={
 K:{c:'Chromel / Alumel',col:'yellow +, red −',t0:-200,v:[-5.891,-3.554,0,4.096,8.138,12.209,16.397,20.644,24.905,29.129,33.275,37.326,41.276,45.119,48.838,52.410]},
 J:{c:'Iron / Constantan',col:'white +, red −',t0:-200,v:[-7.890,-4.633,0,5.269,10.779,16.327,21.848,27.393,33.102,39.132,45.494,51.877,57.953,63.792,69.553]},
 T:{c:'Copper / Constantan',col:'blue +, red −',t0:-200,v:[-5.603,-3.379,0,4.279,9.288,14.862,20.872]},
 E:{c:'Chromel / Constantan',col:'purple +, red −',t0:-200,v:[-8.825,-5.237,0,6.319,13.421,21.036,28.946,36.999,45.093,53.112,61.017,68.787,76.373]},
 N:{c:'Nicrosil / Nisil',col:'orange +, red −',t0:-200,v:[-3.990,-2.407,0,2.774,5.913,9.341,12.974,16.748,20.613,24.527,28.455,32.371,36.256,40.087,43.846,47.513]},
 R:{c:'Pt-13%Rh / Pt',col:'black +, red −',t0:0,v:[0,.647,1.469,2.401,3.408,4.471,5.583,6.743,7.950,9.205,10.506,11.850,13.228,14.629,16.040,17.451,18.849]},
 S:{c:'Pt-10%Rh / Pt',col:'black +, red −',t0:0,v:[0,.646,1.441,2.323,3.259,4.233,5.239,6.275,7.345,8.449,9.587,10.757,11.951,13.159,14.373,15.582,16.777]},
 B:{c:'Pt-30%Rh / Pt-6%Rh',col:'grey +, red −',t0:0,v:[0,.033,.178,.431,.787,1.242,1.792,2.431,3.154,3.957,4.834,5.780,6.786,7.848,8.956,10.099,11.263,12.433,13.591]}};
const tcRange=ty=>{const o=TC[ty]||TC.K;return[o.t0,o.t0+100*(o.v.length-1)]};
/* cubic Hermite interpolation through the table points (slopes from neighbouring points) */
function tcE(ty,t){const o=TC[ty]||TC.K,v=o.v,n=v.length,[lo,hi]=tcRange(ty);t=Math.max(lo,Math.min(hi,t));
 const x=(t-o.t0)/100,i=Math.min(n-2,Math.floor(x)),u=x-i,
  m=k=>k<=0?v[1]-v[0]:k>=n-1?v[n-1]-v[n-2]:(v[k+1]-v[k-1])/2,
  a=m(i),b=m(i+1),u2=u*u,u3=u2*u;
 return(2*u3-3*u2+1)*v[i]+(u3-2*u2+u)*a+(-2*u3+3*u2)*v[i+1]+(u3-u2)*b}
const tcMv=c=>{const ty=c.p.ty||'K',th=snC(snNum(c,'T',25),c.p.u),tc=snC(snNum(c,'Tc',0),c.p.uc||'°C');return tcE(ty,th)-tcE(ty,tc)};
D.thc={n:'Thermocouple (K J T E N R S B)',ds:'Raw thermocouple temperature sensor, millivolt output from hot and cold junction, types K J T E N R S B (measure with a multimeter in mV)',cat:'Sensors',pre:'TC',hs:1,
 t:[[-40,0,'+'],[40,0,'−']],bb:[-46,-30,92,60],
 p:{T:[100,'','Hot junction temperature'],u:['°C','','Unit',SN_TU],ty:['K','','Type',Object.keys(TC)],Tc:[0,'','Cold junction temperature (°C)'],ft:['Normal','','Fault',['Normal','Open (burnout)']]},
 clk:snClk,
 el:c=>{const s=c.s,mv=tcMv(c);s.mv=mv;
  if(String(c.p.ft||'')[0]==='O')return[RR(0,1,1e9)];
  return[{k:'V',a:0,b:1,v:mv/1000}]},
 sim:()=>0,
 st:c=>{const s=c.s;return'Type '+(c.p.ty||'K')+'  '+snFmt(c,snC(snNum(c,'T',25),c.p.u))+' → '+(String(c.p.ft||'')[0]==='O'?'OPEN':(s.mv==null?tcMv(c):s.mv).toFixed(3)+' mV')},
 msg:c=>{const m=[],ty=c.p.ty||'K',[lo,hi]=tcRange(ty),th=snC(snNum(c,'T',25),c.p.u);
  if(th<lo||th>hi)m.push(['wa',`${c.label}: ${snFmt(c,th)} is outside the range of a type ${ty} thermocouple (${lo} … ${hi} °C) – value limited`]);
  return m},
 pp:c=>{const ty=c.p.ty||'K',o=TC[ty]||TC.K,[lo,hi]=tcRange(ty);
  return snBtn+`<table class=iomap><tr><td>Output now</td><td>${String(c.p.ft||'')[0]==='O'?'open circuit':tcMv(c).toFixed(3)+' mV'}</td></tr><tr><td>Type ${ty}</td><td>${o.c}</td></tr><tr><td>Wire colours (IEC)</td><td>${o.col}</td></tr><tr><td>Range</td><td>${lo} … ${hi} °C</td></tr></table>
  <p class=mu>Output = E(hot junction) − E(cold junction). The <b>cold junction</b> is where the sensor wires meet the instrument (0 °C in the tables; set it to the real terminal temperature, e.g. 25 °C, to see the error an instrument has to compensate). Measure the signal with a <b>multimeter in mV</b> across + and −. The voltage is very small (about 40 µV per °C for type K), so a PLC 0-10 V input cannot read it – use a temperature transmitter.</p>`},
 g:c=>{const s=c.s,bad=String(c.p.ft||'')[0]==='O',ty=c.p.ty||'K';
  return`<path d="M-40 0H-18M18 0H40" class=s /><circle cx=0 cy=0 r=18 class=s />`+
   `<text x=-27 y=-4 class=mt style="font-size:10px">+</text><text x=27 y=-4 class=mt style="font-size:10px">−</text><text x=0 y=-2 class=mt style="font-size:11px;font-weight:700">TC</text><text x=0 y=9 class=mt style="font-size:8px">${esc(ty)}</text>`+
   (bad?`<text x=0 y=-24 class=mt style="font-size:7px;fill:var(--wa)">OPEN</text>`:'')+(S.run&&!bad&&s.mv!=null?`<text x=0 y=32 class=mt style="font-size:8px">${s.mv.toFixed(2)} mV</text>`:'')}};

/* Help pages */
if(typeof HLP!=='undefined'){
 HLP.rtd={w:'An <b>RTD</b> (resistance temperature detector) is a thin platinum wire or film whose <b>resistance rises with temperature</b>. A Pt100 is exactly 100 Ω at 0 °C and 138.5 Ω at 100 °C. It is accurate and stable, and the reading is a resistance that an instrument measures with a small current.',
  c:['<b>2-wire</b>: connect R and W to the instrument. The wire resistance is added to the reading.','<b>3-wire</b>: R and R′ (both red) to one side, W to the other – the instrument cancels the wire resistance.','<b>4-wire</b>: R, R′ carry the current, W, W′ sense the voltage – most accurate.'],
  n:['Type the temperature in Properties; the resistance follows IEC 60751.','Measure it with a multimeter in Ω across R and W.','Fault “Open” simulates a broken element (infinite resistance).'],k:['Process temperature (pipes, tanks, ovens up to 850 °C)','HVAC and water temperature','Input of a temperature transmitter']};
 HLP.thc={w:'A <b>thermocouple</b> is two different metals joined at the hot junction. It makes a small <b>voltage that depends on the temperature difference</b> between the hot junction and the cold junction (the instrument terminals). It needs no supply, is rugged and works up to very high temperature, but the signal is only millivolts.',
  c:['Connect + and − to the instrument with the same polarity (the + wire has the colour of the type; red is always −).','Use thermocouple extension cable all the way to the instrument – ordinary copper adds a second junction.'],
  n:['Choose the type (K, J, T, E, N, R, S, B) and the hot junction temperature.','Measure the voltage with a multimeter in mV across + and −.','Set the cold junction temperature to see the effect of cold-junction compensation.','Fault “Open” simulates a burnt-out thermocouple.'],k:['Furnaces, kilns, exhaust gas (K, N)','Plastics and food processing (J, T)','Very high temperature (R, S, B)']}}
if(typeof WIR!=='undefined'){
 WIR.rtd={s:'A bare platinum temperature sensor: its resistance changes with the temperature. A temperature instrument measures that resistance.',rows:[['l','R','Instrument input (1st wire, red)','b',null,0],['l','R′','Instrument input (same wire colour, 3-/4-wire)','b',null,1],['r','W','Instrument input (white wire)','o',null,0],['r','W′','Sense wire (4-wire only)','o',null,1]],tip:['2-wire uses only R and W. Choose the wiring in Properties.','Check with a multimeter in Ω: Pt100 reads 100 Ω at 0 °C.']};
 WIR.thc={s:'A bare thermocouple: it makes a few millivolts that depend on the temperature.',rows:[['l','+','Instrument + input (coloured wire)','o',null,0],['r','−','Instrument − input (red wire)','b',null,0]],tip:['Check with a multimeter in mV across + and −.','The signal is tiny: use a temperature transmitter, not a PLC voltage input.']}}
