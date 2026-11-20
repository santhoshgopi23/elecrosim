/* ElectroSim – Panel design: builds EPLAN-style GA (general arrangement) drawings from the schematic.
   Pages made: GA 1 mounting plate (DIN rails, wiring ducts, dimensions, item balloons),
               GA 2 door (cut-outs for pushbuttons, lamps, meters, HMI), GA 3+ parts list.
   Everything is normal editable shapes, so it can be moved, edited and plotted like the rest. */
const PNL_ENC=[[400,500],[500,500],[500,600],[600,600],[600,800],[800,800],[800,1000],[800,1200],[1000,1200],[1200,1200],[1200,1600],[1600,1800],[1600,2000]];
/* type: [zone, width mm, height mm, rail group]   p = on the mounting plate, d = on the door */
const PNL_MAP={mcb:['p',18,90,0],mcb3:['p',54,90,0],mcb2:['p',36,90,0],mccb:['p',75,130,0],mccb3:['p',105,130,0],rcd:['p',36,90,0],fus:['p',18,90,0],iso:['p',18,90,0],iso3:['p',54,90,0],spd:['p',36,90,0],
 psu:['p',90,125,1],xf:['p',150,130,1],ct:['p',60,60,1],pt:['p',70,100,1],
 rel:['p',15,80,2],rcoil:['p',15,80,2],ton:['p',22.5,80,2],tcoil:['p',22.5,80,2],tcoff:['p',22.5,80,2],plr:['p',22.5,80,2],lvc3:['p',22.5,80,2],lvc5:['p',22.5,80,2],plc:['p',180,100,2],
 con:['p',45,85,3],con3:['p',45,85,3],coil:['p',45,85,3],mpcb3:['p',45,90,3],ovl:['p',45,80,3],ovl3:['p',45,80,3],
 vfd:['p',150,260,4],sst:['p',100,200,4],
 buspe:['p',120,30,5],busn:['p',120,30,5],busl:['p',120,30,5],bus24:['p',120,30,5],bus0:['p',120,30,5],
 hmi:['d',190,135],mfm:['d',96,96],vm:['d',96,96],am:['d',96,96],mltm:['d',96,96],fan:['d',119,119],
 pb:['d',22.5],pbnc:['d',22.5],sel2:['d',22.5],sel3:['d',22.5],ky:['d',22.5],estop:['d',22.5],pl:['d',22.5],led:['d',22.5],buz:['d',22.5],bcn:['d',22.5],twr:['d',22.5],pot:['d',22.5],sw:['d',22.5]};
const PNL_TERM=['term','trm','tpe','fut'],PNL_SKIP=['ac','ac3','dc','bat','pe','nl','txt','box','dio','cno','cnc','cco','cp3','finj','inj'];
const PNL_GRP=['Incoming protection','Power supplies / measuring','Control: PLC, relays, timers','Contactors, overloads, motor protection','Drives','Busbars','Terminal strips'];

function pnlCollect(){
 const dev=[],door=[],field=[],terms=[],seen={};
 S.comps.forEach(c=>{const t=c.type,d=D[t];if(!d||PNL_SKIP.includes(t))return;
  if(PNL_TERM.includes(t)){terms.push(c);return}
  const key=c.label||('#'+c.id);if(seen[key])return;seen[key]=1;
  const m=PNL_MAP[t],o={c,lab:c.label||'?',desc:d.n,mf:c.mf||'',md:c.md||'',pn:c.pn||'',pg:c.pg,type:t};
  if(!m){field.push(o);return}
  o.w=m[1];o.h=m[2]||m[1];o.g=m[3]||0;o.round=m[0]==='d'&&!m[2];(m[0]==='p'?dev:door).push(o)});
 dev.sort((a,b)=>a.g-b.g||String(a.lab).localeCompare(b.lab,undefined,{numeric:true}));
 return{dev,door,field,terms}}
function pnlTermStrips(terms,maxW){
 const n=terms.length;if(!n)return[];const per=Math.max(1,Math.floor(maxW/6.2)),out=[];
 for(let i=0,k=1;i<n;i+=per,k++){const cnt=Math.min(per,n-i);out.push({lab:'X'+k,desc:`Terminal strip, ${cnt} poles`,mf:'',md:'',pn:'',type:'term',w:Math.round(cnt*6.2*10)/10,h:45,g:6,pg:terms[i].pg})}
 return out}
/* pack devices onto DIN rails; one rail group per function, wrap when the rail is full */
function pnlPack(devs,usableW,gap=8){
 const rows=[];let cur=null;
 devs.forEach(o=>{const rg=o.g>3?o.g:0;if(!cur||cur.g!==rg||cur.x+o.w>usableW&&cur.items.length){cur={g:rg,items:[],x:0,h:0};rows.push(cur)}
  o.x=cur.x;cur.items.push(o);cur.x+=o.w+gap;cur.h=Math.max(cur.h,o.h)});
 rows.forEach(r=>r.w=r.x-gap);return rows}
function pnlNeedH(rows,duct){return 15+rows.reduce((a,r)=>a+duct+r.h,0)+duct+15}
function pnlPlan(opt){
 const col=pnlCollect(),all=col.dev.slice(),inset=35,margin=15;
 const attempt=(W,H)=>{const uw=W-2*inset-2*margin,ts=pnlTermStrips(col.terms,uw),devs=all.concat(ts),rows=pnlPack(devs,uw);
  return{W,H,uw,rows,devs,ts,need:pnlNeedH(rows,opt.duct),fits:Math.max(0,...devs.map(o=>o.w))<=uw&&pnlNeedH(rows,opt.duct)<=(H-2*inset)*(opt.auto?.88:1)}};
 let p;
 if(opt.auto){for(const[W,H]of PNL_ENC){p=attempt(W,H);if(p.fits)break}}else p=attempt(opt.W,opt.H);
 return Object.assign(p,{door:col.door,field:col.field,plateW:p.W-2*inset,plateH:p.H-2*inset,inset})}

function pnlScale(pl,paper){const[a,b]=PAPER[paper],PW=a*U,PH=b*U,m=10*U,aw=PW-2*m-60,ah=PH-2*m-50-100-20;return[1,2,2.5,5,10,20,25,50].find(s=>pl.W*U/s+140<=aw&&pl.H*U/s+150<=ah)||50}
function pnlGen(opt){
 /* remove an earlier set */
 const old=S.pages.filter(p=>/^GA \d/.test(p.title)).map(p=>p.id);
 if(old.length){S.shapes=S.shapes.filter(s=>!old.includes(s.pg));S.pages=S.pages.filter(p=>!old.includes(p.id))}
 const pl=pnlPlan(opt);
 if(opt.paper){S.tb.paper=opt.paper==='auto'?(pnlScale(pl,'A3')<=5?'A3':'A2'):opt.paper;S.tb.orient='L'}
 const [PW,PH]=paperPx(),m=10*U,reserveB=100,areaX=m+30,areaY=m+50,areaW=PW-2*m-60,areaH=PH-2*m-50-reserveB-20;
 /* scale: both views side by side */
 const sc=pnlScale(pl,S.tb.paper),f=U/sc;
 const mk=title=>{const id=S.pid++;S.pages.push({id,title});return id};
 let pg=0;const sh=o=>{const s=Object.assign({id:S.nid++,pg,all:0,col:'',wd:1.5,ds:''},o);S.shapes.push(s);return s};
 const ln=(x1,y1,x2,y2,wd=1,col='',ds='')=>sh({k:'line',x1,y1,x2,y2,wd,col,ds}),rc=(x,y,w,h,wd=1.5,fill='',col='',ds='')=>sh({k:'rect',x,y,w,h,wd,fill,col,ds}),
  ci=(x,y,r,wd=1.5,fill='',col='')=>sh({k:'circle',x,y,r,wd,fill,col}),
  tx=(x,y,text,size=14,al='left',bold=0,rot=0,col='')=>sh({k:'text',x,y,text,size,bold,it:0,al,rot,col});
 const dimH=(x1,x2,y,label,off=0)=>{ln(x1,y,x2,y,1);ln(x1,y-6,x1,y+6,1);ln(x2,y-6,x2,y+6,1);ln(x1,y-3,x1+8,y+3,1.5);ln(x2-8,y-3,x2,y+3,1.5);tx((x1+x2)/2,y-6,label,12,'center')};
 const dimV=(y1,y2,x,label)=>{ln(x,y1,x,y2,1);ln(x-6,y1,x+6,y1,1);ln(x-6,y2,x+6,y2,1);ln(x-3,y1,x+3,y1+8,1.5);ln(x-3,y2-8,x+3,y2,1.5);tx(x-6,(y1+y2)/2,label,12,'center',0,-90)};
 const head=(t)=>{tx(areaX,m+34,t,22,'left',1);tx(PW-m-30,m+34,`Scale 1:${sc}`,16,'right',1)};
 let item=0;const items=[];pl.rows.forEach(r=>r.items.forEach(o=>{o.no=++item;items.push(o)}));
 const ew=pl.W*f,eh=pl.H*f,ox=areaX+Math.max(60,(areaW-ew)/2-20),oy=areaY+30;

 /* ---------- GA 1: mounting plate ---------- */
 pg=mk('GA 1 – Mounting plate');head('GA 1  –  MOUNTING PLATE LAYOUT (front view)');
 rc(ox,oy,ew,eh,3);rc(ox+pl.inset*f,oy+pl.inset*f,pl.plateW*f,pl.plateH*f,1.5,'#f4f6f9','', '8 5');
 tx(ox+ew/2,oy+eh+22,`Enclosure ${pl.W} × ${pl.H} × ${opt.depth} mm  ·  Mounting plate ${pl.plateW} × ${pl.plateH} mm`,13,'center');
 dimH(ox,ox+ew,oy-26,pl.W+' mm');dimV(oy,oy+eh,ox-34,pl.H+' mm');
 const px=ox+pl.inset*f,py=oy+pl.inset*f;let y=15;const ducts=[],railY=[];
 const duct=(yy)=>{rc(px+15*f,py+yy*f,(pl.plateW-30)*f,opt.duct*f,1,'#dfe6ee','#6a7f94');ducts.push(yy)};
 pl.rows.forEach((r,ri)=>{duct(y);y+=opt.duct;const rh=r.h,cy=y+rh/2;railY.push(cy);
  rc(px+15*f,py+(cy-17.5)*f,(pl.plateW-30)*f,35*f,1,'#b9c3ce','#55687c');
  r.items.forEach(o=>{const dx=px+(15+o.x)*f,dy=py+(cy-o.h/2)*f,w=o.w*f,h=o.h*f;o.gx=dx;o.gy=dy;o.gw=w;o.gh=h;
   rc(dx,dy,w,h,1.5,'#ffffff');
   if(o.type==='term'){for(let k=1;k<Math.round(o.w/6.2);k++)ln(dx+k*6.2*f,dy,dx+k*6.2*f,dy+h,.6)}
   const fs=Math.max(7,Math.min(13,w>45?13:w*.62));
   if(w>=46||o.type==='term')tx(dx+w/2,dy+h/2-fs*.55,o.lab,fs,'center',1);else tx(dx+w/2+fs*.35,dy+h/2,o.lab,fs,'center',1,-90);
   /* item balloon above the device */
   const bx=dx+w/2,by=dy-11;ln(bx,dy,bx,by+7,.8);ci(bx,by,7.5,1,'#fff');tx(bx,by-5,String(o.no),9,'center',1)});
  y+=rh});
 duct(y);
 /* vertical chain dimension of the rail positions */
 let pys=[0].concat(railY);const dx0=ox+ew+34;pys.forEach((v,i)=>{if(i){ln(dx0-8,py+v*f,dx0+8,py+v*f,1);ln(dx0-8,py+pys[i-1]*f,dx0+8,py+pys[i-1]*f,1);ln(dx0,py+pys[i-1]*f,dx0,py+v*f,1);tx(dx0+6,py+(v+pys[i-1])*f/2+4,Math.round(v-pys[i-1])+'',11,'left')}});
 tx(dx0-4,py-8,'Rail centres from plate top (mm)',10,'left');
 tx(ox,oy+eh+44,`Wiring ducts ${opt.duct} × ${opt.duct} mm (grey)  ·  DIN rail TS35 (dark grey)  ·  numbers = item no., see parts list`,12);
 if(!pl.fits)tx(ox,oy+eh+64,'WARNING: devices do not fit this enclosure – choose a larger size.',13,'left',1,0,'#d12f2f');

 /* ---------- GA 2: door ---------- */
 pg=mk('GA 2 – Door');head('GA 2  –  DOOR LAYOUT (outside view)');
 const dox=ox;
 rc(dox,oy,ew,eh,3);tx(dox+ew/2,oy+eh+22,`Door ${pl.W} × ${pl.H} mm  ·  cut-outs for door-mounted devices`,13,'center');
 dimH(dox,dox+ew,oy-26,pl.W+' mm');dimV(oy,oy+eh,dox-34,pl.H+' mm');
 const groups=[pl.door.filter(o=>o.type==='hmi'),pl.door.filter(o=>['mfm','vm','am','mltm','fan'].includes(o.type)),pl.door.filter(o=>o.round)];
 let dy=60;const dm=60;let dn=0;
 groups.forEach((g,gi)=>{if(!g.length)return;let x=dm,rowH=0;
  g.forEach(o=>{const pitch=gi===2?55:o.w+30;if(x+o.w>pl.W-dm&&x>dm){x=dm;dy+=rowH+45;rowH=0}
   const cx=dox+(x+o.w/2)*f,cy=oy+(dy+o.h/2)*f;o.dn=++dn;
   if(o.round){ci(cx,cy,11.25*f,1.5);tx(cx,cy+11.25*f+13,o.lab,10,'center',1)}
   else{rc(cx-o.w*f/2,cy-o.h*f/2,o.w*f,o.h*f,1.5);tx(cx,cy-7,o.lab,12,'center',1);tx(cx,cy+o.h*f/2+13,`${o.w} × ${o.h} cut-out`,9,'center')}
   x+=pitch;rowH=Math.max(rowH,o.h)});dy+=rowH+45});
 if(!dn)tx(dox+ew/2,oy+eh/2,'No door-mounted devices in the schematic',14,'center');
 tx(dox,oy+eh+44,'Ø22.5 mm cut-outs for pushbuttons, selectors, lamps, e-stop.',12);

 /* ---------- GA 3+: parts list ---------- */
 const rowsAll=[['Item','Designation','Description','Brand / Model','Size mm','Zone']];
 items.forEach(o=>rowsAll.push([o.no,o.lab,o.desc+(o.type==='term'?'':''),[o.mf,o.md].filter(Boolean).join(' ')||'-',o.type==='term'?`${o.w} × ${o.h}`:`${o.w} × ${o.h}`,'Plate']));
 pl.door.forEach(o=>rowsAll.push(['D'+o.dn,o.lab,o.desc,[o.mf,o.md].filter(Boolean).join(' ')||'-',o.round?'Ø22.5':`${o.w} × ${o.h}`,'Door']));
 pl.field.forEach(o=>rowsAll.push(['F',o.lab,o.desc,[o.mf,o.md].filter(Boolean).join(' ')||'-','-','Field (outside panel)']));
 const K=Math.max(1,PW/1680),rh=26*K,perPage=Math.max(6,Math.floor((PH-2*m-50-reserveB-60)/rh)-1);let pgN=0;
 for(let i=1;i<rowsAll.length||i===1;i+=perPage){pgN++;pg=mk('GA '+(2+pgN)+' – Parts list');head('GA '+(2+pgN)+'  –  PANEL PARTS LIST'+(pgN>1?' (cont.)':''));
  const chunk=[rowsAll[0]].concat(rowsAll.slice(i,i+perPage)),cw=[56,130,430,330,120,200].map(v=>v*K),cells=[];chunk.forEach(r=>r.forEach(c=>cells.push(String(c))));
  sh({k:'tbl',all:0,col:'',wd:1.5,fill:'',x:areaX,y:areaY,rows:chunk.length,cols:6,cw,rh,size:Math.round(12*K),lab:0,cells});
  if(rowsAll.length<2)tx(areaX,areaY+rh*2+10,'The schematic has no panel devices yet.',14)}
 /* keep the footer table on every sheet */
 if(typeof addFooter==='function')addFooter(true);
 S.shapes.filter(s=>s.k==='tbl'&&s.all).forEach(s=>{const d=tblDims(s);s.x=PW-m-d.W;s.y=PH-m-d.H});
 const first=S.pages.find(p=>p.title.startsWith('GA 1'));
 setPage(first.id);renderTabs();S.dirty=1;commit();
 return{pl,sc,items:items.length,door:pl.door.length,field:pl.field.length}}

function pnlDialog(){
 let d=document.getElementById('dGA');
 if(!d){d=document.createElement('dialog');d.id='dGA';
  d.innerHTML=`<form method=dialog><h2>Panel design – GA drawings</h2>
  <p class=mu style="margin:0 0 10px">Builds a mounting-plate layout, door layout and parts list from the parts in your schematic. Pages named <b>GA 1…</b> are replaced each time you generate.</p>
  <div class=two><label>Enclosure<select id=gaEnc><option value=auto>Auto (smallest that fits, 12% spare)</option>${PNL_ENC.map(e=>`<option value="${e[0]}x${e[1]}">${e[0]} × ${e[1]} mm</option>`).join('')}</select></label>
  <label>Depth (mm)<input id=gaDepth type=number min=150 step=10 value=300></label></div>
  <div class=two><label>Wiring duct (mm)<select id=gaDuct><option>40</option><option selected>60</option><option>80</option></select></label>
  <label>Paper<select id=gaPaper><option value=auto selected>Auto (A3, or A2 if large)</option><option>A4</option><option>A3</option><option>A2</option></select></label></div>
  <p id=gaInfo class=mu></p><p id=gaPrev style="font-weight:600"></p>
  <div class=row style="display:flex;gap:8px;justify-content:flex-end"><button value=cancel>Close</button><button id=gaGo value=default class=pri>Generate GA drawings</button></div></form>`;
  document.body.appendChild(d);
  d.querySelector('#gaGo').addEventListener('click',e=>{e.preventDefault();
   const v=d.querySelector('#gaEnc').value,auto=v==='auto',[W,H]=auto?[0,0]:v.split('x').map(Number);
   const r=pnlGen({auto,W,H,depth:+d.querySelector('#gaDepth').value||300,duct:+d.querySelector('#gaDuct').value,paper:d.querySelector('#gaPaper').value});
   d.close();toast(`GA drawings made: enclosure ${r.pl.W} × ${r.pl.H} mm, ${r.items} plate devices, ${r.door} door devices, scale 1:${r.sc}`+(r.pl.fits?'':' – devices do not fit, choose a bigger enclosure'))})}
 const upd=()=>{const v=d.querySelector('#gaEnc').value,au=v==='auto',[W,H]=au?[0,0]:v.split('x').map(Number),pl=pnlPlan({auto:au,W,H,duct:+d.querySelector('#gaDuct').value}),pp=d.querySelector('#gaPaper').value,paper=pp==='auto'?(pnlScale(pl,'A3')<=5?'A3':'A2'):pp;d.querySelector('#gaPrev').textContent=`Result: enclosure ${pl.W} × ${pl.H} mm on ${paper}, scale 1:${pnlScale(pl,paper)}`+(pl.fits?'':' – does not fit, pick a bigger enclosure')};
 ['#gaEnc','#gaDuct','#gaPaper'].forEach(q=>d.querySelector(q).onchange=upd);upd();
 const c=pnlCollect();d.querySelector('#gaInfo').textContent=`Found in the schematic: ${c.dev.length+(c.terms.length?1:0)} panel device(s), ${c.door.length} door device(s), ${c.terms.length} terminal(s), ${c.field.length} field device(s) (listed, not drawn on the plate).`;
 d.showModal()}
