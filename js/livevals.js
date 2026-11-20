/* ElectroSim v8.74 – Live values on the sheet + hover tooltip (Simulation tab → "Live values"). Loaded last, no existing part changed.
   LIVE VALUES  A toggle that writes volts / amps (optionally watts) beside every part and wire while the simulation runs.
                Show on: parts · wires · both. Values: V and A · V · A · V, A and W. "Hide idle" leaves out things at 0 V / 0 A.
                Labels are drawn in their own layer (#gLV, above the sheet, never in the PDF) and placed so they do not sit on top of each other.
                A wire value belongs to the whole connection (net): the solver treats wires as ideal, so every wire of one net has the same voltage,
                and the current shown is the largest current of any part on that net.
   TOOLTIP      While running (or paused) hover a part, a terminal or a wire to see voltage, current, power and state. Touch: tap it.
   Both are remembered (localStorage "electrosim.livevals"). Type LIVE or TIP on the sheet to switch them. */
'use strict';
(function(){
 const svg=document.getElementById('svg'),cv=document.getElementById('cv');
 if(!svg||!cv||typeof S==='undefined'||typeof RIB==='undefined'||typeof compSVG!=='function')return;
 const KEY='electrosim.livevals',NS='http://www.w3.org/2000/svg';
 const ON={parts:'Parts',wires:'Wires',both:'Parts and wires'},SHOW={va:'Volts and amps',v:'Volts only',a:'Amps only',vaw:'Volts, amps and watts'};
 const DEF={vals:0,on:'both',show:'va',idle:1,tip:1};
 let O=Object.assign({},DEF);try{Object.assign(O,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){}
 if(!ON[O.on])O.on=DEF.on;if(!SHOW[O.show])O.show=DEF.show;
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(O))}catch(e){}};
 window.LV_OPT=O;

 /* ---------- number format: 12.0 V · 450 mA · 1.20 kW ---------- */
 function fu(x,u){
  if(x==null||!isFinite(x))return'–';const a=Math.abs(x);if(a<1e-6)return'0 '+u;
  const p=(v,s)=>{const b=Math.abs(v);return(b>=100?v.toFixed(0):b>=10?v.toFixed(1):v.toFixed(2))+' '+s};
  if(a>=1e3)return p(x/1e3,'k'+u);if(a>=1)return p(x,u);if(a>=1e-3)return p(x*1e3,'m'+u);return p(x*1e6,'µ'+u)}
 window.lvFmt=fu;
 const num=x=>typeof x==='number'&&isFinite(x)?x:0;
 const partVals=c=>{const o=c.o;return o?{v:num(o.v),i:Math.abs(num(o.i)),p:Math.abs(num(o.p))}:null};
 const netVals=k=>{const t=S.tk&&S.tk[k];return t?{v:num(t.v),i:Math.abs(num(t.f)),p:Math.abs(num(t.v)*num(t.f))}:null};
 const idle=v=>Math.abs(v.v)<.05&&v.i<1e-4;

 /* ---------- geometry ---------- */
 const ROT=[[1,0],[0,1],[-1,0],[0,-1]];
 function partBox(c){   /* bounding box of a part on the sheet, rotation and size included */
  const d=dd(c),bb=bbox(d,c),K=d.us?1:csc(c),[a,b]=ROT[c.rot%4];
  const P=[[bb[0],bb[1]],[bb[0]+bb[2],bb[1]],[bb[0],bb[1]+bb[3]],[bb[0]+bb[2],bb[1]+bb[3]]].map(([x,y])=>[c.x+K*(x*a-y*b),c.y+K*(x*b+y*a)]);
  const xs=P.map(q=>q[0]),ys=P.map(q=>q[1]);return{x0:Math.min(...xs),x1:Math.max(...xs),y0:Math.min(...ys),y1:Math.max(...ys)}}
 const GEO=new Map();
 function wireGeo(w,a,b){   /* longest straight stretch of the wire */
  const na=tnorm(a,+String(w.a).split('.')[1]),nb=tnorm(b,+String(w.b).split('.')[1]),
   d=w.v&&w.v.length?viaPath(tp(w.a),tp(w.b),na,nb,w.v):route(tp(w.a),tp(w.b),na,nb);
  let g=GEO.get(d);if(g)return g;
  const n=(d.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number),P=[];for(let i=0;i+1<n.length;i+=2)P.push([n[i],n[i+1]]);
  let best=null,len=0;for(let i=1;i<P.length;i++){const l=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);len+=l;if(!best||l>best.l)best={l,a:P[i-1],b:P[i]}}
  g=best?{len,seg:best}:null;if(GEO.size>600)GEO.clear();GEO.set(d,g);return g}

 /* ---------- live values layer ---------- */
 let gLV=document.getElementById('gLV');
 if(!gLV){gLV=document.createElementNS(NS,'g');gLV.id='gLV';gLV.setAttribute('pointer-events','none');svg.appendChild(gLV)}
 let lastT=0,lastHTML='';
 const lines=(v,showMode)=>{const L=[];if(showMode!=='a')L.push(fu(v.v,'V'));if(showMode!=='v')L.push(fu(v.i,'A'));if(showMode==='vaw')L.push(fu(v.p,'W'));return L};
 function drawLive(now){
  if(!(O.vals&&S.run)){if(lastHTML){gLV.innerHTML='';lastHTML=''}return}
  const big=S.comps.length+S.wires.length>260;if(now-lastT<(big?170:80))return;lastT=now;
  const z=S.z||1,fs=Math.max(7,Math.min(15,10/z)),lh=fs*1.13,halo=(fs*.32).toFixed(2),placed=[],out=[];let n=0;
  const hit=r=>placed.some(q=>r[0]<q[2]&&r[2]>q[0]&&r[1]<q[3]&&r[3]>q[1]);
  const tw=L=>Math.max(...L.map(s=>s.length))*fs*.6+2;
  const txt=(x,y,an,L,col)=>`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" style="font:700 ${fs.toFixed(1)}px Arial,Helvetica,sans-serif;fill:${col};text-anchor:${an};paint-order:stroke;stroke:#fff;stroke-width:${halo}px;stroke-linejoin:round">`+
   L.map((s,i)=>`<tspan x="${x.toFixed(1)}" dy="${i?lh.toFixed(1):0}">${s}</tspan>`).join('')+'</text>';
  if(O.on!=='wires')for(const c of S.comps){
   if(n>400)break;if(c.pg!==S.pg)continue;const d=D[c.type];if(!d||c.type==='nl'||d.bg)continue;
   const v=partVals(c);if(!v||(O.idle&&idle(v)))continue;const L=lines(v,O.show);if(!L.length)continue;
   let b;try{b=partBox(c)}catch(e){continue}
   const w=tw(L),h=L.length*lh,top=-fs*.85,
    cand=[[b.x1+4,b.y0+fs,'start'],[b.x0-4,b.y0+fs,'end'],[b.x1+4,b.y1-h+fs,'start'],[b.x0-4,b.y1-h+fs,'end']],
    rect=q=>q[2]==='start'?[q[0],q[1]+top,q[0]+w,q[1]+top+h]:[q[0]-w,q[1]+top,q[0],q[1]+top+h];
   const q=cand.find(q=>!hit(rect(q)))||cand[0];placed.push(rect(q));out.push(txt(q[0],q[1],q[2],L,'#0b4f9c'));n++}
  if(O.on!=='parts'){
   const W=[];
   for(const w of S.wires){
    const a=by(cid(w.a)),b=by(cid(w.b));if(!a||!b||a.pg!==S.pg||airK(w.a))continue;
    const v=netVals(w.a);if(!v||(O.idle&&idle(v)))continue;
    let g;try{g=wireGeo(w,a,b)}catch(e){continue}if(g)W.push({g,v})}
   W.sort((p,q)=>q.g.len-p.g.len);
   for(const q of W){
    if(n>400)break;const L=[lines(q.v,O.show).join(' · ')];if(!L[0])continue;
    const s=q.g.seg,hz=Math.abs(s.b[1]-s.a[1])<.5,w=tw(L),h=lh;
    if(s.l<(hz?w*.8:fs*2))continue;
    let done=0;
    for(const t of[.5,.3,.7]){
     const x=s.a[0]+(s.b[0]-s.a[0])*t,y=s.a[1]+(s.b[1]-s.a[1])*t;
     const X=hz?x:x+6,Y=hz?y-4:y+fs*.35,an=hz?'middle':'start',r=hz?[X-w/2,Y-fs*.85,X+w/2,Y-fs*.85+h]:[X,Y-fs*.85,X+w,Y-fs*.85+h];
     if(hit(r))continue;placed.push(r);out.push(txt(X,Y,an,L,'#a85a00'));n++;done=1;break}
    if(!done)continue}
  }
  const html=out.join('');if(html!==lastHTML){lastHTML=html;gLV.innerHTML=html}}

 /* ---------- hover tooltip ---------- */
 const tip=document.createElement('div');tip.id='lvTip';tip.setAttribute('role','tooltip');document.body.appendChild(tip);
 let px=-1,py=-1,pty='mouse',touchUntil=0,td=null,lastTip='',lastPos='';
 addEventListener('pointermove',e=>{px=e.clientX;py=e.clientY;pty=e.pointerType||'mouse'},true);
 addEventListener('pointerdown',e=>{px=e.clientX;py=e.clientY;pty=e.pointerType||'mouse';td=e.pointerType==='mouse'?null:{x:e.clientX,y:e.clientY};touchUntil=0},true);
 addEventListener('pointerup',e=>{if(e.pointerType==='mouse'||!td)return;
  touchUntil=Math.hypot(e.clientX-td.x,e.clientY-td.y)<10?performance.now()+3500:0;px=e.clientX;py=e.clientY;pty='touch';td=null},true);
 addEventListener('pointercancel',()=>{td=null;touchUntil=0},true);
 cv.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'){px=py=-1}});
 const stCls=s=>/TRIP|BLOWN|FAULT|PHASE LOSS|ALARM|SHORT|DEAD/.test(s)?'er':/PULLING|DROPPING|BOUNCE|TIMING|HOLDING|COASTING|AT VOLTAGE/.test(s)?'wa':/ENERGI|^ON\b|CLOSED|LIT|RUNNING|CONDUCT|OUTPUT|^OK|LIVE|PRESSURI/.test(s)?'ok':'';
 const row=(l,v,c)=>`<tr><td>${l}</td><td${c?` class="${c}"`:''}>${v}</td></tr>`;
 const plain=s=>esc(String(s==null?'':s).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim());
 const tname=(c,i)=>{try{const t=dd(c).t[i];return t&&t[2]?t[2]:'#'+(i+1)}catch(e){return'#'+(i+1)}};
 const head=(a,b)=>`<div class="lvh"><b>${esc(a)}</b>${b?`<span>${esc(b)}</span>`:''}</div>`;
 const vrows=v=>row('Voltage',fu(v.v,'V'))+row('Current',fu(v.i,'A'))+row('Power',fu(v.p,'W'));
 function stateOf(c){try{return String(stt(c)||'')}catch(e){return''}}

 function tipHTML(el){
  const T=el.closest('[data-t]'),C=el.closest('[data-c]'),W=!C&&el.closest('[data-w]');
  if(C){
   const c=by(+C.dataset.c);if(!c||c.pg!==S.pg)return'';const d=D[c.type],st=stateOf(c);
   if(T&&T.dataset.t!=null&&!el.closest('.lbh')){   /* a terminal: its own connection first */
    const i=+T.dataset.t,v=netVals(c.id+'.'+i);
    if(v)return head(`${c.label} · ${tname(c,i)}`,'terminal')+'<table>'+row('Voltage',fu(v.v,'V'))+row('Current',fu(v.i,'A'))+(st?row('Part',esc(st),stCls(st)):'')+'</table><div class="lvn">Same for the whole connection this terminal is on.</div>'}
   let h=head(c.label,d?d.n:'')+'<table>';
   if(d&&d.pn&&c.o){try{h+=`<tr><td colspan=2>${plain(d.pn(c))}</td></tr>`}catch(e){const v=partVals(c);if(v)h+=vrows(v)}}
   else{const v=partVals(c);if(v)h+=vrows(v)}
   if(st)h+=row('State',esc(st),stCls(st));
   return h+'</table>'}
  if(W){
   const w=S.wires.find(x=>x.id==+W.dataset.w);if(!w)return'';const a=by(cid(w.a)),b=by(cid(w.b));if(!a||!b||a.pg!==S.pg)return'';
   const ends=`${a.label} · ${tname(a,+String(w.a).split('.')[1])}  →  ${b.label} · ${tname(b,+String(w.b).split('.')[1])}`;
   if(airK(w.a)){const bar=airBar(w.a);return head('Air line',ends)+'<table>'+row('Pressure',bar.toFixed(2)+' bar')+row('State',bar>.05?'PRESSURISED':'VENTED',bar>.05?'ok':'')+'</table>'}
   const v=netVals(w.a);if(!v)return'';
   const st=v.i>1e-6?'LIVE – carrying current':Math.abs(v.v)>.01?'AT VOLTAGE – no current':'DEAD – 0 V';
   return head('Wire',ends)+'<table>'+row('Voltage',fu(v.v,'V'))+row('Current',fu(v.i,'A'))+row('Power carried',fu(v.p,'W'))+row('State',st,stCls(st))+'</table><div class="lvn">Same for every wire on this connection.</div>'}
  return''}

 function hideTip(){if(tip.classList.contains('show')){tip.classList.remove('show');lastTip='';lastPos=''}}
 function tipLoop(now){
  try{
   const touch=pty==='touch';
   const blocked=!O.tip||!S.run||px<0||(touch&&now>touchUntil)||(typeof drag!=='undefined'&&drag)||(typeof pan!=='undefined'&&pan)||(typeof pinch!=='undefined'&&pinch)||S.wiring||S.tool!=='sel'||document.querySelector('dialog[open]');
   if(blocked){hideTip();return}
   const el=document.elementFromPoint(px,py);
   if(!el||!cv.contains(el)||el.closest('#sbar,#zoom,#rest,#thint')){hideTip();return}
   const h=tipHTML(el);if(!h){hideTip();return}
   if(h!==lastTip){tip.innerHTML=h;lastTip=h}
   const w=tip.offsetWidth,hh=tip.offsetHeight,W=innerWidth,H=innerHeight;
   let x=px+16,y=py+20;if(touch){x=px-w/2;y=py-hh-28}
   if(x+w>W-6)x=px-w-16;if(y+hh>H-6)y=py-hh-16;x=Math.max(6,Math.min(W-w-6,x));y=Math.max(6,y);
   const pos=Math.round(x)+','+Math.round(y);if(pos!==lastPos){lastPos=pos;tip.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px)`}
   tip.classList.add('show')}catch(e){hideTip()}}

 (function loop(t){try{drawLive(t)}catch(e){}tipLoop(t);requestAnimationFrame(loop)})(0);

 /* ---------- Simulation tab: group "Live values" ---------- */
 IC.lv_vals='<path d="M2 17h20"/><rect x=5 y=4 width=14 height=8 rx=2 /><path d="M8 8h8"/>';
 IC.lv_tip='<path d="M4 4h16v11h-9l-4 4v-4H4z"/><path d="M8 8h8M8 11h5"/>';
 RIB.Simulation.splice(3,0,['Live values',[['cmd:lv_vals','Live values','lv_vals'],['cmd:lv_tip','Hover tooltip','lv_tip']]]);
 const opts=(m,cur)=>Object.keys(m).map(k=>`<option value="${k}" ${cur===k?'selected':''}>${m[k]}</option>`).join('');
 function paint(){
  const b=document.querySelector('#rbody [data-cmd=lv_vals]'),t=document.querySelector('#rbody [data-cmd=lv_tip]');
  if(b){b.setAttribute('aria-pressed',String(!!O.vals));b.title='Live values '+(O.vals?'ON':'OFF')+' – volts and amps beside every part and wire while running'}
  if(t){t.setAttribute('aria-pressed',String(!!O.tip));t.title='Hover tooltip '+(O.tip?'ON':'OFF')+' – hover a part or wire while running'}
  paintTop()}
 /* top-bar button (next to the sound button): hover tooltip On / Off */
 const SVGI=p=>'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';
 function mountTop(){
  const stat=document.getElementById('stat');if(!stat||document.getElementById('bTip'))return;
  const b=document.createElement('button');b.className='ic';b.id='bTip';b.type='button';b.innerHTML=SVGI(IC.lv_tip);stat.parentNode.insertBefore(b,stat);
  b.addEventListener('click',e=>{e.stopPropagation();setTip(!O.tip)})}
 function paintTop(){const b=document.getElementById('bTip');if(!b)return;b.setAttribute('aria-pressed',String(!!O.tip));
  b.title='Hover tooltip '+(O.tip?'ON':'OFF')+' – click to switch';b.setAttribute('aria-label','Hover tooltip '+(O.tip?'on':'off'))}
 function build(){
  const b=document.querySelector('#rbody [data-cmd=lv_vals]');if(!b)return;
  const ri=b.closest('.ri');if(!ri||ri.querySelector('[data-lv]'))return;
  ri.insertAdjacentHTML('beforeend',`<div class=rsel><label>Show on<select data-lv=on>${opts(ON,O.on)}</select></label><label>Values<select data-lv=show>${opts(SHOW,O.show)}</select></label></div>`+
   `<div class=rsel><label title="Leave out parts and wires that are at 0 V and 0 A"><input type=checkbox data-lv=idle ${O.idle?'checked':''}> Hide idle (0 V, 0 A)</label></div>`)}
 const rib0=ribbon;ribbon=function(){rib0.apply(this,arguments);if(ribTab==='Simulation'){build();paint()}};
 function setVals(v,quiet){O.vals=v?1:0;save();paint();lastHTML='\u0000';lastT=0;if(!quiet)toast('Live values '+(O.vals?(S.run?'ON':'ON – press Run to see them'):'OFF'))}
 function setTip(v,quiet){O.tip=v?1:0;save();paint();if(!O.tip)hideTip();if(!quiet)toast('Hover tooltip '+(O.tip?(S.run?'ON':'ON – press Run, then hover a part or wire'):'OFF'))}
 window.lvSet=setVals;window.lvTip=setTip;
 const rb=document.getElementById('rbody');
 rb.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-cmd=lv_vals],[data-cmd=lv_tip]');if(!b)return;
  e.stopImmediatePropagation();e.preventDefault();if(b.dataset.cmd==='lv_vals')setVals(!O.vals);else setTip(!O.tip)},true);
 rb.addEventListener('change',e=>{const t=e.target.closest&&e.target.closest('[data-lv]');if(!t)return;
  const k=t.dataset.lv;O[k]=t.type==='checkbox'?(t.checked?1:0):t.value;save();lastHTML='\u0000';lastT=0});
 if(typeof CMDS!=='undefined'){
  CMDS.unshift({n:'Live values on / off',a:['live','values','volts','amps'],h:'volts and amps beside every part and wire while running',f:()=>setVals(!O.vals)});
  CMDS.unshift({n:'Hover tooltip on / off',a:['tip','tooltip','hover'],h:'voltage, current, power and state when you hover a part or wire',f:()=>setTip(!O.tip)})}
 mountTop();paintTop();
 if(ribTab==='Simulation')ribbon();
})();
