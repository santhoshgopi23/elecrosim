/* ElectroSim v8.57 – LOAD CALCULATION SHEET.
   Add your loads (motors, lighting, heaters, sockets, sub-boards …); the sheet works out, for every load and for the whole board:
     • cable size – copper OR aluminium, PVC or XLPE, from the current-carrying-capacity table (IEC 60364-5-52, simplified table C.52.1)
       with ambient-temperature and grouping factors, and a voltage-drop check (paralleled cables are used when one cable is not enough)
     • MCB / MCCB / ACB rating, curve, poles and breaking capacity (IEC 60898-1 / 60947-2)
     • RCCB (or RCD relay for big feeders): rating, poles, sensitivity (30 / 100 / 300 mA) and type (AC / A / F / B)
     • isolator (switch-disconnector, IEC 60947-3): rating, poles and duty (AC-21A / 22A / 23A)
     • main incomer for the whole board: breaker, isolator, RCCB, main cable, phase currents, kW / kVA
   Open it: Home / Insert / Output tab → Load calculation, or type LC in the command line.
   “Insert as sheets” puts a summary page and the load schedule into the drawing (LC 1, LC 2 …) so they are plotted to PDF with the rest.
   The data is saved in the project file (S.lc). Loaded after app.js. */
'use strict';

/* ================= engine (pure functions – no DOM) ================= */
const LCE=(()=>{
const SQ3=Math.sqrt(3),N=null;
const MCB_IN=[6,10,16,20,25,32,40,50,63,80,100,125],
 MCCB_IN=[16,20,25,32,40,50,63,80,100,125,160,200,250,315,400,500,630,800],
 ACB_IN=[1000,1250,1600,2000,2500,3200,4000],
 RCCB_IN=[16,25,40,63,80,100,125],
 ISO_IN=[16,20,25,32,40,50,63,80,100,125,160,200,250,315,400,500,630,800,1000,1250,1600,2000,2500,3200,4000],
 CON_AC3=[9,12,18,25,32,40,50,65,80,95,115,150,185,225,265,330,400,500,630,800],
 MCB_KA=[6,10,15,25],MCCB_KA=[16,25,36,50,70,100],ACB_KA=[50,65,85,100];
const CU_S=[1.5,2.5,4,6,10,16,25,35,50,70,95,120,150,185,240],AL_S=[2.5,4,6,10,16,25,35,50,70,95,120,150,185,240];

/* IEC 60364-5-52 simplified table C.52.1 (also printed in the Schneider Electric Installation Guide, fig. G21). Ambient 30 °C, copper or aluminium,
   12 columns per size: [A2 3xPVC, A1 3xPVC, A1 2xPVC, B1 3xPVC, B1 2xPVC / C 3xPVC, E 3xPVC / B1 3xXLPE, C 2xPVC, E 2xPVC, C 3xXLPE, E 3xXLPE, C 2xXLPE, E 2xXLPE]  (null = not tabulated) */
const CU={1.5:[13,13.5,14.5,15.5,17,18.5,19.5,22,23,24,26,N],2.5:[17.5,18,19.5,21,23,25,27,30,31,33,36,N],4:[23,24,26,28,31,34,36,40,42,45,49,N],6:[29,31,34,36,40,43,46,51,54,58,63,N],
 10:[39,42,46,50,54,60,63,70,75,80,86,N],16:[52,56,61,68,73,80,85,94,100,107,115,N],25:[68,73,80,89,95,101,110,119,127,135,149,161],
 35:[N,N,N,110,117,126,137,147,158,169,185,200],50:[N,N,N,134,141,153,167,179,192,207,225,242],70:[N,N,N,171,179,196,213,229,246,268,289,310],
 95:[N,N,N,207,216,238,258,278,298,328,352,377],120:[N,N,N,239,249,276,299,322,346,382,410,437],150:[N,N,N,N,285,318,344,371,395,441,473,504],
 185:[N,N,N,N,324,362,392,424,450,506,542,575],240:[N,N,N,N,380,424,461,500,538,599,641,679]};
const AL={2.5:[13.5,14,15,16.5,18.5,19.5,21,23,24,26,28,N],4:[17.5,18.5,20,22,25,26,28,31,32,35,38,N],6:[23,24,26,28,32,33,36,39,42,45,49,N],10:[31,32,36,39,44,46,49,54,58,62,67,N],
 16:[41,43,48,53,58,61,66,73,77,84,91,N],25:[53,57,63,70,73,78,83,90,97,101,108,121],35:[N,N,N,86,90,96,103,112,120,126,135,150],
 50:[N,N,N,104,110,117,125,136,146,154,164,184],70:[N,N,N,133,140,150,160,174,187,198,211,237],95:[N,N,N,161,170,183,195,211,227,241,257,289],
 120:[N,N,N,186,197,212,226,245,263,280,300,337],150:[N,N,N,N,226,245,261,283,304,324,346,389],185:[N,N,N,N,256,280,298,323,347,371,397,447],
 240:[N,N,N,N,300,330,352,382,409,439,470,530]};
/* which column for which installation method (p = PVC 70 °C, x = XLPE 90 °C, 2 / 3 = number of loaded conductors) */
const MC={B1:{p3:3,p2:4,x3:6,x2:8},C:{p3:4,p2:6,x3:8,x2:10},E:{p3:5,p2:7,x3:9,x2:11}};
function amp(mat,ins,meth,nl,S){const row=(mat==='Al'?AL:CU)[S];if(!row)return 0;const k=(ins==='XLPE'?'x':'p')+(nl===2?'2':'3');let v=row[MC[meth][k]];
 if(v==null){if(meth==='B1'){const c=row[MC.C[k]];v=c==null?0:c*.9}else if(meth==='E'&&k==='x2')v=row[MC.C.x2]}   /* conservative fall-backs for sizes the simplified table leaves blank */
 return v||0}
/* ambient air temperature correction, IEC 60364-5-52 table B.52.14 */
const TP=[[10,1.22],[15,1.17],[20,1.12],[25,1.06],[30,1],[35,.94],[40,.87],[45,.79],[50,.71],[55,.61],[60,.5]],
 TX=[[10,1.15],[15,1.12],[20,1.08],[25,1.04],[30,1],[35,.96],[40,.91],[45,.87],[50,.82],[55,.76],[60,.71],[65,.65],[70,.58],[75,.5],[80,.41]];
function interp(t,x){if(x<=t[0][0])return t[0][1];for(let i=1;i<t.length;i++)if(x<=t[i][0]){const a=t[i-1],b=t[i];return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0])}return 0}
/* grouping factors for 1, 2, 3, 4, 6, 9, 12, 16, 20 circuits (table C.52.3) – the next higher count is used in between (safe side) */
const GN=[1,2,3,4,6,9,12,16,20],GF={B1:[1,.8,.7,.7,.55,.5,.45,.4,.4],C:[1,.85,.8,.75,.7,.7,.7,.7,.7],E:[1,.9,.8,.75,.75,.7,.7,.7,.7]};
function gk(meth,n){n=Math.max(1,Math.ceil(n));const a=GF[meth]||GF.C;for(let i=0;i<GN.length;i++)if(n<=GN[i])return a[i];return a[a.length-1]}
const RHO={Cu:[.0172,.00393],Al:[.0282,.00403]};                       /* Ω·mm²/m at 20 °C, temperature coefficient */
const rhoT=(m,ins)=>RHO[m][0]*(1+RHO[m][1]*((ins==='XLPE'?90:70)-20));
const first=(a,v)=>a.find(x=>x>=v-1e-9);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const f1=v=>Math.round(v*10)/10,f2=v=>Math.round(v*100)/100;

/* load types: power factor, efficiency, supply, MCB curve, RCD sensitivity (mA, 'x' = 30 mA up to 32 A else 300 mA), RCD type ('' = project default), isolator duty */
const LT={
 motor:{n:'Motor – direct on line',pf:.85,eff:90,sup:'3w',curve:'D',rcd:300,rt:'',duty:'AC-23A',mot:1},
 sst:{n:'Motor – soft starter',pf:.85,eff:90,sup:'3w',curve:'C',rcd:300,rt:'',duty:'AC-23A',mot:1},
 vfd:{n:'Motor – VFD (frequency drive)',pf:.95,eff:88,sup:'3w',curve:'C',rcd:300,rt:'B',duty:'AC-22A',vfd:1},
 mot1:{n:'Motor – single-phase',pf:.8,eff:80,sup:'1ph',curve:'D',rcd:'x',rt:'',duty:'AC-23A',mot:1},
 light:{n:'Lighting',pf:.9,eff:100,sup:'1ph',curve:'C',rcd:30,rt:'',duty:'AC-22A'},
 socket:{n:'Socket outlets / general power',pf:.9,eff:100,sup:'1ph',curve:'C',rcd:30,rt:'',duty:'AC-22A'},
 heater:{n:'Heater (resistive)',pf:1,eff:100,sup:'1ph',curve:'B',rcd:'x',rt:'',duty:'AC-21A'},
 ac:{n:'Air-conditioner / compressor',pf:.85,eff:100,sup:'1ph',curve:'C',rcd:'x',rt:'',duty:'AC-22A'},
 feeder:{n:'Sub-board / feeder',pf:.9,eff:100,sup:'4w',curve:'C',rcd:300,rt:'',duty:'AC-22A'},
 other:{n:'Other load',pf:.9,eff:100,sup:'1ph',curve:'C',rcd:'x',rt:'',duty:'AC-22A'}};
const SUP={'1ph':'1-phase (L-N)','3w':'3-phase, 3-wire','4w':'3-phase + neutral'};
const G0={inc:'3ph',Vll:400,Vph:230,mat:'Cu',ins:'PVC',meth:'C',amb:30,grp:1,vdOut:3,vdMain:1,mainLen:20,fault:10,spare:20,div:100,rcdT:'A'};
const ROW0=()=>({name:'',type:'motor',sup:'3w',qty:1,val:5.5,unit:'kW',pf:.85,eff:90,df:100,len:25,mat:'',ph:'auto',curve:'auto',rcd:'auto'});

/* ---- cable ---- */
function sizeCable(o){
 const list=o.mat==='Al'?AL_S:CU_S,kT=o.ins==='XLPE'?interp(TX,o.amb):interp(TP,o.amb),minS=o.mat==='Al'?16:(o.minS||2.5),ph1=o.ph===1,rho=rhoT(o.mat,o.ins),
  sn=Math.sqrt(Math.max(0,1-o.pf*o.pf)),
  vd=(S,n)=>(ph1?2:SQ3)*o.Ib*o.len*(rho/S/n*o.pf+.00008/n*sn)/o.V*100;
 let best=null;
 if(kT<=0)return{ok:0,why:'ambient temperature too high for this insulation',S:list[list.length-1],n:1,iz:0,iz0:0,kT:0,kG:1,vd:0};
 for(let n=1;n<=8;n++){
  const kG=gk(o.meth,(o.cnt||1)+n-1);
  for(const S of list){if(S<minS||(n>1&&S<50))continue;
   const iz0=amp(o.mat,o.ins,o.meth,o.nl,S);if(!iz0)continue;
   const iz=iz0*kT*kG*n,v=vd(S,n);best={S,n,iz,iz0,kT,kG,vd:v};
   if(iz>=o.I&&(!(o.vdMax>0)||v<=o.vdMax))return Object.assign({ok:1},best)}}
 return Object.assign({ok:0,why:'no size meets the current rating and voltage drop – shorten the run, use XLPE, split the load or use busbar trunking'},best||{S:list[list.length-1],n:1,iz:0,iz0:0,kT,kG:1,vd:0})}
/* protective earth conductor, IEC 60364-5-54 table 54.3 */
function peSize(S,mat){const list=mat==='Al'?AL_S:CU_S;let p=S<=16?S:S<=35?16:S/2;if(mat==='Al')p=Math.max(16,p);return first(list,p)||S}

/* ---- breaker ---- */
function pickBreaker(Ib,fault){
 let kind,list,kaL;
 if(Ib<=125&&fault<=25){kind='MCB';list=MCB_IN;kaL=MCB_KA}else if(Ib<=800){kind='MCCB';list=MCCB_IN;kaL=MCCB_KA}else{kind='ACB';list=ACB_IN;kaL=ACB_KA}
 let In=first(list,Ib),over=0;if(!In){In=list[list.length-1];over=1}
 let icu=first(kaL,fault),hi=0;if(!icu){icu=kaL[kaL.length-1];hi=1}
 /* MCCB / ACB have an adjustable long-time setting Ir (0.8 – 1.0 × In): the cable only has to carry Ir, not the frame size */
 let Ir=In;if(kind!=='MCB'){Ir=Math.min(In,Math.ceil(Math.max(Ib,.8*In)/(.05*In)-1e-9)*.05*In);Ir=Math.round(Ir*10)/10}
 return{kind,In,Ir,icu,over,hi}}
const polesOf=sup=>sup==='1ph'?'2P':sup==='3w'?'3P':'4P';

/* ---- one load ---- */
function rowCalc(r,G){
 const T=LT[r.type]||LT.other,ph1=r.sup==='1ph',V=ph1?G.Vph:G.Vll,v=+r.val||0,qty=Math.max(0,+r.qty||0),
  pf=clamp(+r.pf||T.pf,.1,1),eff=clamp((+r.eff||100)/100,.1,1),df=clamp((r.df===''||r.df==null||isNaN(+r.df)?100:+r.df)/100,0,2),len=Math.max(0,+r.len||0);
 const res={empty:0,rem:[],warn:[],pf,df,V,ph1,T};
 if(!(v>0&&qty>0)){res.empty=1;return res}
 let P1,S1;
 if(r.unit==='A'){S1=(ph1?V:SQ3*V)*v;P1=S1*pf}
 else if(r.unit==='kVA'){S1=v*1000;P1=S1*pf}
 else{const po=r.unit==='kW'?v*1000:r.unit==='HP'?v*745.7:v;P1=po/eff;S1=P1/pf}
 const I1=ph1?S1/V:S1/(SQ3*V),Ib=I1*qty*df;
 res.I1=I1;res.ib=Ib;res.Pc=P1*qty;res.Pd=P1*qty*df;res.Qd=res.Pd*Math.tan(Math.acos(pf));
 /* breaker */
 const b=pickBreaker(Ib,G.fault),pol=polesOf(r.sup),curve=b.kind==='MCB'?(r.curve&&r.curve!=='auto'?r.curve:T.curve):'';
 res.brk=b;res.pol=pol;res.curve=curve;
 res.brkTxt=b.kind==='MCB'?`MCB ${b.In} A ${curve} ${pol} ${b.icu} kA`:`${b.kind} ${b.In} A ${pol} ${b.icu} kA`+(b.Ir<b.In?` (Ir ${Math.ceil(b.Ir)} A)`:'');
 if(b.over)res.warn.push('Load current is above the largest breaker – split into several feeders');
 if(b.hi)res.warn.push(`Fault level ${G.fault} kA is above the usual range – check the breaker data`);
 /* cable */
 const mat=r.mat||G.mat,cores=r.sup==='1ph'?2:r.sup==='3w'?3:4,
  c=sizeCable({I:b.Ir,Ib,mat,ins:G.ins,meth:G.meth,nl:ph1?2:3,amb:+G.amb||30,cnt:Math.max(1,+G.grp||1),len,V,ph:ph1?1:3,pf,vdMax:+G.vdOut,minS:r.type==='light'?1.5:2.5});
 const pe=peSize(c.S,mat);
 res.cab=c;res.mat=mat;res.pe=pe;
 res.cabTxt=`${c.n>1?c.n+'× ':''}${cores}C ${c.S} mm² ${mat}`;res.peTxt=`PE ${pe}`;
 if(!c.ok)res.warn.push('Cable: '+c.why);
 if(c.n>4)res.rem.push(`${c.n} cables in parallel – busbar trunking is usually better`);
 if(mat==='Al'&&b.In<32)res.rem.push('Aluminium is 16 mm² minimum – copper is normally used for small loads');
 /* RCD */
 let sens=r.rcd==='none'?0:(r.rcd&&r.rcd!=='auto'?+r.rcd:(T.rcd==='x'?(b.In<=32?30:300):T.rcd));
 const rt=T.rt||G.rcdT||'A';
 res.sens=sens;res.rcdType=rt;
 if(!sens){res.rcdTxt='None';res.rcdIn=0}
 else if(b.In>125){res.rcdIn=0;res.rcdTxt=`RCD relay + CBCT ${sens} mA`;res.rem.push('Above 125 A use an MCCB with RCD module or an earth-leakage relay with a core-balance CT')}
 else{res.rcdIn=first(RCCB_IN,b.In);res.rcdTxt=`RCCB ${res.rcdIn} A ${ph1?'2P':'4P'} ${sens} mA Type ${rt}`}
 /* isolator */
 const need=T.mot?Math.max(b.In,1.25*Ib):b.In,isoIn=first(ISO_IN,need)||ISO_IN[ISO_IN.length-1];
 res.isoIn=isoIn;res.isoTxt=`Isolator ${isoIn} A ${pol} ${T.duty}`;
 /* remarks */
 if(T.mot&&qty===1&&!T.vfd){const con=first(CON_AC3,I1)||'—';res.rem.push(`Contactor AC-3 ≥ ${con} A, overload relay set ${f1(I1)} A`)}
 if(T.vfd)res.rem.push('Type B RCD (or none); line reactor advised; drive current ≥ '+f1(I1)+' A');
 if(sens===30&&b.In>63)res.rem.push('30 mA on a large circuit trips easily – consider 100–300 mA');
 return res}

/* ---- whole board ---- */
function calc(lc){
 const G=Object.assign({},G0,lc&&lc.G||{}),rows=((lc&&lc.rows)||[]).map(r=>({r,res:rowCalc(r,G)}));
 const inc1=G.inc==='1ph',IL=[0,0,0],IS=[0,0,0];let Pc=0,Pd=0,Qd=0,neutral=0,cnt=0;
 /* single-phase loads: fixed phases first, then the biggest ones to the least loaded phase */
 const one=rows.filter(x=>!x.res.empty&&x.res.ph1),three=rows.filter(x=>!x.res.empty&&!x.res.ph1);
 three.forEach(x=>{if(inc1){x.res.warn.push('A 3-phase load cannot be fed from a single-phase incomer');return}[0,1,2].forEach(i=>IL[i]+=x.res.ib)});
 one.filter(x=>/^L[123]$/.test(x.r.ph)).forEach(x=>{const i=+x.r.ph[1]-1;IL[i]+=x.res.ib;IS[i]+=x.res.ib;x.res.phase=x.r.ph});
 one.filter(x=>!/^L[123]$/.test(x.r.ph)).sort((a,b)=>b.res.ib-a.res.ib).forEach(x=>{
  if(inc1){IL[0]+=x.res.ib;x.res.phase='L';return}
  let m=0;for(let i=1;i<3;i++)if(IL[i]<IL[m])m=i;IL[m]+=x.res.ib;IS[m]+=x.res.ib;x.res.phase='L'+(m+1)});
 rows.forEach(x=>{if(x.res.empty)return;cnt++;if(!(!x.res.ph1&&inc1)){Pc+=x.res.Pc;Pd+=x.res.Pd;Qd+=x.res.Qd}});
 if(!inc1)neutral=Math.sqrt(Math.max(0,IS[0]*IS[0]+IS[1]*IS[1]+IS[2]*IS[2]-IS[0]*IS[1]-IS[1]*IS[2]-IS[2]*IS[0]));
 const out={G,rows,cnt,Pc:Pc/1000,Pd:Pd/1000,IL,IN:neutral,main:null};
 if(!cnt)return out;
 const k=Math.max(0,(+G.div||100)/100)*(1+Math.max(0,+G.spare||0)/100),
  Imax=(inc1?IL[0]:Math.max(...IL))*k,S=Math.sqrt(Pd*Pd+Qd*Qd)*k/1000,pfT=S>0?Pd*k/1000/S:1;
 const V=inc1?G.Vph:G.Vll,b=pickBreaker(Imax,G.fault),neu=inc1||rows.some(x=>!x.res.empty&&(x.r.sup==='1ph'||x.r.sup==='4w')),
  pol=inc1?'2P':neu?'4P':'3P',mat=G.mat,
  cab=sizeCable({I:b.Ir,Ib:Imax,mat,ins:G.ins,meth:G.meth,nl:inc1?2:3,amb:+G.amb||30,cnt:1,len:Math.max(0,+G.mainLen||0),V,ph:inc1?1:3,pf:clamp(pfT,.1,1),vdMax:+G.vdMain,minS:10}),
  iso=first(ISO_IN,b.In)||ISO_IN[ISO_IN.length-1],rIn=b.In<=125?first(RCCB_IN,b.In):0,cores=inc1?2:neu?4:3;
 const tan=Math.tan(Math.acos(clamp(pfT,.1,1))),qc=pfT<.95?Pd*k/1000*(tan-Math.tan(Math.acos(.95))):0;
 out.main={I:Imax,kW:Pd*k/1000,kVA:S,pf:pfT,brk:b,pol,
  brkTxt:b.kind==='MCB'?`MCB ${b.In} A ${pol} ${b.icu} kA`:`${b.kind} ${b.In} A ${pol} ${b.icu} kA`+(b.Ir<b.In?` (Ir ${Math.ceil(b.Ir)} A)`:''),cab,cabTxt:`${cab.n>1?cab.n+'× ':''}${cores}C ${cab.S} mm² ${mat}`,pe:peSize(cab.S,mat),
  isoIn:iso,isoTxt:`Isolator ${iso} A ${pol}`,
  rcdTxt:rIn?`RCCB ${rIn} A ${inc1?'2P':'4P'} 300 mA Type ${G.rcdT||'A'} (S, time-delayed)`:`RCD relay + CBCT 300 mA (S, time-delayed) or MCCB with RCD module`,qc,
  warn:[].concat(cab.n>4?[`Main cable needs ${cab.n} parallel runs – consider busbar trunking`]:[],b.over?['Board current is above the largest breaker – use several incomers or a busbar system']:[],cab.ok?[]:['Main cable: '+cab.why])};
 return out}
return{LT,SUP,G0,ROW0,calc,rowCalc,sizeCable,amp,peSize,pickBreaker,interp,gk,f1,f2,TP,TX,CU_S,AL_S,CU,AL}})();

/* ================= user interface ================= */
(()=>{
if(typeof document==='undefined')return;
const esc2=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const {LT,SUP,f1,f2}=LCE;
function lcState(){if(!S.lc||typeof S.lc!=='object')S.lc={G:{...LCE.G0},rows:[]};S.lc.G=Object.assign({},LCE.G0,S.lc.G);if(!Array.isArray(S.lc.rows))S.lc.rows=[];return S.lc}
let dlg=null;

const BASIS=[
 ['inc','Incoming supply','sel',[['3ph','3-phase 4-wire'],['1ph','Single-phase']]],
 ['Vll','Line voltage (V)','num'],['Vph','Phase voltage (V)','num'],
 ['mat','Cable conductor','sel',[['Cu','Copper'],['Al','Aluminium']]],
 ['ins','Cable insulation','sel',[['PVC','PVC – 70 °C'],['XLPE','XLPE / EPR – 90 °C']]],
 ['meth','Installation method','sel',[['B1','B1 – conduit / trunking on a wall'],['C','C – clipped direct, wall or tray'],['E','E – perforated tray / ladder in air']]],
 ['amb','Ambient temperature (°C)','num'],['grp','Circuits in the same group','num'],
 ['vdOut','Max voltage drop – outgoing (%)','num'],['vdMain','Max voltage drop – main cable (%)','num'],
 ['mainLen','Main cable length (m)','num'],['fault','Fault level at the board (kA)','num'],
 ['spare','Future spare capacity (%)','num'],['div','Board diversity factor (%)','num'],
 ['rcdT','Default RCCB type','sel',[['A','Type A'],['AC','Type AC'],['F','Type F']]]];
const UNITS=['kW','HP','W','kVA','A'];
const TYPE_OPTS=Object.keys(LT).map(k=>[k,LT[k].n]);
const COLS=[['#',''],['Description','lc-d'],['Load type',''],['Supply',''],['Qty','lc-n'],['Rating','lc-n'],['Unit','lc-u'],['Length m','lc-n']],
 ADV=[['PF'],['Eff %'],['Demand %'],['Cable'],['Phase'],['Curve'],['RCD']];
const OUT=[['Ib (A)','ib'],['Breaker','brk'],['Cable','cab'],['Iz (A)','iz'],['ΔV %','vd'],['RCCB / RCD','rcd'],['Isolator','iso'],['Remarks','rem']];

const optH=(list,cur)=>list.map(o=>{const[v,t]=Array.isArray(o)?o:[o,o];return`<option value="${esc2(v)}"${String(v)===String(cur)?' selected':''}>${esc2(t)}</option>`}).join('');
function rowHTML(r,i){
 const ph1=r.sup==='1ph',inp=(f,cls,st='')=>`<input class="${cls}" data-f="${f}" value="${esc2(r[f])}" inputmode="decimal" ${st}>`,
  sel=(f,l)=>`<select data-f="${f}">${optH(l,r[f])}</select>`;
 return`<tr data-r="${i}"><td class="lc-i">${i+1}</td><td><input class="lc-d" data-f="name" value="${esc2(r.name)}" placeholder="e.g. Chiller pump P-101"></td>`+
  `<td>${sel('type',TYPE_OPTS)}</td><td>${sel('sup',Object.keys(SUP).map(k=>[k,SUP[k]]))}</td>`+
  `<td>${inp('qty','lc-n')}</td><td>${inp('val','lc-n')}</td><td>${sel('unit',UNITS)}</td><td>${inp('len','lc-n')}</td>`+
  OUT.map(o=>`<td class="lc-o" data-o="${o[1]}"></td>`).join('')+
  `<td>${inp('pf','lc-n')}</td><td>${inp('eff','lc-n')}</td><td>${inp('df','lc-n')}</td>`+
  `<td>${sel('mat',[['','Default'],['Cu','Copper'],['Al','Aluminium']])}</td>`+
  `<td>${ph1?sel('ph',[['auto','Auto'],['L1','L1'],['L2','L2'],['L3','L3']]):'<span class="lc-m">3-ph</span>'}</td>`+
  `<td>${sel('curve',[['auto','Auto'],['B','B'],['C','C'],['D','D']])}</td><td>${sel('rcd',[['auto','Auto'],['none','None'],['30','30 mA'],['100','100 mA'],['300','300 mA']])}</td>`+
  `<td class="lc-x"><button type="button" data-act="dup" title="Copy this row" aria-label="Copy row">⧉</button><button type="button" data-act="del" title="Delete this row" aria-label="Delete row">✕</button></td></tr>`}

function build(){
 const d=document.createElement('dialog');d.id='dLC';d.className='lc';
 d.innerHTML=`<div class="lc-h"><div><b>Load calculation sheet</b><small>Cable (Cu / Al), MCB, RCCB and isolator for each load and for the whole board</small></div><button type="button" class="lc-c" data-act="close" aria-label="Close">✕</button></div>
 <div class="lc-b"><details open class="lc-bs"><summary>Design basis</summary><div class="lc-g" id="lcG">${BASIS.map(b=>`<label>${b[1]}${b[2]==='sel'?`<select data-g="${b[0]}"></select>`:`<input data-g="${b[0]}" inputmode="decimal">`}</label>`).join('')}</div></details>
 <h3>Main incomer – for the whole board</h3><div id="lcRes" class="lc-res"></div>
 <div class="lc-bar"><h3>Loads</h3><span class="sp"></span><button type="button" data-act="add" class="pri">＋ Add load</button><button type="button" data-act="imp" title="Take motors, heaters, lamps and fans from the schematic">Import from schematic</button><button type="button" data-act="clr" class="dn">Clear all</button></div>
 <div class="lc-tw"><table class="lc-t"><thead><tr>${COLS.map(c=>`<th class="${c[1]}">${c[0]}</th>`).join('')}${OUT.map(o=>`<th class="lc-oh">${o[0]}</th>`).join('')}${ADV.map(a=>`<th title="Optional – leave on the default unless you know better">${a[0]}</th>`).join('')}<th></th></tr></thead><tbody id="lcB"></tbody></table></div>
 <p class="lc-note"><b>How it works.</b> Current from kW, power factor and efficiency → breaker = next standard size ≥ load current → cable must carry the <i>breaker</i> rating (Ib ≤ In ≤ Iz) after temperature and grouping factors, and stay inside the voltage-drop limit → RCCB and isolator are chosen from the breaker rating and the load type. Cable tables: IEC 60364-5-52 (simplified table C.52.1); aluminium is used from 16 mm² up. Check against your local code (SS 638 / BS 7671 / NEC / IS 732), the maker's data, the fault level and discrimination before you build. Aluminium needs Al-rated (bi-metal) lugs. Above 240 mm² the sheet uses cables in parallel.</p></div>
 <div class="lc-f"><button type="button" data-act="csv">Download CSV</button><span class="sp"></span><button type="button" data-act="sheets" class="pri" title="Add a summary page and the load schedule to the drawing (pages LC 1, LC 2 …)">Insert as sheets in drawing</button><button type="button" data-act="close">Close</button></div>`;
 document.body.appendChild(d);dlg=d;
 d.addEventListener('click',onClick);d.addEventListener('input',onInput);d.addEventListener('change',onChange);
 d.addEventListener('close',()=>{S.dirty=1;if(typeof commit==='function')commit()});
 d.addEventListener('cancel',()=>{});
 return d}

function fillBasis(){const G=lcState().G;dlg.querySelectorAll('[data-g]').forEach(el=>{const b=BASIS.find(x=>x[0]===el.dataset.g);if(el.tagName==='SELECT')el.innerHTML=optH(b[3],G[b[0]]);else el.value=G[b[0]]})}
function fillRows(){dlg.querySelector('#lcB').innerHTML=lcState().rows.map(rowHTML).join('')||`<tr><td colspan="${COLS.length+OUT.length+ADV.length+1}" class="lc-e">No loads yet – press <b>＋ Add load</b> or <b>Import from schematic</b>.</td></tr>`}

const cell=(tr,o)=>tr.querySelector(`[data-o="${o}"]`);
function paint(){
 const lc=lcState(),R=LCE.calc(lc);dlg._R=R;
 R.rows.forEach((x,i)=>{const tr=dlg.querySelector(`#lcB tr[data-r="${i}"]`);if(!tr)return;const s=x.res,set=(o,h,t)=>{const c=cell(tr,o);if(c){c.innerHTML=h;c.title=t||''}};
  tr.classList.toggle('lc-wn',!!s.warn.length);
  if(s.empty){['ib','brk','cab','iz','vd','rcd','iso','rem'].forEach(o=>set(o,'<span class="lc-m">–</span>'));return}
  const phTxt=s.ph1?` · ${s.phase||''}`:'';
  set('ib',`<b>${f1(s.ib)}</b>`,`${f2(s.I1)} A each × ${x.r.qty} × demand ${Math.round(s.df*100)} %`);
  set('brk',esc2(s.brkTxt),s.brk.kind==='MCB'?`Next standard MCB ≥ ${f1(s.ib)} A`:`Next standard ${s.brk.kind} ≥ ${f1(s.ib)} A`);
  set('cab',`<b>${esc2(s.cabTxt)}</b><br><span class="lc-m">${esc2(s.peTxt)}</span>`,s.cab.ok?`${s.cab.iz0} A × temp ${f2(s.cab.kT)} × group ${f2(s.cab.kG)}${s.cab.n>1?' × '+s.cab.n+' cables':''}`:s.cab.why);
  set('iz',s.cab.ok?`${f1(s.cab.iz)}`:`<span class="lc-bad">${f1(s.cab.iz)}</span>`,'Derated cable capacity – must be ≥ breaker rating');
  set('vd',`<span class="${s.cab.vd>(+lc.G.vdOut||99)?'lc-bad':''}">${f2(s.cab.vd)}</span>`,'Voltage drop at full load current');
  set('rcd',esc2(s.rcdTxt));set('iso',esc2(s.isoTxt));
  set('rem',s.warn.map(w=>`<span class="lc-bad">${esc2(w)}</span>`).concat(s.rem.map(esc2)).join('<br>')||'<span class="lc-m">–</span>');
  const f=tr.querySelector('[data-f="ph"]');if(f&&s.phase&&f.value==='auto')f.title='Auto phase: '+s.phase});
 /* main incomer cards */
 const box=dlg.querySelector('#lcRes'),m=R.main;
 if(!m){box.innerHTML='<p class="lc-m" style="margin:4px 0">Add a load to see the main breaker, isolator, RCCB and cable for the board.</p>';return}
 const card=(h,v,s,w)=>`<div class="lc-k${w?' lc-w':''}"><small>${h}</small><b>${v}</b><span>${s||''}</span></div>`,pc=R.IL.map(f1);
 box.innerHTML=card('Connected load',`${f1(R.Pc)} kW`,`Max demand ${f1(R.Pd)} kW`)+
  card('Design current',`${f1(m.I)} A`,`${f1(m.kVA)} kVA · PF ${f2(m.pf)} · incl. spare ${R.G.spare} %`)+
  card('Phase currents',R.G.inc==='1ph'?`${pc[0]} A`:`${pc[0]} / ${pc[1]} / ${pc[2]} A`,R.G.inc==='1ph'?'single-phase':`L1 / L2 / L3 · neutral ${f1(R.IN)} A`)+
  card('Main breaker',esc2(m.brkTxt),`Ib ${f1(m.I)} A ≤ In`)+
  card('Main isolator',esc2(m.isoTxt),'switch-disconnector, IEC 60947-3')+
  card('Main RCD',esc2(m.rcdTxt),'')+
  card('Main cable',esc2(m.cabTxt),`PE ${m.pe} mm² · Iz ${f1(m.cab.iz)} A · ΔV ${f2(m.cab.vd)} %`,!m.cab.ok)+
  (m.qc>0.5?card('Power-factor correction',`${Math.round(m.qc)} kVAr`,`to reach PF 0.95 (now ${f2(m.pf)})`):'')+
  m.warn.map(w=>`<div class="lc-k lc-w"><small>Warning</small><span>${esc2(w)}</span></div>`).join('')}

function onInput(e){const t=e.target;
 if(t.dataset.g){const G=lcState().G,b=BASIS.find(x=>x[0]===t.dataset.g);G[t.dataset.g]=b[2]==='num'?(t.value===''?'':parseFloat(t.value)):t.value;paint();return}
 const tr=t.closest('tr[data-r]');if(!tr||!t.dataset.f||t.tagName!=='INPUT')return;
 const r=lcState().rows[+tr.dataset.r],f=t.dataset.f;r[f]=(f==='name')?t.value:(t.value===''?'':parseFloat(t.value.replace(',','.')));if(f!=='name'&&isNaN(r[f]))r[f]='';paint()}
function onChange(e){const t=e.target;
 if(t.dataset.g){const G=lcState().G;G[t.dataset.g]=t.tagName==='SELECT'?t.value:G[t.dataset.g];paint();return}
 const tr=t.closest('tr[data-r]');if(!tr||!t.dataset.f||t.tagName!=='SELECT')return;
 const r=lcState().rows[+tr.dataset.r],f=t.dataset.f;r[f]=t.value;
 if(f==='type'){const T=LT[t.value];r.pf=T.pf;r.eff=T.eff;r.sup=T.sup;r.curve='auto';r.rcd='auto';if(T.sup==='1ph')r.ph='auto'}
 if(f==='type'||f==='sup'){if(r.sup!=='1ph')r.ph='auto';fillRows()}
 paint()}
function onClick(e){const b=e.target.closest('button[data-act]');if(!b)return;const a=b.dataset.act,lc=lcState(),tr=b.closest('tr[data-r]'),i=tr?+tr.dataset.r:-1;
 if(a==='close')dlg.close();
 else if(a==='add'){const n=lc.rows.length+1;lc.rows.push(Object.assign(LCE.ROW0(),{name:'Load '+n}));fillRows();paint();const last=dlg.querySelector('#lcB tr:last-child input');if(last)last.focus()}
 else if(a==='del'){lc.rows.splice(i,1);fillRows();paint()}
 else if(a==='dup'){lc.rows.splice(i+1,0,{...lc.rows[i],name:(lc.rows[i].name||'Load')+' (copy)'});fillRows();paint()}
 else if(a==='clr'){if(!lc.rows.length||confirm('Delete every load from the sheet?')){lc.rows=[];fillRows();paint()}}
 else if(a==='imp')importLoads();
 else if(a==='csv')csv();
 else if(a==='sheets'){const r=sheets();if(r){dlg.close();toast(r)}}}

/* ---- take the loads from the schematic ---- */
function importLoads(){
 const lc=lcState(),rows=[],seen={},mots=S.comps.filter(c=>c.type==='mot3'&&c.p),drv=S.comps.filter(c=>(c.type==='vfd'||c.type==='sst')&&c.p),used=new Set();
 const add=(c,o)=>{const key=c.label||('#'+c.id);if(seen[key])return;seen[key]=1;rows.push(Object.assign(LCE.ROW0(),{name:(c.label?c.label+' – ':'')+(D[c.type]?D[c.type].n:c.type)},o))};
 const T=t=>({type:t,pf:LT[t].pf,eff:LT[t].eff,sup:LT[t].sup,unit:'kW'});
 drv.forEach(c=>{const m=mots.find(x=>!used.has(x.id)&&Math.abs((+x.p.P||0)-(+c.p.P||0))<=.01*(+c.p.P||1));if(m)used.add(m.id);
  add(c,Object.assign(T(c.type==='vfd'?'vfd':'sst'),{val:f2((+c.p.P||0)/1000)},m?{name:`${c.label||'Drive'} – ${c.type==='vfd'?'VFD':'soft starter'} → ${m.label||'motor'}`}:{}))});
 S.comps.forEach(c=>{if(!c.p)return;const P=+c.p.P||0,V=+c.p.V||0;
  if(c.type==='mot3'&&!used.has(c.id))add(c,Object.assign(T('motor'),{val:f2(P/1000)}));
  else if(c.type==='mot'&&V>=100)add(c,Object.assign(T('mot1'),{val:f2(P/1000)}));
  else if(c.type==='htr')add(c,Object.assign(T('heater'),{val:f2(P/1000)},V>=380?{sup:'3w'}:{}));
  else if(c.type==='lamp'&&V>=100)add(c,Object.assign(T('light'),{val:f2(P/1000)}));
  else if(c.type==='fan'&&V>=100)add(c,Object.assign(T('mot1'),{val:f2(P/1000),eff:100,pf:.8}));
  else if(c.type==='psu')add(c,Object.assign(T('other'),{val:f2(P/1000),eff:90,pf:.9}))});
 if(!rows.length){toast('No loads with a power rating found in the schematic');return}
 lc.rows=lc.rows.concat(rows);fillRows();paint();toast(`${rows.length} load(s) imported – check the length, quantity and type of each`)}

/* ---- CSV ---- */
function csv(){
 const R=LCE.calc(lcState()),q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"',L=[['No','Description','Type','Supply','Qty','Rating','Unit','PF','Eff %','Demand %','Length m','Ib A','Breaker','Cable','PE mm2','Iz A','Volt drop %','RCCB / RCD','Isolator','Remarks']];
 R.rows.forEach((x,i)=>{const r=x.r,s=x.res;if(s.empty)return;L.push([i+1,r.name,LT[r.type].n,SUP[r.sup],r.qty,r.val,r.unit,s.pf,r.eff,r.df,r.len,f1(s.ib),s.brkTxt,s.cabTxt,s.pe,f1(s.cab.iz),f2(s.cab.vd),s.rcdTxt,s.isoTxt,s.warn.concat(s.rem).join('; ')])});
 if(R.main){const m=R.main;L.push([]);L.push(['MAIN','Design current A',f1(m.I),'kW',f1(m.kW),'kVA',f1(m.kVA),'PF',f2(m.pf)]);L.push(['MAIN','Breaker',m.brkTxt]);L.push(['MAIN','Isolator',m.isoTxt]);L.push(['MAIN','RCD',m.rcdTxt]);L.push(['MAIN','Cable',m.cabTxt+', PE '+m.pe+' mm2'])}
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+L.map(r=>r.map(q).join(',')).join('\r\n')],{type:'text/csv'}));
 a.download=((S.tb.dwgNo||S.tb.project||'electrosim').replace(/[^\w\-. ]+/g,'_')||'electrosim')+'_load_calculation.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

/* ---- put the summary and the load schedule into the drawing as pages LC 1, LC 2 … ---- */
function sheets(){
 const lc=lcState(),R=LCE.calc(lc);
 if(!R.main){toast('Add at least one load first');return 0}
 const old=S.pages.filter(p=>/^LC \d/.test(p.title)).map(p=>p.id);
 if(old.length){S.shapes=S.shapes.filter(s=>!old.includes(s.pg));S.pages=S.pages.filter(p=>!old.includes(p.id))}
 let note='';if(S.tb.paper==='A5'||S.tb.paper==='A4'||S.tb.orient==='P'){S.tb.paper=(S.tb.paper==='A5'||S.tb.paper==='A4')?'A3':S.tb.paper;S.tb.orient='L';note=' (sheet set to '+S.tb.paper+' landscape)'}
 const[PW,PH]=paperPx(),m=10*U,K=Math.max(.6,PW/1680),fs=Math.max(8,Math.round(12*K)),rh=26*K,areaX=m+30,areaY=m+50,botY=PH-m-100-20;
 const mk=t=>{const id=S.pid++;S.pages.push({id,title:t});return id};
 let pg=0;const sh=o=>{const s=Object.assign({id:S.nid++,pg,all:0,col:'',wd:1.5,ds:''},o);S.shapes.push(s);return s};
 const tx=(x,y,text,size=14,al='left',bold=0)=>sh({k:'text',x,y,text,size,bold,it:0,al,rot:0,col:''});
 const G=R.G,mt=G.mat==='Al'?'Aluminium':'Copper',insT=G.ins==='XLPE'?'XLPE / EPR 90 °C':'PVC 70 °C',
  meth={B1:'B1 – conduit / trunking on wall',C:'C – clipped direct / tray',E:'E – perforated tray / free air'}[G.meth];
 const head=(t)=>{tx(areaX,m+34,t,Math.round(22*K),'left',1);tx(PW-m-30,m+34,`${G.mat}/${G.ins} · method ${G.meth} · ${G.amb} °C · ${G.fault} kA`,Math.round(14*K),'right',1)};
 const table=(x,y,rows,cw,lab)=>sh({k:'tbl',all:0,col:'',wd:1.5,fill:'none',x,y,rows:rows.length,cols:cw.length,cw,rh,size:fs,lab:lab?1:0,cells:[].concat(...rows.map(r=>r.map(c=>String(c))))});
 pg=mk('LC 1 – Load calculation');head('LC 1  –  LOAD CALCULATION SUMMARY');
 const mn=R.main,pc=R.IL.map(f1);
 let y=areaY+10*K;
 tx(areaX,y,'Design basis',Math.round(16*K),'left',1);y+=26*K;
 const bas=[['Incoming supply',G.inc==='1ph'?`Single-phase ${G.Vph} V`:`3-phase 4-wire ${G.Vll} / ${G.Vph} V`],['Cable conductor',`${mt}, ${insT}`],['Installation method',meth],['Ambient / grouping',`${G.amb} °C, ${G.grp} circuit(s) in the group`],
  ['Fault level at board',`${G.fault} kA`],['Max voltage drop',`outgoing ${G.vdOut} %, main ${G.vdMain} %`],['Spare capacity / diversity',`${G.spare} % / ${G.div} %`],['Main cable length',`${G.mainLen} m`]];
 const br=[];for(let i=0;i<bas.length;i+=2)br.push([bas[i][0],bas[i][1],bas[i+1]?bas[i+1][0]:'',bas[i+1]?bas[i+1][1]:'']);
 const cw4=[230,400,230,400].map(v=>v*K);table(areaX,y,br,cw4,1);y+=rh*br.length+34*K;
 tx(areaX,y,'Main incomer – whole board',Math.round(16*K),'left',1);y+=26*K;
 const res=[['Connected load',`${f1(R.Pc)} kW`,'Maximum demand',`${f1(R.Pd)} kW`],['Design current (with spare)',`${f1(mn.I)} A`,'Design apparent power',`${f1(mn.kVA)} kVA, PF ${f2(mn.pf)}`],
  ['Phase currents L1 / L2 / L3',G.inc==='1ph'?`${pc[0]} A`:`${pc.join(' / ')} A`,'Neutral current',G.inc==='1ph'?'–':`${f1(R.IN)} A`],
  ['Main breaker',mn.brkTxt,'Main isolator',mn.isoTxt],['Main RCD',mn.rcdTxt,'Main cable',`${mn.cabTxt}, PE ${mn.pe} mm²`],['Main cable capacity / drop',`Iz ${f1(mn.cab.iz)} A, ΔV ${f2(mn.cab.vd)} %`,'Power-factor correction',mn.qc>0.5?`${Math.round(mn.qc)} kVAr to reach PF 0.95`:'not needed']];
 table(areaX,y,res,cw4,1);y+=rh*res.length+34*K;
 const notes=['Basis: cable current rating from IEC 60364-5-52 (simplified table C.52.1) with temperature and grouping factors; breaker Ib ≤ In ≤ Iz (IEC 60364-4-43); voltage drop at full load; PE conductor to IEC 60364-5-54.',
  'RCCB: 30 mA for sockets, lighting and small final circuits; 100–300 mA for motors, heaters and feeders; Type B for frequency drives. Isolators are switch-disconnectors to IEC 60947-3.',
  'Preliminary selection. Confirm with your local code (SS 638 / BS 7671 / NEC / IS 732), manufacturer data, short-circuit withstand and discrimination studies. Aluminium cable needs Al-rated (bi-metal) lugs.'].concat(mn.warn);
 notes.forEach((t,i)=>tx(areaX,y+i*18*K,t,Math.round(11*K),'left',0));
 /* schedule */
 const HD=['No.','Description','Load','Supply','Ib (A)','Breaker','Cable','Iz (A)','ΔV (%)','RCCB / RCD','Isolator','Remarks'],cw=[44,236,130,110,74,176,190,66,66,190,170,148].map(v=>v*(PW-2*m-60)/1600),tw=cw.reduce((a,b)=>a+b,0);
 const lines=R.rows.filter(x=>!x.res.empty).map((x,i)=>{const r=x.r,s=x.res;return[i+1,r.name||LT[r.type].n,`${r.qty} × ${r.val} ${r.unit}`,s.ph1?`1ph ${R.G.Vph} V`:`3ph ${R.G.Vll} V`,f1(s.ib),s.brkTxt,`${s.cabTxt} / ${s.peTxt}`,f1(s.cab.iz),f2(s.cab.vd),s.rcdTxt.replace(' Type ',' T'),s.isoTxt.replace('Isolator ','Iso '),s.warn.concat(s.rem).join('; ')]});
 const per=Math.max(4,Math.floor((botY-areaY-30*K)/rh)-1);let n=1;
 for(let i=0;i<lines.length||i===0;i+=per,n++){pg=mk('LC '+(n+1)+' – Load schedule');head(`LC ${n+1}  –  LOAD SCHEDULE${n>1?' (cont.)':''}`);
  const y0=areaY+10*K;sh({k:'rect',x:areaX,y:y0,w:tw,h:rh,wd:.5,fill:'#dde6ee'});
  table(areaX,y0,[HD].concat(lines.slice(i,i+per)),cw,0)}
 if(typeof addFooter==='function')addFooter(true);
 S.shapes.filter(s=>s.k==='tbl'&&s.all).forEach(s=>{const d=tblDims(s);s.x=PW-m-d.W;s.y=PH-m-d.H});
 const p1=S.pages.find(p=>p.title.startsWith('LC 1'));setPage(p1.id);renderTabs();S.dirty=1;commit();
 return`Load calculation sheets added: ${n} page(s) named LC 1…${note}`}

window.lcOpen=function(){if(!dlg)build();lcState();fillBasis();fillRows();paint();dlg.showModal()};
})();
