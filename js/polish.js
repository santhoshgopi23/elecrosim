/* ElectroSim v8.70 – live-sheet animation styles + the "Simulation" ribbon tab (animation style and sound On / Off). Loaded after sound.js.
   STYLES (chosen in the Simulation tab, remembered):
     Standard  – the plain original look (moving current dots only)
     Moderate  – warm live wires, green coils, a ring pulses when a part switches
     Good      – Moderate + glow on live wires and energised coils
     Realistic – wire thickness, colour and dot speed follow the real current · breathing coil glow · flash with sparks when a part switches · room echo on the sounds
   Notes: the editor redraws the whole sheet every frame, which restarted CSS animations each time (the flow dots hardly moved); a shared phase
   (--fph / --aph / --gph on the sheet) is now used as a negative animation-delay so a redrawn element continues the same motion.
   Large drawings (over 260 parts + wires) switch the glow off automatically (class "big"). */
'use strict';
(function(){
 const svg=document.getElementById('svg');if(!svg||typeof compSVG!=='function')return;
 const KEY='electrosim.anim',NAMES={std:'Standard',mod:'Moderate',good:'Good',real:'Realistic'},
  TIPS={std:'Plain original look',mod:'Warm wires, green coils, ring when a part switches',good:'Moderate + glow',real:'Current-based wires, sparks, glow, room echo on sounds'};
 let ST='good';try{const v=localStorage.getItem(KEY);if(NAMES[v])ST=v}catch(e){}
 window.SIM_ANIM=ST;
 const PUL=window.SND_PUL||new Map(),LIFE=620;
 const apply=()=>{svg.classList.remove('a-std','a-mod','a-good','a-real');svg.classList.add('a-'+ST);window.SIM_ANIM=ST;S.dirty=1};
 apply();

 /* ---------- pulse ring (+ sparks in Realistic) around a part that switches ---------- */
 const base=compSVG;
 compSVG=function(c,live,sel){
  let h=base(c,live,sel);
  if(!live||!S.run||ST==='std'||(window.SIM_OPT&&!window.SIM_OPT.ring))return h;
  const p=PUL.get(c.id);if(!p)return h;
  const age=performance.now()-p.t;if(age>LIFE){PUL.delete(c.id);return h}
  let d,bb;try{d=dd(c);bb=bbox(d,c)}catch(e){return h}
  const K=csc(c),cx=bb[0]+bb[2]/2,cy=bb[1]+bb[3]/2,r=Math.max(18,Math.min(bb[2],bb[3])*.55),dl=`animation-delay:-${(age/1000).toFixed(3)}s`;
  let g=`<circle class=pls cx=${cx} cy=${cy} r=${r.toFixed(1)} style="stroke:${p.col};${dl}" />`;
  if(ST==='real'&&(p.col==='#12a36b'||p.col==='#d93a3a'||p.col==='#8a9aa8')){
   let ln='';for(let i=0;i<10;i++){const a=i*Math.PI/5+(c.id%7)*.2,r0=r*.75,r1=r*(1.05+((i*37+c.id)%5)*.07);ln+=`<line x1=${(cx+Math.cos(a)*r0).toFixed(1)} y1=${(cy+Math.sin(a)*r0).toFixed(1)} x2=${(cx+Math.cos(a)*r1).toFixed(1)} y2=${(cy+Math.sin(a)*r1).toFixed(1)} />`}
   g+=`<g class=spk style="${dl}">${ln}</g>`}
  const ring=`<g transform="${d.us?'':`scale(${K}) `}rotate(${c.rot*90})" pointer-events="none">${g}</g>`;
  return h.endsWith('</g>')?h.slice(0,-4)+ring+'</g>':h};

 /* ---------- Realistic: every live wire follows its current ---------- */
 const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t)),C0=[245,180,0],C1=[255,70,20];
 function realWires(sec){
  const hits=svg.querySelectorAll('path.hit[data-w]');
  hits.forEach(hit=>{
   let a=hit.previousElementSibling,fl=null,w=null;
   if(a&&a.classList.contains('fl')){fl=a;w=a.previousElementSibling}else w=a;
   if(!w||!w.classList.contains('hot')||w.classList.contains('sel'))return;
   const wr=S.wires.find(x=>x.id==hit.dataset.w),k=wr&&S.tk&&S.tk[wr.a],f=k?k.f:0;
   const o=window.SIM_OPT||{},fixed=svg.classList.contains('u-wire'),wm=svg.classList.contains('u-wt')?parseFloat(svg.style.getPropertyValue('--wt'))||1:1,sm=(parseFloat(svg.style.getPropertyValue('--fdur'))||.45)/.45;
   const t=Math.min(1,Math.log10(1+f*50)/2.5),wd=((2.6+t*2.6)*wm).toFixed(2),col=mix(C0,C1,t);
   if(!fixed)w.style.stroke=`rgb(${col})`;w.style.strokeWidth=wd;
   if(!svg.classList.contains('big')&&!fixed)w.style.filter=`drop-shadow(0 0 ${(2+t*6).toFixed(1)}px rgba(255,${Math.round(140-70*t)},0,${(.45+.4*t).toFixed(2)}))`;
   if(fl){const dur=Math.max(.2*sm,(.95-.75*t)*sm);if(!svg.classList.contains('u-dz'))fl.style.strokeWidth=(+wd+.8).toFixed(2);fl.style.animationDuration=dur.toFixed(2)+'s';fl.style.animationDelay=`-${(sec%dur).toFixed(3)}s`}})}

 (function loop(t){
  const s=t/1000;
  {const fd=parseFloat(svg.style.getPropertyValue('--fdur'))||.45;svg.style.setProperty('--fph',(s%fd).toFixed(3)+'s')}
  svg.style.setProperty('--aph',(s%.6).toFixed(3)+'s');
  svg.style.setProperty('--gph',(s%1.6).toFixed(3)+'s');
  if(typeof S!=='undefined'&&S.comps){const big=S.comps.length+S.wires.length>260;if(big!==svg.classList.contains('big'))svg.classList.toggle('big',big);
   if(ST==='real'&&S.run)realWires(s)}
  requestAnimationFrame(loop)})(0);

 /* ---------- "Simulation" ribbon tab ---------- */
 const sv=(p)=>p;
 IC.sim_std='<path d="M3 12h18"/><circle cx=8 cy=12 r=1.2 /><circle cx=14 cy=12 r=1.2 />';
 IC.sim_mod='<path d="M3 12h18" stroke-width="2.5"/><circle cx=8 cy=12 r=1.2 /><circle cx=14 cy=12 r=1.2 /><circle cx=12 cy=12 r=7 stroke-dasharray="2 3"/>';
 IC.sim_good='<path d="M3 12h18" stroke-width="3"/><path d="M5 7.500h14M5 16.500h14" opacity=".35"/><circle cx=8 cy=12 r=1.2 /><circle cx=15 cy=12 r=1.2 /><circle cx=12 cy=12 r=8 opacity=".5"/>';
 IC.sim_real='<path d="M3 12h18" stroke-width="3.5"/><path d="M5 8h14M5 16h14" opacity=".3"/><path d="M12 3v3M12 18v3M4.500 6l2 2M19.500 6l-2 2M4.500 18l2-2M19.500 18l-2-2"/><circle cx=12 cy=12 r=3 />';
 IC.sim_snd='<path d="M4 9.500v5h3.500L12 18.500v-13L7.500 9.500z"/><path d="M15.500 9a4 4 0 0 1 0 6M18 6.500a7.500 7.500 0 0 1 0 11"/>';
 IC.sim_run='<path d="M7 4.500v15l12-7.500z"/>';IC.sim_pause='<path d="M8 5v14M16 5v14"/>';IC.sim_stop='<rect x=6 y=6 width=12 height=12 />';
 RIB.Simulation=[
  ['Animation style',['std','mod','good','real'].map(k=>['cmd:sim_'+k,NAMES[k],'sim_'+k])],
  ['Sound',[['cmd:sim_snd','Sound','sim_snd']]],
  ['Run',[['cmd:sim_run','Run','sim_run'],['cmd:sim_pause','Pause','sim_pause'],['cmd:sim_stop','Stop','sim_stop']]]];
 const paintRib=()=>{
  document.querySelectorAll('#rbody [data-cmd^=sim_]').forEach(b=>{const c=b.dataset.cmd.slice(4);
   if(NAMES[c]){b.setAttribute('aria-pressed',String(c===ST));b.title=NAMES[c]+' – '+TIPS[c]}
   else if(c==='snd'){const on=window.sndIsOn?window.sndIsOn():true;b.setAttribute('aria-pressed',String(on));b.querySelector('span').textContent=on?'Sound ON':'Sound OFF';b.title='Sound '+(on?'ON':'OFF')+' – click to switch'}})};
 const rib0=ribbon;ribbon=function(){rib0.apply(this,arguments);paintRib()};
 $('#rbody').addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-cmd^=sim_]');if(!b)return;
  e.stopImmediatePropagation();e.preventDefault();
  const c=b.dataset.cmd.slice(4);
  if(NAMES[c])setStyle(c);
  else if(c==='snd'){window.sndToggle&&window.sndToggle()}
  else if(c==='run')$('#bRun').click();else if(c==='pause')$('#bPause').click();else if(c==='stop')$('#bStop').click();
  paintRib()},true);
 function setStyle(v){ST=v;try{localStorage.setItem(KEY,v)}catch(e){}apply();paintRib();toast('Animation: '+NAMES[v])}
 window.simSetStyle=setStyle;window.simStyle=()=>ST;
 addEventListener('sndchange',paintRib);
 /* command palette: type ANIM */
 if(typeof CMDS!=='undefined')Object.keys(NAMES).forEach(k=>CMDS.unshift({n:'Animation: '+NAMES[k],a:k==='std'?['anim','animation']:[],h:TIPS[k],f:()=>setStyle(k)}));
 ribbon();
})();
