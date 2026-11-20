/* ElectroSim v8.73 – Realism (Simulation tab → "Realism" group). Loaded after polish.js, before simopt.js.
   1. REAL RELAY TIMING  – a relay / contactor no longer switches in the same instant as its coil. The coil state (s.kce) is separate from the
      armature and contacts (s.en): pull-in and drop-out take about 10–30 ms (one simulation step = 20 ms), with an optional "slow ×3 / ×10" to see it.
      A coil pulse shorter than the pull-in time never closes the contacts. CONTACT BOUNCE: after the armature arrives the contacts chatter
      (closed-open-closed…); the bounce is exaggerated to whole simulation steps so you can see it, and the sound clicks with it.
      The solver reads window.RT_MECH(c) (solver.js) to know which parts use the separate coil state.
   2. ARC ON OPENING     – a contact (switch, button, relay / contactor contact, breaker, fuse) that opens while carrying about 0.4 A or more flashes
      and crackles; the flash length, brightness and the number of sparks follow the current (sound.js: sndArc).
   3. FAULT REPLAY       – the last 3 s of the run are recorded. When a fuse blows or a breaker / overload trips a banner appears; "Replay" pauses the
      run and lets you step back frame by frame (20 ms each), seeing the currents, the part states and which parts and wires went over their limit first.
   Choices are remembered (localStorage "electrosim.realism"). */
'use strict';
(function(){
 const svg=document.getElementById('svg');if(!svg||typeof RIB==='undefined'||typeof compSVG!=='function')return;
 const KEY='electrosim.realism',DEF={rt:0,rx:'1',bn:1,arc:1,rec:1,pz:0};
 let O=Object.assign({},DEF);try{Object.assign(O,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){}
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(O))}catch(e){}};
 /* pull-in / drop-out time in ms per part type */
 const MECH={rel:[15,10],rl2:[15,10],mpr:[20,15],con:[25,20],coil:[25,20],con3:[30,25]};
 const RXM={'1':1,'3':3,'10':10},RXN={'1':'Real speed','3':'3× slower','10':'10× slower'};
 window.RT_OPT=O;
 window.RT_MECH=c=>!!O.rt&&!!MECH[c.type];
 const TK=DT*1000,ticks=(ms)=>Math.max(1,Math.round(ms*RXM[O.rx]/TK));
 const prim=s=>{const r={};for(const k in s){const v=s[k];if(v===null||typeof v!=='object')r[k]=v}return r};

 /* ================= 1. relay timing + bounce ================= */
 function mech(c){
  const s=c.s,tg=!!s.kce,m=MECH[c.type];
  if(s.kmb>0){                                   /* contacts chattering after the armature arrived */
   if(tg!==!!s.kma)s.kmb=0;
   else{s.en=s.en?0:1;s.kmb--;if(!s.kmb)s.en=s.kma?1:0;return}}
  if(!!s.en===tg){s.kmv=0;s.kmt=0;return}        /* settled (a pulse shorter than the pull-in time ends here: nothing moved) */
  if(!s.kmv){s.kmv=1;s.kmt=0}
  s.kmt++;
  if(s.kmt>=ticks(tg?m[0]:m[1])){
   s.en=tg?1:0;s.kmv=0;s.kmt=0;
   if(O.bn){s.kma=tg?1:0;s.kmb=tg?(Math.random()<.5?2:4):2}}}
 function setMode(on){                           /* switching the option on / off while running keeps the contacts as they are */
  S.comps.forEach(c=>{if(!MECH[c.type])return;const s=c.s;
   if(on)s.kce=s.en?1:0;else if(s.kce!=null)s.en=s.kce?1:0;
   s.kmv=s.kmt=s.kmb=0})}
 const stt0=stt;
 stt=function(c){
  if(O.rt&&MECH[c.type]&&S.run){const s=c.s;if(s.kmb>0)return'CONTACT BOUNCE';if(s.kmv)return s.kce?'PULLING IN…':'DROPPING OUT…'}
  return stt0(c)};

 /* ================= 2. arc on opening ================= */
 const ARC=new Map(),CS=new Map(),ARC_I=.4;
 function arcs(){
  S.comps.forEach(c=>{const d=D[c.type];if(!d||typeof d.cl!=='function')return;
   let cl;try{cl=!!d.cl(c)}catch(e){return}
   const I=c.o?Math.abs(d.xr?c.io||0:c.o.i||0):0,p=CS.get(c.id);
   if(O.arc&&p&&p.cl&&!cl&&p.I>=ARC_I){
    ARC.set(c.id,{t:performance.now(),I:p.I,life:220+Math.min(1,Math.log10(1+p.I)/1.6)*380});
    if(window.sndArc)window.sndArc(p.I,c)}
   CS.set(c.id,{cl,I:cl?Math.max(I,p&&p.cl?p.I*.5:0):0})})}
 const base=compSVG;
 compSVG=function(c,live,sel){
  let h=base(c,live,sel);
  if(!live||!S.run||!O.arc)return h;
  const a=ARC.get(c.id);if(!a)return h;
  const age=performance.now()-a.t;if(age>a.life){ARC.delete(c.id);return h}
  let d,bb;try{d=dd(c);bb=bbox(d,c)}catch(e){return h}
  const u=Math.min(1,Math.log10(1+a.I)/1.6),f=1-age/a.life,L=7+u*22,K=csc(c),cx=bb[0]+bb[2]/2,cy=bb[1]+bb[3]/2,j=()=>Math.random()-.5,
   hot=u>.55,core='#ffffff',edge=hot?'#ffb54a':'#8ab4ff',glow=hot?'255,190,90':'150,190,255';
  let g=`<circle cx=${cx.toFixed(1)} cy=${cy.toFixed(1)} r=${(L*.95).toFixed(1)} fill="rgba(${glow},${(.38*f).toFixed(2)})" />`;
  const nb=1+Math.round(u*2);
  for(let b=0;b<nb;b++){let pts='';const n=7,tilt=(b?(b%2?1:-1)*.35:0)+j()*.3;
   for(let i=0;i<=n;i++){const t=i/n-.5,jy=(i===0||i===n)?0:j()*(6+u*10);
    pts+=`${(cx+t*2*L*Math.cos(tilt)-jy*Math.sin(tilt)).toFixed(1)},${(cy+t*2*L*Math.sin(tilt)+jy*Math.cos(tilt)).toFixed(1)} `}
   g+=`<polyline points="${pts}" fill=none stroke="${edge}" stroke-width=${(2.4+u*3).toFixed(1)} stroke-linejoin=round stroke-opacity=${(.75*f).toFixed(2)} style="filter:drop-shadow(0 0 ${(2+u*5).toFixed(1)}px ${edge})" />`+
      `<polyline points="${pts}" fill=none stroke="${core}" stroke-width=${(.9+u*1.2).toFixed(1)} stroke-linejoin=round stroke-opacity=${f.toFixed(2)} />`}
  const np=3+Math.round(u*9),sec=age/1000;
  for(let i=0;i<np;i++){const ang=i*2*Math.PI/np+(c.id%5)*.7,r0=L*.3+sec*70*(.6+((i*37)%5)/6),r1=r0+4+u*5;
   g+=`<line x1=${(cx+Math.cos(ang)*r0).toFixed(1)} y1=${(cy+Math.sin(ang)*r0).toFixed(1)} x2=${(cx+Math.cos(ang)*r1).toFixed(1)} y2=${(cy+Math.sin(ang)*r1).toFixed(1)} stroke="#ffd54a" stroke-width=1.6 stroke-linecap=round stroke-opacity=${Math.max(0,f*1.1).toFixed(2)} />`}
  const arc=`<g transform="${d.us?'':`scale(${K}) `}rotate(${c.rot*90})" pointer-events="none">${g}</g>`;
  return h.endsWith('</g>')?h.slice(0,-4)+arc+'</g>':h};

 /* ================= 3. fault replay ================= */
 const RN=150,RING=[],FS=new Map(),EV=[];let RP=null,skip=0;
 function record(){
  if(S.comps.length>300&&(skip^=1))return;       /* big drawings: every second step */
  const cs=S.comps;
  RING.push({t:S.time,tk:S.tk,cs,o:cs.map(c=>c.o),s:cs.map(c=>prim(c.s))});
  if(RING.length>RN)RING.shift()}
 function ratio(c,o){
  if(!o)return 0;const t=c.type,p=c.p,d=D[t];
  if(t==='fus'||t==='fut'||TRIP.includes(t))return p.I>0?Math.abs(o.i)/p.I:0;
  if(t==='res')return p.P>0?Math.max(0,o.p)/p.P:0;
  if(['lamp','mot','htr','buz','sol','pl'].includes(t))return p.P>0&&p.V>0?Math.abs(o.i)/(p.P/p.V):0;
  if(d&&d.src&&p.Imax>0)return Math.abs(o.i)/p.Imax;
  return 0}
 const tn=k=>{const c=by(cid(k)),i=+String(k).split('.')[1];let t;try{t=dd(c).t[i]}catch(e){}return(c?c.label:'?')+'.'+(t&&t[2]!=null?t[2]:i)};
 function analyse(c,kind,fr,fi){
  const last=fr.length-1,Ith=+c.p.I||0,ci=fr[last].cs.indexOf(c);
  const dev=fr.map(f=>{const o=ci>=0?f.o[ci]:null;return{i:o?Math.abs(o.i):0,r:ratio(c,o)}});
  const parts=[];
  fr[last].cs.forEach((q,j)=>{let first=-1,peak=0;fr.forEach((f,i)=>{const r=ratio(q,f.o[j]);if(r>peak)peak=r;if(first<0&&r>1.05)first=i});
   if(first>=0)parts.push({c:q,first,peak})});
  parts.sort((a,b)=>a.first-b.first||b.peak-a.peak);
  const wires=[];
  if(Ith>0)S.wires.forEach(w=>{let first=-1,peak=0;fr.forEach((f,i)=>{const k=f.tk&&f.tk[w.a],v=k?k.f:0;if(v>peak)peak=v;if(first<0&&v>Ith)first=i});
   if(first>=0)wires.push({w,first,peak})});
  wires.sort((a,b)=>a.first-b.first||b.peak-a.peak);
  return{c,cid:c.id,label:c.label,type:D[c.type].n,kind,t:S.time,frames:fr,fi,Ith,dev,parts,wires,at:Date.now()}}
 /* The solver opens a blown fuse / tripped breaker inside the same step that found the overload, so no recorded step shows the overload itself.
   preFrame() solves once more with that device held closed (rating raised, every protection flag put back afterwards) to get the instant before. */
 function preFrame(c){
  const flags=S.comps.map(q=>[q.s.blown,q.s.tripped]),pI=c.p.I,s=c.s;
  let fr=null;
  try{s.blown=0;s.tripped=0;c.p.I=1e9;step();
   const cs=S.comps;fr={t:S.time-.005,tk:S.tk,cs,o:cs.map(q=>q.o),s:cs.map(q=>prim(q.s))}}catch(e){fr=null}
  c.p.I=pI;S.comps.forEach((q,i)=>{q.s.blown=flags[i][0];q.s.tripped=flags[i][1]});
  try{step()}catch(e){}
  return fr}
 function fireArc(c,I){
  if(!O.arc||!(I>=ARC_I))return;
  ARC.set(c.id,{t:performance.now(),I,life:220+Math.min(1,Math.log10(1+I)/1.6)*380});
  if(window.sndArc)window.sndArc(I,c)}
 function fault(c,kind){
  if(!O.rec||RING.length<2)return;
  const post=RING[RING.length-1],pre=preFrame(c);
  const fr=RING.slice(0,-1).concat(pre?[pre]:[],[post]),fi=pre?fr.length-2:fr.length-1;
  if(pre){const ci=pre.cs.indexOf(c),o=ci>=0?pre.o[ci]:null;if(o)fireArc(c,Math.abs(o.i))}
  const ev=analyse(c,kind,fr,fi);EV.unshift(ev);if(EV.length>5)EV.pop();
  banner(ev);paintBtn();
  if(O.pz&&S.run&&!S.pause)setRun(1,1)}
 function faults(){
  S.comps.forEach(c=>{const s=c.s,t=c.type,bl=!!s.blown&&(t==='fus'||t==='fut'),tr=!!s.tripped&&TRIP.includes(t);let p=FS.get(c.id);
   if(!p){FS.set(c.id,{bl,tr});return}
   if(bl&&!p.bl)fault(c,'blown');else if(tr&&!p.tr)fault(c,'tripped');
   p.bl=bl;p.tr=tr})}

 /* ---- panel + banner ---- */
 const st=document.createElement('style');
 st.textContent=`#rtBan,#rtRep{position:absolute;z-index:7;font:12px Arial,sans-serif;color:#17283a;background:rgba(255,255,255,.97);border:1px solid #cdd7e1;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.22)}
#rtBan{left:50%;top:10px;transform:translateX(-50%);padding:7px 10px;display:none;align-items:center;gap:8px;border-color:#e03a3a;max-width:94%}
#rtRep{left:10px;right:10px;bottom:10px;padding:8px 10px;display:none;max-width:760px;margin:0 auto;max-height:60%;overflow:auto}
#rtRep select{width:auto;min-height:26px}#rtRep input[type=range]{width:auto;min-height:0;padding:0}
#rtBan button,#rtRep button{min-height:26px;padding:2px 9px;border:1px solid #b9c6d3;background:#f3f7fb;border-radius:5px;cursor:pointer;font:inherit;color:inherit}
#rtBan button.p{background:#e03a3a;border-color:#e03a3a;color:#fff}
#rtRep .h{display:flex;align-items:center;gap:8px;margin-bottom:4px}#rtRep .h b{font-size:13px}#rtRep .h span{flex:1;color:#52667a}
#rtRep canvas{width:100%;height:54px;display:block;background:#f6f9fc;border:1px solid #dbe3eb;border-radius:4px}
#rtRep .c{display:flex;align-items:center;gap:5px;margin:5px 0}#rtRep .c input[type=range]{flex:1;min-width:60px}
#rtRep .i{line-height:1.45}#rtRep .i b.e{color:#d32f2f}#rtRep .i ol{margin:3px 0 0;padding-left:18px}#rtRep .i li.on{color:#d32f2f;font-weight:700}#rtRep .i li{color:#52667a}
@media (max-width:640px){#rtRep{left:4px;right:4px;bottom:4px}}`;
 document.head.appendChild(st);
 const cvEl=document.getElementById('cv')||document.body,esc2=s=>String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
 const ban=document.createElement('div');ban.id='rtBan';cvEl.appendChild(ban);
 const rep=document.createElement('div');rep.id='rtRep';cvEl.appendChild(rep);
 ban.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.x==='open')openRep(EV[0]);else ban.style.display='none'});
 function banner(ev){
  ban.innerHTML=`<span>⚡ <b>${esc2(ev.label)}</b> (${esc2(ev.type)}) ${ev.kind==='blown'?'blew':'tripped'} at t=${ev.t.toFixed(2)} s</span><button class=p data-x=open type=button>⏪ Replay</button><button data-x=x type=button title="Hide">✕</button>`;
  ban.style.display='flex'}
 const fmsx=(i,ev)=>{const d=Math.round((ev.frames[i].t-ev.frames[ev.fi].t)*1000);return d===0?'fault':(d>0?'+':'−')+Math.abs(d)+' ms'};
 function openRep(ev){
  if(!ev)return;
  if(!S.run){toast('Run the simulation first – the replay needs the run to be open');return}
  if(RP)closeRep(true);
  RP={ev,i:ev.fi,play:0,sp:.5,wasP:!!S.pause,liveI:{tk:S.tk,cs:S.comps.slice(),o:S.comps.map(c=>c.o),s:S.comps.map(c=>prim(c.s))},acc:0};
  setRun(1,1);ban.style.display='none';
  S.flash={id:ev.cid,until:Date.now()+1e10,rt:1};
  rep.style.display='block';
  rep.innerHTML=`<div class=h><b>⏪ Fault replay</b><span>${esc2(ev.label)} ${ev.kind==='blown'?'blew':'tripped'} at t=${ev.t.toFixed(2)} s · ${ev.frames.length} frames × 20 ms</span><button data-x=close type=button>Close ✕</button></div>
<canvas id=rtC></canvas>
<div class=c><button data-x=start type=button title="First frame">⏮</button><button data-x=back type=button title="One frame back">◀</button><button data-x=play type=button title="Play">▶</button><button data-x=fwd type=button title="One frame forward">▶|</button><button data-x=fault type=button title="The moment of the fault">⚡</button><button data-x=end type=button title="Last frame (after the fault)">⏭</button>
<input type=range id=rtR min=0 max=${ev.frames.length-1} value=${RP.i} aria-label="Frame"><select id=rtS title="Playback speed"><option value=".25">¼×</option><option value=".5" selected>½×</option><option value="1">1×</option></select></div>
<div class=i id=rtI></div>`;
  applyFrame(RP.i)}
 function applyFrame(i){
  if(!RP)return;const ev=RP.ev,n=ev.frames.length-1;i=Math.max(0,Math.min(n,i));RP.i=i;
  const f=ev.frames[i];S.tk=f.tk;
  f.cs.forEach((c,j)=>{c.o=f.o[j];Object.assign(c.s,f.s[j])});
  S.dirty=1;try{tbl()}catch(e){}
  const r=document.getElementById('rtR');if(r&&+r.value!==i)r.value=i;
  const d=ev.dev[i],over=ev.parts.filter(p=>p.first<=i).length;
  let nw=0;if(ev.Ith>0)S.wires.forEach(w=>{const k=S.tk&&S.tk[w.a];if(k&&k.f>ev.Ith)nw++});
  const top=ev.parts.slice(0,4).map(p=>`<li class="${p.first<=i?'on':''}">${esc2(p.c.label)} (${esc2(D[p.c.type].n)}) – over its limit from ${fmsx(p.first,ev)}, peak ${(p.peak*100).toFixed(0)} %</li>`).join(''),
   tw=ev.wires.slice(0,4).map(q=>`<li class="${q.first<=i?'on':''}">wire ${esc2(tn(q.w.a))} ↔ ${esc2(tn(q.w.b))} – above ${ev.Ith} A from ${fmsx(q.first,ev)}, peak ${q.peak.toFixed(1)} A</li>`).join('');
  document.getElementById('rtI').innerHTML=
   `<div><b>${fmsx(i,ev)}</b> · ${esc2(ev.label)} carries <b class="${d.r>1?'e':''}">${d.i.toFixed(d.i<10?2:1)} A</b>${ev.Ith?` (limit ${ev.Ith} A → ${(d.r*100).toFixed(0)} %)`:''} · ${over} part${over===1?'':'s'} over limit · ${nw} wire${nw===1?'':'s'} above ${ev.Ith||'–'} A</div>`+
   (top?`<div style="margin-top:3px"><b>Parts over their limit, first to last</b><ol>${top}</ol></div>`:'')+
   (tw?`<div style="margin-top:3px"><b>Wires that carried more than ${ev.Ith} A, first to last</b><ol>${tw}</ol>${ev.wires.length>4?`<span style="color:#52667a">+ ${ev.wires.length-4} more in the same path</span>`:''}</div>`:'');
  drawPlot()}
 function drawPlot(){
  const cv=document.getElementById('rtC');if(!cv||!RP)return;const ev=RP.ev,dpr=window.devicePixelRatio||1,w=cv.clientWidth,h=cv.clientHeight;
  if(!w)return;if(cv.width!==w*dpr){cv.width=w*dpr;cv.height=h*dpr}
  const x=cv.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,w,h);
  const n=ev.dev.length,mx=Math.max(2,...ev.dev.map(q=>q.r))*1.05,X=i=>6+(w-12)*i/Math.max(1,n-1),Y=r=>h-4-(h-10)*Math.min(1,r/mx);
  x.strokeStyle='#e03a3a';x.setLineDash([4,3]);x.beginPath();x.moveTo(0,Y(1));x.lineTo(w,Y(1));x.stroke();x.setLineDash([]);
  x.fillStyle='rgba(224,58,58,.18)';x.beginPath();x.moveTo(X(0),Y(0));ev.dev.forEach((q,i)=>x.lineTo(X(i),Y(q.r)));x.lineTo(X(n-1),Y(0));x.closePath();x.fill();
  x.strokeStyle='#1565c0';x.lineWidth=1.8;x.beginPath();ev.dev.forEach((q,i)=>{i?x.lineTo(X(i),Y(q.r)):x.moveTo(X(i),Y(q.r))});x.stroke();
  x.fillStyle='#52667a';x.font='10px Arial';x.fillText('current of '+ev.label+' ÷ its limit (dashed = 100 %)',8,11);
  x.strokeStyle='#e03a3a';x.lineWidth=1;x.beginPath();x.moveTo(X(ev.fi),0);x.lineTo(X(ev.fi),h);x.stroke();
  x.strokeStyle='#17283a';x.lineWidth=1.4;x.beginPath();x.moveTo(X(RP.i),0);x.lineTo(X(RP.i),h);x.stroke()}
 function closeRep(restore){
  if(!RP)return;const L=RP.liveI,wasP=RP.wasP;
  if(restore){S.tk=L.tk;L.cs.forEach((c,j)=>{c.o=L.o[j];Object.assign(c.s,L.s[j])})}
  if(S.flash&&S.flash.rt)S.flash=null;
  RP=null;rep.style.display='none';rep.innerHTML='';S.dirty=1;
  if(restore&&S.run&&!wasP&&S.pause)setRun(1,0);
  try{tbl()}catch(e){}}
 rep.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!RP)return;const x=b.dataset.x;
  if(x==='close'){closeRep(true);return}
  RP.play=x==='play'?!RP.play:0;
  if(x==='start')applyFrame(0);else if(x==='fault')applyFrame(RP.ev.fi);else if(x==='end')applyFrame(RP.ev.frames.length-1);
  else if(x==='back')applyFrame(RP.i-1);else if(x==='fwd')applyFrame(RP.i+1);
  else if(x==='play'&&RP.play&&RP.i>=RP.ev.frames.length-1)applyFrame(0);
  const p=rep.querySelector('[data-x=play]');if(p)p.textContent=RP.play?'⏸':'▶'});
 rep.addEventListener('input',e=>{if(!RP)return;if(e.target.id==='rtR'){RP.play=0;applyFrame(+e.target.value);const p=rep.querySelector('[data-x=play]');if(p)p.textContent='▶'}else if(e.target.id==='rtS')RP.sp=+e.target.value});
 addEventListener('resize',()=>drawPlot());

 /* wires during the replay: red = above the limit of the device that blew, orange = more than 60 % of it */
 function replayWires(){
  if(!RP||!S.run)return;const Ith=RP.ev.Ith;if(!(Ith>0))return;
  svg.querySelectorAll('path.hit[data-w]').forEach(hit=>{
   let a=hit.previousElementSibling,w=a;if(a&&a.classList.contains('fl'))w=a.previousElementSibling;
   if(!w||!w.classList.contains('wire')||w.classList.contains('sel')||w.classList.contains('air'))return;
   const wr=S.wires.find(x=>x.id==hit.dataset.w),k=wr&&S.tk&&S.tk[wr.a],f=k?k.f:0;
   if(f>Ith){w.style.stroke='#e53935';w.style.strokeWidth='4.5';w.style.filter='drop-shadow(0 0 4px rgba(229,57,53,.8))'}
   else if(f>.6*Ith){w.style.stroke='#fb8c00';w.style.strokeWidth='3.2'}})}

 /* ================= tick hook + loop ================= */
 const tick1=tick;
 tick=function(){
  tick1.apply(this,arguments);
  try{
   if(O.rt)S.comps.forEach(c=>{if(MECH[c.type])mech(c)});
   arcs();record();faults()}catch(e){}};
 let wasRun=false,last=performance.now();
 function loop(now){
  try{
   if(!S.run){if(wasRun){wasRun=false;RING.length=0;FS.clear();CS.clear();ARC.clear();EV.length=0;ban.style.display='none';closeRep(false);paintBtn()}}
   else{wasRun=true;
    if(RP&&!S.pause)closeRep(true);              /* ▶ Run pressed during the replay: back to the live state and carry on */
    if(RP&&RP.play){RP.acc+=(now-last)/TK*RP.sp;const n=Math.floor(RP.acc);if(n>0){RP.acc-=n;if(RP.i+n>=RP.ev.frames.length-1){RP.play=0;const p=rep.querySelector('[data-x=play]');if(p)p.textContent='▶';applyFrame(RP.ev.frames.length-1)}else applyFrame(RP.i+n)}}
    replayWires()}
  }catch(e){}
  last=now;requestAnimationFrame(loop)}
 setTimeout(()=>requestAnimationFrame(loop),0);   /* registered after simopt.js so the replay colours win */

 /* ================= ribbon group ================= */
 const col=h=>`<div class=rsel>${h}</div>`,
  chk=(l,k,tip)=>`<label title="${tip}"><input type=checkbox data-rt="${k}" ${O[k]?'checked':''}> ${l}</label>`;
 function paintBtn(){const b=document.querySelector('#rbody [data-rt=replay]');if(b){b.disabled=!EV.length;b.title=EV.length?`Replay the last fault: ${EV[0].label} ${EV[0].kind==='blown'?'blew':'tripped'}`:'Nothing to replay yet – it is recorded when a fuse blows or a breaker trips'}}
 function build(){
  const body=document.getElementById('rbody');if(!body||!body.querySelector('[data-cmd=sim_std]')||body.querySelector('[data-rt=g]'))return;
  const d=document.createElement('div');d.className='rp';d.dataset.rt='g';
  const g1=col(chk('Real relay timing','rt','Relays and contactors pull in and drop out in 10–30 ms instead of instantly')+
    `<label>Delay<select data-rt=rx title="Slow the delay down so you can see it">${Object.keys(RXN).map(k=>`<option value="${k}" ${O.rx===k?'selected':''}>${RXN[k]}</option>`).join('')}</select></label>`),
   g2=col(chk('Contact bounce','bn','Contacts chatter closed-open-closed when the relay arrives (needs real relay timing; exaggerated so you can see it)')+
    chk('Arc on opening','arc','Flash and crackle when a contact opens carrying current (size follows the current)')),
   g3=col(chk('Record faults','rec','Keep the last 3 s so a fuse blow or breaker trip can be replayed')+
    chk('Pause on fault','pz','Pause the run when a fuse blows or a breaker trips')+
    '<label><button type=button data-rt=replay style="min-height:24px;padding:2px 10px">⏪ Fault replay</button></label>');
  d.innerHTML='<div class=ri>'+g1+g2+g3+'</div><div class=rn>Realism</div>';
  body.appendChild(d);paintBtn()}
 const rib0=ribbon;ribbon=function(){rib0.apply(this,arguments);if(ribTab==='Simulation')build()};
 const rb=document.getElementById('rbody');
 rb.addEventListener('change',e=>{const t=e.target.closest&&e.target.closest('[data-rt]');if(!t||t.dataset.rt==='g'||t.tagName==='BUTTON')return;
  const k=t.dataset.rt;O[k]=t.type==='checkbox'?(t.checked?1:0):t.value;save();
  if(k==='rt'){setMode(!!O.rt);toast(O.rt?'Real relay timing ON':'Real relay timing OFF')}
  if(k==='rx')toast('Relay delay: '+RXN[O.rx])});
 rb.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('button[data-rt=replay]');if(!b)return;
  if(!EV.length){toast('Nothing to replay yet – a fuse must blow or a breaker trip first');return}openRep(EV[0])});
 if(ribTab==='Simulation')ribbon();
})();
