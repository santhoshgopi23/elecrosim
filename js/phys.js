/* ElectroSim v8.28 – "Physical device" look for EVERY remaining part (push buttons, breakers, contactors, relays, motors, lamps, sensors, meters …).
   Same switch as v8.26:  Properties → Appearance → Physical device (for simulation) | Drawing symbol (for submission),
   whole drawing:  View → Device look (as set in each part → all symbols → all physical),  PDF: Plot → "Draw devices as drawing symbols".
   Default for these parts stays the drawing symbol, so existing drawings look exactly as before until you choose Physical.
   Terminals, wires and the simulation are identical in both looks – only the picture changes. Live state is shown on the picture
   (button pressed, lever up / down / tripped, relay armature, motor fan turning, lamp glow, meter needle …).
   Add a part:  ph.<type> = (c,o,cl) => svg   and   PHB.<type> = [x1,y1,x2,y2] (body extent, optional).   Loaded after view.js, before app.js. */
'use strict';
(()=>{   /* own scope: helper names (RC, CI, PA, TX …) can never clash with the rest of the app */
const ph={},PHB={};
const phOn=c=>S.vwAll==='ph'?1:S.vwAll==='sy'?0:c.p.vw===VW[0];
/* ---- drawing helpers (all inline styles, so the picture looks the same on screen, in the library and in the PDF) ---- */
const PK={g1:'#e6e9ec',g2:'#c5ccd2',g3:'#9aa5af',dk:'#2d343b',bk:'#171b20',wh:'#f7f8f9',st:'#b9c0c6',cu:'#c9843f',br:'#c9a24a',rd:'#d32f2f',gn:'#2e9e5b',yl:'#f2c230',bl:'#2b6cb0',or:'#ee7a1a',ol:'#46525c'};
const _s=(f,s,w,x)=>`style="fill:${f};stroke:${s};stroke-width:${w}${x?';'+x:''}"`;
const RC=(x,y,w,h,f,r,s,sw)=>`<rect x=${x} y=${y} width=${w} height=${h} rx=${r||0} ${_s(f,s===undefined?PK.ol:s||'none',sw||1)} />`;
const CI=(x,y,r,f,s,sw,ex)=>`<circle cx=${x} cy=${y} r=${r} ${_s(f,s===undefined?PK.ol:s||'none',sw||1,ex)} />`;
const PA=(d,f,s,sw,ex)=>`<path d="${d}" ${_s(f||'none',s===undefined?PK.ol:s||'none',sw||1,'stroke-linecap:round;stroke-linejoin:round'+(ex?';'+ex:''))} />`;
const TX=(x,y,s,z,f,w,a)=>`<text x=${x} y=${y} style="font:${w||700} ${z||7}px Arial,Helvetica,sans-serif;fill:${f||'#1c2833'};text-anchor:${a||'middle'};pointer-events:none">${esc(s)}</text>`;
const HL=(x,y,w)=>`<rect x=${x} y=${y} width=${w} height=2 rx=1 style="fill:rgba(255,255,255,.5)" />`;      /* highlight strip = a little depth */
const GLOW=(r,k,a)=>a>.02?`<circle r=${r} style="fill:rgb(${k});opacity:${Math.min(.55,a*.55)};pointer-events:none" />`:'';
const TB=(x,y,w,h)=>RC(x,y,w,h,PK.dk,1,'#1b2026',.8)+CI(x+w/2,y+h/2,Math.max(1.5,Math.min(w,h)/2-1.3),PK.st,'#6f7983',.7)+PA(`M${x+w/2-1.8} ${y+h/2}h3.6`,'none','#59626b',.7);
const num=v=>v>=1e6?+(v/1e6).toFixed(2)+'M':v>=1e3?+(v/1e3).toFixed(2)+'k':+(+v).toFixed(2)+'';
const ANG=(c)=>((c.s&&c.s.ang)||0);
const bst=c=>c.s.tripped?2:(c.s.on?1:0);                           /* breaker state: 0 off, 1 on, 2 tripped */
const BWIN=t=>t===1?PK.rd:t===2?PK.or:PK.gn;                      /* status window colour */

/* ================= POWER ================= */
ph.dc=(c,o)=>{const i=o?Math.abs(o.i):0;
 return RC(-22,-26,44,52,'#3a4651',3,'#1d252c')+HL(-20,-25,40)+RC(-17,-20,34,14,'#0f1a12',1.5,'#050805',.8)+TX(0,-9.5,S.run?(+c.p.V).toFixed(1)+' V':c.p.V+' V',9,'#6dff9a',700)+
  TX(0,3,S.run?(i<1?(i*1000).toFixed(0)+' mA':i.toFixed(2)+' A'):'DC SUPPLY',6.5,S.run?'#6dff9a':'#c8d2da',600)+CI(-12,14,3.4,S.run?'#3ddc97':'#456',PK.ol,.7)+TX(2,16.5,'ON',6,'#dce5ec',700,'start')+
  CI(13,14,4,'#222','#999',.8)+PA('M13 10.5V14','none','#ddd',1)+RC(-22,-26,44,6,'none',3,'none')+TX(-14,-23.5,'+',8,PK.rd)+TX(0,24,'−',8,'#dce5ec')};
ph.bat=(c,o)=>{const sm=+c.p.V<=4;
 return sm?RC(-9,-22,18,44,'#e0aa2f',3,'#7a5b12')+RC(-9,-6,18,22,'#2a2a2a',0,'#111',.6)+RC(-4,-26,8,5,'#cfd3d6',1)+TX(0,6,c.p.V+'V',8,'#f4d26a',700)+TX(0,-12,'+',8,'#7a3b00')
  :RC(-17,-24,34,48,'#1f5aa8',3,'#0e2f5a')+HL(-15,-23,30)+RC(-9,-28,18,5,PK.rd,1)+RC(-9,23,18,5,PK.dk,1)+RC(-12,-14,24,26,'#f2f4f6',1.5,'#6a7b8a',.7)+TX(0,-4,c.p.V+' V',9,'#0d2f57')+TX(0,6,'DC battery',5.5,'#44566a',600)+TX(0,-18,'+',8,'#fff')+TX(0,19,'−',8,'#fff')};
ph.ac=(c,o)=>RC(-22,-26,44,52,'#f1f3f4',4,'#8e9aa4')+CI(0,0,17,'#e4e8ea','#9aa6af',1)+CI(-6,-4,2.4,'#1a1f24',0)+CI(6,-4,2.4,'#1a1f24',0)+RC(-1.5,5,3,6,'#1a1f24',1,'#000',.4)+TX(0,-18.5,c.p.V+' V AC',6.5,'#35434f')+TX(-15,-21,'L',0)+TX(0,22.5,'MAINS',6,'#35434f',600)+
 (S.run?CI(15,-17,2.6,'#3ddc97','#1b6b46',.6):'');
ph.psu=(c,o)=>{const on=S.run&&c.s.en!==0&&o;
 return RC(-22,-30,44,60,'#aeb7bf',3,'#56626c')+RC(-22,-30,44,9,'#8f9aa4',3,'#56626c',.8)+RC(-22,21,44,9,'#8f9aa4',3,'#56626c',.8)+RC(-16,-17,32,34,'#d7dde2',2,'#7c8993',.7)+TX(0,-8,'POWER SUPPLY',5,'#34424e',700)+
  TX(0,2,c.p.Vin+'V→'+c.p.Vo+'V',7.5,'#14202b',700)+TX(0,10,c.p.P+' W',6.5,'#34424e',600)+CI(-9,15,2.4,on?'#3ddc97':'#5a6a60','#274',.5)+TX(-4,17,'DC OK',4.8,'#34424e',600,'start')+
  RC(-22,-8,4,16,'#2d343b',0)+RC(18,-8,4,16,'#2d343b',0)+TX(-12,-24.5,'L',5,'#e8ecef')+TX(-12,27.5,'N',5,'#e8ecef')+TX(12,-24.5,'+',5.5,'#ffb4b4')+TX(12,27.5,'−',5.5,'#e8ecef')};
ph.pe=()=>RC(-14,-24,28,10,'#d7dbde',1.5,'#7b858e')+RC(-6,-14,12,24,'#c9ced2',1,'#7b858e')+CI(0,-18,3.2,'#9aa5af','#5d6770',.8)+RC(-9,10,18,11,PK.gn,2,'#16623a')+PA('M-9 12L-4 21M-3 11L3 21M3 11L8 20M-9 18L-6 21','none',PK.yl,2.4)+CI(0,15.5,2.2,'#111','#fff',.6);

/* ================= PROTECTION ================= */
const lever=(t,x,y,w,h,col)=>{const on=t===1,tr=t===2,hh=h*.46,yy=on?y:tr?y+h*.27:y+h-hh;return RC(x,y,w,h,'#262d34',1.5,'#10151a',.8)+RC(x+1,yy,w-2,hh,tr?PK.or:col||'#0e1216',1.2,'#000',.7)+HL(x+1.5,yy+.8,w-3)};
ph.mcb=c=>{const t=bst(c);return RC(-20,-28,40,56,PK.g1,3,'#7f8a94')+RC(-22,-9,5,18,PK.dk,0)+RC(17,-9,5,18,PK.dk,0)+RC(-13,-23,26,46,PK.g2,2,'#8a949d',.7)+lever(t,-5,-17,10,34)+
  RC(-8,-24.5,5,2.6,BWIN(t),.8,'none')+TX(0,-25.8,'',1)+TX(8.5,-21.2,t===1?'I':t===2?'!':'0',6.5,'#34424e')+TX(0,26.2,'C'+c.p.I,6.2,'#1c2833',700)};
ph.mccb=c=>{const t=bst(c),dy=t===1?-8:t===2?0:8;return RC(-22,-30,44,60,PK.bk,3,'#000')+RC(-18,-26,36,52,'#272e35',2,'#3a444d',.8)+HL(-17,-25,34)+RC(-9,-4,18,8,'#0b0e11',2)+PA(`M0 0L${dy*.0} ${dy*2.2}`,'none',t===2?PK.or:'#5a6671',7,'stroke-linecap:round')+CI(0,0,4.6,'#14191e','#506070',1)+
  RC(-15,-24,30,9,'#d7dde2',1.5,'#8a949d',.7)+TX(0,-17.6,'MCCB '+c.p.I+'A',5,'#1c2833')+TX(0,24,t===1?'ON':t===2?'TRIPPED':'OFF',6.2,t===1?'#ff6a6a':t===2?'#ffb066':'#6fe39e',700)+RC(-22,-9,5,18,'#4c555e',0)+RC(17,-9,5,18,'#4c555e',0)};
const rcP=(c,X,br)=>{const t=bst(c),a=Math.min(...X),b=Math.max(...X),mx=(a+b)/2,x0=a-7,w=b-a+14,n=X.length;
 return RC(x0,-26,w,52,PK.g1,3,'#7f8a94')+RC(x0,-26,w,8,'#d3d9de',3,'#7f8a94',.8)+RC(x0,18,w,8,'#d3d9de',3,'#7f8a94',.8)+lever(t,x0+6,-14,12,28)+RC(mx-1,-12,20,11,'#f1c232',2,'#8a6d00',.8)+TX(mx+9,-4,'T',7.5,'#222')+TX(mx+9,9,c.p.mA+'mA',5.6,'#1c2833')+
  RC(x0+6,-23,8,3,BWIN(t),.8,'none')+TX(mx,-20.6,br?'RCBO C'+c.p.I:'RCCB '+c.p.I+'A',5.6,'#1c2833')+TX(mx,24.2,n+'P  '+c.p.mA+'mA',5,'#44566a',600)+X.map(x=>TB(x-5,-26,10,5)+TB(x-5,21,10,5)).join('')};
ph.rcd=c=>rcP(c,[-20,20],0);
ph.rcd4=c=>rcP(c,[-20,0,20,40],0);
ph.rcbo=c=>rcP(c,[-20,20],1);
ph.rcbo4=c=>rcP(c,[-20,0,20,40],1);
ph.fus=c=>{const b=!!c.s.blown;return RC(-22,-9,8,18,PK.br,2,'#7a5f1c')+RC(14,-9,8,18,PK.br,2,'#7a5f1c')+RC(-14,-7,28,14,b?'#d9cfc6':'#efe6d3',1.5,'#8f8672',.9)+(b?PA('M-14 0H-6L-2 -3L2 3L6 0H14','none','#222',1,'stroke-dasharray:2 2')+PA('M-3 0l6 0','none',PK.rd,1.6):PA('M-14 0H14','none','#7a7f85',1.2))+HL(-13,-6.5,26)+TX(0,-12,c.p.I+' A',6.5,'#1c2833')+(b?CI(0,12,2.4,PK.rd,'#600',.5):'')};
ph.iso=c=>{const on=c.s.on;return RC(-20,-28,40,56,'#e3e6e8',3,'#7f8a94')+RC(-22,-9,5,18,PK.dk,0)+RC(17,-9,5,18,PK.dk,0)+CI(0,2,15,'#d9dee2','#8a949d',.9)+CI(0,2,11,PK.bk,'#000',1)+PA(`M0 2L0 ${on?-9.5:2}`,'none','#fff',0)+RC(-3.2,2-11,6.4,13,PK.rd,1.5,'#6a1010',.7,'')+TX(0,-21.5,'ISOLATOR',5.6,'#34424e')+TX(0,26,on?'I  ON':'0  OFF',6.5,on?'#b02020':'#1b6b46',700)};
const isoP=(c,X,txt)=>{const on=c.s.on,a=Math.min(...X),b=Math.max(...X),mx=(a+b)/2;return RC(a-9,-24,b-a+18,48,'#e3e6e8',3,'#7f8a94')+X.map(x=>TB(x-5,-24,10,5)+TB(x-5,19,10,5)+PA(`M${x-9.5} -17V17`,'none','#a8b2ba',.6)).join('')+CI(mx,0,15,'#d9dee2','#8a949d',.9)+CI(mx,0,11,PK.bk,'#000',1)+`<g transform="translate(${mx} 0) rotate(${on?-90:0})">`+RC(-3,-12,6,14,PK.rd,1.5,'#6a1010',.7)+`</g>`+TX(mx,-18.5,txt,5,'#34424e')+TX(mx,22.5,on?'I  ON':'0  OFF',5.6,on?'#b02020':'#1b6b46',700)};
ph.iso3=c=>isoP(c,[-20,0,20],'ISOLATOR 3P');
ph.iso2=c=>isoP(c,[-20,20],'ISOLATOR 2P');
ph.iso4=c=>isoP(c,[-20,0,20,40],'ISOLATOR 4P');
const mc3=(c,t,body,txt,dark,xs)=>{const X=xs||[-20,0,20],a=Math.min(...X),b=Math.max(...X),x0=a-9,w=b-a+18,mx=(a+b)/2;
 return RC(x0,-26,w,52,body,3,dark?'#000':'#7f8a94')+X.map(x=>TB(x-5,-26,10,5)+TB(x-5,21,10,5)+RC(x-4,-15,8,30,dark?'#272e35':'#262d34',1.5,'#10151a',.8)+RC(x-3,t===1?-14:t===2?-6:2,6,12,t===2?PK.or:'#0e1216',1,'#000',.6)).join('')+RC(x0+5,t===1?-9:t===2?-1:7,w-10,2.4,t===2?PK.or:'#4a5560',1,'none')+
  TX(mx,-18.8,txt,5.6,dark?'#e8ecef':'#1c2833')+TX(mx,24,t===1?'ON':t===2?'TRIPPED':'OFF',5.6,t===1?(dark?'#ff8a8a':'#b02020'):t===2?'#e5812b':(dark?'#6fe39e':'#1b6b46'),700)};
ph.mcb2=c=>mc3(c,bst(c),PK.g1,'MCB 2P  C'+c.p.I,0,[-20,20]);
ph.mcb3=c=>mc3(c,bst(c),PK.g1,'MCB 3P  C'+c.p.I);
ph.mccb3=c=>mc3(c,bst(c),PK.bk,'MCCB 3P  '+c.p.I+'A',1);
ph.mccb2=c=>mc3(c,bst(c),PK.bk,'MCCB 2P  '+c.p.I+'A',1,[-20,20]);
ph.mccb4=c=>mc3(c,bst(c),PK.bk,'MCCB 4P  '+c.p.I+'A',1,[-20,0,20,40]);
ph.mpcb3=c=>{const t=bst(c),a=t===1?0:t===2?-45:-90;return RC(-29,-26,58,52,'#2b3d52',3,'#0e1a26')+[-20,0,20].map(x=>TB(x-5,-26,10,5)+TB(x-5,21,10,5)).join('')+CI(-12,0,12,'#1b2631','#000',1)+`<g transform="translate(-12 0) rotate(${a})">`+RC(-3,-11,6,13,t===2?PK.or:PK.bk,1.5,'#9aa5af',.8)+PA('M0 -10V0','none','#fff',1.2)+`</g>`+TX(-12,-15.4,'',1)+
  CI(14,-4,8,'#c9d0d6','#6f7983',1)+`<g transform="rotate(${-110+Math.min(1,(c.p.I||1)/40)*220} 14 -4)">`+PA('M14 -4V-10','none','#d32f2f',1.6)+`</g>`+TX(14,12,c.p.I+'A',6,'#e8ecef')+TX(-12,-16,'MPCB',5,'#e8ecef')+TX(-12,23,t===1?'I':t===2?'TRIP':'O',5.6,t===2?'#ffb066':'#e8ecef')};
ph.ovl=c=>{const t=!!c.s.tripped;return RC(-22,-28,44,56,'#34506e',3,'#13263a')+RC(-22,-9,5,18,PK.dk,0)+RC(17,-9,5,18,PK.dk,0)+CI(0,-8,10,'#c9d0d6','#6f7983',1)+`<g transform="rotate(${-120+Math.min(1,c.p.I/40)*240} 0 -8)">`+PA('M0 -8V-16','none',PK.rd,1.6)+`</g>`+TX(0,-6,'',1)+TX(0,8,c.p.I+' A',7,'#e8ecef')+RC(-14,13,13,8,'#1e3550',1.5,'#9db5cc',.7)+TX(-7.5,19,'RESET',3.8,'#e8ecef')+RC(1,13,13,8,t?PK.rd:'#6c7c8c',1.5,'#111',.7)+TX(7.5,19,t?'TRIP':'TEST',3.8,'#fff')+TX(0,-23.2,'OVERLOAD',5.2,'#dbe6f0')};
ph.ovl3=c=>{const t=!!c.s.tripped;return RC(-30,-26,72,52,'#34506e',3,'#13263a')+[-20,0,20].map(x=>TB(x-5,-26,10,5)+TB(x-5,21,10,5)).join('')+RC(30,-24,10,48,'#2a3d52',1,'none')+TB(34,-24,8,8)+TB(34,16,8,8)+TX(-20,-18,'1',0)+
  CI(-8,-3,11,'#c9d0d6','#6f7983',1)+`<g transform="rotate(${-120+Math.min(1,c.p.I/40)*240} -8 -3)">`+PA('M-8 -3V-12','none',PK.rd,1.8)+`</g>`+TX(-8,-1,'',1)+TX(-8,16,c.p.I+' A',6.5,'#e8ecef')+RC(10,-14,14,9,t?PK.rd:'#69809a',1.5,'#111',.7)+TX(17,-7.4,t?'TRIP':'OK',4.6,'#fff')+RC(10,-2,14,8,'#1e3550',1.5,'#9db5cc',.7)+TX(17,4,'RESET',3.8,'#e8ecef')+TX(0,-19.6,'THERMAL OVERLOAD',4.6,'#dbe6f0')+TX(30,24,'95  96',4,'#dbe6f0',600,'end')};
ph.spd=c=>RC(-17,-30,34,60,PK.g1,3,'#7f8a94')+RC(-14,-26,28,28,'#566472',2,'#2c363f',.8)+HL(-13,-25,26)+PA('M-1.5 -22L-6 -11H-1L-3 -3L5 -14H0L2.5 -22Z',PK.yl,'#5a4a00',.6)+RC(-14,6,28,22,PK.g2,2,'#8a949d',.7)+RC(-6,10,12,6,PK.gn,1.5,'#16623a',.7)+TX(0,23,'SPD  T2',5.6,'#1c2833');

/* ================= SWITCHING (operators) ================= */
const pbtn=(c,col,dark,mark,collar)=>{const p=!!c.s.pressed;
 return RC(-22,-7,6,14,PK.dk,0)+RC(16,-7,6,14,PK.dk,0)+CI(0,0,20.5,collar||'#c9cfd4','#6b757d',1.2)+CI(0,0,17.5,'#1d2328','#000',1)+(p?'':CI(1.5,2.5,14.5,'rgba(0,0,0,.4)',0))+CI(0,p?1:0,p?12.4:14,p?dark:col,'#000',.9)+
 (p?'':`<path d="M-9 -6A10.5 10.5 0 0 1 4 -10" style="fill:none;stroke:rgba(255,255,255,.55);stroke-width:2.2;stroke-linecap:round" />`)+TX(0,p?4:3.2,mark,9,'#fff',800)};
ph.pb=c=>pbtn(c,'#2fae66','#1d7a45','I')+TX(0,31,'NO',5.5,'#44566a',700);
ph.pbnc=c=>pbtn(c,'#d93a3a','#962222','O')+TX(0,31,'NC',5.5,'#44566a',700);
ph.estop=c=>{const l=!!c.s.on;return RC(-22,-7,6,14,PK.dk,0)+RC(16,-7,6,14,PK.dk,0)+CI(0,0,21,PK.yl,'#7a5f00',1.2)+CI(0,0,18,'#1d2328','#000',1)+(l?'':CI(1.5,3,15.5,'rgba(0,0,0,.4)',0))+CI(0,l?1:0,l?13.5:15.5,l?'#a22020':'#e02a2a','#4a0a0a',1)+CI(0,l?1:0,l?8:10,l?'#b52a2a':'#ee4040','none',0)+
 (l?'':`<path d="M-10 -7A12 12 0 0 1 4 -11" style="fill:none;stroke:rgba(255,255,255,.55);stroke-width:2.4;stroke-linecap:round" />`)+TX(0,31,l?'E-STOP  LATCHED':'E-STOP',5.5,l?'#b02020':'#44566a',700)};
ph.sw=(c,o,cl)=>{const a=cl?32:-32;return RC(-22,3,44,15,'#3a444d',2,'#1b2026')+RC(-18,0,36,6,'#aeb7bf',1.5,'#6b757d',.8)+CI(0,2,6,'#c5ccd2','#6b757d',1)+`<g transform="translate(0 2) rotate(${a})">`+RC(-2.2,-20,4.4,20,'#9aa5af',2,'#5d6770',.8)+CI(0,-21,4,'#2d343b','#000',.8)+`</g>`+TX(-14,15,'OFF',4.5,'#9fb0bf',700)+TX(14,15,'ON',4.5,cl?'#6fe39e':'#9fb0bf',700)};
const knob=(c,a,marks,body)=>CI(0,0,21,'#d9dee2','#6b757d',1.2)+(marks||'')+CI(0,0,13.5,'#14181c','#000',1)+`<g transform="rotate(${a})">`+RC(-1.6,-12,3.2,11,'#f4f4f4',1,'none')+`</g>`+CI(0,0,3,'#2c353d','#000',.5)+RC(-22,-7,6,14,PK.dk,0)+RC(16,-7,6,14,PK.dk,0);
ph.sel2=(c,o,cl)=>knob(c,cl?40:-40,TX(-14,-15,'0',6)+TX(14,-15,'I',6));
ph.sel3=(c)=>{const p=c.p.pos,a=p==='HAND'?-40:p==='AUTO'?40:0;
 return RC(-22,-7,6,14,PK.dk,0)+RC(16,-4,6,8,PK.dk,0,PK.ol,.6)+RC(16,-24,6,8,PK.dk,0)+RC(16,16,6,8,PK.dk,0)+CI(0,0,21,'#d9dee2','#6b757d',1.2)+CI(0,0,13.5,'#14181c','#000',1)+
 `<g transform="rotate(${a})">`+RC(2,-1.6,11,3.2,'#f4f4f4',1,'none')+`</g>`+CI(0,0,3,'#2c353d','#000',.5)+TX(15,-12,'H',6)+TX(18,3,'0',6)+TX(15,15,'A',6)};
ph.ky=(c,o,cl)=>RC(-22,-7,6,14,PK.dk,0)+RC(16,-7,6,14,PK.dk,0)+CI(0,0,20,'#c9cfd4','#6b757d',1.2)+CI(0,0,15,'#8d98a2','#46525c',1)+CI(0,0,8.5,'#12161a','#000',1)+`<g transform="rotate(${cl?90:0})">`+RC(-1.8,-24,3.6,24,PK.br,1.5,'#7a5f1c',.8)+CI(0,-22,6,PK.br,'#7a5f1c',.9)+CI(0,-22,2.2,'#12161a',0)+`</g>`+TX(-14,-13,'0',5,'#34424e')+TX(14,-13,'I',5,'#34424e');
ph.ths=(c,o,cl)=>RC(-20,-28,40,44,'#c9d0d6',3,'#6b757d')+RC(-20,-28,40,8,'#aab3bb',3,'#6b757d',.8)+CI(0,-6,13,'#f3f5f6','#6b757d',1)+Array.from({length:7},(_,i)=>{const a=(-120+i*40)*Math.PI/180;return PA(`M${Math.sin(a)*10} ${-6-Math.cos(a)*10}L${Math.sin(a)*12} ${-6-Math.cos(a)*12}`,'none','#555',.8)}).join('')+`<g transform="rotate(${cl?60:-30} 0 -6)">`+PA('M0 -6V-15','none',PK.rd,1.6)+`</g>`+CI(0,-6,2.2,'#333',0)+TX(0,-21.6,'THERMOSTAT',4.5,'#1c2833')+
 PA('M0 16V24Q-4 30 -14 28','none','#9aa5af',1.6)+RC(-18,25,10,6,'#c9a24a',2,'#7a5f1c',.8)+CI(10,8,2.6,cl?PK.gn:'#7b868f','#333',.6)+TX(10,14.5,'°C',5,'#1c2833');
ph.prs=(c,o,cl)=>RC(-22,-6,5,12,PK.dk,0)+RC(17,-6,5,12,PK.dk,0)+RC(-17,-26,34,32,'#7c8995',3,'#3b4650')+HL(-16,-25,32)+CI(0,-17,6,'#c9d0d6','#46525c',1)+PA('M-4 -17H4','none','#555',1.2)+TX(0,-3,'PRESSURE',4.6,'#fff')+TX(0,3,'SWITCH',4.6,'#fff')+RC(-8,6,16,7,PK.br,1.5,'#7a5f1c',.9)+RC(-5,13,10,13,'#b6bcc2',1,'#6f7983',.8)+PA('M-5 17H5M-5 21H5','none','#6f7983',.8)+CI(12,-20,2.4,cl?PK.gn:'#44505a','#222',.6);
ph.lvs=(c,o,cl)=>RC(-22,-6,5,12,PK.dk,0)+RC(17,-6,5,12,PK.dk,0)+RC(-15,-27,30,15,'#4a5865',3,'#1c242b')+HL(-14,-26,28)+TX(0,-17,'LEVEL',5,'#e8ecef')+PA('M0 -12V12','none','#9aa5af',2.4)+`<g transform="translate(0 ${cl?-1:15})">`+`<ellipse cx=0 cy=0 rx=13 ry=7 ${_s(cl?'#f0b429':'#e0e4e8','#5d6770',1)} />`+PA('M-9 -2Q0 -6 9 -2','none','rgba(255,255,255,.7)',1.2)+`</g>`+PA('M-20 20q5 -3 10 0t10 0t10 0t10 0','none','#5aa7e6',1.4,'opacity:.8');

/* relays & contactors */
const rlin=(x,y,w)=>PA(`M${x} ${y}h${w}`,'none','#8a5a2a',.7);
const coilW=(x,y,w,h,en)=>RC(x,y,w,h,en?'#d98a3e':PK.cu,2,'#6a3f17',.8)+Array.from({length:Math.floor(h/3)},(_,i)=>rlin(x+.6,y+2+i*3,w-1.2)).join('');
ph.rel=(c,o,cl)=>{const en=!!c.s.en;return RC(-22,-30,44,60,'#d5dee7',3,'#6b7a88')+RC(-18,-26,36,52,'rgba(190,215,235,.45)',2,'#8fa3b5',.8)+coilW(-14,-18,10,24,en)+RC(-3,-16,2.6,20,'#8c98a3',0)+PA(`M-3 ${en?-14:-16}L${en?3:10} ${en?-14:-18}`,'none','#555',1.4)+
 CI(14,-20,1.8,'#c9d0d6','#555',.6)+CI(14,20,1.8,'#c9d0d6','#555',.6)+PA(`M14 -20L${cl?14:8} ${cl?18:4}`,'none',PK.br,1.8)+CI(-10,23,2.4,en?'#3ddc97':'#5b6b66','#273',.5)+TX(2,25,c.p.ct,5,'#34424e',700,'start')+TX(0,-31.5,'',1)+TX(0,-23,'RELAY '+c.p.V+'V',5,'#34424e')+
 RC(-22,-28,5,16,PK.dk,0)+RC(-22,12,5,16,PK.dk,0)+RC(17,-28,5,16,PK.dk,0)+RC(17,12,5,16,PK.dk,0)};
ph.ton=(c,o,cl)=>{const d=!!c.s.done;return RC(-22,-30,44,60,'#e4e7ea',3,'#7f8a94')+RC(-22,-30,44,10,'#2b6cb0',3,'#16365a')+TX(0,-22.5,'TIMER ON-DELAY',4.6,'#fff')+CI(0,-4,11,'#2d343b','#000',1)+`<g transform="rotate(${Math.min(1,(c.p.T||1)/60)*270-135} 0 -4)">`+PA('M0 -4V-12','none','#fff',1.8)+`</g>`+
 Array.from({length:6},(_,i)=>{const a=(-135+i*54)*Math.PI/180;return PA(`M${Math.sin(a)*13.5} ${-4-Math.cos(a)*13.5}L${Math.sin(a)*15.5} ${-4-Math.cos(a)*15.5}`,'none','#555',.8)}).join('')+TX(0,21,'T = '+c.p.T+' s',6.5,'#1c2833')+CI(-12,26,2.2,S.run?'#3ddc97':'#8a948d','#273',.5)+TX(-8,27.6,'U',4.4,'#34424e',700,'start')+CI(6,26,2.2,d?PK.yl:'#a9a48a','#775',.5)+TX(10,27.6,'R',4.4,'#34424e',700,'start')+
 RC(-22,-28,5,16,PK.dk,0)+RC(-22,12,5,16,PK.dk,0)+RC(17,-28,5,16,PK.dk,0)+RC(17,12,5,16,PK.dk,0)};
ph.con=(c,o,cl)=>{const en=!!c.s.en;return RC(-22,-44,44,88,'#3b4650',3,'#1c242b')+HL(-20,-43,40)+RC(-17,-38,34,17,'#e9edf0',1.5,'#8a949d',.7)+TX(0,-30,'CONTACTOR',5,'#1c2833')+TX(0,-24,'coil '+c.p.V+' V',4.6,'#44566a',600)+RC(-12,-12,24,24,'#161b20',2,'#000',.8)+RC(-8,en?-1:-9,16,12,en?PK.gn:'#c9d0d6',1.5,'#555',.8)+TX(0,26,en?'ON':'OFF',6,en?'#6fe39e':'#9fb0bf',700)+
 [-40,-20,20,40].map(y=>TB(14,y-5,8,10)).join('')+TB(-22,-25,8,10)+TB(-22,15,8,10)+TX(10,-2,'',1)};
ph.con3=(c,o,cl)=>{const en=!!c.s.en;return RC(-50,-30,84,60,'#3b4650',3,'#1c242b')+HL(-48,-29,80)+[-20,0,20].map(x=>TB(x-5,-30,10,8)+TB(x-5,22,10,8)).join('')+TB(-52,-25,8,10)+TB(-52,15,8,10)+RC(-42,-20,22,40,'#e9edf0',1.5,'#8a949d',.7)+TX(-31,-8,'KM',7,'#1c2833')+TX(-31,2,c.p.V+' V',5,'#44566a',600)+TX(-31,12,'coil',4.6,'#44566a',600)+
 RC(-12,-14,36,28,'#161b20',2,'#000',.8)+RC(-8,en?-3:-11,28,12,en?PK.gn:'#c9d0d6',1.5,'#555',.8)+TX(6,en?7:-0.6,en?'ON':'',5,'#fff',700)+TX(6,26,'3-pole contactor',4.2,'#d5dde4',600)};
PHB.rel=[-22,-30,22,30];PHB.ton=[-22,-30,22,30];PHB.con=[-22,-44,22,44];PHB.con3=[-52,-30,34,30];

/* coils and contact blocks (the "of coil" parts) */
const coilP=(c,tag,extra)=>{const en=!!c.s.en;return RC(-3,-26,6,52,'#9aa5af',1,'#5d6770',.8)+RC(-16,-23,32,5,'#262d34',1.5,'#000',.7)+RC(-16,18,32,5,'#262d34',1.5,'#000',.7)+coilW(-13,-19,26,38,en)+(en?RC(-17,-24,34,48,'none',3,PK.gn,2):'')+RC(-8,-8,16,11,'#f1f3f4',1.5,'#8a949d',.7)+TX(0,.4,tag,6.5,'#1c2833')+(extra||'')};
ph.coil=c=>coilP(c,'KM');ph.rcoil=c=>coilP(c,'KA');
ph.tcoil=c=>coilP(c,'KT',TX(0,13,'ON-dly',4.4,'#2a1a08',700));ph.tcoff=c=>coilP(c,'KT',TX(0,13,'OFF-dly',4.4,'#2a1a08',700));
const stud=(x,y)=>CI(x,y,3.6,'#dfe4e8','#6b757d',.9)+CI(x,y,1.2,'#9aa5af',0);
const cblk=(c,cl,nc,txt)=>RC(-14,-26,28,52,PK.g1,2,'#7f8a94')+RC(-14,-26,28,6,'#2d343b',2)+RC(-14,20,28,6,'#2d343b',2)+RC(-9,-17,18,34,'#262d34',2,'#10151a',.8)+stud(0,-11)+stud(0,11)+
 (cl?PA('M0 -11V11','none',PK.cu,3):PA('M0 11L7 -3','none',PK.cu,3)+PA('M0 -11V-6','none',PK.cu,1.6,'opacity:.25'))+RC(-13,-9,.1,.1,'none')+TX(-19,3,txt,5,'#34424e',700,'end')+TX(0,-21.8,nc,4.6,'#fff',700)+(cl?CI(10,0,2,PK.gn,0):CI(10,0,2,'#8a948d',0));
ph.cno=(c,o,cl)=>cblk(c,cl,0,'')+TX(0,31.5,'NO  13-14',4.8,'#34424e',700);
ph.cnc=(c,o,cl)=>cblk(c,cl,1,'')+TX(0,31.5,'NC  21-22',4.8,'#34424e',700);
ph.cco=(c,o,cl)=>RC(-28,-26,56,52,PK.g1,2,'#7f8a94')+RC(-28,-26,56,6,'#2d343b',2)+RC(-28,20,56,6,'#2d343b',2)+RC(-24,-17,48,34,'#262d34',2,'#10151a',.8)+stud(-20,-11)+stud(20,-11)+CI(0,11,3.2,'#dfe4e8','#6b757d',.9)+PA(`M0 11L${cl?20:-20} -10`,'none',PK.cu,3)+TX(-20,-21.8,'12',4.6,'#fff',700)+TX(20,-21.8,'14',4.6,'#fff',700)+TX(0,24.2,'11',4.6,'#fff',700)+TX(0,.5,'CO',6,'#9fb0bf',700);
ph.cp3=(c,o,cl)=>RC(-29,-26,58,52,'#3b4650',3,'#1c242b')+[-20,0,20].map(x=>TB(x-5,-26,10,5)+TB(x-5,21,10,5)+RC(x-6,-17,12,34,'#262d34',2,'#10151a',.8)+stud(x,-11)+stud(x,11)+(cl?PA(`M${x} -11V11`,'none',PK.cu,3.2):PA(`M${x} 11L${x+5} -2`,'none',PK.cu,3.2))).join('')+TX(0,-19,'MAIN CONTACTS',4.2,'#d5dde4',600)+TX(0,25,cl?'CLOSED':'OPEN',5,cl?'#6fe39e':'#9fb0bf',700);

/* ================= SENSORS ================= */
const thr=(x1,x2,h)=>{let s='';for(let x=x1;x<=x2;x+=2.4)s+=PA(`M${x.toFixed(1)} ${-h}V${h}`,'none','#8f99a2',.6);return s};
const prox=(c,cl,tag)=>{const on=!!c.s.on;return RC(10,-10,12,20,'#20262c',2,'#000',.8)+RC(-16,-8.5,28,17,'#b9c0c6',1.5,'#6f7983',.9)+thr(-14,10,8.5)+RC(-8,-11,4.6,22,'#9aa5af',1,'#5d6770',.8)+RC(0,-11,4.6,22,'#9aa5af',1,'#5d6770',.8)+RC(-20,-7,4,14,on?'#7dffb8':'#37424c',1,'#111',.8)+CI(16,-3,2.3,on?PK.yl:'#7a7348','#222',.5)+TX(-1,1.6,tag,5,'#1c2833',700)};
ph.sens=(c,o,cl)=>prox(c,cl,'PX')+(c.s.on?'':'')+PA('M-22 0H-20','none',PK.ol,1);
const prox3=(c,tag)=>prox(c,0,tag)+PA('M18 -10Q18 -22 0 -22','none','#7a4a22',1.8)+PA('M18 10Q18 22 0 22','none','#2a62b0',1.8)+PA('M22 0H21','none','#111',1.8);
ph.pnp=c=>prox3(c,'PNP');ph.npn=c=>prox3(c,'NPN');
const limsw=(c,on)=>RC(-14,-16,28,32,'#f2c230',3,'#8a6d00')+HL(-13,-15,26)+RC(-9,-24,18,9,'#7b858d',2,'#3b4650',.9)+PA(on?'M0 -24L-12 -28':'M0 -24L-12 -36','none','#46525c',3.2)+CI(on?-12:-12,on?-28:-36,4.4,'#1d2328','#000',.9)+CI(0,-3,3.2,'#c9a24a','#7a5f1c',.7)+TX(0,9,'LIMIT',5.2,'#4a3a00',700)+RC(-22,-6,8,12,PK.dk,0)+RC(14,-6,8,12,PK.dk,0)+CI(8,8,2.2,on?PK.gn:'#7b6b20',0);
ph.lim=c=>limsw(c,!!c.s.on);ph.limnc=c=>limsw(c,!!c.s.on)+TX(0,15,'NC',4.8,'#4a3a00',700);
PHB.lim=[-22,-40,22,16];PHB.limnc=[-22,-40,22,16];

/* ================= LOADS, LAMPS, SIGNALS ================= */
const BULB=(c,o,k,b,lens)=>GLOW(30,k,b)+CI(0,-3,14,`rgba(${k},${.1+Math.min(1,b)*.85})`,'#7a8791',1)+PA('M-5 9V1l2.5-5 2.5 5 2.5-5 2.5 5V9','none',b>.1?`rgb(255,${Math.round(210-Math.min(1,b)*70)},90)`:'#6b6f73',1.3)+RC(-7,10,14,10,'#a6aeb5',1.5,'#5d6770',.9)+PA('M-7 13H7M-7 16.5H7','none','#5d6770',.7)+RC(-3,20,6,3,'#5a5a5a',1)+PA('M-6 -9Q-9 -3 -7 2','none','rgba(255,255,255,.6)',1.3);
ph.lamp=(c,o)=>{const b=gl(c,o);return BULB(c,o,CLR[c.p.col]||CLR.yellow,b)};
ph.pl=(c,o)=>{const b=gl(c,o),k=CLR[c.p.col]||CLR.green;return GLOW(30,k,b)+RC(-22,-7,6,14,PK.dk,0)+RC(16,-7,6,14,PK.dk,0)+CI(0,0,20.5,'#c9cfd4','#6b757d',1.2)+CI(0,0,17,'#1d2328','#000',1)+CI(0,0,14.5,`rgba(${k},${.35+Math.min(1,b)*.65})`,'#000',.9)+CI(0,0,8,`rgba(${k},${.2+b*.7})`,'none',0)+`<path d="M-9 -6A10.5 10.5 0 0 1 4 -10" style="fill:none;stroke:rgba(255,255,255,.6);stroke-width:2.2;stroke-linecap:round" />`};
ph.buz=(c,o)=>{const b=gl(c,o);return RC(-22,-7,6,14,PK.dk,0)+RC(16,-7,6,14,PK.dk,0)+CI(0,0,18,'#252c33','#000',1)+CI(0,0,14,'#2f373f','#10151a',1)+CI(0,0,3.6,'#07090b',0)+[[-8,-6],[8,-6],[-8,6],[8,6],[0,-9],[0,9]].map(p=>CI(p[0],p[1],1.5,'#07090b',0)).join('')+TX(-13,-9,'+',6,'#ff8a8a')+
 (b>.3?PA('M20 -7Q26 0 20 7','none','#e8a317',1.6)+PA('M24 -11Q33 0 24 11','none','#e8a317',1.4,'opacity:.7'):'')};
ph.bcn=(c,o)=>{const b=gl(c,o),k=CLR[c.p.col]||CLR.amber,rays=b>.3?Array.from({length:8},(_,i)=>{const a=(i*45-90)*Math.PI/180;return PA(`M${Math.cos(a)*19} ${Math.sin(a)*19-4}L${Math.cos(a)*26} ${Math.sin(a)*26-4}`,'none',`rgb(${k})`,1.8,'opacity:.8')}).join(''):'';
 return GLOW(32,k,b)+RC(-22,-6,6,12,PK.dk,0)+RC(16,-6,6,12,PK.dk,0)+RC(-15,8,30,10,'#3a444d',2,'#1b2026')+PA('M-14 8A14 14 0 0 1 14 8Z',`rgba(${k},${.35+Math.min(1,b)*.6})`,'#3b4650',1)+`<g transform="rotate(${ANG(c)} 0 2)">`+(b>.2?PA('M0 2V-8','none','#fff',1.6,'opacity:.8'):'')+`</g>`+PA('M-9 5Q-8 -4 0 -7','none','rgba(255,255,255,.6)',1.3)+rays};
ph.htr=(c,o)=>{const b=Math.min(1,gl(c,o)),col=`rgb(${Math.round(150+b*105)},${Math.round(150-b*80)},${Math.round(150-b*130)})`;return GLOW(28,'255,110,0',b)+RC(-22,-14,8,28,PK.dk,1,'#1b2026')+RC(-14,-14,4,28,'#9aa5af',1,'#5d6770',.8)+PA('M-10 -9H12A9 9 0 0 1 12 9H-10','none','#5d6770',7)+PA('M-10 -9H12A9 9 0 0 1 12 9H-10','none',col,5)+PA('M-8 -9H12A9 9 0 0 1 12 9H-8','none','rgba(255,255,255,.35)',1.2)};
ph.sol=(c,o)=>{const on=gl(c,o)>.5;return RC(-22,8,6,10,PK.br,1,'#7a5f1c')+RC(16,8,6,10,PK.br,1,'#7a5f1c')+RC(-16,4,32,18,PK.br,3,'#7a5f1c')+HL(-15,5,30)+RC(-6,-6,12,10,'#9aa5af',1,'#5d6770',.8)+RC(-12,-24,24,19,'#1f2328',3,'#000')+HL(-11,-23,22)+TX(0,-11.5,'Y',8,'#e8ecef')+CI(8,-19,2.2,on?'#3ddc97':'#4a5560','#111',.5)+PA(`M-5 ${on?10:15}H5`,'none','#5d3a10',1.4)+PA('M-12 13H-6M6 13H12','none','#7a5f1c',1)};
PHB.sol=[-22,-24,22,22];
const resB=R=>{const cl=['#111','#7a4a1b','#d32f2f','#f2822a','#f2d02a','#2e9e5b','#2b6cb0','#8a4fd0','#8a8f94','#f4f4f4'];let e=0,v=Math.max(+R||1,.1);while(v>=100){v/=10;e++}while(v<10){v*=10;e--}let r=Math.round(v);if(r>=100){r=10;e++}return[cl[Math.floor(r/10)],cl[r%10],e>=0&&e<=9?cl[e]:e===-1?'#c9a24a':'#c0c0c0']};
ph.res=c=>{if(c.p.P>=5)return RC(-19,-10,38,20,'#efe9dc',2,'#9c9380')+RC(-21,-7,4,14,'#9aa5af',1)+RC(17,-7,4,14,'#9aa5af',1)+Array.from({length:9},(_,i)=>PA(`M${-14+i*3.5} -9V9`,'none','#c9843f',.8,'opacity:.55')).join('')+TX(0,-.5,num(c.p.R)+' Ω',7,'#2a2418')+TX(0,7.5,c.p.P+' W',5,'#5a5040',600);
 const b=resB(c.p.R);return PA('M-22 0H-15M15 0H22','none','#aab',1.6)+RC(-15,-6.5,30,13,'#d8c49a',6,'#8c7a50',.9)+[-8,-2.5,3].map((x,i)=>RC(x,-6.5,2.6,13,b[i],0,'none')).join('')+RC(9,-6.5,2.2,13,'#c9a24a',0,'none')+HL(-12,-5.5,24)};
ph.brr=c=>RC(-22,-8,5,16,PK.dk,1)+RC(-17,-14,34,28,'#b3bbc2',2,'#69747d')+Array.from({length:8},(_,i)=>PA(`M${-14+i*4} -13V13`,'none','#8a949d',1)).join('')+RC(-20,12,40,4,'#69747d',1)+RC(17,-8,5,16,PK.dk,1)+TX(0,2,num(c.p.R)+'Ω '+c.p.P+'W',5.6,'#1c2833')+TX(0,-6,'BRAKING RES',4.2,'#34424e',600);
ph.cap=c=>RC(-20,-5,5,10,'#c9d0d6',1,'#6f7983',.8)+RC(15,-5,5,10,'#c9d0d6',1,'#6f7983',.8)+RC(-16,-11,31,22,'#1f4fa0',3,'#0d2a5c')+RC(-16,-11,7,22,'#dfe6f0',2,'#9aa5af',.7)+TX(-12.5,-1,'−',9,'#0d2a5c')+TX(-12.5,9,'−',9,'#0d2a5c')+HL(-8,-10,22)+TX(6,-0.5,num(c.p.C),7,'#fff')+TX(6,8,'µF',5.5,'#cfe0ff',600);
ph.ind=c=>PA('M0 0m-11 0a11 11 0 1 0 22 0a11 11 0 1 0 -22 0','none','#3a444d',9)+Array.from({length:14},(_,i)=>{const a=i*Math.PI/7;return PA(`M${Math.cos(a)*5.5} ${Math.sin(a)*5.5}L${Math.cos(a)*17.5} ${Math.sin(a)*17.5}`,'none',PK.cu,2.6)+PA(`M${Math.cos(a)*5.5} ${Math.sin(a)*5.5}L${Math.cos(a)*17.5} ${Math.sin(a)*17.5}`,'none','#8a5a2a',.5)}).join('')+TX(0,2.4,c.p.L+'mH',5,'#fff');
ph.dio=c=>RC(-12,-6,24,12,'#1a1d21',3,'#000',.8)+RC(6,-6,4.2,12,'#c9d0d6',0,'none')+HL(-10,-5.5,16)+TX(-3,2.4,'1N',4.6,'#aeb7bf',600)+PA('M-22 0H-12M12 0H22','none','#aab',1.6);
ph.led=c=>{const on=!!c.s.fw;return GLOW(30,'255,70,70',on?1:0)+RC(-14,-10,28,20,'#f4f5f6',2,'#9aa5af',.9)+CI(0,0,7,on?'#ff6a5a':'#a43d37','#5a1a16',.8)+CI(-2,-2,2,'rgba(255,255,255,.6)',0)+RC(-18,-5,6,10,'#c9d0d6',1,'#6f7983',.8)+RC(12,-5,6,10,'#c9d0d6',1,'#6f7983',.8)+RC(-14,-10,5,5,'#222',0)+TX(-11.5,-6.2,'',1)};

/* ================= MOTORS ================= */
ph.mot=c=>{const a=ANG(c);return RC(-22,-8,6,16,PK.dk,0)+RC(-16,-14,32,28,'#8e9aa5',4,'#46525c')+RC(-16,-14,7,28,'#2b323a',3,'#000',.8)+HL(-8,-13,22)+RC(9,-11,6,22,'#aab4bd',1,'#6f7983',.8)+RC(15,-3,8,6,'#d0d5d9',1,'#6f7983',.7)+[0,1,2].map(i=>PA(`M${(16+((a/9+i*2.6)%8)).toFixed(1)} -3v6`,'none','#7a848c',.9)).join('')+TX(0,2,'DC',6.5,'#fff')+TX(0,-16.6,c.p.P+'W',4.6,'#34424e',600)};
PHB.mot=[-22,-17,24,14];
const motEnd=(c,lugs,cap,title)=>{const a=ANG(c),cy=5,blades=Array.from({length:6},(_,i)=>{const t=(a+i*60)*Math.PI/180;return PA(`M${Math.cos(t)*4} ${cy+Math.sin(t)*4}Q${Math.cos(t+.5)*11} ${cy+Math.sin(t+.5)*11} ${Math.cos(t+.2)*14.5} ${cy+Math.sin(t+.2)*14.5}`,'none','#1f2830',2.2)}).join(''),
 fins=Array.from({length:24},(_,i)=>{const t=i*Math.PI/12;return PA(`M${Math.cos(t)*21} ${cy+Math.sin(t)*21}L${Math.cos(t)*25.5} ${cy+Math.sin(t)*25.5}`,'none','#2f3a44',1.6)}).join('');
 return RC(-31,-38,62,17,'#4a5865',2.5,'#2b333b')+HL(-30,-37,60)+(cap?RC(-9,-36,18,14,'#14181c',3,'#000',.8)+TX(0,-27.5,cap+'µF',5,'#e8ecef')+TX(0,-22.6,'',1):'')+lugs.map(l=>CI(l[0],-33,3.4,PK.br,'#7a5f1c',.8)+TX(l[0],-24,l[1],4.4,'#e8ecef')).join('')+
  RC(-27,cy+21,54,6,'#2b333b',1.5,'#000',.8)+CI(0,cy,26,'#5d6b78','#2f3a44',1.2)+fins+CI(0,cy,21,'#8693a0','#46525c',1)+CI(0,cy,16.5,'#c3cad1','#6f7983',.9)+CI(0,cy,15,'#eef1f3','#9aa5af',.6,'opacity:.55')+blades+CI(0,cy,4.6,'#d9dee1','#6f7983',.9)+CI(0,cy,1.6,'#555',0)+
  CI(28,0,3,PK.gn,'#16623a',.8)+PA('M28 -3V3','none',PK.yl,1.4)+TX(0,cy+36,title,5,'#34424e',700)};
const kw=P=>P>=1000?+(P/1000).toFixed(2)+' kW':P+' W';
ph.mot3=c=>motEnd(c,[[-20,'U1'],[0,'V1'],[20,'W1']],0,'3~ MOTOR '+kw(c.p.P));
ph.mot1=c=>motEnd(c,[[-20,'L'],[20,'N']],c.p.C,'1~ MOTOR '+kw(c.p.P));
PHB.mot3=[-31,-38,31,41];PHB.mot1=[-31,-38,31,41];
ph.pot=c=>{const a=-135+Math.max(0,Math.min(100,+c.p.pos||0))*2.7;return RC(-6,-22,12,5,PK.dk,0)+RC(-6,17,12,5,PK.dk,0)+RC(16,-6,6,12,PK.dk,0)+CI(0,0,21,'#d9dee2','#6b757d',1.2)+Array.from({length:11},(_,i)=>{const t=(-135+i*27)*Math.PI/180;return PA(`M${Math.sin(t)*17.5} ${-Math.cos(t)*17.5}L${Math.sin(t)*20} ${-Math.cos(t)*20}`,'none','#555',.8)}).join('')+CI(0,0,13.5,'#14181c','#000',1)+HL(-8,-9,10)+`<g transform="rotate(${a})">`+RC(-1.5,-12.5,3,9,'#fff',1,'none')+`</g>`+CI(0,0,2.6,'#2c353d',0)+TX(0,0.5,'',1)+TX(-17,-14,'1',4.4,'#34424e')+TX(-17,19,'3',4.4,'#34424e')+TX(17,-9.5,'W',4.4,'#34424e')};

/* ================= TRANSFORMER, METERS, TOOLS, TERMINALS ================= */
ph.xf=c=>RC(-17,-26,34,52,'#76828e',2,'#3b4650')+Array.from({length:13},(_,i)=>PA(`M-16 ${-24+i*4}H16`,'none','#5a6671',.5)).join('')+RC(-4,-26,8,52,'#68747f',0,'none')+RC(-22,-20,13,40,PK.cu,3,'#6a3f17')+RC(9,-20,13,40,PK.cu,3,'#6a3f17')+Array.from({length:12},(_,i)=>rlin(-21,-17+i*3.2,11)+rlin(10,-17+i*3.2,11)).join('')+TX(0,2,c.p.Vp+'/'+c.p.Vs,5.4,'#fff')+TX(0,9,'V',5,'#dfe6ec');
PHB.xf=[-22,-26,22,26];
const mrng=v=>{const e=Math.pow(10,Math.floor(Math.log10(Math.max(v,1e-12)))),m=v/e;return(m<=1?1:m<=2?2:m<=5?5:10)*e};
const meter=(c,o,val,u)=>{const r=mrng(Math.max(val,1e-9)),fr=Math.min(1,val/r),a=-50+fr*100;
 return RC(-22,-22,44,44,'#1d2329',3,'#000')+RC(-18,-18,36,36,'#f6f6ef',2,'#555',.7)+PA('M-12.4 0.8A16 16 0 0 1 12.4 0.8','none','#222',1)+Array.from({length:6},(_,i)=>{const t=(-50+i*20)*Math.PI/180;return PA(`M${Math.sin(t)*13} ${12-Math.cos(t)*13}L${Math.sin(t)*16} ${12-Math.cos(t)*16}`,'none','#222',1)}).join('')+
  `<g transform="rotate(${o?a:-50} 0 12)">`+PA('M0 12V-3','none',PK.rd,1.3)+`</g>`+CI(0,12,2.4,'#222',0)+TX(-10,-9,u,7,'#222',800)+TX(0,21,o?f(val):'',5.4,'#222',700)+RC(-22,-7,0,0,'none')};
ph.vm=(c,o)=>meter(c,o,o?Math.abs(o.v):0,'V');
ph.am=(c,o)=>meter(c,o,o?Math.abs(o.i):0,'A');
ph.finj=c=>{const t=String(c.p.type||''),tag=/^Short/.test(t)?'SHORT':/^Open/.test(t)?'OPEN':'LEAK';return RC(-20,-18,40,36,'#2d343b',3,'#000')+RC(-20,-18,40,9,PK.yl,3,'#000',.8)+Array.from({length:6},(_,i)=>PA(`M${-18+i*6} -9L${-12+i*6} -18`,'none','#111',2.4)).join('')+TX(0,-0.5,'FAULT',8.5,'#ff8a8a',800)+TX(0,10,tag,6.4,'#e8ecef',700)+TX(0,15.8,'INJECTOR',3.8,'#9fb0bf',600)};
ph.term=c=>RC(-20,-14,40,28,'#c9ced3',3,'#7f8a94')+[-9,9].map(x=>CI(x,0,6.4,'#e0e4e7','#6f7983',1)+PA(`M${x-3.6} 0h7.2`,'none','#59626b',1.2)).join('')+PA('M-9 -10H9','none',PK.cu,2.2,'opacity:.8')+RC(-22,-3,4,6,PK.dk,0)+RC(18,-3,4,6,PK.dk,0);
ph.tpe=c=>RC(-20,-14,40,14,PK.gn,3,'#16623a')+RC(-20,0,40,14,PK.yl,3,'#8a6d00')+[-9,9].map(x=>CI(x,0,6.4,'#e0e4e7','#6f7983',1)+PA(`M${x-3.6} 0h7.2`,'none','#59626b',1.2)).join('')+TX(0,-4.4,'PE',5.6,'#fff',800)+RC(-22,-3,4,6,PK.dk,0)+RC(18,-3,4,6,PK.dk,0);

/* ================= hook every look into the Appearance switch ================= */
const PHBB=(d,c,ob)=>{if(typeof ob==='function')return ob(c);if(ob)return ob;const ts=dd(c).t.filter(q=>!hidT(q)),xs=[-22,22,...ts.map(q=>q[0])],ys=[-22,22,...ts.map(q=>q[1])],x0=Math.min(...xs)-6,y0=Math.min(...ys)-6;return[x0,y0,Math.max(...xs)+6-x0,Math.max(...ys)+6-y0]};
Object.keys(ph).forEach(t=>{const d=D[t];if(!d||!d.g)return;const og=d.g,ob=d.bb,opv=d.pv,B=PHB[t];
 d.p=d.p||{};d.p.vw=[VW[1],'','Appearance',VW];
 d.g=(c,o,cl)=>phOn(c)?ph[t](c,o,cl):og(c,o,cl);
 d.bb=c=>{const b=PHBB(d,c,ob);if(!phOn(c)||!B)return b;const x1=Math.min(b[0],B[0]-6),y1=Math.min(b[1],B[1]-6),x2=Math.max(b[0]+b[2],B[2]+6),y2=Math.max(b[1]+b[3],B[3]+6);return[x1,y1,x2-x1,y2-y1]};
 if(opv)d.pv=c=>({...opv(c),vw:d.p.vw})});
globalThis.PHYS=ph;   /* for tests / adding parts from the console */
})();
