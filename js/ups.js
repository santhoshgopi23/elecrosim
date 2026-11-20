/* ElectroSim v8.24 – UPS (uninterruptible power supply), library group "Power". Loaded after mfm.js, before solver.js.
   A single-phase UPS, ONE component. Everything is chosen in Properties:
     UPS type            Online (double conversion) | Line-interactive (AVR) | Offline (standby)
     Rating              VA (500 … 10 000)  and  power factor  →  real power W = VA × PF
     Input / output V    110 … 240 V (output voltage is free only for an Online UPS; the other types pass the mains voltage)
     Backup time         minutes the battery carries the FULL rated load (5 … 240); the battery size (Wh, Ah) follows from it
     Battery time speed  1× = real time, 10× / 60× / 300× make the battery drain and charge faster so you can watch it
   Terminals (fixed index so saved wires survive changes):  0 L (in)  1 N (in)  2 L (out)  3 N (out)  4 PE (optional)
   Model (solver elements):  E[0] input = resistor V²/Pin (mains power: load ÷ efficiency + charger + idle; 100 kΩ sensing resistance while the mains is absent, so a cut or open breaker reads 0 V)
                             E[1] output = ideal voltage source (hz 50) – on while the UPS switch is ON, there is no fault and (mains OK or battery not empty)
   sim()  (solver loop)  mains window with hysteresis, output on / off, measured output V / I / W / VA, input power
   tk()   (every 20 ms)  battery: drain on battery  (Peukert-like: lighter loads last longer than a straight line), charge when the mains is back,
                         overload timer (105 % → 120 s, 125 % → 30 s, 150 % → 1 s), then OVERLOAD shutdown
   A fault (overload, output short circuit) keeps the output off until the UPS switch is turned OFF and ON again – like pressing the power button.
   Click the UPS while running (or tick "UPS switch ON" in Properties) to switch it. */
'use strict';
const UPT=['Online (double conversion)','Line-interactive (AVR)','Offline (standby)'];
const UPVA=['500','650','800','1000','1500','2000','3000','5000','6000','10000'];
const UPPF=['0.6','0.7','0.8','0.9','1.0'];
const UPV=['110','115','120','127','220','230','240'];
const UPBT=['5','10','15','20','30','60','120','240'];
const UPAC=['1×','10×','60×','300×'];
const upK=c=>{const i=UPT.indexOf(c.p.typ);return i<0?0:i};
const upVA=c=>+c.p.va||1000,upW=c=>upVA(c)*(+c.p.pf||.9);
const upVi=c=>+c.p.Vi||230,upVo=c=>upK(c)===0?(+c.p.Vo||230):upVi(c);
const upEta=c=>[.9,.95,.97][upK(c)];                         /* efficiency of the path that carries the load */
const upWin=c=>[[.6,1.2],[.75,1.2],[.85,1.15]][upK(c)];      /* accepted input voltage window (× nominal) */
const upTr=c=>[0,4,10][upK(c)];                              /* transfer time in ms (information) */
const upBt=c=>+c.p.bt||10,upAcc=c=>parseFloat(c.p.acc)||1;
const upSoc=c=>c.s.soc==null?100:c.s.soc;
const upBat=c=>{const W=upW(c),V=W<=700?12:W<=1500?24:W<=3500?48:W<=7000?96:192,Wh=W*upBt(c)/60/upEta(c);return{V,Wh,Ah:Wh/V}};
/* battery use as a fraction of the full capacity per hour, at output power P (W) */
const upRate=(c,P)=>{const W=upW(c);return(60/upBt(c))*Math.pow((Math.max(0,P)+.02*W)/(1.02*W),1.2)};
const upMin=(c,P)=>upSoc(c)/100/Math.max(1e-9,upRate(c,P))*60;
const upFm=m=>m>=120?(m/60).toFixed(1)+' h':m>=10?Math.round(m)+' min':m.toFixed(1)+' min';
const upPV={};
const upPVf=c=>{const on=upK(c)===0;if(!upPV[on]){const b=D.ups.p,o={};['typ','va','pf','Vi',...(on?['Vo']:[]),'bt','acc'].forEach(k=>o[k]=b[k]);upPV[on]=o}return upPV[on]};

D.ups={n:'UPS (uninterruptible power supply)',ds:'Single-phase UPS with battery: online, line-interactive or offline; rating (VA), power factor, voltages and battery backup time are chosen in Properties',
 cat:'Power',pre:'UPS',sx:30,sy:34,bb:[-44,-44,88,94],
 t:[[-40,-20,'L (in)'],[-40,20,'N (in)'],[40,-20,'L (out)'],[40,20,'N (out)'],[0,40,'PE','o']],
 p:{typ:[UPT[0],'','UPS type',UPT],va:['1000','','Rating (VA)',UPVA],pf:['0.9','','Power factor (W = VA × PF)',UPPF],
  Vi:['230','','Input voltage (V)',UPV],Vo:['230','','Output voltage (V)',UPV],bt:['10','','Battery backup time at full load (min)',UPBT],
  acc:['10×','','Battery time speed (1× = real time)',UPAC]},
 pv:upPVf,chg:(c,k)=>k==='typ',
 el:c=>{const s=c.s,V=upVi(c),pin=Math.max(.5,s.uPin||.5);
  return[R(c,s.mains?V*V/pin:1e5),{k:'V',a:2,b:3,v:s.out?upVo(c):0,...(s.out?{hz:50}:{})}]},
 sim:(c,E)=>{const s=c.s,e=E[0],o=E[1];let ch=0;
  if(!s.on&&(s.flt||s.ovT)){s.flt='';s.ovT=0;ch=1}                       /* power cycle clears a fault */
  const V=upVi(c),[lo,hi]=upWin(c),h=s.mains?0:.03,v=Math.hypot(e.vr,e.vi),m=v>=(lo+h)*V&&v<=(hi-h)*V;
  s.uVin=v;if(m!==!!s.mains){s.mains=m;ch=1}
  if(m&&s.dead){s.dead=0;ch=1}
  let out=!!s.on&&!s.flt&&(m||(upSoc(c)>0&&!s.dead));
  if(out&&o.na===o.nb){s.flt='OUTPUT SHORT CIRCUIT';out=false;ch=1}      /* output terminals joined by a wire */
  if(out!==!!s.out){s.out=out;ch=1}
  const P=out?Math.max(0,o.vr*o.cr+o.vi*o.ci):0,I=out?Math.hypot(o.cr,o.ci):0,Vo=out?Math.hypot(o.vr,o.vi):0;
  s.uPo=P;s.uIo=I;s.uVo=Vo;s.ul=out?Math.max(P/upW(c),Vo*I/upVA(c)):0;
  const W=upW(c),soc=upSoc(c),pch=m&&soc<99.95?.08*W*(soc>90?.4:1):0,pst=m&&s.on&&!s.flt?.01*W:0,pin=m?Math.max(.5,P/upEta(c)+pch+pst):0;
  s.uPin=pin;if(Math.abs(pin-(s.uPinS||0))>.5){s.uPinS=pin;ch=1}
  return ch},
 tk:c=>{const s=c.s;if(!S.run||s.uVin==null)return;
  const dt=DT*upAcc(c);let soc=upSoc(c);
  if(s.mains){if(soc<100)soc=Math.min(100,soc+(100/8/3600)*dt*(soc>90?.4:1))}                       /* full charge in about 8 h */
  else if(s.out){soc-=upRate(c,s.uPo||0)*100*dt/3600;if(soc<=0){soc=0;s.dead=1}}
  s.soc=soc;
  if(s.out&&!s.flt){const r=s.ul||0;
   if(r>1.05){s.ovT=(s.ovT||0)+DT/(r>1.5?1:r>1.25?30:120);if(s.ovT>=1){s.flt='OVERLOAD';s.ovT=0}}else s.ovT=Math.max(0,(s.ovT||0)-DT/60)}},
 rst:c=>{Object.assign(c.s,{soc:100,mains:0,out:0,flt:'',dead:0,ovT:0,ul:0,uPo:0,uIo:0,uVo:0,uPin:0,uPinS:0,uVin:null})},
 fin:c=>{const s=c.s;c.o={v:s.uVo||0,i:s.uIo||0,p:s.uPo||0}},
 st:c=>{const s=c.s,soc=Math.round(upSoc(c));
  if(!s.on)return s.mains?`OFF · charging ${soc}%`:'OFF';
  if(s.flt)return'FAULT · '+s.flt;
  if(!s.out)return'BATTERY EMPTY · output off';
  if(!s.mains)return`ON BATTERY ${soc}% · ${upFm(upMin(c,s.uPo||0))} left`;
  const k=upK(c),r=(s.uVin||0)/upVi(c);
  return k===0?`ONLINE · load ${Math.round(100*(s.ul||0))}%`:k===1?`LINE ${r<.92?'· AVR BOOST':r>1.08?'· AVR BUCK':'· NORMAL'} · load ${Math.round(100*(s.ul||0))}%`:`STANDBY (mains) · load ${Math.round(100*(s.ul||0))}%`},
 msg:c=>{const s=c.s,r=[];if(!S.run||s.uVin==null)return r;const soc=Math.round(upSoc(c));
  if(s.flt)r.push(['er',`${c.label}: ${s.flt} – output off. Switch the UPS OFF and ON again after removing the cause`]);
  else if(s.on&&s.dead&&!s.mains)r.push(['er',`${c.label}: battery empty – output off until the mains returns`]);
  else if(s.on&&s.out&&!s.mains){r.push(['wa',`${c.label}: input power failure – running on battery (${soc}%, about ${upFm(upMin(c,s.uPo||0))} left)`]);if(soc<20)r.push(['er',`${c.label}: LOW BATTERY (${soc}%) – shut the load down`])}
  if(s.on&&!s.mains&&s.uVin>.3*upVi(c)){const[lo,hi]=upWin(c);r.push(['wa',`${c.label}: input ${s.uVin.toFixed(0)} V is outside the accepted ${Math.round(lo*upVi(c))}–${Math.round(hi*upVi(c))} V – on battery`])}
  if(s.out&&!s.flt&&s.ul>1)r.push(['wa',`${c.label}: overloaded ${Math.round(100*s.ul)}% of rating (${Math.round(s.uVo*s.uIo)} VA / ${Math.round(s.uPo)} W of ${upVA(c)} VA / ${Math.round(upW(c))} W) – it will shut down${s.ul>1.05?' ('+Math.round(100*(s.ovT||0))+'% of the overload time used)':''}`]);
  return r},
 pp:c=>{const s=c.s,b=upBat(c),W=upW(c),k=upK(c),live=S.run&&s.uVin!=null;
  const soc=Math.round(upSoc(c));
  return`<p class=mu><b>${UPT[k]}</b> · ${upVA(c)} VA / ${Math.round(W)} W · in ${upVi(c)} V → out ${upVo(c)} V · transfer time ${upTr(c)?upTr(c)+' ms':'0 ms (no break)'}.<br>
   Battery: ${b.V} V · ${b.Wh.toFixed(0)} Wh · about ${b.Ah.toFixed(1)} Ah, carries the full ${Math.round(W)} W for ${upBt(c)} min.</p>`+
   (live?`<p class=mu><b>${D.ups.st(c)}</b><br>Battery ${soc}% · output ${(s.uVo||0).toFixed(0)} V, ${Math.round(s.uPo||0)} W, load ${Math.round(100*(s.ul||0))}% · input ${(s.uVin||0).toFixed(0)} V${s.mains?'':' (mains failed)'}</p>`:'<p class=mu>Press ▶ Run to see the battery and the output.</p>')+
   `<p class=mu><b>Wiring:</b> mains <b>L / N</b> to the input (through a breaker), the load to <b>L (out) / N (out)</b>. To test a power cut, open the breaker or switch in front of the UPS.</p>`},
 g:(c,o)=>{const s=c.s,live=S.run&&s.uVin!=null,soc=live?upSoc(c):100,k=upK(c),on=!!s.on,
   led=!live?'#8793a0':s.flt||(on&&!s.out)?'#e03a3a':!on?'#8793a0':s.mains?'#27b36a':'#f0a020',
   bc=soc>50?'#27b36a':soc>20?'#f0a020':'#e03a3a';
  return`<rect x=-30 y=-34 width=60 height=68 rx=4 class=s style="fill:#eef2f6" />`+
   `<text y=-20 class=tx style="font-size:12px">UPS</text><text y=-9 class=mt style="font-size:8px">${upVA(c)>=1000?(upVA(c)/1000)+' kVA':upVA(c)+' VA'}</text>`+
   `<text y=2 class=mt style="font-size:7px">${['ON-LINE','LINE-INT.','OFFLINE'][k]}</text>`+
   `<text x=-27 y=-17 class=mt style="font-size:7px;text-anchor:start">L</text><text x=-27 y=23 class=mt style="font-size:7px;text-anchor:start">N</text><text x=27 y=-17 class=mt style="font-size:7px;text-anchor:end">L</text><text x=27 y=23 class=mt style="font-size:7px;text-anchor:end">N</text>`+
   `<rect x=-18 y=9 width=30 height=9 rx=1.5 class=s style="stroke-width:1.2;fill:#fff" /><rect x=12 y=11.5 width=3 height=4 style="fill:var(--w)" /><rect x=-16.5 y=10.5 width=${(27*soc/100).toFixed(1)} height=6 rx=1 style="fill:${bc};stroke:none" />`+
   `<circle cx=-22 cy=-27 r=3.2 class=s style="stroke-width:1.2;fill:${on?'#fff':'#c3ced9'}" /><path d="M-22 -29.5V-26.5" class=s style="stroke-width:1.2" /><circle cx=22 cy=-27 r=3.5 class=s style="stroke-width:1.2;fill:${led}" />`+
   (live&&s.out&&!s.mains?`<text x=0 y=29 class=mt style="font-size:7px;fill:var(--wa);font-weight:700">BATT ${Math.round(soc)}%</text>`:live&&s.flt?`<text x=0 y=29 class=mt style="font-size:7px;fill:var(--er);font-weight:700">FAULT</text>`:`<text x=0 y=29 class=mt style="font-size:7px">${on?'ON':'OFF'}</text>`)+
   `<text x=8 y=45 class=mt style="font-size:7px;text-anchor:start">PE</text>`}};
