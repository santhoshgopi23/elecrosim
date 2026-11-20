/* ElectroSim v8.25 – cross-references between pages ("call" a terminal / coil from anywhere).
   Net / Page Link (nl):  same name = same wire, on any page.  Each link shows where its other ends are (page + sheet zone, e.g. 2 C4).
   Contacts (cno, cnc, cco, cp3) name a coil by label: they show where that coil is.  A coil shows where its contacts are.
   Go there:  select the part → ↗ Go (bottom bar or Properties),  or double-click / double-tap it.  ↩ Back returns to where you were.
   Properties of a contact / link has a "Call an existing …" list: pick a coil or link name from any page.
   Zone = the column number and row letter printed in the sheet frame (works only while the frame is on). */
'use strict';
const xrKey=s=>String(s==null?'':s).trim().toUpperCase();
const xrB=()=>S.back||(S.back=[]);
function xrZone(c){if(S.tb.frame===0)return'';const[W,H]=paperPx(),m=10*U,nC=Math.max(2,Math.round((W/U-20)/50)),nR=Math.max(2,Math.round((H/U-20)/50)),cw=(W-2*m)/nC,rh=(H-2*m)/nR;
 const ci=Math.max(0,Math.min(nC-1,Math.floor((c.x-m)/cw))),ri=Math.max(0,Math.min(nR-1,Math.floor((c.y-m)/rh)));return String.fromCharCode(65+ri)+(ci+1)}
const xrLoc=(c,pg)=>(c.pg!==pg?'p.'+pnum(c.pg)+' ':'')+(xrZone(c)||(c.pg===pg?'this page':''));
const xrLocs=(L,pg)=>{const o=[...L].sort((a,b)=>pnum(a.pg)-pnum(b.pg)||a.y-b.y||a.x-b.x),s=o.slice(0,3).map(c=>xrLoc(c,pg)).join(', ');return s+(o.length>3?' +'+(o.length-3):'')};
function xrTargets(c){const d=D[c.type];
 if(d.rl){const k=xrKey(c.p.ref);return k?S.comps.filter(q=>q!==c&&D[q.type].xr&&xrKey(q.label)===k):[]}
 if(c.type==='nl'){const k=xrKey(c.p.name);return k?S.comps.filter(q=>q!==c&&q.type==='nl'&&xrKey(q.p.name)===k):[]}
 if(d.xr){const k=xrKey(c.label);return S.comps.filter(q=>q.p&&q.p.ref&&xrKey(q.p.ref)===k)}
 return[]}
/* small text under a contact / link: where the other end is */
function xrTag(c,bb,K){const d=D[c.type];if(!(d.rl||c.type==='nl'))return'';
 const T=xrTargets(c);if(c.type==='nl'&&T.length)return'';const bad=!T.length,txt=bad?(d.rl?'✖ no coil '+esc(c.p.ref):'✖ not called elsewhere'):'▸ '+xrLocs(T,c.pg);
 const r=c.rot%4,rx=(x,y)=>[x,-y,-x,y][r],ry=(x,y)=>[y,x,-y,-x][r],cs=[[bb[0],bb[1]],[bb[0]+bb[2],bb[1]],[bb[0],bb[1]+bb[3]],[bb[0]+bb[2],bb[1]+bb[3]]],xs=cs.map(q=>rx(q[0],q[1])),ys=cs.map(q=>ry(q[0],q[1]));
 return`<text x=${(Math.min(...xs)+Math.max(...xs))/2*K} y=${Math.max(...ys)*K+12} class=mt${bad?' style="fill:#d98400"':''}>${txt}</text>`}
function xrShow(t){if(t.pg!==S.pg)setPage(t.pg);select({k:'c',id:t.id});if(S.z<.6)S.z=.8;S.vx=t.x-cv.clientWidth/2/S.z;S.vy=t.y-cv.clientHeight/2/S.z;S.auto=0;applyView();
 S.flash={id:t.id};S.dirty=1;clearTimeout(xrShow.tm);xrShow.tm=setTimeout(()=>{S.flash=null;S.dirty=1},2000)}
function xrGo(t){const b=xrB();b.push({pg:S.pg,id:S.sel&&S.sel.k==='c'?S.sel.id:null,vx:S.vx,vy:S.vy,z:S.z});if(b.length>30)b.shift();xrShow(t)}
function xrGoSel(){const c=S.sel&&S.sel.k==='c'&&by(S.sel.id);if(!c)return;const T=xrTargets(c).sort((a,b)=>pnum(a.pg)-pnum(b.pg)||a.y-b.y||a.x-b.x);
 if(!T.length){toast('Nothing to go to – no matching '+(D[c.type].rl?'coil':c.type==='nl'?'link':'contact')+' found');return}
 S.xi=S.xi||{};const i=(S.xi[c.id]||0)%T.length;S.xi[c.id]=i+1;xrGo(T[i])}
function xrBack(){const b=xrB(),p=b.pop();if(!p)return;if(S.pages.some(q=>q.id===p.pg)&&p.pg!==S.pg)setPage(p.pg);if(p.id!=null&&by(p.id))select({k:'c',id:p.id});S.z=p.z;S.vx=p.vx;S.vy=p.vy;S.auto=0;applyView();xrSync()}
function xrSync(){const sb=$('#sbar');if(!sb)return;const s=S.sel,c=s&&s.k==='c'&&by(s.id),T=c?xrTargets(c):[],g=sb.querySelector('.gp');
 sb.dataset.go=T.length?1:0;if(g&&c)g.textContent='↗ '+(D[c.type].rl?'Go to coil':c.type==='nl'?'Go to other end':'Go to contact')+(T.length>1?' ('+T.length+')':'');sb.dataset.bk=xrB().length?1:0}
/* Properties: where it is + "call an existing …" list */
function xrProps(c){const d=D[c.type];if(!(d.rl||c.type==='nl'||d.xr))return'';
 const T=xrTargets(c).sort((a,b)=>pnum(a.pg)-pnum(b.pg)||a.y-b.y||a.x-b.x),what=d.rl?'coil':c.type==='nl'?'link':'contact';
 let h='<div class=sec>Cross-reference</div>';
 h+=T.length?`<p class=mu style="margin:2px 0 4px">${T.length} ${what}${T.length>1?'s':''} found – tap to go there:</p><p>`+T.slice(0,12).map(t=>`<button data-go=${t.id}>↗ ${esc(c.type==='nl'?'Link':t.label)} · ${esc(xrLoc(t,S.pg))}</button>`).join(' ')+'</p>'
  :`<p class=mu style="margin:2px 0 6px">${d.rl?'No coil or relay has the label “'+esc(c.p.ref)+'”. Pick one below or fix the label.':c.type==='nl'?'No other link has this name yet. Place another Net / Page Link (here or on another page) with the same name.':'No contact uses this label yet.'}</p>`;
 if(d.rl){const L=S.comps.filter(q=>D[q.type].xr).sort((a,b)=>pnum(a.pg)-pnum(b.pg)||natCmp(a.label,b.label));
  h+=`<label>Call a coil / relay from any page<select data-pick=ref><option value="">— choose —</option>${L.map(q=>`<option value="${esc(q.label)}">${esc(q.label)} — ${esc(xrLoc(q,0))} (${esc(D[q.type].n)})</option>`).join('')}</select></label>`}
 if(c.type==='nl'){const L=[...new Map(S.comps.filter(q=>q.type==='nl'&&q!==c&&xrKey(q.p.name)).map(q=>[xrKey(q.p.name),q])).values()];
  h+=`<label>Call an existing link name<select data-pick=name><option value="">— choose —</option>${L.map(q=>`<option value="${esc(q.p.name)}">${esc(q.p.name)} — ${esc(xrLoc(q,0))}</option>`).join('')}</select></label>`}
 return h}
addEventListener('DOMContentLoaded',function(){const sb=$('#sbar'),ed=sb&&sb.querySelector('[data-a=edit]');
 if(ed)ed.insertAdjacentHTML('beforebegin','<button data-a="go" class="gp" title="Show the matching coil / link (also: double-click the part)">↗ Go</button><button data-a="back" class="bk" title="Return to where you were">↩ Back</button>');
 const pb=$('#propsBody');
 pb.addEventListener('input',e=>{const t=e.target;if(!t.dataset||!t.dataset.pick)return;e.stopPropagation();const c=S.sel&&S.sel.k==='c'&&by(S.sel.id);if(c&&t.value){c.p[t.dataset.pick]=t.value;S.dirty=1;props();xrSync()}},true);
 pb.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(!b)return;const t=by(+b.dataset.go);if(t)xrGo(t)});
 let down=null,tap=null;
 svg.addEventListener('pointerdown',e=>{const g=e.target.closest&&e.target.closest('[data-c]');down=g?{id:+g.dataset.c,x:e.clientX,y:e.clientY}:null},true);
 svg.addEventListener('pointerup',e=>{if(!down||S.wiring)return;const d=down;down=null;if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>6)return;
  const c=by(d.id);if(!c||!(D[c.type].rl||c.type==='nl'||D[c.type].xr))return;const n=performance.now();
  if(tap&&tap.id===d.id&&n-tap.t<450){tap=null;if(S.sel&&S.sel.k==='c'&&S.sel.id===c.id)xrGoSel()}else tap={id:d.id,t:n}},true)});
