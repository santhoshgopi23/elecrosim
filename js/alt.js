/* ElectroSim v8.25 – Alternating relay (pump duty / standby), library group "Switching". Loaded after xref.js.
   Used to share the running hours of two pumps / compressors: every time the control input S is switched ON, the other output closes.
   Terminals (fixed index):  0 A1  1 S (control input)  2 A2 (supply −/N, also the reference of S)   3 15 (COM 1)  4 18 (NO 1)   5 25 (COM 2)  6 28 (NO 2)
   Supply on A1 / A2 (coil, V²/P). S is "on" when the relay is powered and S has ≥ 50 % of the supply voltage to A2.
   Modes: Alternate | Pump 1 only | Pump 2 only | Both (parallel).  Starts with pump 1 after ▶ Run; the next start is pump 2, and so on. */
'use strict';
const ALM=['Alternate','Pump 1 only','Pump 2 only','Both (parallel)'];
D.alt={n:'Alternating Relay (pump 1 / pump 2)',ds:'Alternating relay for duty / standby pumps: each new start (input S) switches the other output; modes alternate, pump 1 only, pump 2 only or both',
 cat:'Switching',pre:'KA',cv:1,bb:[-46,-52,92,104],
 t:[[-40,-20,'A1'],[-40,0,'S'],[-40,20,'A2'],[40,-40,'15'],[40,-20,'18'],[40,20,'25'],[40,40,'28']],
 p:{V:['24','','Supply voltage (V)',['12','24','48','110','230']],P:[2,'W','Coil power'],mode:[ALM[0],'','Mode',ALM]},
 el:c=>{const s=c.s,V=+c.p.V||24;return[RR(0,2,V*V/Math.max(.01,c.p.P)),RR(1,2,1e5),RR(3,4,s.c1?.005:1e9),RR(5,6,s.c2?.005:1e9)]},
 sim:(c,E)=>{const s=c.s,V=+c.p.V||24,m=c.p.mode,on=!!s.en&&Math.abs(E[1].v2)>=.5*V;let ch=0;
  if(on&&!s.sp&&m===ALM[0])s.act=s.act==null?0:1-s.act;
  if(on!==!!s.sp){s.sp=on;ch=1}
  const c1=on&&(m===ALM[1]||m===ALM[3]||(m===ALM[0]&&s.act===0)),c2=on&&(m===ALM[2]||m===ALM[3]||(m===ALM[0]&&s.act===1));
  if(c1!==!!s.c1){s.c1=c1;ch=1}if(c2!==!!s.c2){s.c2=c2;ch=1}return ch},
 rst:c=>{Object.assign(c.s,{act:null,sp:0,c1:0,c2:0})},
 st:c=>{const s=c.s;if(!s.en)return'NO SUPPLY';if(!s.sp)return s.act==null||c.p.mode!==ALM[0]?'READY':`READY · next pump ${s.act?1:2}`;return s.c1&&s.c2?'PUMP 1 + PUMP 2 RUN':s.c1?'PUMP 1 RUN':'PUMP 2 RUN'},
 pp:c=>`<p class=mu>Supply on <b>A1 / A2</b>. Put the control signal (the same voltage, e.g. a level switch or pressure switch contact) on <b>S</b>. Each time S comes ON, the other output closes: <b>15–18</b> drives pump 1, <b>25–28</b> pump 2. Use those contacts to feed the two pump contactor coils.${S.run&&c.s.en?'<br><b>Now:</b> '+D.alt.st(c):''}</p>`,
 g:c=>{const s=c.s,a=!!S.run;const k1=a&&s.c1,k2=a&&s.c2,sw=(y,cl)=>`<circle cx=22 cy=${y} r=2.5 class=f /><circle cx=22 cy=${y+20} r=2.5 class=f /><path d="M22 ${y}L${cl?22:14} ${cl?y+20:y+14}" class=s />`;
  return`<rect x=-22 y=-46 width=44 height=92 rx=3 class="s ${a&&s.en?'on':''}" />`+
   `<text y=-34 class=tx style="font-size:11px">ALT</text><text y=-25 class=mt style="font-size:6.5px">${['ALTERN.','PUMP 1','PUMP 2','P1 + P2'][Math.max(0,ALM.indexOf(c.p.mode))]}</text>`+
   `<text x=-19 y=-17 class=mt style="font-size:7px;text-anchor:start">A1</text><text x=-19 y=3 class=mt style="font-size:7px;text-anchor:start">S</text><text x=-19 y=23 class=mt style="font-size:7px;text-anchor:start">A2</text>`+
   sw(-40,k1)+sw(20,k2)+`<text x=8 y=-5 class=mt style="font-size:8px;font-weight:700;${k1?'fill:#1a9d5b':''}">P1</text><text x=8 y=15 class=mt style="font-size:8px;font-weight:700;${k2?'fill:#1a9d5b':''}">P2</text>`+
   `<text x=34 y=-42 class=mt style="font-size:7px;text-anchor:start;display:none"></text>`}};
