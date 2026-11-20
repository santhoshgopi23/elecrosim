/* ElectroSim v8.58 – Auto-save (ON / OFF) and "close?" confirmation.   Loaded after app.js and file.js.
   AUTO-SAVE   left 3-bar (☰) menu → File → Auto-save: ON / OFF (remembered in this browser). While ON the drawing is copied to this browser's storage
               a few seconds after every change, and again when the tab is hidden or closed. It uses its OWN slot, so it never
               overwrites "Save in browser". 3-bar menu → Restore auto-saved work brings it back; at start-up, if an auto-save exists
               and the sheet is still untouched, you are asked Yes / No whether to restore it.
   CLOSE       Closing the tab or the browser, reloading, or leaving the page asks for confirmation first (nothing is closed until
               you confirm). Browsers do not allow a web page to draw its own Yes / No box for tab or browser close – they show
               their own "Leave site? / Stay" box, and only after you have clicked in the page once. Leaving through ElectroSim's own
               links (About ElectroSim) uses ElectroSim's Yes / No box below. */
'use strict';
(()=>{
const Q=s=>document.querySelector(s),PREF='esim_autosave',SLOT='esim_auto',STAMP='esim_auto_t',EVERY=4000;
const ls={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v);return true}catch(e){return false}}};
let on=ls.get(PREF)!=='0',last=ls.get(SLOT)||'',failed=0,leaving=0,touched=0;
/* The editor starts with a small demo circuit. Until you actually work in the drawing (click, type, drag, drop a part) it is not "your work":
   it is never auto-saved, and so it can never overwrite a real auto-save. Clicks inside the File / More menus and the Yes / No boxes do not count. */
const mark=e=>{const t=e.target;if(t&&t.closest&&t.closest('#fmenu,#menu,dialog.as-dlg'))return;touched=1};
['pointerdown','keydown','input','change','drop','paste'].forEach(ev=>addEventListener(ev,mark,true));

/* ---------- what counts as "something drawn" ---------- */
const hasWork=()=>!!(S.comps.length||S.wires.length||S.shapes.some(x=>!x.all));

/* ---------- auto-save ---------- */
const pill=()=>Q('#fAuto'),
 paint=()=>{const b=pill();if(!b)return;b.setAttribute('aria-pressed',String(on));b.querySelector('.asw').textContent=on?'ON':'OFF';b.classList.toggle('on',on);
  const t=ls.get(STAMP),n=Q('#fAutoT');if(n)n.textContent=failed?'Auto-save failed – browser storage is full. Use File → Save As.':on?(t?'Last auto-saved '+new Date(+t).toLocaleTimeString():'Waiting for the first change…'):'Auto-save is off – use Ctrl+S to save.'};
function doSave(force){
 if(!on&&!force)return;
 if(!force&&(!touched||!hasWork()))return;      /* never overwrite a good auto-save with the untouched demo circuit or an empty sheet */
 let j;try{j=JSON.stringify(snapshot())}catch(e){return}
 if(j===last)return;
 if(ls.set(SLOT,j)){last=j;ls.set(STAMP,String(Date.now()));if(failed){failed=0;toast('Auto-save working again')}}
 else if(!failed){failed=1;toast('Auto-save failed – browser storage is full. Use File → Save As.')}
 paint()}
function setAuto(v){on=!!v;ls.set(PREF,on?'1':'0');if(on)doSave();paint();toast('Auto-save '+(on?'ON':'OFF'))}
setInterval(()=>doSave(),EVERY);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')doSave()});
addEventListener('pagehide',()=>doSave());

/* ---------- Yes / No box (ElectroSim's own) ---------- */
function ask(title,msg,yes,no){
 return new Promise(res=>{
  const d=document.createElement('dialog');d.className='as-dlg';
  d.innerHTML=`<form method="dialog"><h3></h3><p></p><div class="as-b"><button value="no" class="as-no"></button><button value="yes" class="as-yes" autofocus></button></div></form>`;
  d.querySelector('h3').textContent=title;d.querySelector('p').textContent=msg;d.querySelector('.as-yes').textContent=yes||'Yes';d.querySelector('.as-no').textContent=no||'No';
  d.addEventListener('close',()=>{const v=d.returnValue==='yes';d.remove();res(v)});
  document.body.appendChild(d);d.showModal()})}

/* ---------- restore ---------- */
async function restore(askFirst){
 const j=ls.get(SLOT);if(!j){toast('No auto-saved work found');return}
 if(askFirst){const t=ls.get(STAMP),when=t?new Date(+t).toLocaleString():'earlier';
  if(!await ask('Restore auto-saved work?','Your drawing was auto-saved on '+when+'. Restore it now?','Yes, restore','No'))return}
 try{loadData(JSON.parse(j));last=j;toast('Auto-saved work restored')}catch(e){toast('The auto-save could not be read')}}

/* ---------- the left 3-bar (☰) menu holds the file commands ---------- */
const fm=Q('#fmenu'),burger=Q('#tLib');
if(fm&&burger){
 fm.insertAdjacentHTML('beforeend','<hr class="as-hr"><button id="fAuto" type="button" role="switch" aria-pressed="true">Auto-save<span class="asw">ON</span></button><button id="fRestore" type="button">Restore auto-saved work</button><div id="fAutoT"></div>');
 const lm=document.createElement('div');lm.id='lmenu';lm.setAttribute('role','menu');
 lm.innerHTML='<div class="lm-h">File</div>';
 ['#fName','#fOpen','#fSave','#fSaveAs','.as-hr','#fAuto','#fRestore','#fAutoT'].forEach(q=>{const e=fm.querySelector(q);if(e)lm.appendChild(e)});
 lm.insertAdjacentHTML('beforeend','<hr class="as-hr"><button id="lLib" type="button">Show / hide component library</button>');
 document.body.appendChild(lm);
 const bf=Q('#bFile');if(bf)(bf.closest('.mw')||bf).style.display='none';        /* the old File button is no longer needed */
 const shut=()=>lm.classList.remove('open');
 let pass=0;
 burger.addEventListener('click',e=>{if(pass)return;e.stopImmediatePropagation();e.preventDefault();
  const r=burger.getBoundingClientRect();lm.style.top=(r.bottom+4)+'px';lm.style.left=Math.max(4,r.left)+'px';
  lm.classList.toggle('open');paint()},true);
 Q('#lLib').onclick=()=>{shut();pass=1;burger.click();pass=0};                    /* the original library toggle */
 Q('#fAuto').onclick=e=>{e.stopPropagation();setAuto(!on)};
 Q('#fRestore').onclick=()=>{shut();restore(true)};
 lm.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!['fAuto','lLib','fRestore'].includes(b.id))setTimeout(shut,0)});
 document.addEventListener('click',e=>{if(!e.target.closest('#lmenu,#tLib'))shut()});
 addEventListener('keydown',e=>{if(e.key==='Escape')shut()})}
paint();

/* ---------- start-up: offer the auto-saved drawing while the sheet is still the untouched demo circuit ---------- */
setTimeout(()=>{if(last&&!touched)restore(true)},700);

/* ---------- close tab / close browser / reload: confirm first ---------- */
addEventListener('beforeunload',e=>{
 if(leaving||!hasWork())return;
 doSave();
 e.preventDefault();e.returnValue='Close ElectroSim? Your drawing'+(on?' is auto-saved in this browser.':' has not been saved.');return e.returnValue});

/* ---------- ElectroSim's own links that leave the editor: Yes / No ---------- */
document.addEventListener('click',async e=>{
 const a=e.target.closest&&e.target.closest('a[href]');if(!a||a.target==='_blank'||a.hasAttribute('download'))return;
 const h=a.getAttribute('href');if(!h||h[0]==='#'||/^(javascript|mailto|tel):/i.test(h))return;
 if(!hasWork())return;
 e.preventDefault();e.stopImmediatePropagation();
 if(await ask('Leave the editor?','Close this drawing and go to '+(a.textContent.trim()||h)+'?'+(on?' Your work is auto-saved in this browser.':' Auto-save is OFF – unsaved changes will be lost.'),'Yes, leave','No, stay')){doSave();leaving=1;location.href=a.href}
},true);
})();
