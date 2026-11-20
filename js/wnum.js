/* ElectroSim v8.42 (wire numbers: show / hide button added) – automatic wire numbers (like EPLAN "connection numbers").
   • Every wire gets a number automatically. Wires that are electrically the same point (joined at a terminal, a wire end, a busbar, or through Net / Page Link
     parts with the same name) are one NET and share one number – so a junction never shows two different numbers.
   • You can overwrite a number: select the wire (double-click it, or double-click its number) and type a new one in Properties. By default the new number goes to
     every wire of that net; untick "Same number on all wires" to change only that wire. Type - to hide the number. "Auto" gives the automatic number back.
   • Numbering is set in Properties with nothing selected: show / hide, prefix, start, step, text size, and the order (drawing order or position on the sheet).
     Automatic numbers skip any number you typed yourself, so two nets never get the same number by accident.
   • Drag a number on the sheet to move it. The numbers are drawn on the sheet and printed in the PDF.
   Data: wire.wn = typed number (absent = automatic), wire.wg = 1 when it was typed for the whole net, wire.wo = [dx,dy] position offset, S.wn = numbering settings. Nothing here touches the simulation. */
'use strict';
const WN_DEF={on:1,pre:'',start:1,step:1,sz:10,ord:'d'};
const wnoCfg=()=>{const c=S.wn||(S.wn={...WN_DEF});for(const k in WN_DEF)if(c[k]==null)c[k]=WN_DEF[k];return c};
const wnoMan=w=>String(w.wn==null?'':w.wn).trim();      /* the number typed by the user ('' = automatic) */

/* work out the nets, the automatic numbers and the number every wire shows */
function wnoCompute(){
 const cfg=wnoCfg(),P=new Map(),
  find=k=>{if(!P.has(k))P.set(k,k);let r=k;while(P.get(r)!==r)r=P.get(r);while(P.get(k)!==r){const n=P.get(k);P.set(k,r);k=n}return r},
  un=(a,b)=>{const x=find(a),y=find(b);if(x!==y)P.set(x,y)};
 const ws=S.wires.filter(w=>!airK(w.a)&&by(cid(w.a))&&by(cid(w.b)));
 ws.forEach(w=>un(String(w.a),String(w.b)));
 S.comps.forEach(c=>{if(D[c.type].bus){const t=dd(c).t;for(let i=1;i<t.length;i++)un(c.id+'.'+i,c.id+'.0')}});   /* busbar: one potential */
 const nm={};S.comps.forEach(c=>{if(c.type!=='nl')return;const k=String(c.p.name).trim().toUpperCase();if(!k)return;if(k in nm)un(c.id+'.0',nm[k]);else nm[k]=c.id+'.0'});   /* same net name = same potential */
 const G=new Map();ws.forEach(w=>{const r=find(String(w.a));let g=G.get(r);if(!g)G.set(r,g={ws:[],man:'',auto:''});g.ws.push(w)});
 const gs=[...G.values()],root=new Map();
 gs.forEach(g=>{g.ws.sort((a,b)=>a.id-b.id);g.id0=g.ws[0].id;const m=g.ws.find(w=>w.wg&&wnoMan(w));g.man=m?wnoMan(m):'';   /* a net-wide typed number: every wire of the net (also ones drawn later) shows it */g.ws.forEach(w=>root.set(w.id,g))});
 if(cfg.ord==='p'){   /* by position: sheet, then top → bottom, then left → right */
  gs.forEach(g=>{let b=null;g.ws.forEach(w=>[w.a,w.b].forEach(k=>{const c=by(cid(k)),p=tp(k),q=[pnum(c.pg),Math.round(p[1]/GRID),p[0]];
   if(!b||q[0]<b[0]||(q[0]===b[0]&&(q[1]<b[1]||(q[1]===b[1]&&q[2]<b[2]))))b=q}));g.key=b});
  gs.sort((a,b)=>a.key[0]-b.key[0]||a.key[1]-b.key[1]||a.key[2]-b.key[2]||a.id0-b.id0)}
 else gs.sort((a,b)=>a.id0-b.id0);
 const used=new Set();ws.forEach(w=>{const m=wnoMan(w);if(m)used.add(m)});
 let n=Number.isFinite(+cfg.start)?Math.floor(+cfg.start):1;const st=Math.max(1,Math.floor(+cfg.step)||1),pre=String(cfg.pre||'');
 gs.forEach(g=>{if(g.man)return;let s;do{s=pre+n;n+=st}while(used.has(s));g.auto=s});
 const name=w=>{const g=root.get(w.id);return g?(wnoMan(w)||g.man||g.auto):''};
 const seen=new Map();ws.forEach(w=>{const s=name(w);if(!s||s==='-')return;let t=seen.get(s);if(!t)seen.set(s,t=new Set());t.add(root.get(w.id))});
 return{cfg,name,group:w=>root.get(w.id)||null,dup:s=>{const t=seen.get(s);return!!t&&t.size>1},nets:gs.length}}

/* the number of one wire, drawn at the middle of its longest straight piece; d = the wire's path ("M x y L x y …") */
function wnoLabel(w,d,live,sel,WN){
 if(!WN||!WN.cfg.on)return'';const s=WN.name(w);if(!s||s==='-')return'';
 const v=String(d).match(/-?\d+(?:\.\d+)?/g);if(!v||v.length<4)return'';
 const p=[];for(let i=0;i+1<v.length;i+=2)p.push([+v[i],+v[i+1]]);
 let bi=1,bl=-1;for(let i=1;i<p.length;i++){const l=Math.abs(p[i][0]-p[i-1][0])+Math.abs(p[i][1]-p[i-1][1]);if(l>bl){bl=l;bi=i}}
 const a=p[bi-1],b=p[bi],hz=Math.abs(b[0]-a[0])>=Math.abs(b[1]-a[1]),sz=+WN.cfg.sz||10,o=w.wo||[0,0],tw=s.length*sz*.62+5;
 let x=(a[0]+b[0])/2,y=(a[1]+b[1])/2;const an=hz?'middle':'start';
 if(hz)y-=4;else{x+=5;y+=sz*.35}
 x+=o[0];y+=o[1];
 let h=`<text x=${x} y=${y} class="wnum${sel?' sel':''}${live&&WN.dup(s)?' dup':''}" style="text-anchor:${an};font-size:${sz}px">${esc(s)}</text>`;
 if(live)h+=`<rect class=wnh data-wl=${w.id} x=${an==='middle'?x-tw/2:x-2} y=${y-sz} width=${tw} height=${sz+4} rx=2><title>Wire number · drag to move it · double-click to change it</title></rect>`;
 return h}

/* type a number (or clear it): the whole net by default, or just this wire */
function wnoSet(w,v){v=String(v).trim();const g=wnoCompute().group(w),net=g&&(S.wnNet!==0||g.ws.length<2);
 if(net)g.ws.forEach(x=>{if(v){x.wn=v;x.wg=1}else{delete x.wn;delete x.wg}});   /* whole net: wn + wg flag */
 else{if(v){w.wn=v;delete w.wg}else{delete w.wn;delete w.wg}}                    /* this wire only */
 S.dirty=1}

/* Properties of a selected wire (number part) */
function wnoWireProps(w){
 const WN=wnoCompute(),g=WN.group(w),n=g?g.ws.length:1,s=WN.name(w),own=w.wn==null?'':String(w.wn);
 let h=`<div class=sec>Wire number</div><label>Number<input type=text data-wn maxlength=24 placeholder="auto" value="${esc(own)}"></label>`;
 h+=`<p class=mu style="margin:2px 0 4px">On the sheet: <b>${s&&s!=='-'?esc(s):'(hidden)'}</b>${own?'':' <span class=mu>(automatic)</span>'}</p>`;
 if(n>1)h+=`<label class=ck><input type=checkbox data-wnnet ${S.wnNet===0?'':'checked'}>Same number on all ${n} wires of this net</label>`;
 if(s&&s!=='-'&&WN.dup(s))h+=`<p class=note>“${esc(s)}” is also used on another net. Wires with the same number should be the same point.</p>`;
 if(!WN.cfg.on)h+='<p class=note>Wire numbers are switched off. Turn them on in Properties (click an empty place on the sheet).</p>';
 h+=`<div class=row><button data-a=wnauto>Auto number</button>${w.wo?'<button data-a=wnpos>Reset position</button>':''}</div>`;
 return h+'<p class=mu>Double-click the wire or its number to edit it. Drag the number to move it. Type - to hide it.</p>'}

/* Properties with nothing selected: numbering settings */
function wnoSettings(){const c=wnoCfg(),o=(v,t)=>`<option value=${v} ${c.ord===v?'selected':''}>${t}</option>`;
 return`<div class=sec>Wire numbers</div>
 <label class=ck><input type=checkbox data-wc=on ${c.on?'checked':''}>Show wire numbers on the sheet</label>
 <div class=two><label>Prefix<input type=text data-wc=pre maxlength=8 placeholder="e.g. W" value="${esc(c.pre)}"></label><label>Start at<input type=number step=1 data-wc=start value=${c.start}></label></div>
 <div class=two><label>Step<input type=number min=1 step=1 data-wc=step value=${c.step}></label><label>Text size<input type=number min=6 max=24 step=1 data-wc=sz value=${c.sz}></label></div>
 <label>Number in order of<select data-wc=ord>${o('d','Drawing (the order the wires were drawn)')}${o('p','Position (top to bottom, left to right)')}</select></label>
 <p class=mu style="margin:2px 0">Wires that are the same electrical point share one number. Select a wire to type your own number; automatic numbers skip the ones you typed.</p>
 <div class=row><button data-a=wnclr>Clear all typed numbers</button></div>`}
function wnoCfgSet(t){const c=wnoCfg(),k=t.dataset.wc;
 if(t.type==='checkbox')c[k]=t.checked?1:0;
 else if(k==='pre'||k==='ord')c[k]=t.value;
 else{const v=Math.floor(parseFloat(t.value));if(!Number.isFinite(v))return;if(k==='step'&&v<1)return;if(k==='sz'&&(v<6||v>24))return;c[k]=v}
 S.dirty=1;if(k==='on'&&typeof ribbon==='function')ribbon()}

/* focus the number box in the Properties panel (opens the panel if it is hidden) */
function wnoFocus(){if(B.contains('hr'))panel('hr',true);setTimeout(()=>{const t=$('#propsBody [data-wn]');if(t){t.focus();t.select()}},80)}
/* second tap on the same wire / number within 450 ms */
function wnoTap(id){const n=performance.now(),d=window._wnT&&_wnT.id===id&&n-_wnT.t<450;window._wnT=d?null:{id,t:n};return d}

/* View → Wire numbers (ribbon button, ⋯ menu, command WN): show / hide every wire number on the sheet and in the PDF.
   The same switch as "Show wire numbers on the sheet" in Properties. The numbers themselves (and the ones you typed) are kept. */
function wnoToggle(){const c=wnoCfg();c.on=c.on?0:1;S.dirty=1;
 if(typeof ribbon==='function')ribbon();
 const t=$('#propsBody [data-wc=on]');if(t)t.checked=!!c.on;
 if(typeof commit==='function')commit();
 toast('Wire numbers '+(c.on?'shown':'hidden'))}
