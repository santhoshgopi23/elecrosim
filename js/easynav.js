/* ElectroSim – easy page switching (v8.68)
   ◀ 1 / 3 ▶ in the page bar · PageUp / PageDown · the sheet bar scrolls with the mouse wheel ·
   every page remembers its own zoom and position · clicking the current tab no longer opens a dialog
   (use the ✎ or double-click the tab to rename / move / delete) · a small ◀ ▶ switcher on the sheet when the page bar is hidden. */
(function(){
const views=new Map(),nav=$('#pages'),pgs=$('#pgs');
const idx=()=>S.pages.findIndex(p=>p.id===S.pg);
function go(d){const i=idx()+d;if(i<0||i>=S.pages.length){toast(d<0?'This is the first page':'This is the last page');return}setPage(S.pages[i].id)}

/* page bar: ◀ n / N ▶ */
const pv=document.createElement('button'),pn=document.createElement('span'),nx=document.createElement('button');
pv.id='pgPrev';nx.id='pgNext';pn.id='pgNo';pv.textContent='◀';nx.textContent='▶';pv.title='Previous page (PageUp)';nx.title='Next page (PageDown)';
pv.setAttribute('aria-label','Previous page');nx.setAttribute('aria-label','Next page');
nav.insertBefore(nx,nav.firstChild);nav.insertBefore(pn,nx);nav.insertBefore(pv,pn);
pv.onclick=()=>go(-1);nx.onclick=()=>go(1);

/* the same switcher floating on the sheet – only shown when the page bar is hidden */
const fl=document.createElement('div');fl.id='pgFloat';fl.innerHTML='<button data-d=-1 aria-label="Previous page" title="Previous page (PageUp)">◀</button><span></span><button data-d=1 aria-label="Next page" title="Next page (PageDown)">▶</button>';
cv.appendChild(fl);fl.addEventListener('click',e=>{const b=e.target.closest('[data-d]');if(b)go(+b.dataset.d)});

function sync(){const i=idx(),n=S.pages.length,t=(i+1)+' / '+n;pn.textContent=t;fl.querySelector('span').textContent=t;
 pv.disabled=i<=0;nx.disabled=i>=n-1;fl.querySelector('[data-d="-1"]').disabled=i<=0;fl.querySelector('[data-d="1"]').disabled=i>=n-1;fl.classList.toggle('one',n<2)}

/* each page remembers its own zoom / position */
const _setPage=setPage,_renderTabs=renderTabs;
setPage=function(id){
 const from=S.pg;if(from!=null)views.set(from,{vx:S.vx,vy:S.vy,z:S.z,auto:S.auto});
 const r=_setPage.apply(this,arguments),v=views.get(id);
 if(v&&!v.auto&&id!==from){S.vx=v.vx;S.vy=v.vy;S.z=v.z;S.auto=0;applyView()}
 return r};
renderTabs=function(){const r=_renderTabs.apply(this,arguments);sync();return r};

/* clicking the tab you are already on does nothing; ✎ or double-click opens the page settings */
pgs.addEventListener('click',e=>{const b=e.target.closest('[data-pg]');if(b&&+b.dataset.pg===S.pg&&!e.target.closest('.pe'))e.stopImmediatePropagation()},true);
pgs.addEventListener('dblclick',e=>{const b=e.target.closest('[data-pg]');if(b&&+b.dataset.pg===S.pg)openPG()});
/* mouse wheel over the page bar scrolls it sideways */
pgs.addEventListener('wheel',e=>{if(pgs.scrollWidth>pgs.clientWidth){e.preventDefault();pgs.scrollLeft+=e.deltaY||e.deltaX}},{passive:false});

/* keyboard */
addEventListener('keydown',e=>{
 if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||document.querySelector('dialog[open]')||e.ctrlKey||e.metaKey||e.altKey)return;
 if(e.key==='PageUp'){e.preventDefault();go(-1)}else if(e.key==='PageDown'){e.preventDefault();go(1)}},true);

sync();
})();
