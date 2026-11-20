/* ElectroSim v8.26 – "Appearance" of devices: Physical device (looks like the real thing, good for simulating)  or  Drawing symbol (clean block / bubble symbol for the drawing you hand to others).
   Added to every part that has a physical picture (level rods, level controller, phase relay, voltage relay, pressure switches, transmitters, valves, tower light, fan, UPS, VFD, soft starter, fused terminal, alternating relay, MFM …).
   Per part:   Properties → Appearance.      Whole drawing:  View → Device look (cycles  per part → all symbols → all physical).      PDF:  Plot → "Draw devices as drawing symbols".
   Terminals, wires and the simulation are identical in both looks – only the picture changes.
   The symbol is made from the part's terminals: a box around the terminals (or an instrument bubble for transmitters) with a short code, a caption and the terminal names.
   S.vwAll = '' (per part) | 'sy' | 'ph'. */
'use strict';
const VW=['Physical device (for simulation)','Drawing symbol (for submission)'];
const VWC={lrod3:['LP','3-rod probe'],lrod5:['LP','5-rod probe'],lvc3:['LC','level controller'],lvc5:['LC','level controller'],plr:['PFR','phase relay'],pws:['PS','1 set point'],pwd:['PS','2 set points'],
 vsa:['XV','single acting'],vda:['XV','double acting'],svp:['YV','valve panel'],pav:['XV','air valve + LS'],pad:['XV','air valve + LS'],vem:['XV','modulating valve'],
 twr:['H','tower light'],fan:['FN','panel fan'],fut:['XF','fused terminal'],ups:['UPS',''],sst:['SS','soft starter'],vfd:['VFD','drive'],stp:['STEP','stepper motor'],fls:['FS','flow switch'],vcs:['VS','vacuum switch'],sps:['SS','speed switch'],alt:['KA','alternating'],vmr:['UVR','voltage relay'],rs485:['RS485','node'],rs232:['RS232','serial port'],ethp:['ETH','LAN port'],rj45:['RJ45','plug'],ethc:['CAT','cable'],ethsw:['SW','switch'],rs422:['RS422','serial port'],mbm:['MBM','Modbus master'],mbs:['MBS','Modbus slave'],mfm:['MFM','multi-function meter'],cda:['CDA','clean dry air'],
 ptx:['PT'],dpt:['PDT'],ttx:['TT'],ltx:['LT'],ftx:['FT'],wtx:['WT'],htx:['HT'],phx:['pH'],ctx:['QT'],otx:['O₂'],ntx:['NTU'],vtx:['VT'],gtx:['GT'],stx:['ST'],xtx:['ZT'],qtx:['TqT'],dtx:['DT'],itx:['IT'],etx:['ET'],ktx:['KT'],gen:['XT'],mltm:['DMM'],inj:['SG','injector'],plc:['PLC','controller'],ct:['CT','current transf.'],pt:['VT','voltage transf.']};
const VWB=new Set(['ptx','dpt','ttx','ltx','ftx','wtx','htx','phx','ctx','otx','ntx','vtx','gtx','stx','xtx','qtx','dtx','itx','etx','ktx','gen']);   /* drawn as an instrument bubble */
const vwSy=c=>{const m=S.vwAll;return m==='sy'?1:m==='ph'?0:c.p&&c.p.vw===VW[1]};
function vwGeom(c){const d=dd(c),sx=d.sx||22,sy=d.sy||22,L=[];
 d.t.forEach(([x,y,n,fl])=>{if(fl&&/[hn]/.test(fl))return;const h=hz(d,x,y);L.push({x,y,n:String(n),h,ex:h?Math.sign(x)*sx:x,ey:h?y:Math.sign(y)*sy})});
 const l=L.filter(q=>q.h&&q.x<0),r=L.filter(q=>q.h&&q.x>0),t=L.filter(q=>!q.h&&q.y<0),b=L.filter(q=>!q.h&&q.y>0),xs=L.map(q=>q.x),ys=L.map(q=>q.y);
 let x1=l.length?Math.min(...l.map(q=>q.ex)):(xs.length?Math.min(...xs)-14:-22),x2=r.length?Math.max(...r.map(q=>q.ex)):(xs.length?Math.max(...xs)+14:22),
     y1=t.length?Math.min(...t.map(q=>q.ey)):(ys.length?Math.min(...ys)-14:-20),y2=b.length?Math.max(...b.map(q=>q.ey)):(ys.length?Math.max(...ys)+14:20);
 x1=Math.min(x1,-22);x2=Math.max(x2,22);y1=Math.min(y1,t.length?-26:-20);y2=Math.max(y2,b.length?26:20);
 const rad=Math.max(22,...L.map(q=>Math.hypot(q.ex,q.ey))),bub=VWB.has(c.type)&&rad<=34;
 return{L,x1,y1,x2,y2,bub,rad}}
function vwDraw(c,o){const G=vwGeom(c),[code,sub0]=VWC[c.type]||[c.type.toUpperCase(),''],sub=c.type==='ups'?(c.p.va>=1000?c.p.va/1000+' kVA':c.p.va+' VA'):sub0;
 const act=o&&S.run&&c.o&&Math.abs(c.o.p)>1e-3,cx=(G.x1+G.x2)/2,cy=(G.y1+G.y2)/2,fill=act?'rgba(61,220,151,.16)':'#fff';
 let h=G.bub?`<circle r=${G.rad} class=s style="fill:${fill}" />`:`<rect x=${G.x1} y=${G.y1} width=${G.x2-G.x1} height=${G.y2-G.y1} rx=2 class=s style="fill:${fill}" />`;
 h+=`<text x=${cx} y=${sub&&G.x2-G.x1>=56?cy-1:cy+5} class=tx style="font-size:${code.length>3?11:13}px">${esc(code)}</text>`+(sub&&G.x2-G.x1>=56?`<text x=${cx} y=${cy+10} class=mt style="font-size:7px">${esc(sub)}</text>`:'');
 if(!G.bub)G.L.forEach(q=>{const n=esc(q.n.split(' ')[0]);if(!n)return;
  h+=q.h?`<text x=${q.x<0?q.ex+3:q.ex-3} y=${q.y+3} class=mt style="font-size:7.5px;text-anchor:${q.x<0?'start':'end'}">${n}</text>`:`<text x=${q.x} y=${q.y<0?q.ey+9:q.ey-4} class=mt style="font-size:7.5px">${n}</text>`});
 return h}
function vwBB(c){const G=vwGeom(c);if(G.bub)return[-G.rad-6,-G.rad-6,2*G.rad+12,2*G.rad+12];return[G.x1-6,G.y1-6,G.x2-G.x1+12,G.y2-G.y1+12]}
Object.keys(VWC).forEach(t=>{const d=D[t];if(!d||!d.g)return;
 const og=d.g,ob=d.bb,opv=d.pv;
 d.p=d.p||{};d.p.vw=[VW[0],'','Appearance',VW];
 d.g=(c,o,cl)=>vwSy(c)?vwDraw(c,o):og(c,o,cl);
 d.bb=c=>{if(vwSy(c))return vwBB(c);if(typeof ob==='function')return ob(c);if(ob)return ob;
  const ts=dd(c).t.filter(q=>!hidT(q)),xs=[-22,22,...ts.map(q=>q[0])],ys=[-22,22,...ts.map(q=>q[1])],x0=Math.min(...xs)-6,y0=Math.min(...ys)-6;return[x0,y0,Math.max(...xs)+6-x0,Math.max(...ys)+6-y0]};
 if(opv)d.pv=c=>({...opv(c),vw:d.p.vw})});
function vwCycle(){S.vwAll=S.vwAll===''||S.vwAll==null?'sy':S.vwAll==='sy'?'ph':'';S.dirty=1;toast('Device look: '+(S.vwAll==='sy'?'all drawing symbols':S.vwAll==='ph'?'all physical devices':'as set in each part'))}
