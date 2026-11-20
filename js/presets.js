/* ElectroSim v8.75 – Simulation presets (Simulation tab → Presets). Loaded last.
   A preset is a named copy of your look-and-sound settings: animation style, every Simulation option (wire / dot / part colours, glow,
   thickness, dots, ring, wire colour mode, speed, sound volume and groups) and sound On / Off. Save as many as 12, for example
   "Training" or "Presentation", and switch with one click on its button. The preset that matches the current settings is highlighted.
   Realism and Live values are not part of a preset. Stored in localStorage "electrosim.presets". Command palette: type PRESET. */
'use strict';
(function(){
 if(typeof RIB==='undefined'||typeof ribbon!=='function'||!window.simoptSet||!window.simSetStyle)return;
 const KEY='electrosim.presets',MAX=12;
 let L=[];try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(v))L=v.filter(p=>p&&p.n&&p.d&&p.d.o)}catch(e){}
 const KON='electrosim.presets.on';let ON=1;try{ON=localStorage.getItem(KON)==='0'?0:1}catch(e){}
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(L))}catch(e){toast('Could not save presets (browser storage is full or blocked)')}};
 const snap=()=>({anim:window.simStyle(),o:Object.assign({},window.SIM_OPT),snd:window.sndIsOn?!!window.sndIsOn():true});
 const canon=d=>JSON.stringify([d.anim,Object.keys(d.o).sort().map(k=>[k,String(d.o[k])]),!!d.snd]);
 const active=()=>{const c=canon(snap());return L.findIndex(p=>canon(p.d)===c)};
 function apply(i){
  const p=L[i];if(!p||!ON)return;const d=p.d;
  window.simoptSet(d.o);if(d.anim)window.simSetStyle(d.anim);
  if(window.sndIsOn&&window.sndToggle&&!!window.sndIsOn()!==!!d.snd)window.sndToggle();
  paint();cmds();toast('Preset: '+p.n)}
 function saveCur(){
  const a=active();let n=prompt('Name for this preset (colours, sound and speed as they are now):',a>=0?L[a].n:'');
  if(n==null)return;n=n.trim().slice(0,24);if(!n){toast('A preset needs a name');return}
  const i=L.findIndex(p=>p.n.toLowerCase()===n.toLowerCase());
  if(i>=0){if(!confirm('Replace the preset "'+L[i].n+'" with the current settings?'))return;L[i].d=snap();toast('Preset "'+L[i].n+'" updated')}
  else{if(L.length>=MAX){toast('Up to '+MAX+' presets – delete one first');return}L.push({n,d:snap()});toast('Preset "'+n+'" saved')}
  save();paint();cmds()}
 function delCur(){
  const a=active();if(a<0){toast('Switch to a preset first, then press Delete preset');return}
  if(!confirm('Delete the preset "'+L[a].n+'"?'))return;L.splice(a,1);save();paint();cmds();toast('Preset deleted')}
 IC.pr_save='<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>';
 IC.pr_del='<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v6M14 11v6"/>';
 RIB.Simulation.splice(3,0,['Presets',[['cmd:pr_save','Save preset','pr_save'],['cmd:pr_del','Delete preset','pr_del']]]);
 const chip=(p,i,on)=>`<button type=button class=prc data-pr="${i}" aria-pressed="${on}" title="Switch to the preset ${esc(p.n)}">${esc(p.n)}</button>`;
 function paint(){
  paintTop();
  const g=document.querySelector('#rbody [data-cmd=pr_save]');if(!g)return;const ri=g.closest('.ri');if(!ri)return;
  const grp=ri.closest('.rp');if(grp)grp.style.display=ON?'':'none';
  let box=ri.querySelector('.prbox');if(!box){box=document.createElement('div');box.className='rsel prbox';ri.appendChild(box)}
  const a=active(),h=L.length?L.map((p,i)=>chip(p,i,i===a)).join(''):'<span class=prempty>No presets yet – set your colours, sound and speed, then press Save preset.</span>';
  if(box.dataset.h!==h+a){box.dataset.h=h+a;box.innerHTML=h}
  const d=document.querySelector('#rbody [data-cmd=pr_del]');if(d)d.disabled=a<0}
 const rib0=ribbon;ribbon=function(){rib0.apply(this,arguments);if(ribTab==='Simulation')paint()};
 const rb=document.getElementById('rbody');
 rb.addEventListener('click',e=>{
  const c=e.target.closest&&e.target.closest('.prc');if(c){e.stopImmediatePropagation();e.preventDefault();apply(+c.dataset.pr);return}
  const b=e.target.closest&&e.target.closest('[data-cmd=pr_save],[data-cmd=pr_del]');if(!b)return;
  e.stopImmediatePropagation();e.preventDefault();b.dataset.cmd==='pr_save'?saveCur():delCur()},true);
 setInterval(()=>{if(ribTab==='Simulation')paint()},400);   /* the highlight follows changes made with the other controls */
 /* command palette: PRESET <name> */
 function cmds(){
  if(typeof CMDS==='undefined')return;
  for(let i=CMDS.length-1;i>=0;i--)if(CMDS[i]._pr)CMDS.splice(i,1);
  CMDS.unshift({_pr:1,n:'Presets on / off',a:['presets'],h:'show or hide the presets and switch them on or off',f:()=>setOn(!ON)});
  if(ON)L.forEach((p,i)=>CMDS.unshift({_pr:1,n:'Preset: '+p.n,a:['preset','preset '+p.n.toLowerCase()],h:'switch colours, sound and speed',f:()=>apply(i)}))}
 /* top-bar button (next to the sound button): presets On / Off */
 function setOn(v,quiet){ON=v?1:0;try{localStorage.setItem(KON,ON?'1':'0')}catch(e){}paint();cmds();if(!quiet)toast('Presets '+(ON?'ON':'OFF – the Presets group is hidden, your presets are kept'))}
 function mountTop(){
  const stat=document.getElementById('stat');if(!stat||document.getElementById('bPre'))return;
  const b=document.createElement('button');b.className='ic';b.id='bPre';b.type='button';
  b.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>';
  stat.parentNode.insertBefore(b,stat);b.addEventListener('click',e=>{e.stopPropagation();setOn(!ON)})}
 function paintTop(){const b=document.getElementById('bPre');if(!b)return;b.setAttribute('aria-pressed',String(!!ON));
  b.title='Presets '+(ON?'ON':'OFF')+' – click to switch';b.setAttribute('aria-label','Presets '+(ON?'on':'off'))}
 window.presetApply=n=>{if(!ON)return false;const i=L.findIndex(p=>p.n.toLowerCase()===String(n).toLowerCase());if(i>=0)apply(i);return i>=0};
 window.presetList=()=>L.map(p=>p.n);
 mountTop();paintTop();cmds();if(ribTab==='Simulation')ribbon();
})();
