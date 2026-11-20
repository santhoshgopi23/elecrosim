/* ElectroSim v8.45 (phase 1) – VFD programming page + drive type chooser.  Loaded after vfdhelp.js.
   vfdAsk(c)  : asks "Simple or Programmable drive?" when a VFD is placed.
   vpOpen(c)  : full-screen programming page (Siemens-style parameter list with P-numbers, search, groups, keypad with live values). */
'use strict';
let vpC=null,vpDlg=null,vpTm=0;const vpS={g:-1,q:'',ch:0};
const vpE=s=>String(s==null?'':s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])),vpQ=(id)=>vpDlg.querySelector(id),
 vpSame=(c,r)=>c.p[r[0]]==null||String(c.p[r[0]])===String(r[1]),vpSm=c=>c.p.kind==='Simple',vpBase=c=>VPS.filter(r=>!vpSm(c)||VSK.includes(r[0]));
function vpRows(){const c=vpC,q=vpS.q.trim().toLowerCase();
 return vpBase(c).filter(r=>(vpS.g<0||r[5]===vpS.g)&&!(vpS.ch&&vpSame(c,r))&&(!q||(r[6]+' '+r[3]+' '+r[0]+' '+r[7]).toLowerCase().includes(q)))}
function vpRow(r){const c=vpC,k=r[0],v=c.p[k]==null?r[1]:c.p[k],o=(vpSm(c)&&k==='rsrc')?['Keypad','AI1']:r[4],
 inp=o?`<select data-k=${k}>${o.map(x=>`<option${x===v?' selected':''}>${vpE(x)}</option>`).join('')}</select>`:`<input type=number step=any data-k=${k} value="${vpE(v)}">`;
 return`<tr data-k=${k} class="${vpSame(c,r)?'':'chg'}"><td class=pn>${r[6]||'–'}</td><td>${vpE(r[3])}</td><td>${inp}</td><td class=un>${vpE(r[2])}</td><td class=fd>${vpE(r[1])}</td></tr>`}
function vpDraw(){const c=vpC,sm=vpSm(c),base=vpBase(c),rows=vpRows(),nch=base.filter(r=>!vpSame(c,r)).length,tab=vpQ('#vpTab'),st=tab.scrollTop;
 vpQ('#vpT').textContent=`${c.label} – VFD programming · ${sm?'Simple drive':'Programmable drive (Siemens-style)'}`;
 let g=`<button data-g=-1 class="${vpS.g<0?'on':''}">All parameters <i>${base.length}</i></button>`;
 VGR.forEach((n,i)=>{const k=base.filter(r=>r[5]===i).length;if(k)g+=`<button data-g=${i} class="${vpS.g===i?'on':''}">${vpE(n)} <i>${k}</i></button>`});
 vpQ('#vpG').innerHTML=g;
 vpQ('#vpTb').innerHTML=`<label><input type=checkbox data-o=chg ${vpS.ch?'checked':''}> Changed from factory only (${nch})</label><span class=sp></span><span class=mu>${rows.length} parameter${rows.length==1?'':'s'}</span>${sm?'':`<select id=vpMac>${VMAC.map((m,i)=>`<option value=${i}>${vpE(m[0])}</option>`).join('')}</select><button data-o=macro>Apply macro</button><button data-o=wiz>Quick commissioning</button>`}<button data-o=kind>${sm?'Change to Programmable drive':'Change to Simple drive'}</button><button data-o=factory class=dn>Factory reset</button>`;
 let h='',lg=-1;rows.forEach(r=>{if(vpS.g<0&&r[5]!==lg){lg=r[5];h+=`<tr class=gh><td colspan=5><b>${vpE(VGR[lg])}</b> – ${vpE(VGH[lg])}</td></tr>`}h+=vpRow(r)});
 tab.innerHTML=rows.length?`<table><thead><tr><th>Param</th><th>Name</th><th>Value</th><th>Unit</th><th>Factory</th></tr></thead><tbody>${h}</tbody></table>`:'<p class=mu style="padding:14px">No parameter matches.</p>';tab.scrollTop=st;
 vpLive()}
function vpLive(){const c=vpC;if(!c||!vpDlg.open)return;const s=c.s||{},p=c.p,on=!!(S.run&&c.o),fo=on?(s.fo||0):0;
 vpQ('#kHz').textContent=fo.toFixed(1)+' Hz';vpQ('#kHz').className=on&&s.tripped?'bad':'';
 vpQ('#kSt').textContent=on?vShort(c):'SIMULATION STOPPED';
 vpQ('#kIn').textContent=on?`${(s.io||0).toFixed(1)} A · ${(s.vo||0).toFixed(0)} V · ${Math.round(fo/Math.max(1,+p.fb||50)*(+p.rpm||1440))} rpm`:'press ▶ Run (top bar)';
 vpQ('#kInf').innerHTML=`Command: ${vpE(p.cmd==='Terminal'?(p.wire===VWR[0]?'terminals, 2-wire':'terminals, 3-wire'):p.cmd)}<br>Setpoint: ${vpE(p.rsrc)}${on?' → '+(s.fref||0).toFixed(1)+' Hz':''}<br>Ramp ${vpE(p.acc)} s up / ${vpE(p.dec)} s down<br>Limits ${vpE(p.fmin)} – ${vpE(p.fmax)} Hz`+(on&&s.tripped?`<br><b class=bad>${vpE(s.fc)} ${vpE(s.ft)}</b>`:'')+`<hr><b>Fault history</b><br>${(s.hist&&s.hist.length)?s.hist.slice(0,6).map(vpE).join('<br>'):'none'}`}
function vpOpen(c){vpC=c;
 if(!vpDlg){vpDlg=document.createElement('dialog');vpDlg.id='dVFD';document.body.appendChild(vpDlg);
  vpDlg.innerHTML=`<div class=vh><b id=vpT></b><span class=sp></span><button data-o=run>▶ Run</button><button data-o=stop>■ Stop</button><button data-o=close class=pri>Close</button></div>
  <div class=vm><aside class=vg><input id=vpQ type=search placeholder="Search P-number or name" aria-label="Search parameters"><div id=vpG></div></aside>
  <section class=vc><div class=vtb id=vpTb></div><div id=vpTab class=vt></div><div id=vpHelp class=vhp>Click a value to see what the parameter does.</div></section>
  <aside class=vk><div class=lcd><div id=kHz>0.0 Hz</div><div id=kSt></div><div id=kIn></div></div>
   <div class=kb><button data-o=krun class=g>RUN</button><button data-o=kstop class=r>STOP</button><button data-o=krst>RST</button><button data-o=kup title="Keypad setpoint +1 Hz">▲</button><button data-o=kdn title="Keypad setpoint −1 Hz">▼</button></div>
   <div id=kInf class=kinf></div><p class=mu>Change a value on the left, press ▶ Run and watch the drive react. P-numbers are the Siemens (SINAMICS V20 / MICROMASTER) numbers.</p></aside></div>`;
  vpDlg.addEventListener('input',e=>{if(e.target.id==='vpQ'){vpS.q=e.target.value;vpDraw()}});
  vpDlg.addEventListener('click',e=>{const G=e.target.closest('[data-g]');if(G){vpS.g=+G.dataset.g;vpDraw();return}
   const b=e.target.closest('[data-o]');if(!b||b.type==='checkbox')return;const o=b.dataset.o,c=vpC;
   if(o==='close')vpDlg.close();else if(o==='run')document.getElementById('bRun').click();else if(o==='stop')document.getElementById('bStop').click();
   else if(o==='kind'){c.p.kind=vpSm(c)?'Programmable':'Simple';D.vfd.chg(c,'kind');vpDraw()}
   else if(o==='wiz')vpWiz();else if(o==='macro'){const i=+vpQ('#vpMac').value;if(i||confirm('Set every VFD parameter back to its factory value?')){const t=i?vpMacro(c,i):(D.vfd.clk(c,'factory'),VMAC[0][2]);vpDraw();vpQ('#vpHelp').innerHTML=`<b>${vpE(VMAC[i][0])}</b> applied. ${vpE(t)}`}}
   else if(o==='factory'){D.vfd.clk(c,'factory');vpDraw()}
   else if(o==='krun'){D.vfd.clk(c,'run');vpDraw()}else if(o==='kstop'){D.vfd.clk(c,'stop');vpDraw()}else if(o==='krst')D.vfd.clk(c,'reset');
   else if(o==='kup'||o==='kdn'){if(c.p.rsrc!=='Keypad')toast('The ▲ ▼ keys change the keypad setpoint – set the setpoint source to Keypad first');else{c.p.fset=Math.max(0,Math.min(+c.p.fmax||50,(+c.p.fset||0)+(o==='kup'?1:-1)));S.dirty=1;vpDraw()}}});
  vpDlg.addEventListener('change',e=>{const t=e.target;if(t.dataset.o==='chg'){vpS.ch=t.checked?1:0;vpDraw();return}
   const k=t.dataset.k,r=k&&VPS.find(x=>x[0]===k);if(!r||!vpC)return;
   vpC.p[k]=r[4]?t.value:(t.value===''||isNaN(+t.value)?r[1]:+t.value);if(t.type==='number')t.value=vpC.p[k];S.dirty=1;t.closest('tr').classList.toggle('chg',!vpSame(vpC,r))});
  vpDlg.addEventListener('focusin',e=>{const tr=e.target.closest&&e.target.closest('tr[data-k]'),r=tr&&VPS.find(x=>x[0]===tr.dataset.k);
   if(r)vpQ('#vpHelp').innerHTML=`<b>${r[6]||'No Siemens P-number'} – ${vpE(r[3])}</b> · factory value ${vpE(r[1])} ${vpE(r[2])}<br>${vpE(r[7])}`});
  vpDlg.addEventListener('close',()=>{clearInterval(vpTm);if(typeof props==='function')props()})}
 vpS.q='';vpS.g=-1;vpS.ch=0;vpQ('#vpQ').value='';vpDlg.showModal();vpDraw();clearInterval(vpTm);vpTm=setInterval(vpLive,250)}
function vfdAsk(c){if(c&&c.type==='trm'){const same=S.comps.filter(q=>q!==c&&q.type==='trm'&&q.p.strip===c.p.strip).map(q=>parseInt(q.p.num)||0);c.p.num=String(Math.max(0,...same)+1);S.dirty=1;return}if(!c||c.type!=='vfd')return;const o=document.getElementById('dVFDsel');if(o)o.remove();
 const d=document.createElement('dialog');d.id='dVFDsel';
 d.innerHTML=`<h2>Which frequency drive?</h2><p class=mu>Pick the drive for this circuit. You can change it later in Properties → Drive type.</p><div class=vcards>
  <div class=vcard><h3>Simple drive</h3><p>Start, stop, direction and speed – almost nothing to set up.</p><ul><li>L1 L2 L3 in, U V W to the motor, PE</li><li>RUN (DI1) and REV (DI2), COM, +24 V</li><li>Speed from the keypad or one analog input (AI1 with +10 V pot or 4-20 mA)</li><li>Min / max frequency, ramps, V/f boost – about 19 settings</li><li>No relays, outputs, presets or PID</li></ul><p class=mu>Good for a conveyor, fan or pump with a pot or one fixed speed.</p><button class=pri data-s=Simple>Use simple drive</button></div>
  <div class=vcard><h3>Programmable drive (Siemens-style)</h3><p>The full drive – for real applications and for learning VFD programming.</p><ul><li>6 digital inputs, 2 analog inputs, 2 analog outputs, 2 transistor outputs, 2 relays</li><li>About 85 parameters with Siemens P-numbers</li><li>Fixed speeds, MOP, jog, PID, 2- / 3-wire control</li><li>Motor I²t, under / over voltage, auto restart, faults</li><li>Full-screen programming page with keypad</li></ul><button class=pri data-s=Programmable>Use programmable drive</button><button data-s=prog>Programmable + open programming page</button></div></div>`;
 document.body.appendChild(d);
 d.addEventListener('click',e=>{const b=e.target.closest('[data-s]');if(!b)return;const s=b.dataset.s;c.p.kind=s==='Simple'?'Simple':'Programmable';D.vfd.chg(c,'kind');d.close();if(typeof props==='function')props();if(s==='prog')vpOpen(c)});
 d.addEventListener('close',()=>d.remove());d.showModal()}
/* ---- phase 2a: connection macros, quick commissioning wizard ---- */
const VMAC=[['Factory defaults',null,'All parameters back to factory values.'],
 ['Keypad control (no wiring)',{cmd:VCMD[1],rsrc:VSRC[0]},'RUN / STOP and ▲ ▼ on the keypad. Only the mains and motor are wired.'],
 ['Terminals 2-wire + analog speed',{rsrc:'AI1',d1:VDI[1],d2:VDI[3],d3:VDI[6]},'DI1 = run (switch), DI2 = reverse (switch), DI3 = fault reset. Speed pot between +10V, AI1, COM. 24 V from +24V through the switches.'],
 ['Fixed speeds (3 bits)',{rsrc:VSRC[4],d1:VDI[1],d2:VDI[10],d3:VDI[11],d4:VDI[12],d5:VDI[6]},'DI1 = run, DI2 / DI3 / DI4 = speed bits 0 / 1 / 2 (7 preset speeds, P1001-P1007), DI5 = reset.'],
 ['3-wire push buttons',{wire:VWR[1],rsrc:'AI1',d1:VDI[1],d2:VDI[2],d3:VDI[15],d4:VDI[6]},'DI1 = START forward (push button NO), DI2 = START reverse (NO), DI3 = STOP (push button NC, wired in series), DI4 = reset. Speed from AI1.'],
 ['Motorised potentiometer (MOP)',{rsrc:VSRC[5],d1:VDI[1],d2:VDI[13],d3:VDI[14],d4:VDI[6]},'DI1 = run, DI2 = faster, DI3 = slower, DI4 = reset. The speed is kept in the drive.'],
 ['PID process control',{rsrc:VSRC[6],pid_fb:'AI2',pid_sp:'Keypad (%)',a2t:'4-20 mA',awb:'Trip F0080',d1:VDI[1],d2:VDI[6]},'DI1 = run, DI2 = reset. Sensor 4-20 mA on AI2 (loop from +24V). Setpoint in % on the PID page of the parameters.']];
function vpMacro(c,i){const m=VMAC[i];if(!m[1]){D.vfd.clk(c,'factory');return m[2]}
 ['d1','d2','d3','d4','d5','d6'].forEach(k=>c.p[k]=VDI[0]);Object.assign(c.p,{cmd:VCMD[0],wire:VWR[0],rsrc:VSRC[0]},m[1]);S.dirty=1;return m[2]}
const VWZ=[['P','Motor rated power','W'],['V','Supply / motor voltage','V'],['Imot','Motor rated current','A'],['rpm','Motor rated speed','rpm'],['fb','Motor base frequency','Hz'],['fmin','Minimum frequency','Hz'],['fmax','Maximum frequency','Hz'],['acc','Ramp-up time','s'],['dec','Ramp-down time','s']];
function vpWiz(){const c=vpC,o=document.getElementById('dVFDwiz');if(o)o.remove();const d=document.createElement('dialog');d.id='dVFDwiz';
 d.innerHTML=`<h2>Quick commissioning</h2><p class=mu>Step 1: type the motor name-plate. Step 2: ramps and limits. Step 3: choose how the drive is controlled (connection macro).</p>
 <div class=wz>${VWZ.map(([k,l,u])=>`<label>${l} (${VPS.find(r=>r[0]===k)[6]})<span><input type=number step=any data-w=${k} value="${vpE(c.p[k])}"> ${u}</span></label>`).join('')}
 <label>Connection macro<select id=wzM>${VMAC.slice(1).map((m,i)=>`<option value=${i+1}>${vpE(m[0])}</option>`).join('')}<option value=0>Keep my current settings</option></select></label></div>
 <div class=act><button data-w2=x>Cancel</button><button class=pri data-w2=ok>Apply</button></div>`;
 document.body.appendChild(d);d.addEventListener('click',e=>{const b=e.target.closest('[data-w2]');if(!b)return;
  if(b.dataset.w2==='ok'){d.querySelectorAll('[data-w]').forEach(i=>{if(i.value!==''&&!isNaN(+i.value))c.p[i.dataset.w]=+i.value});const m=+d.querySelector('#wzM').value;S.dirty=1;d.close();
   vpDraw();vpQ('#vpHelp').innerHTML=m?(vpMacro(c,m),`<b>${vpE(VMAC[m][0])}</b> applied. ${vpE(VMAC[m][2])}`):'Motor data and limits applied.';vpDraw()}else d.close()});
 d.addEventListener('close',()=>d.remove());d.showModal()}
