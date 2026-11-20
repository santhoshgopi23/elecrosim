/* ElectroSim – multi-select (v8.68)
   Ctrl + click (Cmd or Shift also work) on a part, wire or drawn object adds it to the selection,
   Ctrl + click on a selected one removes it. Click item 1, Ctrl+click item 2, Ctrl+click item 3 …
   Then: drag any selected part = move them all · arrow keys = nudge · Copy · Delete · Rotate · Esc = clear.
   Ctrl+A selects everything on the current page.
   Loaded last: it wraps select / props / del / rotSel / dupSel / compSVG / shapeMarkup / pageMarkup. */
(function(){
const MS=window.MS={a:[],busy:0};
const _select=select,_props=props,_del=del,_rot=rotSel,_dup=dupSel,_comp=compSVG,_shape=shapeMarkup,_page=pageMarkup;
const same=(x,y)=>x.k===y.k&&x.id===y.id;
const inMS=(k,id)=>MS.a.length>1&&MS.a.some(x=>x.k===k&&x.id===id);

/* what is under the pointer? */
function itemOf(t){
 if(!t||!t.closest)return null;
 let n=t.closest('[data-c]');if(n)return{k:'c',id:+n.dataset.c};
 n=t.closest('[data-s]');if(n)return{k:'s',id:+n.dataset.s};
 n=t.closest('[data-w]');if(n)return{k:'w',id:+n.dataset.w};
 return null}
const exists=x=>x.k==='c'?!!by(x.id):x.k==='s'?!!shp(x.id):S.wires.some(w=>w.id===x.id);

/* ---------- selection state ---------- */
function apply(arr){
 arr=arr.filter(exists);MS.busy=1;
 try{
  if(arr.length<2){MS.a=[];_select(arr[0]||null)}
  else{MS.a=arr.slice();_select(null);bar()}
 }finally{MS.busy=0}
 S.dirty=1}
function bar(){
 const sb=$('#sbar');sb.classList.add('show');sb.dataset.k='m';
 const n=$('#msN');if(n)n.textContent=MS.a.length+' selected';
 $$('#ribbon [data-cmd=rot],#ribbon [data-cmd=dup],#ribbon [data-cmd=del]').forEach(b=>b.disabled=false)}
function toggle(it){
 const arr=MS.a.length?MS.a.slice():(S.sel?[{k:S.sel.k,id:S.sel.id}]:[]);
 const i=arr.findIndex(x=>same(x,it));
 if(i>=0)arr.splice(i,1);else arr.push(it);
 apply(arr)}

/* ---------- wrapped app functions ---------- */
select=function(s){if(!MS.busy)MS.a=[];return _select.apply(this,arguments)};

props=function(){
 if(MS.a.length<2)return _props.apply(this,arguments);
 const el=$('#propsBody'),c=MS.a.filter(x=>x.k==='c'),w=MS.a.filter(x=>x.k==='w'),s=MS.a.filter(x=>x.k==='s');
 const names=c.slice(0,14).map(x=>{const p=by(x.id);return p?esc(p.label||D[p.type].n):''}).filter(Boolean);
 el.innerHTML=`<h3>${MS.a.length} items selected</h3>
  <p class=mu style="margin:2px 0 8px">${c.length} part${c.length==1?'':'s'} · ${w.length} wire${w.length==1?'':'s'} · ${s.length} drawn object${s.length==1?'':'s'}</p>
  ${names.length?`<p class=mu style="margin:0 0 8px">${names.join(', ')}${c.length>names.length?' …':''}</p>`:''}
  <div class=lr style="margin:8px 0"><button data-ms=dup>Copy</button><button data-ms=rot>Rotate</button><button data-ms=del class=dn>Delete</button></div>
  <p><button data-ms=clr>Clear selection</button></p>
  <p class=mu><b>Ctrl + click</b> a part, wire or object to add it or remove it. <b>Drag</b> any selected part to move them all together. <b>Arrow keys</b> nudge. <b>Esc</b> clears.</p>`};
$('#propsBody').addEventListener('click',e=>{const b=e.target.closest('[data-ms]');if(!b||MS.a.length<2)return;
 const a=b.dataset.ms;if(a==='clr')select(null);else if(a==='del')del();else if(a==='rot'){rotSel()}else if(a==='dup')dupSel()});

del=function(){
 if(MS.a.length<2)return _del.apply(this,arguments);
 const cs=new Set(MS.a.filter(x=>x.k==='c').map(x=>x.id)),ss=new Set(MS.a.filter(x=>x.k==='s').map(x=>x.id)),ws=new Set(MS.a.filter(x=>x.k==='w').map(x=>x.id));
 S.comps=S.comps.filter(c=>!cs.has(c.id));S.shapes=S.shapes.filter(q=>!ss.has(q.id));
 S.wires=S.wires.filter(w=>!ws.has(w.id)&&!cs.has(cid(w.a))&&!cs.has(cid(w.b)));
 const n=MS.a.length;select(null);toast(n+' items deleted')};

rotSel=function(){
 if(MS.a.length<2)return _rot.apply(this,arguments);
 const keep=S.sel;MS.a.forEach(x=>{if(x.k==='w')return;S.sel={k:x.k,id:x.id};try{_rot()}catch(_){}});S.sel=keep;S.dirty=1};

dupSel=function(){
 if(MS.a.length<2)return _dup.apply(this,arguments);
 const src=MS.a.slice(),map=new Map(),out=[];
 src.forEach(x=>{if(x.k==='w')return;S.sel={k:x.k,id:x.id};_dup();const n=S.sel;if(n){out.push({k:n.k,id:n.id});if(x.k==='c')map.set(x.id,n.id)}});
 /* wires whose two ends are both on copied parts are copied too (same colour, shifted corners) */
 S.wires.slice().forEach(w=>{const a=cid(w.a),b=cid(w.b);if(!map.has(a)||!map.has(b))return;
  const t=q=>map.get(cid(q))+'.'+String(q).split('.')[1],n={...w,id:S.nid++,a:t(w.a),b:t(w.b)};
  if(w.v)n.v=w.v.map(q=>[q[0]+30,q[1]+30]);delete n.wo;S.wires.push(n);out.push({k:'w',id:n.id})});
 apply(out);toast(out.length+' items copied – drag them into place')};

/* in a multi-selection the dashed box is enough – the per-part resize handle is left out */
compSVG=function(c,live,sel){const m=live&&inMS('c',c.id),h=_comp.call(this,c,live,sel||m);return m?h.replace(/<circle class="hnd chs"[^>]*>.*?<\/circle>/,''):h};
shapeMarkup=function(s,live,sel,pi){return _shape.call(this,s,live,sel||(live&&inMS('s',s.id)),pi)};
pageMarkup=function(pg,live){
 let h=_page.apply(this,arguments);
 if(live&&MS.a.length>1)MS.a.forEach(x=>{if(x.k!=='w')return;const w=S.wires.find(q=>q.id===x.id),a=w&&by(cid(w.a)),b=w&&by(cid(w.b));if(!a||!b||a.pg!==pg)return;
  const na=tnorm(a,+String(w.a).split('.')[1]),nb=tnorm(b,+String(w.b).split('.')[1]),d=w.v&&w.v.length?viaPath(tp(w.a),tp(w.b),na,nb,w.v):route(tp(w.a),tp(w.b),na,nb);
  h+=`<path d="${d}" class="wire sel" style="pointer-events:none" />`});
 return h};

/* ---------- pointer: Ctrl+click toggles · press a selected part and drag = move the group ---------- */
let gd=null;
svg.addEventListener('pointerdown',e=>{
 if(e.pointerType==='mouse'&&e.button!==0)return;
 if(S.tool!=='sel'||pend||S.wiring)return;
 const it=itemOf(e.target);
 if(e.ctrlKey||e.metaKey||e.shiftKey){
  if(!it)return;
  e.stopImmediatePropagation();e.preventDefault();toggle(it);return}
 if(MS.a.length<2||!it||!inMS(it.k,it.id)||S.run||ptrs.size)return;
 if(e.target.closest('[data-t],[data-ch],[data-lb],[data-wl],[data-wv],[data-hd]'))return;
 e.stopImmediatePropagation();
 try{svg.setPointerCapture(e.pointerId)}catch(_){}
 const ids=new Set(MS.a.filter(x=>x.k==='c').map(x=>x.id));
 gd={id:e.pointerId,sx:e.clientX,sy:e.clientY,m0:mp(e),moved:0,it,
  c:MS.a.filter(x=>x.k==='c').map(x=>by(x.id)).filter(Boolean).map(c=>({c,x:c.x,y:c.y})),
  s:MS.a.filter(x=>x.k==='s').map(x=>shp(x.id)).filter(Boolean).map(s=>({s,o:{...s}})),
  v:S.wires.filter(w=>w.v&&w.v.length&&ids.has(cid(w.a))&&ids.has(cid(w.b))).map(w=>({w,v:w.v.map(q=>[q[0],q[1]])}))}},true);
svg.addEventListener('contextmenu',e=>{if(e.ctrlKey&&itemOf(e.target))e.preventDefault()});
function gMove(dx,dy,noShapes){
 gd.c.forEach(o=>{o.c.x=o.x+dx;o.c.y=o.y+dy});
 if(!noShapes)gd.s.forEach(o=>moveShape(o.s,o.o,dx,dy,1));
 gd.v.forEach(o=>{o.w.v=o.v.map(q=>[q[0]+dx,q[1]+dy])})}
addEventListener('pointermove',e=>{if(!gd||e.pointerId!==gd.id)return;
 if(!gd.moved&&Math.hypot(e.clientX-gd.sx,e.clientY-gd.sy)>3)gd.moved=1;
 if(!gd.moved)return;const m=mp(e);S.free=1;gMove(m.x-gd.m0.x,m.y-gd.m0.y);S.dirty=1});
function gEnd(e){if(!gd||e.pointerId!==gd.id)return;
 if(!gd.moved){const it=gd.it;gd=null;select(it);return}   /* a plain click on one of them selects just that one */
 const m=mp(e),rx=m.x-gd.m0.x,ry=m.y-gd.m0.y;let dx=snapG(rx),dy=snapG(ry);
 /* keep the group on the sheet: shift everything back by the largest overshoot */
 let fx=0,fy=0;gd.c.forEach(o=>{const t={type:o.c.type,sc:o.c.sc,x:o.x+dx,y:o.y+dy};clampC(t);if(Math.abs(t.x-o.x-dx)>Math.abs(fx))fx=t.x-o.x-dx;if(Math.abs(t.y-o.y-dy)>Math.abs(fy))fy=t.y-o.y-dy});
 gMove(dx+fx,dy+fy,1);
 gd.s.forEach(o=>moveShape(o.s,o.o,rx,ry,0));
 gd=null;S.free=0;S.dirty=1}
addEventListener('pointerup',gEnd);addEventListener('pointercancel',e=>{if(gd&&e.pointerId===gd.id){gMove(0,0);gd=null;S.free=0}});

/* ---------- keyboard ---------- */
addEventListener('keydown',e=>{
 if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||document.querySelector('dialog[open]'))return;
 if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==='a'&&S.tool==='sel'&&!pend){
  e.preventDefault();e.stopImmediatePropagation();
  const arr=[];S.comps.forEach(c=>{if(c.pg===S.pg)arr.push({k:'c',id:c.id})});
  S.wires.forEach(w=>{const a=by(cid(w.a));if(a&&a.pg===S.pg)arr.push({k:'w',id:w.id})});
  S.shapes.forEach(s=>{if(s.pg===S.pg&&!s.all)arr.push({k:'s',id:s.id})});
  apply(arr);if(arr.length>1)toast(arr.length+' items selected · Esc to clear');return}
 const ar={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
 if(ar&&MS.a.length>1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
  e.preventDefault();e.stopImmediatePropagation();
  MS.a.forEach(x=>{if(x.k==='c'){const c=by(x.id);if(c){c.x+=ar[0]*GRID;c.y+=ar[1]*GRID;clampC(c)}}
   else if(x.k==='s'){const s=shp(x.id);if(s)moveShape(s,{...s},ar[0]*5,ar[1]*5,1)}});
  S.dirty=1}},true);

/* ---------- selection-bar label ---------- */
{const sb=$('#sbar'),n=document.createElement('span');n.id='msN';sb.insertBefore(n,sb.firstChild)}
})();
