/* ElectroSim v8.64 – Modbus function codes + Register Map editor (PHASE 1 + PHASE 2: Link, Format, 0/1-based start address).  Loaded after rs485.js, BEFORE modbus.js (modbus.js uses everything defined here).
   FOUR DATA TYPES, each with its own address space (addresses start at 0 in every type):
     c coil (1 bit, read/write)  ·  d discrete input (1 bit, read only)  ·  i input register (16 bit, read only)  ·  h holding register (16 bit, read/write)
   EIGHT FUNCTION CODES:  01 read coils · 02 read discrete inputs · 03 read holding registers · 04 read input registers · 05 write single coil · 06 write single register ·
     15 (0x0F) write multiple coils · 16 (0x10) write multiple registers.   (08 diagnostics stays "unsupported" → exception 01, as before.)
   REGISTER MAP (slave): rows {t type, a address, n name, v RAW value, sc scaling, u unit, l link, f format}.  Stored as JSON in c.p.rm (a string, so Duplicate copies it safely).
     c.p.rm === '' = old project: the old "addr:value,addr:value" text in c.p.rt is read as holding registers.  The first edit in the editor writes c.p.rm.
     RAW is what travels on the wire (a 16-bit number, shown signed −32768…32767).  Engineering value = raw × scaling (raw 235 × 0.1 = 23.5 °C).  Changing the scaling keeps the raw value.
     The live values live in c.s.rv = {h:{addr:raw},i:{},c:{},d:{}} and are thrown away at Stop (like before).  PHASE 2 –
     f FORMAT: '' = 16-bit (one register, raw × scaling) · 'ABCD' 'CDAB' 'BADC' 'DCBA' = 32-bit IEEE float over TWO registers (a and a+1), only for input / holding registers.  For a float row v is the
       engineering value itself (a float, no scaling).  Byte order: ABCD = high word first, big-endian · CDAB = words swapped · BADC = bytes swapped inside each word · DCBA = everything reversed.
     l LINK \"Label#channel\" (a component by its label, e.g. PT1#val): every tick (mbSync, called from the slave's tk) input types (d, i) READ the channel; coils and holding registers WRITE back to it when the master
       has changed the register (otherwise they mirror the component).  The channels per component type are listed in mbCh() – add a line there to make a new part linkable.
   MASTER start address: property ab = '0-based' (default, wire address = number typed) or '1-based' (wire address = number typed − 1, the PLC / manual way of counting; see mbSt).
   mbExec = what a slave does with a request; mbReq = the request a master builds; mbMap = which byte is which field (Frame Viewer colours). */
'use strict';
const MBT={c:{n:'Coil',b:0,bit:1,fn:'01 read · 05, 15 write',p:'C'},d:{n:'Discrete input',b:1,bit:1,fn:'02 read',p:'D'},i:{n:'Input register',b:3,bit:0,fn:'04 read',p:'IR'},h:{n:'Holding register',b:4,bit:0,fn:'03 read · 06, 16 write',p:'R'}},
 MBTO=['c','d','i','h'],MBTY={1:'c',2:'d',3:'h',4:'i',5:'c',6:'h',15:'c',16:'h'},MBWR=[5,6,15,16];
const mbTy=fc=>MBTY[fc]||null,mbRd=fc=>fc>=1&&fc<=4,mbWr=fc=>MBWR.includes(fc),mbF=fc=>String(fc).padStart(2,'0'),
 mbPlc=(t,a)=>String(MBT[t].b*(a<9999?1e4:1e5)+a+1).padStart(5,'0'),            /* the classic PLC number: holding register 0 = 40001 */
 mbSc=x=>{x=+x;return x>0&&isFinite(x)?x:1},
 mbEng=(raw,sc)=>+((raw>32767?raw-65536:raw)*sc).toFixed(6),
 mbRaw=(eng,sc)=>Math.max(-32768,Math.min(65535,Math.round(eng/sc)))&65535,
 mbVals=m=>String(m.p.vals||'').split(/[\s,;]+/).filter(x=>x!=='').map(Number).filter(Number.isFinite);
/* ---------- register map (slave) ---------- */
function mbRows(c){const o=[],rm=c.p.rm;
 if(rm!=null&&rm!==''){try{JSON.parse(rm).forEach(x=>{if(!Array.isArray(x))return;const t=MBT[x[0]]?x[0]:'h',a=Math.round(+x[1]),bit=MBT[t].bit,f=!bit&&MBFO[x[7]]&&a<=65534?x[7]:'',v=Math.round(+x[3]);
  if(a>=0&&a<=65535)o.push({t,a,n:String(x[2]||''),v:bit?(v?1:0):f?(Number.isFinite(+x[3])?Math.fround(+x[3]):0):Number.isFinite(v)?v&65535:0,sc:bit||f?1:mbSc(x[4]),u:String(x[5]||''),l:String(x[6]||''),f})})}catch(e){}}
 else String(c.p.rt||'').split(',').forEach(x=>{const m=x.split(':'),a=Math.round(+m[0]),v=Math.round(+m[1]);if(m.length>1&&a>=0&&a<=65535&&v>=-32768&&v<=65535)o.push({t:'h',a,n:'',v:v&65535,sc:1,u:'',l:'',f:''})});
 return o.slice(0,200)}
const mbSave=(c,o)=>{c.p.rm=JSON.stringify(o.map(r=>[r.t,r.a,r.n,r.v,r.sc,r.u,r.l,r.f||'']));S.dirty=1},
 mbRegs=(c,t)=>{t=t||'h';let V=c.s.rv;if(!V||!V.h){V={h:{},i:{},c:{},d:{}};mbRows(c).forEach(r=>mbWords(r).forEach((w,i)=>{if(!(r.a+i in V[r.t]))V[r.t][r.a+i]=w}));if(S.run)c.s.rv=V}return V[t]},
 mbCount=c=>{const n={c:0,d:0,i:0,h:0};mbRows(c).forEach(r=>n[r.t]++);return n};
/* ---------- PHASE 2: formats (16-bit / 32-bit float over 2 registers) ---------- */
const MBFM={'':'16-bit',ABCD:'Float32 ABCD',CDAB:'Float32 CDAB',BADC:'Float32 BADC',DCBA:'Float32 DCBA'},
 MBFO={ABCD:[0,1,2,3],CDAB:[2,3,0,1],BADC:[1,0,3,2],DCBA:[3,2,1,0]};          /* MBFO[order][i] = which byte of A B C D (0..3) travels as wire byte i */
const mbFl=r=>r.f&&MBFO[r.f]?2:1,                                                /* registers a row uses */
 mbF32w=(x,o)=>{const d=new DataView(new ArrayBuffer(4));d.setFloat32(0,x,false);const b=[0,1,2,3].map(i=>d.getUint8(i)),w=MBFO[o].map(i=>b[i]);return[w[0]<<8|w[1],w[2]<<8|w[3]]},      /* float → [register N, register N+1] */
 mbF32x=(a,b,o)=>{const w=[a>>8&255,a&255,b>>8&255,b&255],y=[0,0,0,0];MBFO[o].forEach((k,i)=>{y[k]=w[i]});const d=new DataView(new ArrayBuffer(4));y.forEach((v,i)=>d.setUint8(i,v));return d.getFloat32(0,false)},   /* two registers → float */
 mbWords=r=>MBT[r.t].bit?[r.v?1:0]:r.f?mbF32w(r.v,r.f):[r.v&65535],               /* the register words a row holds at rest */
 mbEngR=(r,w)=>MBT[r.t].bit?w[0]:r.f?mbF32x(w[0],w[1],r.f):mbEng(w[0],r.sc),      /* words → engineering value */
 mbEncR=(r,x)=>MBT[r.t].bit?[x?1:0]:r.f?mbF32w(x,r.f):[mbRaw(x,r.sc)],            /* engineering value → words */
 mbSt=m=>m.p.ab==='1-based'?mbN(m.p.st,1,65536)-1:mbN(m.p.st,0,65535),            /* master: wire start address from the number typed (0-based / 1-based) */
 mbDups=c=>{const s={};let n=0;mbRows(c).forEach(r=>{const ks=[r.t+r.a].concat(r.f?[r.t+(r.a+1)]:[]);if(ks.some(k=>s[k]))n++;ks.forEach(k=>{s[k]=1})});return n};
/* ---------- PHASE 2: links – which components a register row can be tied to ----------
   mbCh(c) = the channels of a component: {k key, n name, r()→engineering value, w(x)→set it (optional), bit (0/1 value)}.  Add a branch here to make another part linkable. */
function mbCh(c){const t=c.type,p=c.p,s=c.s,o=[],A=(k,n,r,w,bit)=>o.push({k,n,r,w,bit:!!bit});
 if(typeof TXD!=='undefined'&&TXD.some(x=>x[0]===t)){
  A('val','process value ('+(p.unit||'')+')',()=>+p.val||0,x=>{p.val=Math.round(x*1e4)/1e4});
  A('pct','process value in % of span',()=>txPct(c),x=>{p.val=Math.round((+p.lo+txSpan(c)*x/100)*1e4)/1e4});
  A('out','output signal (mA or V)',()=>txOut(c))}
 else if(t==='vfd'){
  A('fo','output frequency (Hz)',()=>s.fo||0);
  A('rpm','motor speed (rpm)',()=>Math.round((s.fo||0)/Math.max(1,+p.fb||50)*(+p.rpm||1440)));
  A('cur','motor current (A)',()=>s.io||0);
  A('fset','frequency set-point, keypad (Hz)',()=>+p.fset||0,x=>{p.fset=Math.max(0,Math.round(x*100)/100)});
  A('cmd','run command (1 = keypad RUN, 0 = keypad STOP)',()=>p.cmd===VCMD[1]?1:0,x=>{p.cmd=x?VCMD[1]:VCMD[2]},1);
  A('run','running (status)',()=>s.run?1:0,null,1);
  A('flt','fault active',()=>s.tripped?1:0,null,1)}
 else if(t==='mpr'||t==='rl2'||(D[t]&&D[t].cv))A('en','coil energised (relay output)',()=>s.en?1:0,null,1);
 else if(t==='vem')A('pos','valve position (%)',()=>vePos(c)*100);
 else if(t==='mfm'){const M=k=>()=>s.m&&Number.isFinite(s.m[k])?s.m[k]:0;
  A('V','voltage (V)',M('Vm'));A('I','current, average (A)',M('Ia'));A('P','active power, total (W)',M('Pt'));A('hz','frequency (Hz)',M('hz'));A('pf','power factor',M('pf'))}
 return o}
function mbLk(l){l=String(l||'');if(!l)return null;const i=l.lastIndexOf('#'),lab=i<0?l:l.slice(0,i),k=i<0?'':l.slice(i+1),c=S.comps.find(x=>x.label===lab);if(!c)return null;const L=mbCh(c),ch=k?L.find(x=>x.k===k):L[0];return ch?{c,ch}:null}
/* once per tick, slave side: linked rows read the component / write back to it.  Known last words per row live in c.s.rv.k (thrown away with the live values) */
function mbSync(c){const r0=c.s.r;if(!S.run||!r0||!r0.pw)return;const rows=mbRows(c);if(!rows.some(r=>r.l))return;mbRegs(c,'h');const V=c.s.rv;if(!V||!V.h)return;const K=V.k||(V.k={}),seen={};
 rows.forEach(r=>{const ks=[r.t+r.a].concat(r.f?[r.t+(r.a+1)]:[]),dup=ks.some(k=>seen[k]);ks.forEach(k=>{seen[k]=1});if(dup||!r.l)return;const L=mbLk(r.l);if(!L)return;
  const R=V[r.t],n=mbFl(r),w=[];for(let i=0;i<n;i++)w.push(R[r.a+i]);if(w.some(x=>x==null))return;const key=r.t+r.a,sig=w.join(','),wr=(r.t==='c'||r.t==='h')&&L.ch.w;
  if(wr&&key in K&&K[key]!==sig){const x=mbEngR(r,w);if(Number.isFinite(x)){L.ch.w(L.ch.bit?(x?1:0):x);S.dirty=1}K[key]=sig;return}      /* the master wrote → component */
  const nw=mbEncR(r,L.ch.r());nw.forEach((v,i)=>{R[r.a+i]=v});K[key]=nw.join(',')})}                                                     /* otherwise component → registers */
const MBEX=[['c',0,'Pump run command',0,1,''],['c',1,'Valve open command',0,1,''],['c',2,'Alarm reset',0,1,''],['d',0,'Pump running',1,1,''],['d',1,'Door closed',1,1,''],['d',2,'Fault',0,1,''],
 ['i',0,'Temperature',235,.1,'°C'],['i',1,'Pressure',412,.01,'bar'],['i',2,'Tank level',750,.1,'%'],['i',3,'Flow rate (32-bit float, 2 registers)',123.456,1,'m³/h','ABCD'],['h',0,'Speed set-point',1480,1,'rpm'],['h',1,'Temperature limit',800,.1,'°C'],['h',2,'Ramp time',50,.1,'s']];
/* ---------- master: the request it builds ---------- */
function mbReq(m){const a=mbN(m.p.sa,0,247),fc=mbFc(m),st=mbSt(m),w=x=>[x>>8&255,x&255];
 if(fc===8)return mbCrc([a,8,0,0,165,55]);
 if(fc===5)return mbCrc([a,5,...w(st),m.p.cv==='OFF'?0:255,0]);
 if(fc===6)return mbCrc([a,6,...w(st),...w(mbN(m.p.val,-32768,65535))]);
 if(fc===15){const v=mbVals(m).slice(0,1968).map(x=>x?1:0),by=[];for(let i=0;i<v.length;i+=8){let b=0;for(let j=0;j<8&&i+j<v.length;j++)b|=v[i+j]<<j;by.push(b)}return mbCrc([a,15,...w(st),...w(v.length),by.length,...by])}
 if(fc===16){const v=mbVals(m).slice(0,123);return mbCrc([a,16,...w(st),...w(v.length),v.length*2,...v.flatMap(x=>w(x&65535))])}
 return mbCrc([a,fc,...w(st),...w(mbN(m.p.q,0,65535))])}
/* the values a write request carries (FC15 bits / FC16 registers), as far as the frame really has them */
const mbReqData=q=>{const n=q[4]<<8|q[5],o=[];if(q[1]===15)for(let i=0;i<n&&7+(i>>3)<q.length-2;i++)o.push(q[7+(i>>3)]>>(i&7)&1);else if(q[1]===16)for(let i=0;i<n&&8+2*i<q.length-2;i++)o.push(q[7+2*i]<<8|q[8+2*i]);return o};
/* what the slave does with a request (q includes the CRC, it is not checked here): the answer, or an exception [addr, fc|0x80, code].  Order like a real device: function (01) → value (03) → address (02) → execution (04) */
function mbExec(s,q,wr){const fc=q[1],ex=k=>[q[0],fc|128,k],ad=q[2]<<8|q[3],v=q[4]<<8|q[5],t=mbTy(fc);if(!t)return ex(1);
 const R=mbRegs(s,t),has=n=>{for(let i=0;i<n;i++)if(!((ad+i)in R))return 0;return 1},bad=()=>s.p.fail==='ON';
 if(fc===1||fc===2){if(v<1||v>2000)return ex(3);if(!has(v))return ex(2);if(bad())return ex(4);const b=[];for(let i=0;i<v;i++){if(i%8===0)b.push(0);if(R[ad+i])b[i>>3]|=1<<(i&7)}return[q[0],fc,b.length,...b]}
 if(fc===3||fc===4){if(v<1||v>125)return ex(3);if(!has(v))return ex(2);if(bad())return ex(4);const r=[q[0],fc,v*2];for(let i=0;i<v;i++)r.push(R[ad+i]>>8,R[ad+i]&255);return r}
 if(fc===5){if(v!==0&&v!==65280)return ex(3);if(!(ad in R))return ex(2);if(bad())return ex(4);if(wr)R[ad]=v?1:0;return q.slice(0,6)}
 if(fc===6){if(!(ad in R))return ex(2);if(bad())return ex(4);if(wr)R[ad]=v;return q.slice(0,6)}
 const bc=q[6],n=fc===15?Math.ceil(v/8):v*2;if(v<1||v>(fc===15?1968:123)||bc!==n||q.length!==9+bc)return ex(3);if(!has(v))return ex(2);if(bad())return ex(4);
 if(wr)for(let i=0;i<v;i++)R[ad+i]=fc===15?q[7+(i>>3)]>>(i&7)&1:q[7+2*i]<<8|q[8+2*i];return q.slice(0,6)}
/* field map of a frame: one entry per byte {n name, c colour class, k group, j index in group} */
function mbMap(f,isReq){const fc=f[1],n=f.length,F=[['Address','a',1],['Function','f',1]],o=[],bit=fc===1||fc===2,ad=bit||fc===5||fc===15;
 if(fc&128)F.push(['Exception code','x',1]);
 else if(mbRd(fc))isReq?F.push([ad?'Start address':'Start register','d',2],['Quantity','d',2]):F.push(['Byte count','n',1],[fc===1?'Coil states (8 per byte)':fc===2?'Input states (8 per byte)':'Register values','d',Math.max(0,n-5)]);
 else if(fc===5)F.push(['Coil address','d',2],['Coil value (FF00 = ON)','d',2]);
 else if(fc===6)F.push(['Register address','d',2],['Register value','d',2]);
 else if(fc===15||fc===16)isReq?F.push(['Start address','d',2],['Quantity','d',2],['Byte count','n',1],[fc===15?'Coil bits (8 per byte)':'Register values','d',Math.max(0,n-9)]):F.push(['Start address','d',2],['Quantity','d',2]);
 else F.push(['Sub-function','d',2],['Test data','d',2]);
 F.push(['CRC-16 (low, high)','c',2]);F.forEach(([nm,c,l],k)=>{for(let j=0;j<l;j++)o.push({n:nm,c,k,j})});return o}
/* what a finished poll gave the master: {k 'bit'|'reg', st start address, v values} */
function mbDec(T){const q=T.req,r=T.res,fc=T.fc,st=q[2]<<8|q[3],n=q[4]<<8|q[5],v=[];
 if(fc===1||fc===2){for(let i=0;i<n&&3+(i>>3)<r.length-2;i++)v.push(r[3+(i>>3)]>>(i&7)&1);return{k:'bit',st,v}}
 if(fc===3||fc===4){for(let i=0;i<r[2]/2;i++)v.push(r[3+2*i]<<8|r[4+2*i]);return{k:'reg',st,v}}
 if(fc===5)return{k:'bit',st,v:[n?1:0]};if(fc===6)return{k:'reg',st,v:[n]};return{k:fc===15?'bit':'reg',st,v:mbReqData(q)}}

/* ================= REGISTER MAP EDITOR (dialog) ================= */
const MBE={d:null,id:0,iv:0},mbeC=()=>S.comps.find(x=>x.id===MBE.id&&x.type==='mbs');
function mbSum(c){const n=mbCount(c),R=mbRows(c),nl=R.filter(r=>r.l).length,nf=R.filter(r=>r.f).length;return`<p class=mu style="margin:4px 0">Register map: <b>${n.c}</b> coils · <b>${n.d}</b> discrete inputs · <b>${n.i}</b> input registers · <b>${n.h}</b> holding registers. This slave answers function codes 01, 02, 03, 04, 05, 06, 15 and 16 from this map (an address that is not in the map gives exception 02).${nl||nf?` <b>${nl}</b> row${nl===1?' is':'s are'} linked to components, <b>${nf}</b> use${nf===1?'s':''} a 32-bit float (2 registers).`:''}</p><div class=row><button data-clk=rm>▦ Register Map…</button></div>`}
function mbLive(c,r){const V=S.run&&c.s.rv,R=V&&V[r.t],n=mbFl(r),w=[];for(let i=0;i<n;i++)w.push(R&&r.a+i in R?R[r.a+i]:null);return w.every(x=>x!=null)?w:mbWords(r)}
const mbFx=x=>Number.isFinite(x)?+x.toPrecision(7):'',
 mbVal=(r,w)=>{const x=mbEngR(r,w);return r.f?mbFx(x):x},
 mbRawS=(r,w)=>MBT[r.t].bit?w[0]:r.f?w.join(' · '):(w[0]>32767?w[0]-65536:w[0]),
 mbHexS=(r,w)=>MBT[r.t].bit?w[0]:w.map(mbH4).join(' '),
 mbPlcR=r=>mbPlc(r.t,r.a)+(r.f?' – '+mbPlc(r.t,r.a+1):'');
function mbLinkOpts(r){const wr=r.t==='c'||r.t==='h',cur=mbLk(r.l);let h='<option value="">— none —</option>',f=!r.l;
 S.comps.forEach(c=>mbCh(c).forEach(ch=>{if(wr&&!ch.w)return;const v=c.label+'#'+ch.k,on=!!cur&&cur.c===c&&cur.ch.k===ch.k;if(on)f=true;h+=`<option value="${esc(v)}" ${on?'selected':''}>${esc(c.label)} · ${esc(ch.n)}</option>`}));
 if(!f)h+=`<option value="${esc(r.l)}" selected>${esc(r.l)} (not available)</option>`;return h}
function mbeHtml(c){const o=mbRows(c),seen={};
 let h=`<div class=lc-tw><table class=lc-t><tr><th>#</th><th>Type</th><th title="Address inside its own type, starting at 0 (the protocol address)">Address</th><th title="The classic PLC number: holding register 0 = 40001, input register 0 = 30001, discrete input 0 = 10001, coil 0 = 00001">PLC no.</th><th>Name</th><th title="Engineering value = raw × scaling (a 32-bit float is the value itself)">Value</th><th title="Engineering value = raw value × scaling, e.g. 0.1: raw 235 means 23.5 (not used by 32-bit floats)">Scaling</th><th>Unit</th><th title="16-bit: one register. Float32: a 32-bit floating-point number over TWO registers (this address and the next one); ABCD / CDAB / BADC / DCBA is the byte and word order">Format</th><th title="Tie this row to a component by its label. Input registers / discrete inputs read the component every tick; coils / holding registers write to it when the master writes">Link</th><th title="The number(s) that really travel on the wire">Raw</th><th>Hex</th><th>Function codes</th><th></th></tr>`;
 o.forEach((r,i)=>{const ks=[r.t+r.a].concat(r.f?[r.t+(r.a+1)]:[]),dup=ks.some(k=>seen[k]),bit=MBT[r.t].bit,w=mbLive(c,r),L=r.l?mbLk(r.l):null;ks.forEach(k=>{seen[k]=1});
  h+=`<tr data-i=${i} class="${dup?'lc-wn':''}"><td class=lc-i>${i+1}</td><td><select data-f=t>${MBTO.map(t=>`<option value=${t} ${r.t===t?'selected':''}>${MBT[t].n}</option>`).join('')}</select></td><td><input type=number min=0 max=${r.f?65534:65535} step=1 data-f=a value=${r.a}></td>`+
   `<td class=lc-o data-o=p>${mbPlcR(r)}</td><td><input type=text maxlength=40 data-f=n value="${esc(r.n)}" placeholder="e.g. Tank temperature"></td><td><input type=number step=${bit?1:'any'} ${bit?'min=0 max=1':''} data-f=v value="${mbVal(r,w)}"></td>`+
   `<td><input type=number step=any min=0 data-f=sc ${bit||r.f?'disabled':''} value=${r.sc}></td><td><input type=text maxlength=12 data-f=u value="${esc(r.u)}"></td>`+
   `<td><select data-f=f ${bit?'disabled':''}>${bit?'<option>–</option>':Object.keys(MBFM).map(k=>`<option value="${k}" ${r.f===k?'selected':''}>${MBFM[k]}</option>`).join('')}</select></td><td><select data-f=l>${mbLinkOpts(r)}</select></td>`+
   `<td class=lc-o data-o=r>${mbRawS(r,w)}</td><td class=lc-o data-o=x>${mbHexS(r,w)}</td>`+
   `<td class="lc-m" data-o=fn>${MBT[r.t].fn}${r.f?'<br>2 registers: '+r.a+' and '+(r.a+1):''}${r.l?(L?'<br>linked: '+esc(L.c.label)+' ('+(r.t==='c'||r.t==='h'?'master writes → component':'component → register')+')':'<br><b class=lc-bad>link not found</b>'):''}${dup?'<br><b class=lc-bad>address already used – only the first row is used (a float takes two registers)</b>':''}</td><td class=lc-x><button data-del=${i} title="Delete this row">✕</button></td></tr>`});
 if(!o.length)h+='<tr><td class=lc-e colspan=14>The map is empty. Press “＋ Row” or “Load example map”.</td></tr>';
 return h+'</table></div>'}
function mbeRender(){const d=MBE.d,c=mbeC();if(!c){d.close();return}const n=mbCount(c),tot=n.c+n.d+n.i+n.h;
 d.querySelector('#mbeS').textContent=`${c.label} · slave address ${mbAd(c)} · ${tot} rows${S.run?' · running: the Value column shows the live values':''}`;
 d.querySelector('#mbeB').innerHTML=`<p class=lc-note style="margin:0 0 8px">Each of the four types has its <b>own addresses starting at 0</b>: holding register 0 and coil 0 are different things. <b>Value</b> = <b>Raw × Scaling</b>; the master only sees the raw number (a 16-bit value). Coils and discrete inputs are single bits (0 / 1). Function codes: <b>01</b> read coils · <b>02</b> read discrete inputs · <b>03</b> read holding registers · <b>04</b> read input registers · <b>05</b> write one coil · <b>06</b> write one register · <b>15</b> write several coils · <b>16</b> write several registers. Coils and holding registers can be written by the master; discrete inputs and input registers are read-only for the master. <b>Format:</b> 16-bit, or a 32-bit float over <b>two</b> registers (this address and the next) with the byte / word order ABCD · CDAB · BADC · DCBA. <b>Link:</b> tie a row to a component by its label – input rows read it every tick (transmitter value, VFD speed, relay output …); coil and holding rows write to it when the master writes (while running, a linked row shows the live component value).</p>`+mbeHtml(c);
 d.querySelector('[data-a=add]').disabled=tot>=200}
function mbeCells(tr,c,r){const bit=MBT[r.t].bit,w=mbLive(c,r),q=s=>tr.querySelector(s),vi=q('[data-f=v]');
 q('[data-o=p]').textContent=mbPlcR(r);q('[data-o=r]').textContent=mbRawS(r,w);q('[data-o=x]').textContent=mbHexS(r,w);if(vi!==document.activeElement)vi.value=mbVal(r,w)}
function mbeEdit(tr,f,val,fin){const c=mbeC(),i=+tr.dataset.i;if(!c)return;const o=mbRows(c),r=o[i];if(!r)return;let live=0;
 if(f==='t'){r.t=val;if(MBT[val].bit){r.v=r.v?1:0;r.sc=1;r.f=''}live=1}
 else if(f==='a'){const a=Math.round(+val);if(!(a>=0&&a<=65535))return;r.a=r.f&&a>65534?65534:a;live=1}
 else if(f==='n')r.n=String(val).slice(0,40);else if(f==='u')r.u=String(val).slice(0,12);
 else if(f==='sc'){const s=+val;if(!(s>0&&isFinite(s))||r.f)return;r.sc=s}
 else if(f==='f'){const nf=MBFO[val]?val:'';if(MBT[r.t].bit||nf===r.f)return;const e=r.f?r.v:mbEng(r.v,r.sc);r.f=nf;if(nf){if(r.a>65534)r.a=65534;r.sc=1;r.v=Math.fround(e)}else r.v=mbRaw(e,r.sc);live=1}
 else if(f==='l'){r.l=String(val).slice(0,60);if(S.run&&c.s.rv&&c.s.rv.k)delete c.s.rv.k[r.t+r.a]}
 else if(f==='v'){const e=parseFloat(val);if(!Number.isFinite(e))return;r.v=MBT[r.t].bit?(e?1:0):r.f?Math.fround(e):mbRaw(e,r.sc);if(S.run&&c.s.rv&&c.s.rv[r.t])mbWords(r).forEach((x,k)=>{c.s.rv[r.t][r.a+k]=x})}
 mbSave(c,o);if(live)c.s.rv=null;
 if(fin&&(f==='t'||f==='a'||f==='f'||f==='l'))mbeRender();else mbeCells(tr,c,r)}
function mbeOpen(c){let d=MBE.d;
 if(!d){d=MBE.d=document.createElement('dialog');d.className='lc mbe';document.body.appendChild(d);
  d.innerHTML=`<div class=lc-h><div><b>Modbus Register Map</b><small id=mbeS></small></div><button class="lc-c" data-x title=Close>✕</button></div><div class=lc-b id=mbeB></div>
  <div class=lc-f><button data-a=add title="Add a row at the end">＋ Row</button><button data-a=sort title="Order by type, then address">⇅ Sort</button><button data-a=ex title="Replace the map by a small example with all four types">Load example map</button><span style="flex:1"></span><button class=pri data-x>Close</button></div>`;
  d.addEventListener('click',e=>{if(e.target.closest('[data-x]')){d.close();return}const c=mbeC();if(!c)return;const del=e.target.closest('[data-del]'),b=e.target.closest('button[data-a]');
   if(del){const o=mbRows(c);o.splice(+del.dataset.del,1);mbSave(c,o);c.s.rv=null;mbeRender();return}if(!b)return;const a=b.dataset.a,o=mbRows(c);
   if(a==='add'){if(o.length>=200)return;const L=o[o.length-1],t=L?L.t:'h',n=o.filter(r=>r.t===t);o.push({t,a:n.length?Math.min(65535,Math.max(...n.map(r=>r.a+mbFl(r)-1))+1):0,n:'',v:0,sc:1,u:'',l:'',f:''})}
   else if(a==='sort')o.sort((x,y)=>MBTO.indexOf(x.t)-MBTO.indexOf(y.t)||x.a-y.a);
   else if(a==='ex'){if(o.length&&!confirm('Replace the whole register map by the example map?'))return;o.length=0;MBEX.forEach(x=>o.push({t:x[0],a:x[1],n:x[2],v:x[3],sc:x[4],u:x[5],l:'',f:x[6]||''}))}
   mbSave(c,o);c.s.rv=null;mbeRender()});
  d.addEventListener('input',e=>{const t=e.target,f=t.dataset&&t.dataset.f,tr=t.closest('tr[data-i]');if(!f||!tr||f==='t'||f==='a'||f==='f'||f==='l')return;mbeEdit(tr,f,t.value,0)});
  d.addEventListener('change',e=>{const t=e.target,f=t.dataset&&t.dataset.f,tr=t.closest('tr[data-i]');if(!f||!tr)return;mbeEdit(tr,f,t.value,1)});
  d.addEventListener('close',()=>{clearInterval(MBE.iv);MBE.iv=0;if(typeof props==='function')props()})}
 MBE.id=c.id;mbeRender();d.showModal();clearInterval(MBE.iv);
 MBE.iv=setInterval(()=>{const c=mbeC();if(!c||!d.open||!S.run)return;const o=mbRows(c),rows=d.querySelectorAll('tr[data-i]');if(rows.length!==o.length)return;rows.forEach((tr,i)=>{if(!tr.contains(document.activeElement))mbeCells(tr,c,o[i])})},300)}
