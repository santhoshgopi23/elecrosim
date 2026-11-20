/* ElectroSim – Footer table (title block). One editable table, shown on every sheet.
   Cells can hold fixed text or {page} {pages} {title} {project} {dwgno} {rev} {date}. */
const f1=v=>Math.round(v*10)/10;
function tblDims(s){return{W:s.cw.reduce((a,b)=>a+b,0),H:s.rh*s.rows}}
function tblFit(t,w,font){_mc.font=font;if(_mc.measureText(t).width<=w)return t;while(t.length>1&&_mc.measureText(t+'…').width>w)t=t.slice(0,-1);return t+'…'}
function tblMarkup(s,live,sel,pi){
 const col=s.col||'#10202f',wd=s.wd||1.5,{W,H}=tblDims(s),fs=s.size||12,xs=[0];s.cw.forEach(w=>xs.push(xs[xs.length-1]+w));
 let h=`<g transform="translate(${s.x} ${s.y})"><rect width=${W} height=${H} fill="${s.fill||'#fff'}" stroke="none" />`,t='',g='';
 for(let r=0;r<s.rows;r++)for(let c=0;c<s.cols;c++){
  const lab=s.lab!==0&&c%2===0;
  if(lab)h+=`<rect x=${xs[c]} y=${r*s.rh} width=${s.cw[c]} height=${s.rh} fill="#e9eff5" />`;
  const txt=tblFit(subst(s.cells[r*s.cols+c]||'',pi),s.cw[c]-10,`${lab?'bold ':''}${fs}px Arial,Helvetica,sans-serif`);
  if(txt)t+=`<text x=${xs[c]+6} y=${r*s.rh+s.rh/2+fs*.35} fill="${col}" style="font:${lab?'700':'400'} ${fs}px Arial,Helvetica,sans-serif;white-space:pre">${esc(txt)}</text>`}
 for(let r=1;r<s.rows;r++)g+=`M0 ${r*s.rh}H${W}`;for(let c=1;c<s.cols;c++)g+=`M${xs[c]} 0V${H}`;
 h+=`<path d="${g}" stroke="${col}" stroke-width=${wd*.6} fill=none />`+t+`<rect width=${W} height=${H} fill=none stroke="${col}" stroke-width=${wd+.5} />`;
 if(live)h+=`<rect width=${W} height=${H} fill=transparent pointer-events=all data-s=${s.id} class=shit />`;
 if(sel)h+=`<rect x=-3 y=-3 width=${W+6} height=${H+6} class=selr />`;
 return h+'</g>'}
function addFooter(auto){
 const ex=S.shapes.find(s=>s.k==='tbl'&&s.all);
 if(ex){if(auto)return;select({k:'s',id:ex.id});panel('hr',true);toast('The footer table already exists – edit it in the right-hand panel');return}
 const[W,H]=paperPx(),m=10*U,rows=3,rh=28,cw=[90,210,80,140],w=520;
 const s={id:S.nid++,k:'tbl',pg:S.pg,all:1,col:'',wd:1.5,ds:'',fill:'',x:W-m-w,y:H-m-rh*rows,rows,cols:4,cw,rh,size:12,lab:1,
  cells:['Project','{project}','Drawing no.','{dwgno}','Title','{title}','Rev.','{rev}','Date','{date}','Sheet','{page} / {pages}']};
 S.shapes.push(s);S.dirty=1;if(auto)return;setTool('sel');select({k:'s',id:s.id});panel('hr',true);toast('Footer table added to every sheet – type in its cells at the right')}
/* a brand-new empty drawing starts with the footer already on the sheet */
addEventListener('load',()=>setTimeout(()=>{if(typeof S!=='undefined'&&!S.shapes.length)addFooter(true)},400));
function tblProps(s){
 let h='<h3>Footer table</h3><p class=mu style="margin:0 0 8px">Click a cell and type. These fill in by themselves on each sheet: <code>{page}</code> <code>{pages}</code> <code>{title}</code> <code>{project}</code> <code>{dwgno}</code> <code>{rev}</code> <code>{date}</code></p>';
 h+=`<div class=tbg style="grid-template-columns:repeat(${s.cols},minmax(0,1fr))">`;
 for(let r=0;r<s.rows;r++)for(let c=0;c<s.cols;c++)h+=`<input data-tc="${r},${c}" value="${esc(s.cells[r*s.cols+c]||'')}" aria-label="Row ${r+1}, column ${c+1}" class="${s.lab!==0&&c%2===0?'tl':''}">`;
 h+='</div><div class=lr style="margin:8px 0"><button data-a="tr+">+ Row</button><button data-a="tr-">− Row</button><button data-a="tc+">+ Column</button><button data-a="tc-">− Column</button></div>';
 h+='<div class=sec>Column widths (mm)</div><div class=tbw>'+s.cw.map((w,i)=>`<input type=number min=5 step=1 data-tw=${i} value=${f1(w/U)} aria-label="Width of column ${i+1}">`).join('')+'</div>';
 h+=`<div class=two><label>Row height (mm)<input type=number min=4 step=.5 data-sp=rh data-mul=4 value=${f1(s.rh/U)}></label><label>Text size<input type=number min=6 max=60 step=1 data-sp=size value=${s.size}></label></div>`;
 h+=`<label class=ck><input type=checkbox data-sp=lab ${s.lab!==0?'checked':''}>Shade and bold the label columns (1st, 3rd…)</label>`;
 h+=`<div class=sec>Border colour</div>${swatches('col',s.col,'Default')}<div class=sec>Background</div>${swatches('fill',s.fill,'White')}`;
 h+=`<label>Border thickness<input type=range min=1 max=6 step=.5 data-sp=wd value=${s.wd||1.5}></label>`;
 return h+`<label class=ck style="margin-top:12px"><input type=checkbox data-sp=all ${s.all?'checked':''}>Show on every page</label><p class=mu style="margin:2px 0 6px">Drag the table on the sheet to move it. Double-click a cell to edit it.</p><p><button data-a=dup>Duplicate</button> <button data-a=del class=dn>Delete</button></p>`}
function tblIn(s,t){
 if('tc'in t.dataset){const[r,c]=t.dataset.tc.split(',').map(Number);s.cells[r*s.cols+c]=t.value}
 else{const v=parseFloat(t.value);if(v>=5)s.cw[+t.dataset.tw]=v*U}}
function tblAct(s,a){
 if(!/^t[rc][+-]$/.test(a))return false;
 const[W,H]=paperPx(),m=10*U,d=tblDims(s),atB=Math.abs(s.y+d.H-(H-m))<3,atR=Math.abs(s.x+d.W-(W-m))<3;
 if(a==='tr+'){if(s.rows>=12){toast('12 rows is the maximum');return true}for(let i=0;i<s.cols;i++)s.cells.push('');s.rows++;if(atB)s.y-=s.rh}
 else if(a==='tr-'){if(s.rows<2)return true;s.cells.length-=s.cols;s.rows--;if(atB)s.y+=s.rh}
 else if(a==='tc+'){if(s.cols>=8){toast('8 columns is the maximum');return true}const n=[];for(let r=0;r<s.rows;r++){n.push(...s.cells.slice(r*s.cols,(r+1)*s.cols),'')}s.cells=n;s.cw.push(100);s.cols++;if(atR)s.x-=100}
 else if(a==='tc-'){if(s.cols<2)return true;const n=[];for(let r=0;r<s.rows;r++)n.push(...s.cells.slice(r*s.cols,(r+1)*s.cols-1));const w=s.cw.pop();s.cells=n;s.cols--;if(atR)s.x+=w}
 S.dirty=1;props();return true}
function tblFocus(s,e){
 const p=mp(e);let x=p.x-s.x,c=0;while(c<s.cols-1&&x>s.cw[c]){x-=s.cw[c];c++}
 const r=Math.max(0,Math.min(s.rows-1,Math.floor((p.y-s.y)/s.rh)));panel('hr',true);
 setTimeout(()=>{const i=document.querySelector(`#propsBody [data-tc="${r},${c}"]`);if(i){i.focus();i.select()}},80)}
