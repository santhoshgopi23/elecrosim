/* ElectroSim v8.51 – CREATE BLOCK (AutoCAD-style BLOCK command): turn anything you draw into your own component.
   1. Draw the symbol with Line / Circle / Rectangle / Text.
   2. Create Block  →  pick the objects (click them, or click two corners: left→right = inside window, right→left = touching window).  Enter.
   3. Click every spot where a wire must connect (terminals; they sit on the wire grid).  Enter.
   4. Name it.  The block appears in the library under “My Blocks”: place it, rotate it, resize it, wire it, print it.
   Blocks are saved inside the project file and also kept in this browser, so they are there in every new project.
   Loaded after app.js. */
'use strict';
const BK={};                       /* id -> {id,n,pre,t:[[x,y,name]],sh:[local shapes],bb:[x,y,w,h]}  (local units: sheet units / SC) */
const BKCAT='My Blocks',BKLS='esim_blocks';
(()=>{
const Q=s=>document.querySelector(s),r2=v=>Math.round(v*100)/100;
const K={step:0,sel:new Set(),win:null,ox:0,oy:0,t:[],hov:null,mx:0,my:0};

/* ---------- block definition  ->  registry entry ---------- */
function geo(b){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;const a=(x,y)=>{x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)};
 b.sh.forEach(s=>{if(s.k==='line'){a(s.x1,s.y1);a(s.x2,s.y2)}else if(s.k==='circle'){a(s.x-s.r,s.y-s.r);a(s.x+s.r,s.y+s.r)}else if(s.k==='text'){a(s.x,s.y);a(s.x+(s.w||40),s.y+(s.size||13)*1.2)}else{a(s.x,s.y);a(s.x+s.w,s.y+s.h)}});
 if(x0>x1){x0=-20;y0=-20;x1=20;y1=20}return{x0,y0,x1,y1}}
function svgOf(sh){let h='';
 sh.forEach(s=>{const wd=s.wd&&s.wd!==2?s.wd/SC:0,da=dashOf(s.ds,(s.wd||2)/SC),st=`style="${s.col?'stroke:'+s.col+';':''}${wd?'stroke-width:'+r2(wd)+';':''}${da?'stroke-dasharray:'+da+';':''}${s.k!=='line'&&s.k!=='text'&&s.fill?'fill:'+s.fill+';':''}"`;
  if(s.k==='line'){h+=`<path d="M${r2(s.x1)} ${r2(s.y1)}L${r2(s.x2)} ${r2(s.y2)}" class=s ${st} />`;
   if(s.ar){const dx=s.x2-s.x1,dy=s.y2-s.y1,L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L,a=9,b=3.4;h+=`<path d="M${r2(s.x2)} ${r2(s.y2)}L${r2(s.x2-ux*a+uy*b)} ${r2(s.y2-uy*a-ux*b)}L${r2(s.x2-ux*a-uy*b)} ${r2(s.y2-uy*a+ux*b)}Z" style="fill:${s.col||'var(--w)'};stroke:none" />`}}
  else if(s.k==='rect')h+=`<rect x=${r2(s.x)} y=${r2(s.y)} width=${r2(s.w)} height=${r2(s.h)} class=s ${st} />`;
  else if(s.k==='circle')h+=`<circle cx=${r2(s.x)} cy=${r2(s.y)} r=${r2(s.r)} class=s ${st} />`;
  else if(s.k==='text'){const fs=r2(s.size),an=s.al==='center'?'middle':s.al==='right'?'end':'start',ax=0;
   h+=`<g transform="translate(${r2(s.x)} ${r2(s.y)}) rotate(${s.rot||0})"><text y=${r2(fs*.9)} class=tx style="font-size:${fs}px;font-weight:${s.bold?700:400};${s.it?'font-style:italic;':''}text-anchor:${an};${s.col?'fill:'+s.col+';':''}white-space:pre">`+
    String(s.text||'').split('\n').map((l,i)=>`<tspan x=${ax} dy=${i?r2(fs*1.2):0}>${esc(l)||' '}</tspan>`).join('')+'</text></g>'}});
 return h}
function defOf(b){const G=geo(b),T=b.t.map(q=>[q[0],q[1],q[2],'n']);
 let x0=G.x0,y0=G.y0,x1=G.x1,y1=G.y1;b.t.forEach(q=>{x0=Math.min(x0,q[0]);y0=Math.min(y0,q[1]);x1=Math.max(x1,q[0]);y1=Math.max(y1,q[1])});
 const svg=svgOf(b.sh);
 return{n:b.n,ds:'Your own block – '+b.t.length+' terminal'+(b.t.length===1?'':'s')+(b.t.length?' ('+b.t.map(q=>q[2]).join(', ')+')':''),cat:BKCAT,pre:b.pre||'B',t:T,p:{},el:()=>[],ns:1,blk:1,
  bb:[x0-8,y0-8,x1-x0+16,y1-y0+16],
  /* a wire leaves a terminal through the nearest edge of the drawn symbol */
  hf:(x,y)=>{const dx=Math.min(Math.abs(x-G.x0),Math.abs(x-G.x1)),dy=Math.min(Math.abs(y-G.y0),Math.abs(y-G.y1));return dx<=dy},
  g:()=>svg,
  pp:()=>`<div class=sec>My block</div><p class=mu style="margin:2px 0 6px">Made with <b>Create Block</b>. Place it from <b>My Blocks</b> in the library as often as you like. Every terminal can be wired.</p><div class=row><button data-bk=explode>Explode (back to lines)</button><button data-bk=del class=dn>Delete block from library</button></div>`}}
function reg(b){BK[b.id]=b;D[b.id]=defOf(b);
 for(let i=CMDS.length;i--;)if(CMDS[i].t===b.id)CMDS.splice(i,1);
 CMDS.push({n:b.n,a:[],h:'place my block',t:b.id,f:()=>place(b.id),ds:'my block custom',comp:1})}
function unreg(id){delete BK[id];delete D[id];for(let i=CMDS.length;i--;)if(CMDS[i].t===id)CMDS.splice(i,1)}
function store(){try{localStorage.setItem(BKLS,JSON.stringify(BK))}catch(e){}}
window.bkLoad=function(m){let n=0;if(m)for(const id in m){const b=m[id];if(b&&b.id&&Array.isArray(b.sh)&&Array.isArray(b.t)){reg(b);n++}}if(n)store();buildLib($('#q').value)};
/* the library a user built earlier in this browser */
try{const m=JSON.parse(localStorage.getItem(BKLS)||'null');if(m){for(const id in m){const b=m[id];if(b&&b.id&&Array.isArray(b.sh)&&Array.isArray(b.t))reg(b)}buildLib($('#q').value)}}catch(e){}

/* ---------- interaction: Create Block as a drawing tool ---------- */
HINT.blk='';
const hint=t=>{const h=Q('#thint');h.textContent=t;h.classList.add('show')};
const drawn=()=>S.shapes.filter(s=>s.pg===S.pg&&!s.all&&s.k!=='tbl');
function bkStart(){
 if(!drawn().length){toast('Draw your symbol first with Line, Circle, Rectangle or Text – then press Create Block');return}
 setTool('blk');Object.assign(K,{step:1,win:null,t:[],hov:null});K.sel=new Set();
 hint('CREATE BLOCK – 1/2  Select the objects: click them, or click two corners (left→right = inside, right→left = touching). Enter = continue · A = everything on this sheet · Esc = cancel')}
window.bkStart=bkStart;
window.bkReset=function(t){if(t!=='blk'&&K.step){K.step=0;K.win=null;K.sel=new Set();K.t=[];const d=Q('#dBK');if(d&&d.open)d.close()}};

/* distance helpers for picking a single object */
function hitShape(s,m){const tol=8/S.z,d=(x,y)=>Math.hypot(x-m.x,y-m.y);
 if(s.k==='line'){const dx=s.x2-s.x1,dy=s.y2-s.y1,L2=dx*dx+dy*dy||1,u=Math.max(0,Math.min(1,((m.x-s.x1)*dx+(m.y-s.y1)*dy)/L2));return d(s.x1+u*dx,s.y1+u*dy)<=tol}
 if(s.k==='circle'){const r=d(s.x,s.y);return s.fill?r<=s.r+tol:Math.abs(r-s.r)<=tol}
 const b=shapeBounds(s,pnum(s.pg)-1),ins=m.x>=b.x-tol&&m.x<=b.x+b.w+tol&&m.y>=b.y-tol&&m.y<=b.y+b.h+tol;
 if(s.k==='rect'&&!s.fill){const inner=m.x>b.x+tol&&m.x<b.x+b.w-tol&&m.y>b.y+tol&&m.y<b.y+b.h-tol;return ins&&!inner}
 return ins}
function windowPick(a,b){const x0=Math.min(a.x,b.x),x1=Math.max(a.x,b.x),y0=Math.min(a.y,b.y),y1=Math.max(a.y,b.y),cross=b.x<a.x;let n=0;
 drawn().forEach(s=>{const q=shapeBounds(s,pnum(s.pg)-1),in_=q.x>=x0&&q.x+q.w<=x1&&q.y>=y0&&q.y+q.h<=y1,hit=!(q.x>x1||q.x+q.w<x0||q.y>y1||q.y+q.h<y0);
  if(cross?hit:in_){K.sel.add(s.id);n++}});return n}
function origin(){const L=[...K.sel].map(id=>shp(id)).filter(Boolean);let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
 L.forEach(s=>{const q=shapeBounds(s,pnum(s.pg)-1);x0=Math.min(x0,q.x);y0=Math.min(y0,q.y);x1=Math.max(x1,q.x+q.w);y1=Math.max(y1,q.y+q.h)});
 K.ox=snapG((x0+x1)/2);K.oy=snapG((y0+y1)/2)}
function termPt(e){const m=mp(e),h=S.os!==0&&!e.altKey?osnapAt(m,-1):null,q=h||m;return[K.ox+Math.round((q.x-K.ox)/GRID)*GRID,K.oy+Math.round((q.y-K.oy)/GRID)*GRID]}

/* called from app.js startTool() (pointer down while the Block tool is active) */
window.bkClick=function(e){const m=mp(e);
 if(K.step===1){
  if(K.win){const n=windowPick(K.win,m);K.win=null;toast(n?n+' object'+(n>1?'s':'')+' added – '+K.sel.size+' selected · Enter to continue':'Nothing in that window');S.dirty=1;return}
  const hit=[...drawn()].reverse().find(s=>hitShape(s,m));
  if(hit){K.sel.has(hit.id)?K.sel.delete(hit.id):K.sel.add(hit.id);toast(K.sel.size+' selected · Enter to continue');S.dirty=1;return}
  K.win={x:m.x,y:m.y};S.dirty=1;return}
 if(K.step===2){const[x,y]=termPt(e);if(!K.t.some(q=>q[0]===x&&q[1]===y)){K.t.push([x,y]);toast('Terminal '+K.t.length+' placed')}S.dirty=1}};
window.bkMove=function(e){const m=mp(e);K.mx=m.x;K.my=m.y;if(K.step===2){const p=termPt(e);K.hov=p}S.dirty=1};
function next(){
 if(K.step===1){if(!K.sel.size){const a=drawn();a.forEach(s=>K.sel.add(s.id));toast(a.length+' object'+(a.length>1?'s':'')+' on this sheet selected – press Enter again to continue');S.dirty=1;return}
  origin();K.step=2;K.win=null;K.t=[];
  hint('CREATE BLOCK – 2/2  Click every point where a wire must connect (terminals). They snap to the wire grid and to the ends of your lines. Enter = finish · Backspace = remove last · none is fine for a drawing-only block');S.dirty=1;return}
 if(K.step===2)dialog()}
addEventListener('keydown',e=>{if(S.tool!=='blk'||!K.step||document.querySelector('dialog[open]'))return;
 if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
 if(e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();next()}
 else if(K.step===1&&e.key.toLowerCase()==='a'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();e.stopImmediatePropagation();drawn().forEach(s=>K.sel.add(s.id));toast(K.sel.size+' selected · Enter to continue');S.dirty=1}
 else if(K.step===2&&(e.key==='Backspace'||e.key==='Delete')){e.preventDefault();e.stopImmediatePropagation();K.t.pop();S.dirty=1}},true);
Q('#cv').addEventListener('contextmenu',e=>{if(S.tool==='blk'&&K.step){e.preventDefault();next()}});

/* ---------- name dialog ---------- */
let dlg=null;
function dialog(){
 if(!dlg){dlg=document.createElement('dialog');dlg.id='dBK';
  dlg.innerHTML=`<form method="dialog"><h2>Create Block</h2><p class="mu">Your drawing becomes a new component under <b>My Blocks</b> in the library. You can place it as often as you like, rotate it, resize it, and wire its terminals.</p>
  <label>Block name<input id="bkN" maxlength="40" placeholder="e.g. Heater element"></label>
  <div class="two"><label>Label prefix<input id="bkP" maxlength="4" placeholder="B"></label><label>Terminals<input id="bkC" readonly></label></div>
  <label>Terminal names, comma separated, in the order you clicked them<input id="bkT" placeholder="1, 2"></label>
  <label class="ck"><input type="checkbox" id="bkR" checked>Replace the drawn objects with the block</label>
  <div class="act"><button type="button" id="bkX">Cancel</button><button type="button" class="pri" id="bkOK">Create block</button></div></form>`;
  document.body.appendChild(dlg);
  dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
  Q('#bkX').onclick=()=>{dlg.close();setTool('sel')};
  Q('#bkOK').onclick=create;
  Q('#bkN').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();create()}})}
 const n=Object.keys(BK).length+1;
 Q('#bkN').value='Block '+n;Q('#bkP').value='B';Q('#bkC').value=K.t.length;Q('#bkT').value=K.t.map((_,i)=>i+1).join(', ');Q('#bkR').checked=true;
 dlg.showModal();setTimeout(()=>{const i=Q('#bkN');i.focus();i.select()},30)}

function create(){
 const name=Q('#bkN').value.trim();if(!name){toast('Give the block a name');Q('#bkN').focus();return}
 if(Object.values(BK).some(b=>b.n.toLowerCase()===name.toLowerCase())&&!confirm('A block called “'+name+'” already exists. Create another one with the same name?'))return;
 const pre=(Q('#bkP').value.trim().replace(/[^A-Za-z0-9]/g,'').toUpperCase()||'B').slice(0,4),names=Q('#bkT').value.split(',').map(x=>x.trim());
 const L=[...K.sel].map(id=>shp(id)).filter(Boolean),ox=K.ox,oy=K.oy,u=v=>v/SC,
  sh=L.map(s=>{const o={k:s.k};['col','fill','ds','dim','ar','text','bold','it','al','rot'].forEach(q=>{if(s[q])o[q]=s[q]});if(s.wd&&s.wd!==2)o.wd=s.wd;
   if(s.k==='line'){o.x1=r2(u(s.x1-ox));o.y1=r2(u(s.y1-oy));o.x2=r2(u(s.x2-ox));o.y2=r2(u(s.y2-oy))}
   else if(s.k==='circle'){o.x=r2(u(s.x-ox));o.y=r2(u(s.y-oy));o.r=r2(u(s.r))}
   else if(s.k==='text'){o.x=r2(u(s.x-ox));o.y=r2(u(s.y-oy));o.size=r2(u(s.size));o.w=r2(u(textBox(s,0).w))}
   else{o.x=r2(u(s.x-ox));o.y=r2(u(s.y-oy));o.w=r2(u(s.w));o.h=r2(u(s.h))}return o}).filter(o=>o.k!=='img'),
  t=K.t.map((p,i)=>[Math.round(u(p[0]-ox)/20)*20,Math.round(u(p[1]-oy)/20)*20,names[i]||String(i+1)]);
 const id='blk_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),b={id,n:name,pre,t,sh};
 /* a short lead from each terminal to the drawn symbol, so the terminal is visibly connected */
 const G=geo(b);t.forEach(q=>{const cx=Math.max(G.x0,Math.min(G.x1,q[0])),cy=Math.max(G.y0,Math.min(G.y1,q[1]));if(Math.hypot(cx-q[0],cy-q[1])>3)sh.push({k:'line',x1:q[0],y1:q[1],x2:r2(cx),y2:r2(cy)})});
 reg(b);store();buildLib($('#q').value);dlg.close();
 if(Q('#bkR').checked){const ids=new Set(K.sel);S.shapes=S.shapes.filter(s=>!ids.has(s.id))}
 const off=Q('#bkR').checked?0:60;K.step=0;K.sel=new Set();K.t=[];
 setTool('sel');const c=add(id,K.ox+off,K.oy+off);select({k:'c',id:c.id});S.dirty=1;
 toast('Block “'+name+'” created – find it in the library under My Blocks');if(!mq.matches&&B.contains('hl'))panel('hl',true)}

/* ---------- overlay on the sheet while creating ---------- */
function halo(s){const w=7/S.z,st=`fill:none;stroke:#1c7ed6;stroke-width:${w};opacity:.45;stroke-linecap:round;stroke-linejoin:round`;
 if(s.k==='line')return`<path d="M${s.x1} ${s.y1}L${s.x2} ${s.y2}" style="${st}" />`;
 if(s.k==='circle')return`<circle cx=${s.x} cy=${s.y} r=${s.r} style="${st}" />`;
 const b=shapeBounds(s,pnum(s.pg)-1);return`<rect x=${b.x} y=${b.y} width=${b.w} height=${b.h} style="${st}" />`}
window.bkMarkup=function(){if(S.tool!=='blk'||!K.step)return'';let h='<g style="pointer-events:none">';const z=S.z;
 K.sel.forEach(id=>{const s=shp(id);if(s&&(s.pg===S.pg||s.all))h+=halo(s)});
 if(K.step===1&&K.win){const a=K.win,x=Math.min(a.x,K.mx),y=Math.min(a.y,K.my),w=Math.abs(K.mx-a.x),hh=Math.abs(K.my-a.y),cr=K.mx<a.x;
  h+=`<rect x=${x} y=${y} width=${w} height=${hh} style="fill:${cr?'rgba(24,176,74,.14)':'rgba(28,126,214,.14)'};stroke:${cr?'#18b04a':'#1c7ed6'};stroke-width:${1.4/z};${cr?`stroke-dasharray:${6/z} ${4/z}`:''}" />`}
 if(K.step===2){const r=5/z;
  h+=`<path d="M${K.ox-12/z} ${K.oy}H${K.ox+12/z}M${K.ox} ${K.oy-12/z}V${K.oy+12/z}" style="stroke:#e0007a;stroke-width:${1.6/z};fill:none" /><text x=${K.ox+14/z} y=${K.oy-8/z} style="font:600 ${10.5/z}px Arial,sans-serif;fill:#e0007a">base point</text>`;
  K.t.forEach((p,i)=>{h+=`<circle cx=${p[0]} cy=${p[1]} r=${r*1.5} style="fill:#fff;stroke:#e0007a;stroke-width:${2/z}" /><text x=${p[0]} y=${p[1]+3.6/z} style="font:700 ${10/z}px Arial,sans-serif;fill:#e0007a;text-anchor:middle">${i+1}</text>`});
  if(K.hov)h+=`<circle cx=${K.hov[0]} cy=${K.hov[1]} r=${r*1.5} style="fill:rgba(224,0,122,.18);stroke:#e0007a;stroke-width:${1.4/z};stroke-dasharray:${3/z} ${3/z}" />`}
 return h+'</g>'};

/* ---------- block instance: properties (explode / delete) ---------- */
function explode(c){const b=BK[c.type];if(!b)return;const k=csc(c),[a,bb]=[[1,0],[0,1],[-1,0],[0,-1]][c.rot%4],X=(x,y)=>c.x+k*(x*a-y*bb),Y=(x,y)=>c.y+k*(x*bb+y*a);
 b.sh.forEach(o=>{const s={id:S.nid++,k:o.k,pg:c.pg,all:0,col:o.col||'',wd:o.wd||2,ds:o.ds||''};
  if(o.k==='line'){Object.assign(s,{x1:X(o.x1,o.y1),y1:Y(o.x1,o.y1),x2:X(o.x2,o.y2),y2:Y(o.x2,o.y2)});if(o.ar)s.ar=1;if(o.dim)s.dim=1}
  else if(o.k==='circle')Object.assign(s,{x:X(o.x,o.y),y:Y(o.x,o.y),r:o.r*k,fill:o.fill||''});
  else if(o.k==='text')Object.assign(s,{x:X(o.x,o.y),y:Y(o.x,o.y),text:o.text||'',size:Math.max(6,Math.round(o.size*k)),bold:o.bold||0,it:o.it||0,al:o.al||'left',rot:((o.rot||0)+90*(c.rot%4))%360});
  else{const x1=X(o.x,o.y),y1=Y(o.x,o.y),x2=X(o.x+o.w,o.y+o.h),y2=Y(o.x+o.w,o.y+o.h);Object.assign(s,{x:Math.min(x1,x2),y:Math.min(y1,y2),w:Math.abs(x2-x1),h:Math.abs(y2-y1),fill:o.fill||''})}
  S.shapes.push(s)});
 S.comps=S.comps.filter(q=>q.id!==c.id);S.wires=S.wires.filter(w=>cid(w.a)!==c.id&&cid(w.b)!==c.id);select(null);toast('Block exploded into lines – wires on it were removed')}
Q('#propsBody').addEventListener('click',e=>{const a=e.target.closest('[data-bk]');if(!a||!S.sel||S.sel.k!=='c')return;const c=by(S.sel.id);if(!c||!BK[c.type])return;
 if(a.dataset.bk==='explode'){if(S.wires.some(w=>cid(w.a)===c.id||cid(w.b)===c.id)&&!confirm('Wires are connected to this block. Exploding removes them. Continue?'))return;explode(c);return}
 if(a.dataset.bk==='del'){const id=c.type,n=S.comps.filter(q=>q.type===id).length;
  if(!confirm('Delete the block “'+BK[id].n+'” from your library'+(n?' and its '+n+' placement'+(n>1?'s':'')+' in this project (with their wires)':'')+'?'))return;
  const ids=new Set(S.comps.filter(q=>q.type===id).map(q=>q.id));S.comps=S.comps.filter(q=>!ids.has(q.id));S.wires=S.wires.filter(w=>!ids.has(cid(w.a))&&!ids.has(cid(w.b)));
  unreg(id);store();select(null);buildLib($('#q').value);toast('Block deleted')}});
})();
