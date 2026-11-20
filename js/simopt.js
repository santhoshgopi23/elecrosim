/* ElectroSim v8.71 – more Simulation options (Simulation tab): colours, glow, thickness, flow dots, ring / sparks, simulation speed, sound volume and groups.
   All choices are remembered (localStorage "electrosim.simopt"). "Auto" = what the chosen animation style does by itself.
   Loaded after polish.js. Sets CSS variables / classes on the sheet (#svg), polish.js and sound.js read window.SIM_OPT / window.SND_OPT. */
'use strict';
(function(){
 const svg=document.getElementById('svg');if(!svg||typeof RIB==='undefined')return;
 const KEY='electrosim.simopt';
 const WIRE={auto:['Auto',null],amber:['Amber','#f0a000'],red:['Red','#e53935'],green:['Green','#2e9e4f'],blue:['Blue','#1e88e5'],cyan:['Cyan','#00acc1'],purple:['Purple','#8e44ad'],pink:['Pink','#e91e8c'],black:['Black','#222b36'],heat:['Heat (by current)',null]},
  DOT={auto:['Auto',null],white:['White','#fffbe6'],yellow:['Yellow','#ffd600'],cyan:['Cyan','#4dd0e1'],lime:['Lime','#9be22d'],red:['Red','#ff5252'],black:['Black','#1b2430']},
  PART={auto:['Auto (green)',null],blue:['Blue','#1e88e5'],amber:['Amber','#f0a000'],red:['Red','#e53935'],purple:['Purple','#8e44ad'],cyan:['Cyan','#00acc1']},
  GLOW={auto:'Auto',off:'Off',low:'Low',high:'High'},
  WT={thin:['Thin',.75],normal:['Normal',1],thick:['Thick',1.4],xthick:['Extra thick',1.8]},
  DSP={slow:['Slow',.9],normal:['Normal',.45],fast:['Fast',.25],vfast:['Very fast',.15]},
  DSZ={small:['Small',2.4],normal:['Normal',3.4],large:['Large',5]},
  SPD={'0.25':'¼×  slow motion','0.5':'½×','1':'1×  normal','2':'2×','4':'4×  fast'},
  VOL={low:['Low',.3],med:['Medium',.6],high:['High',.9]};
 const CM={single:'One colour (set above)',wire:'Different for every wire',net:'Different for every connection (net)',volt:'By voltage level',cur:'By current (heat)'},
  SWC={'':'Default',red:['Red','#e53935'],orange:['Orange','#fb8c00'],amber:['Amber','#f0a000'],green:['Green','#2e9e4f'],teal:['Teal','#00897b'],cyan:['Cyan','#00acc1'],blue:['Blue','#1e88e5'],purple:['Purple','#8e44ad'],pink:['Pink','#e91e8c'],brown:['Brown','#6d4c41'],black:['Black','#222b36']},
  NETC=['#e53935','#1e88e5','#2e9e4f','#f0a000','#8e44ad','#00acc1','#e91e8c','#6d4c41','#43a047','#fb8c00','#3949ab','#d81b60'],
  VLEV=[[0.5,'#8a9aa8','0 V'],[6,'#00acc1','up to 6 V'],[13,'#1e88e5','up to 12 V'],[30,'#2e9e4f','24 V'],[60,'#8bc34a','48 V'],[150,'#f0a000','110 V'],[260,'#e53935','230 V'],[450,'#8e44ad','400 V'],[1e9,'#222b36','above 450 V']];
 const DEF={cm:'single',lg:1,wc:'auto',dc:'auto',ec:'auto',glow:'auto',wt:'normal',dots:1,dsp:'normal',dsz:'normal',ring:1,spd:'1',vol:'high',sr:1,ss:1,sa:1};
 let O=Object.assign({},DEF);try{Object.assign(O,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){}
 window.SIM_OPT=O;window.SND_OPT={vol:.9,relay:1,sw:1,alarm:1};
 const rgba=(h,a)=>{const n=parseInt(h.slice(1),16);return`rgba(${n>>16},${(n>>8)&255},${n&255},${a})`};
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(O))}catch(e){}};

 /* ---------- apply every option to the sheet ---------- */
 function apply(){
  const st=svg.style,cl=svg.classList,wc=WIRE[O.wc]&&WIRE[O.wc][1],dc=DOT[O.dc]&&DOT[O.dc][1],ec=PART[O.ec]&&PART[O.ec][1];
  const set=(k,v)=>v==null?st.removeProperty(k):st.setProperty(k,v);
  cl.toggle('u-wire',!!wc);set('--live',wc);set('--gcw',wc?rgba(wc,.7):null);
  cl.toggle('u-dot',!!dc);set('--dot',dc);
  cl.toggle('u-on',!!ec);set('--onc',ec);set('--onf',ec?rgba(ec,.4):null);set('--gco',ec?rgba(ec,.65):null);
  ['g-off','g-low','g-high'].forEach(k=>cl.remove(k));if(O.glow!=='auto')cl.add('g-'+O.glow);
  cl.toggle('u-wt',O.wt!=='normal');set('--wt',WT[O.wt][1]);
  cl.toggle('f-off',!O.dots);
  set('--fdur',DSP[O.dsp][1]+'s');
  cl.toggle('u-dz',O.dsz!=='normal');set('--dsz',DSZ[O.dsz][1]);
  cl.toggle('p-off',!O.ring);
  Object.assign(window.SND_OPT,{vol:VOL[O.vol][1],relay:O.sr?1:0,sw:O.ss?1:0,alarm:O.sa?1:0});
  if(window.sndVolume)window.sndVolume(VOL[O.vol][1]);
  S.dirty=1}

 /* ---------- simulation speed: run the solver several times per step (fast) or skip steps (slow motion) ---------- */
 const tick0=tick;let acc=0;
 tick=function(){const sp=+O.spd||1;acc+=sp;let n=0;while(acc>=1&&n<8){tick0();acc-=1;n++}if(acc>=1)acc=0};

 /* ---------- ribbon: extra groups in the Simulation tab ---------- */
 const opts=(m,cur)=>Object.keys(m).map(k=>`<option value="${k}" ${String(cur)===k?'selected':''}>${Array.isArray(m[k])?m[k][0]:m[k]}</option>`).join('');
 const sel=(lbl,key,m)=>`<label>${lbl}<select data-so="${key}">${opts(m,O[key])}</select></label>`;
 const chk=(lbl,key,tip)=>`<label title="${tip||''}"><input type="checkbox" data-so="${key}" ${O[key]?'checked':''}> ${lbl}</label>`;
 const grp=(name,inner)=>{const d=document.createElement('div');d.className='rp';d.dataset.so='g';d.innerHTML=`<div class=ri>${inner}</div><div class=rn>${name}</div>`;return d};
 const col=h=>`<div class=rsel>${h}</div>`;
 function build(){
  const body=document.getElementById('rbody');if(!body||!body.querySelector('[data-cmd=sim_std]'))return;
  const ps=[...body.children],gStyle=ps[0],gSnd=ps[1],gRun=ps[2];
  const colours=grp('Colours',col(sel('Wires','wc',WIRE)+sel('Dots','dc',DOT))+col(sel('Parts on','ec',PART)+sel('Glow','glow',GLOW))),
   look=grp('Wires & dots',col(sel('Thickness','wt',WT)+sel('Dot speed','dsp',DSP))+col(sel('Dot size','dsz',DSZ)+chk('Show dots','dots','Moving dots on live wires'))),
   fx=grp('Switching',col(chk('Ring / sparks','ring','Ring (and sparks in Realistic) around a part when it switches')));
  const wcol=grp('Wire colours',col(sel('Mode','cm',CM)+`<label>Selected wire<select data-so="sw" disabled>${opts(SWC,'')}</select></label>`)+col(chk('Colour key','lg','Show the colour key for voltage mode')+`<label><button type=button data-so="clrw" style="min-height:24px;padding:2px 10px">Clear wire colours</button></label>`));
  gStyle.after(colours,wcol,look,fx);
  if(gSnd){gSnd.querySelector('.ri').insertAdjacentHTML('beforeend',col(sel('Volume','vol',VOL)+`<label><button type=button data-so="test" style="min-height:24px;padding:2px 10px">▶ Test sound</button></label>`)+col(chk('Relays','sr','Relay and contactor clicks, latch')+chk('Switches','ss','Push buttons, switches, breakers, E-stop')+chk('Alarms','sa','Trip, fuse blow, buzzer')))}
  if(gRun)gRun.querySelector('.ri').insertAdjacentHTML('beforeend',col(sel('Speed','spd',SPD)));
  body.appendChild(grp('Options',`<button class=rb type=button data-so="reset" title="Back to the default simulation options"><svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 3-6.200M4 4v4h4"/></svg><span>Defaults</span></button>`))}
 const rib1=ribbon;ribbon=function(){rib1.apply(this,arguments);if(ribTab==='Simulation')build()};
 const rb=document.getElementById('rbody');
 rb.addEventListener('change',e=>{const t=e.target.closest&&e.target.closest('[data-so]');if(!t||t.dataset.so==='g'||t.tagName==='BUTTON')return;
  const k=t.dataset.so;
  if(k==='sw'){const w=S.sel&&S.sel.k==='w'&&S.wires.find(x=>x.id==S.sel.id);if(w){if(t.value)w.sc=t.value;else delete w.sc;S.dirty=1;if(typeof commit==='function')commit()}return}O[k]=t.type==='checkbox'?(t.checked?1:0):t.value;save();apply();if(k==='spd')toast('Simulation speed '+SPD[O.spd].split(' ')[0])});
 rb.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('button[data-so]');if(!b)return;
  if(b.dataset.so==='reset'){Object.assign(O,DEF);save();apply();ribbon();toast('Simulation options reset')}
  else if(b.dataset.so==='clrw'){let n=0;S.wires.forEach(w=>{if(w.sc){delete w.sc;n++}});S.dirty=1;toast(n+' wire colour'+(n===1?'':'s')+' cleared')}
  else if(b.dataset.so==='test'){if(window.sndTest)window.sndTest()}});

 /* ---------- wire colour modes (every frame, after the sheet is drawn) ---------- */
 const NI=new Map(),hexA=(h,a)=>rgba(h,a),mixc=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
 let leg=null;
 function legend(show){
  if(!leg){leg=document.createElement('div');leg.id='simLeg';leg.style.cssText='position:absolute;left:10px;top:10px;z-index:5;background:rgba(255,255,255,.94);border:1px solid #cdd7e1;border-radius:6px;padding:6px 9px;font:11px Arial,sans-serif;color:#17283a;pointer-events:none;box-shadow:0 1px 4px rgba(0,0,0,.15)';
   leg.innerHTML='<b>Wire voltage</b>'+VLEV.map(l=>`<div style="display:flex;align-items:center;gap:6px;margin-top:2px"><i style="display:inline-block;width:18px;height:4px;border-radius:2px;background:${l[1]}"></i>${l[2]}</div>`).join('');
   (document.getElementById('cv')||document.body).appendChild(leg)}
  leg.style.display=show?'block':'none'}
 function glowOf(col){
  if(svg.classList.contains('big')||svg.classList.contains('g-off'))return'none';
  const g=svg.classList.contains('g-high')?5:svg.classList.contains('g-low')?1.5:(svg.classList.contains('a-good')||svg.classList.contains('a-real'))?2.5:0;
  return g?`drop-shadow(0 0 ${g}px ${hexA(col,.7)})`:'none'}
 function colourWires(){
  const mode=O.cm,run=S.run,anyW=S.wires.some(w=>w.sc);
  legend(run&&mode==='volt'&&!!O.lg);
  if(!run||(mode==='single'&&!anyW))return;
  const wi=new Map(S.wires.map((w,i)=>[w.id,i]));
  svg.querySelectorAll('path.hit[data-w]').forEach(hit=>{
   let a=hit.previousElementSibling,w=a;if(a&&a.classList.contains('fl'))w=a.previousElementSibling;
   if(!w||!w.classList.contains('wire')||w.classList.contains('sel')||w.classList.contains('air'))return;
   if(!w.classList.contains('hot')&&!w.classList.contains('v'))return;
   const wr=S.wires.find(x=>x.id==hit.dataset.w);if(!wr)return;
   const k=S.tk&&S.tk[wr.a];let col=null;
   if(wr.sc&&SWC[wr.sc])col=SWC[wr.sc][1];
   else if(mode==='wire')col=NETC[(wi.get(wr.id)||0)%NETC.length];
   else if(mode==='net'){const n=S.net?S.net(wr.a):wr.a;if(!NI.has(n))NI.set(n,NI.size);col=NETC[NI.get(n)%NETC.length]}
   else if(mode==='volt'){const v=Math.abs(k?k.v:0);col=(VLEV.find(l=>v<l[0])||VLEV[VLEV.length-1])[1]}
   else if(mode==='cur'){const t=Math.min(1,Math.log10(1+(k?k.f:0)*50)/2.5),c=mixc([245,180,0],[255,70,20],t);col=`rgb(${c})`}
   if(!col)return;
   w.style.stroke=col;if(col[0]==='#')w.style.filter=glowOf(col);else w.style.filter=glowOf('#f0780a')})}
 function syncSel(){const s=document.querySelector('#rbody select[data-so=sw]');if(!s)return;
  const w=S.sel&&S.sel.k==='w'&&S.wires.find(x=>x.id==S.sel.id);s.disabled=!w;if(document.activeElement!==s)s.value=w&&w.sc||'';s.title=w?'Colour of the selected wire while it is live':'Click a wire on the sheet first'}
 (function loop(){try{colourWires();syncSel()}catch(e){}requestAnimationFrame(loop)})();
 window.simoptSet=o=>{Object.assign(O,DEF,o||{});save();apply();if(ribTab==='Simulation')ribbon()};   /* v8.75: used by presets.js */
 apply();if(ribTab==='Simulation')ribbon();
})();
