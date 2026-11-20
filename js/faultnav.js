/* Click a fault / warning in the results panel (or a result row) to jump to the part in the drawing:
   switches to its sheet, selects it, centres it and pulses a red box around it for a few seconds. */
function msgComp(txt){
 const t=String(txt).replace(/<[^>]*>/g,' ');let best=null,bi=1e9;
 for(const c of S.comps){const l=c.label;if(!l)continue;
  const m=new RegExp('(?<![A-Za-z0-9_])'+l.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![A-Za-z0-9_])').exec(t);
  if(m&&(m.index<bi||m.index===bi&&best&&l.length>best.label.length)){best=c;bi=m.index}}
 return best}
function showComp(c){
 if(!c)return;if(c.pg!==S.pg)setPage(c.pg);
 select({k:'c',id:c.id});
 const w=cv.clientWidth,h=cv.clientHeight;
 if(w&&h){S.z=Math.max(S.z,.9);S.vx=c.x-w/S.z/2;S.vy=c.y-h/S.z/2;S.auto=0;applyView()}
 S.flash={id:c.id,until:Date.now()+5000};S.dirty=1}
function flashMarkup(){
 const f=S.flash;if(!f)return'';if(Date.now()>f.until){S.flash=null;return''}
 const c=S.comps.find(q=>q.id===f.id);if(!c||c.pg!==S.pg)return'';
 const d=D[c.type],b=bbox(d,c),r=Math.max(Math.abs(b[0]),Math.abs(b[1]),b[0]+b[2],b[1]+b[3])*(c.sc||1)+8,
  a=.35+.65*Math.abs(Math.sin(Date.now()/320));
 return`<rect x=${c.x-r} y=${c.y-r} width=${2*r} height=${2*r} rx=10 fill="rgba(224,58,58,${(.18*a).toFixed(2)})" stroke="#e03a3a" stroke-width=4 stroke-opacity=${a.toFixed(2)} style="pointer-events:none"/>`}
(()=>{const el=document.getElementById('msgs');if(!el)return;
 const go=e=>{const r=e.target.closest&&e.target.closest('[data-mc]');if(!r)return;e.preventDefault();showComp(S.comps.find(c=>c.id===+r.dataset.mc))};
 el.addEventListener('pointerdown',go);
 el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')go(e)})})();
