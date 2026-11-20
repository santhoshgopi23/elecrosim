/* ElectroSim v8.37 – Multi-pole relay (3 or 4 changeover contacts) and plain 2-pole relay, library group "Switching". Loaded after vmr.js.
   Both have a coil (A1 / A2, coil voltage V, coil resistance Rc) and are found by contacts that name their label (xr), like the other relays.
   Multi-pole relay  (D.mpr)  terminals (fixed index so wires survive a change of size):  0 A1  1 A2, then for pole i = 0..3:  2+3i COM  3+3i NC  4+3i NO.
                              The 4th pole is hidden when "Number of changeover contacts" is 3 (wires on it are deleted).
   2-pole relay      (D.rl2)  terminals: 0 A1  1 A2  2 COM 1  3 NO/NC 1  4 COM 2  5 NO/NC 2;  each contact is NO or NC (set separately). */
'use strict';
const MPRN=['3','4'],mprNP=c=>+c.p.np===3?3:4,mprCache={};
const mprX=i=>-70+60*i;   /* x of the COM terminal of pole i; NC is 20 left of it, NO 20 right of it */
function mprLay(n){if(mprCache[n])return mprCache[n];
 const t=[[-130,-40,'A1'],[-130,40,'A2']];
 for(let i=0;i<4;i++){const x=mprX(i);if(i<n)t.push([x,-40,'COM '+(i+1),'o'],[x-20,40,'NC '+(i+1),'o'],[x+20,40,'NO '+(i+1),'o']);else t.push([0,0,'','h'],[0,0,'','h'],[0,0,'','h'])}
 const x1=mprX(n-1)+20+16;return mprCache[n]={t,bb:[-152,-62,x1+152,124]}}
const rlMsg=c=>{const o=c.o;return o&&Math.abs(o.v)>1.15*c.p.V?[['wa',`${c.label}: coil overvoltage ${f(Math.abs(o.v))} V (rated ${c.p.V} V)`]]:[]};
D.mpr={n:'Multi-pole Relay (3 or 4 changeover contacts)',ds:'Control relay with a coil and 3 or 4 changeover contacts (COM / NC / NO each); contacts that name its label follow the coil',
 cat:'Switching',pre:'K',cv:1,xr:1,vs:1,sy:22,t:mprLay(4).t,bb:mprLay(4).bb,
 p:{V:[24,'V','Coil voltage'],Rc:[400,'Ω','Coil resistance'],np:['4','','Number of changeover contacts',MPRN]},
 dyn:c=>{const L=mprLay(mprNP(c));return L.d||(L.d=Object.assign(Object.create(D.mpr),{t:L.t,bb:L.bb}))},
 chg:(c,k)=>{if(k!=='np')return false;const m=plcPrune(c);if(m)toast(m+' wire'+(m>1?'s':'')+' on the removed contact deleted');S.dirty=1;if(typeof commit==='function')commit();return true},
 cl:c=>!!c.s.en,
 el:c=>{const n=mprNP(c),e=!!c.s.en,r=[R(c,c.p.Rc)];for(let i=0;i<n;i++)r.push(RR(2+3*i,4+3*i,e?.005:1e9),RR(2+3*i,3+3*i,e?1e9:.005));return r},
 st:c=>c.s.en?'ENERGISED':'OFF',msg:rlMsg,
 pp:c=>`<p class=mu>Coil on <b>A1 / A2</b>. Each of the ${mprNP(c)} contacts has <b>COM</b>, <b>NC</b> (closed while the relay is off) and <b>NO</b> (closed while the relay is on). Name a contact (<i>Contact of coil</i>) after this relay's label to use it elsewhere on the drawing.</p>`,
 g:c=>{const n=mprNP(c),en=!!c.s.en,T=(s,x,y)=>`<text x="${x}" y="${y}" class="mt" style="font-size:7px">${s}</text>`;
  let h=`<rect x="-144" y="-22" width="28" height="44" class="s ${en?'on':''}"/><text x="-130" y="4" class="tx">K</text>`+T('A1',-130,-46)+T('A2',-130,54)+`<path d="M-116 0H${mprX(n-1)+20}" class="s" ${DASH}/>`;
  for(let i=0;i<n;i++){const x=mprX(i);
   h+=`<circle cx="${x}" cy="-22" r="2.5" class="f"/><circle cx="${x-20}" cy="22" r="2.5" class="f"/><circle cx="${x+20}" cy="22" r="2.5" class="f"/><path d="M${x} -22L${en?x+20:x-20} 22" class="s"/>`+
    T('COM '+(i+1),x,-46)+T('NC',x-20,54)+T('NO',x+20,54)}
  return h}};

const rl2cl=(c,k)=>!!c.s.en===(c.p[k]==='NO');
D.rl2={n:'Relay 2-pole (2 contacts)',ds:'Plain control relay with a coil and two separate contacts (each NO or NC); contacts that name its label follow the coil',
 cat:'Switching',pre:'K',cv:1,xr:1,
 t:[[-40,-20,'A1'],[-40,20,'A2'],[40,-40,'COM 1','o'],[40,-20,'NO/NC 1','o'],[40,20,'COM 2','o'],[40,40,'NO/NC 2','o']],
 p:{V:[24,'V','Coil voltage'],Rc:[400,'Ω','Coil resistance'],c1:['NO','','Contact 1 type',['NO','NC']],c2:['NO','','Contact 2 type',['NO','NC']]},
 cl:c=>!!c.s.en,
 el:c=>[R(c,c.p.Rc),RR(2,3,rl2cl(c,'c1')?.005:1e9),RR(4,5,rl2cl(c,'c2')?.005:1e9)],
 st:c=>c.s.en?'ENERGISED':'OFF',msg:rlMsg,
 pp:()=>'<p class=mu>Coil on <b>A1 / A2</b>. Two independent contacts: <b>COM 1 – NO/NC 1</b> and <b>COM 2 – NO/NC 2</b>. Set each one to NO (closes when the coil is energised) or NC (opens when it is energised). Name a contact (<i>Contact of coil</i>) after this relay\'s label to use it elsewhere on the drawing.</p>',
 g:c=>{const en=!!c.s.en,k1=rl2cl(c,'c1'),k2=rl2cl(c,'c2'),sw=(y,cl)=>`<circle cx="22" cy="${y}" r="2.5" class="f"/><circle cx="22" cy="${y+20}" r="2.5" class="f"/><path d="M22 ${y}L${cl?22:12} ${cl?y+20:y+6}" class="s"/>`;
  return`<rect x="-28" y="-26" width="20" height="52" class="s ${en?'on':''}"/><text x="-18" y="4" class="tx">K</text><path d="M-8 0H16" class="s" ${DASH}/>`+sw(-40,k1)+sw(20,k2)}};

/* help */
if(typeof HLP!=='undefined'){
 HLP.mpr=HL('A <b>multi-pole relay</b> has one coil and <b>three or four changeover contacts</b> that all move together. A small current in the coil (<b>A1–A2</b>) pulls the relay in; every contact then switches from <b>NC</b> to <b>NO</b> at the same time. One relay can therefore switch several separate circuits – for example a start command, a seal-in, a lamp and an alarm – and the circuits stay electrically separate from each other and from the coil.',
  ['Coil <b>A1</b> to the control voltage, <b>A2</b> to 0 V (or N). The coil voltage must match the <i>Coil voltage</i> setting.','For each contact: <b>COM</b> is the common (the moving contact). <b>NC</b> is connected to COM while the relay is off, <b>NO</b> is connected to COM while the relay is on.','Use only the contacts you need; the others can stay unconnected.'],
  ['Choose <b>3 or 4 changeover contacts</b> in Properties. Switching to 3 removes the 4th contact and deletes any wires on it.','The relay pulls in at about 70 % of the coil voltage and drops out below 30 %. A warning appears above 115 % of the coil voltage.','Contacts that name this relay\'s label (e.g. <b>K1</b>) in their <i>Coil / relay label</i> also follow it.'],
  ['Interlocking, seal-in and signalling circuits, interfacing a PLC output to several loads or voltages.']);
 HLP.rl2=HL('A <b>2-pole relay</b> is a plain control relay with one coil and <b>two separate contacts</b>. When the coil (<b>A1–A2</b>) is energised, a normally-open (NO) contact closes and a normally-closed (NC) contact opens.',
  ['Coil <b>A1</b> to the control voltage, <b>A2</b> to 0 V (or N).','Contact 1 is between <b>COM 1</b> and <b>NO/NC 1</b>, contact 2 between <b>COM 2</b> and <b>NO/NC 2</b>. They are separate circuits and may carry different voltages.'],
  ['Set <b>Contact 1 type</b> and <b>Contact 2 type</b> to NO or NC in Properties – for example one NO and one NC for a start / stop interlock.','The relay pulls in at about 70 % of the coil voltage and drops out below 30 %. A warning appears above 115 % of the coil voltage.','Contacts that name this relay\'s label (e.g. <b>K1</b>) in their <i>Coil / relay label</i> also follow it.'],
  ['Simple on / off control, signal repeating, starting a contactor from a low-voltage control signal.']);
}
