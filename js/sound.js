/* ElectroSim v8.69 – Sound (synthesised with the Web Audio API, no sound files) + sound On / Off button.
   Plays while the simulation runs:
     relay / contactor / timer contact pulls in and drops out · alternating-relay outputs · latch (seal-in) tick when a start button is
     released and the relay stays on · voltage-monitor latch · toggle switch, selector, push button (press + release) · circuit breaker / RCD ·
     emergency stop (heavy latch clunk) · limit / sensor ticks · overload trip · fuse blow · buzzer (continuous while powered).
   The button 🔊 / 🔇 in the top bar (also ⋯ menu → Sound on / off, and type SOUND on the sheet) switches all of it on / off; the choice is remembered.
   Loaded last (after easynav.js). Reads the simulation state every frame and compares it with the previous frame – no existing part changed. */
'use strict';
(function(){
 const KEY='electrosim.sound';
 let on=true;try{on=localStorage.getItem(KEY)!=='0'}catch(e){}
 let ctx=null,out=null,noise=null,buzz=null,lastAny=[],was=false,wet=null;
 const M=new Map(),PUL=window.SND_PUL=new Map(),last=new Map();

 /* ---------- audio engine ---------- */
 function ac(){
  if(ctx)return ctx;
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
  try{ctx=new AC()}catch(e){return null}
  const comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=6;comp.attack.value=.002;comp.release.value=.12;
  out=ctx.createGain();out.gain.value=(window.SND_OPT&&window.SND_OPT.vol)||.9;out.connect(comp);comp.connect(ctx.destination);
  const n=ctx.sampleRate*.5|0,b=ctx.createBuffer(1,n,ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;noise=b;
  /* small-room echo used by the Realistic animation style */
  const rl=ctx.sampleRate*.45|0,rb=ctx.createBuffer(2,rl,ctx.sampleRate);for(let ch=0;ch<2;ch++){const r=rb.getChannelData(ch);for(let i=0;i<rl;i++)r[i]=(Math.random()*2-1)*Math.pow(1-i/rl,3.2)}
  const cv=ctx.createConvolver();cv.buffer=rb;wet=ctx.createGain();wet.gain.value=.5;wet.connect(cv);cv.connect(out);
  return ctx}
 const wake=()=>{if(!on)return;const c=ac();if(c&&c.state==='suspended')c.resume()};
 ['pointerdown','keydown','touchstart'].forEach(e=>addEventListener(e,wake,{capture:true,passive:true}));

 /* building blocks: every sound is a few of these, scheduled at time t0 on a (stereo-panned) bus */
 function bus(pan){const g=ctx.createGain();let n=g;if(ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=Math.max(-.7,Math.min(.7,pan||0));g.connect(p);n=p}n.connect(out);if(window.SIM_ANIM==='real'&&wet){const w=ctx.createGain();w.gain.value=.55;n.connect(w);w.connect(wet)}return g}
 function nz(b,t,freq,q,vol,dur,type){            /* filtered noise burst = the "tick" */
  const s=ctx.createBufferSource();s.buffer=noise;s.playbackRate.value=.8+Math.random()*.4;
  const f=ctx.createBiquadFilter();f.type=type||'bandpass';f.frequency.value=freq;f.Q.value=q;
  const g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.0012);g.gain.exponentialRampToValueAtTime(.0008,t+dur);
  s.connect(f);f.connect(g);g.connect(b);s.start(t,Math.random()*.2,dur+.02)}
 function tn(b,t,f0,f1,vol,dur,type){            /* sine / triangle sweep = the "thump" or the "ping" */
  const o=ctx.createOscillator();o.type=type||'sine';o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
  const g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.002);g.gain.exponentialRampToValueAtTime(.0008,t+dur);
  o.connect(g);g.connect(b);o.start(t);o.stop(t+dur+.02)}

 const R=()=>.93+Math.random()*.14;               /* small random pitch change so repeats do not sound like a machine gun */
 const SND={
  relayOn:(b,t,r)=>{nz(b,t,3300*r,1.3,.55,.03);nz(b,t+.009,4600*r,1.6,.32,.016);tn(b,t,190*r,85,.28,.055)},
  relayOff:(b,t,r)=>{nz(b,t,2600*r,1.2,.3,.022);tn(b,t,150*r,80,.12,.03)},
  contOn:(b,t,r)=>{nz(b,t,1300*r,.8,.8,.07);nz(b,t+.014,2300*r,1.2,.45,.03);tn(b,t,100*r,42,.6,.14);tn(b,t+.014,220*r,110,.18,.05)},
  contOff:(b,t,r)=>{tn(b,t,80*r,38,.4,.1);nz(b,t,950*r,.9,.34,.045)},
  swOn:(b,t,r)=>{nz(b,t,4200*r,2.2,.42,.011);nz(b,t+.05,3000*r,2,.3,.013);tn(b,t,320*r,150,.1,.03)},
  swOff:(b,t,r)=>{nz(b,t,3300*r,2.2,.38,.011);nz(b,t+.045,2400*r,2,.26,.013);tn(b,t,260*r,120,.09,.03)},
  pbDown:(b,t,r)=>{nz(b,t,2700*r,2,.4,.014);tn(b,t,230*r,120,.16,.022)},
  pbUp:(b,t,r)=>{nz(b,t,3600*r,2.2,.24,.009)},
  breaker:(b,t,r)=>{tn(b,t,135*r,55,.55,.15);nz(b,t,1800*r,1,.5,.04);nz(b,t+.026,3500*r,1.8,.36,.018)},
  estop:(b,t,r)=>{tn(b,t,105*r,40,.8,.22);nz(b,t,900*r,.8,.75,.07);tn(b,t+.01,1800*r,1500,.12,.22,'triangle');nz(b,t+.03,3000*r,1.5,.3,.02)},
  estopUp:(b,t,r)=>{nz(b,t,3500*r,1.6,.32,.015);tn(b,t,1250*r,1100,.07,.12,'triangle');tn(b,t,160*r,90,.15,.05)},
  latch:(b,t,r)=>{nz(b,t,2200*r,1.8,.34,.016);tn(b,t,170*r,95,.14,.035);nz(b,t+.07,3900*r,2,.3,.012)},
  sense:(b,t,r)=>{nz(b,t,5000*r,2.5,.2,.008)},
  trip:(b,t,r)=>{tn(b,t,140*r,50,.7,.2);nz(b,t,2000*r,.9,.6,.05);nz(b,t+.03,3800*r,1.5,.4,.02);tn(b,t+.05,900,380,.12,.2,'sawtooth')},
  fuse:(b,t,r)=>{nz(b,t,6000,.4,.7,.16,'highpass');nz(b,t,1500*r,.7,.6,.05);tn(b,t,300,70,.3,.08)}
 };
 function play(kind,c,force){
  if(!on||!ctx||ctx.state!=='running'||!SND[kind])return;
  const so=window.SND_OPT;if(so&&!force&&so[catOf(kind)]===0)return;
  const now=ctx.currentTime;
  if(c){const k=c.id,lt=last.get(k)||0;if(now-lt<.025)return;last.set(k,now)}   /* one part cannot click faster than 40 / s */
  lastAny=lastAny.filter(x=>now-x<.1);if(lastAny.length>10)return;lastAny.push(now);
  let pan=0;try{if(c&&typeof paperPx==='function')pan=(c.x/paperPx()[0]-.5)*1.4}catch(e){}
  const b=bus(pan);SND[kind](b,now+.002,R());setTimeout(()=>{try{b.disconnect()}catch(e){}},1500)}
 const CAT={relayOn:'relay',relayOff:'relay',contOn:'relay',contOff:'relay',latch:'relay',trip:'alarm',fuse:'alarm'};
 const catOf=k=>CAT[k]||'sw';
 window.sndVolume=v=>{if(out)out.gain.value=v};
 window.sndTest=()=>{if(!ac())return;wake();let i=0;[['relayOn',0],['contOn',350],['swOn',800],['pbDown',1050],['latch',1250],['breaker',1700],['trip',2200]].forEach(([k,ms])=>setTimeout(()=>play(k,null,1),ms))};
 /* arc crackle when a contact opens under load (realism.js): more and louder crackle for a bigger current I (amps) */
 const lastArc=new Map();
 window.sndArc=(I,c)=>{
  if(!on||!ac()||ctx.state!=='running')return;
  const now=ctx.currentTime,k=c?c.id:0,lt=lastArc.get(k)||0;if(now-lt<.06)return;lastArc.set(k,now);
  const u=Math.min(1,Math.log10(1+Math.max(0,I))/1.6),n=3+Math.round(u*11),dur=.07+u*.3,vol=.16+.4*u;
  let pan=0;try{if(c&&typeof paperPx==='function')pan=(c.x/paperPx()[0]-.5)*1.4}catch(e){}
  const b=bus(pan),t0=now+.002;
  for(let i=0;i<n;i++){const t=t0+(i?Math.random()*dur:0);nz(b,t,2200+Math.random()*5200,.6+Math.random(),vol*(.5+Math.random()*.6),.006+Math.random()*.02,'bandpass')}
  nz(b,t0,7000,.4,vol*.8,.05+u*.1,'highpass');
  if(I>=5)tn(b,t0,170,55,.18+.3*u,.1+.12*u);
  setTimeout(()=>{try{b.disconnect()}catch(e){}},1500)};
 window.sndPlay=play;                                /* usable from other code: sndPlay('relayOn') */

 /* ---------- buzzer: continuous while a buzzer is powered ---------- */
 function buzzer(want){
  if(!ctx)return;
  if(want&&on&&ctx.state==='running'&&!(window.SND_OPT&&window.SND_OPT.alarm===0)){
   if(!buzz){const o=ctx.createOscillator(),o2=ctx.createOscillator(),f=ctx.createBiquadFilter(),g=ctx.createGain();
    o.type='square';o.frequency.value=2300;o2.type='square';o2.frequency.value=2310;f.type='lowpass';f.frequency.value=3200;
    g.gain.value=0;o.connect(f);o2.connect(f);f.connect(g);g.connect(out);o.start();o2.start();g.gain.setTargetAtTime(.045,ctx.currentTime,.01);buzz={o,o2,g}}}
  else if(buzz){const z=buzz;buzz=null;z.g.gain.setTargetAtTime(0,ctx.currentTime,.015);setTimeout(()=>{try{z.o.stop();z.o2.stop()}catch(e){}},120)}}

 /* ---------- what counts as what ---------- */
 const TOGGLE=new Set(['sw','sel2','ky','iso','iso2','iso3','iso4']),
  BREAKER=new Set(['mcb','mcb2','mcb3','mccb','mccb2','mccb3','mccb4','mpcb3','rcd','rcd4','rcbo','rcbo4']),
  SENSE=new Set(['sens','lim','limnc','pnp','npn','prs','lvs','ths']),
  HEAVY=new Set(['con','con3','coil']);
 const contact=c=>{const s=c.s,t=c.type;return t==='ton'||t==='tcoil'?!!s.done:t==='tcoff'?!!(s.en||s.hold):!!s.en};
 const pulse=(c,col)=>{PUL.set(c.id,{t:performance.now(),col})};
 const fresh=c=>({x:0,on:!!c.s.on,pr:!!c.s.pressed,pos:c.p&&c.p.pos,tr:!!c.s.tripped,bl:!!c.s.blown,lat:0,c1:0,c2:0});

 function scan(){
  if(typeof S==='undefined'||!S.comps)return;
  if(!S.run){if(was){was=false;M.clear();buzzer(false)}return}
  if(!was){was=true;M.clear()}
  let buz=false;
  S.comps.forEach(c=>{
   const s=c.s,t=c.type,d=D[t];if(!d||!s)return;
   let p=M.get(c.id);if(!p){p=fresh(c);M.set(c.id,p)}
   /* relays, contactors, timers (their contact) */
   if(d.xr){const x=contact(c);
    if(x!==!!p.x){p.x=x?1:0;const h=HEAVY.has(t);play(x?(h?'contOn':'relayOn'):(h?'contOff':'relayOff'),c);pulse(c,x?'#12a36b':'#8a9aa8')}}
   if(t==='alt'){const a=!!s.c1,b=!!s.c2;if(a!==!!p.c1){p.c1=a?1:0;play(a?'relayOn':'relayOff',c);pulse(c,a?'#12a36b':'#8a9aa8')}if(b!==!!p.c2){p.c2=b?1:0;play(b?'relayOn':'relayOff',c);pulse(c,b?'#12a36b':'#8a9aa8')}}
   /* voltage monitoring relay latched on a fault */
   if(s.lat!=null&&t!=='ups'){const l=!!s.lat;if(l!==!!p.lat){p.lat=l?1:0;if(l){play('latch',c);pulse(c,'#d93a3a')}}}
   /* push buttons: press and release */
   if(t==='pb'||t==='pbnc'){const q=!!s.pressed;
    if(q!==p.pr){p.pr=q;play(q?'pbDown':'pbUp',c);pulse(c,'#1a7fe0');if(!q)latchCheck()}}
   /* switches */
   else if(TOGGLE.has(t)||BREAKER.has(t)||t==='estop'||SENSE.has(t)){const q=!!s.on;
    if(q!==p.on){p.on=q;
     if(t==='estop')play(q?'estop':'estopUp',c);
     else if(BREAKER.has(t))play('breaker',c);
     else if(SENSE.has(t))play('sense',c);
     else play(q?'swOn':'swOff',c);
     pulse(c,t==='estop'?'#d93a3a':'#1a7fe0')}}
   else if(t==='sel3'){if(c.p.pos!==p.pos){p.pos=c.p.pos;play('swOn',c);pulse(c,'#1a7fe0')}}
   /* protection */
   if(!!s.tripped!==p.tr){p.tr=!!s.tripped;if(p.tr){play('trip',c);pulse(c,'#d93a3a')}}
   if(!!s.blown!==p.bl){p.bl=!!s.blown;if(p.bl){play('fuse',c);pulse(c,'#d93a3a')}}
   if(t==='buz'&&c.o&&c.o.p>.02*c.p.P)buz=true;
  });
  buzzer(buz)}

 /* a start button was released: if a relay / contactor that was on is still on a moment later, it is sealed in (latched) → soft "latch" tick */
 function latchCheck(){
  const on0=new Set(S.comps.filter(c=>D[c.type]&&D[c.type].xr&&contact(c)).map(c=>c.id));
  if(!on0.size)return;
  setTimeout(()=>{if(!S.run)return;const k=S.comps.find(c=>on0.has(c.id)&&contact(c));if(k){play('latch',k);pulse(k,'#12a36b')}},90)}

 /* ---------- button ---------- */
 const ICON_ON='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
  ICON_OFF='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
 function paint(){
  const b=document.getElementById('bSnd'),m=document.getElementById('mSnd');
  if(b){b.innerHTML=on?ICON_ON:ICON_OFF;b.setAttribute('aria-pressed',String(on));b.title='Sound '+(on?'ON':'OFF')+' – click to switch';b.setAttribute('aria-label','Sound '+(on?'on':'off'))}
  if(m)m.textContent='Sound: '+(on?'ON':'OFF')+' – click to switch'}
 function set(v,quiet){
  on=!!v;try{localStorage.setItem(KEY,on?'1':'0')}catch(e){}
  if(on){wake();setTimeout(()=>{if(ac()&&ctx.state==='running'&&!quiet)play('swOn')},30)}else buzzer(false);
  paint();dispatchEvent(new Event('sndchange'));if(!quiet&&typeof toast==='function')toast('Sound '+(on?'on':'off'))}
 window.sndToggle=()=>set(!on);window.sndIsOn=()=>on;

 function mount(){
  const stat=document.getElementById('stat');
  if(stat&&!document.getElementById('bSnd')){const b=document.createElement('button');b.className='ic';b.id='bSnd';b.type='button';stat.parentNode.insertBefore(b,stat);b.addEventListener('click',e=>{e.stopPropagation();set(!on)})}
  const menu=document.getElementById('menu'),ref=document.getElementById('mWn');
  if(menu&&ref&&!document.getElementById('mSnd')){const m=document.createElement('button');m.id='mSnd';m.type='button';ref.parentNode.insertBefore(m,ref.nextSibling);m.addEventListener('click',()=>{set(!on);if(typeof menuClose==='function')menuClose()})}
  paint()}
 if(typeof CMDS!=='undefined')CMDS.unshift({n:'Sound on / off',a:['sound','snd','mute','audio'],h:'relay and switch sounds',f:()=>set(!on)});   /* type S-O-U-N-D on the sheet */
 mount();
 (function loop(){try{scan()}catch(e){}requestAnimationFrame(loop)})();
})();
