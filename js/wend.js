/* ElectroSim v8.27 – free wire ends.
   A wire may now stop anywhere on the sheet: while drawing, double-click (or press Enter) to end the wire at the last corner / pointer point.
   The end is a small real part, "Wire end" (library: Connection), so wires, moving, deleting and the simulation work as for any terminal;
   other wires can later be joined to it (it then acts as a junction).
   A free end that only one wire reaches (nothing else is joined to it) is LOOSE: shown in magenta (ring with a cross), its wire is drawn magenta dashed, and the
   results list says "Wire end … is not connected to any terminal". Once a second wire is joined to it (e.g. to a terminal) it turns into a normal junction dot. */
'use strict';
/* a wire end is LOOSE while only one wire is attached to it, i.e. its far end touches nothing */
const wnCount=c=>S.wires.filter(w=>w.a===c.id+'.0'||w.b===c.id+'.0').length;
const wnLoose=c=>c.type==='wend'&&wnCount(c)<2;
const wnWire=w=>{const a=by(cid(w.a)),b=by(cid(w.b));return!!((a&&a.type==='wend'&&wnLoose(a))||(b&&b.type==='wend'&&wnLoose(b)))};
D.wend={n:'Wire end (free end)',ds:'Free end of a wire: lets a wire stop anywhere; shown magenta while it is not connected to any terminal',cat:'Connection',pre:'WE',nolbl:1,bom:0,nn:1,us:1,bb:[-10,-10,20,20],t:[[0,0,'']],p:{},el:()=>[],
 g:c=>wnLoose(c)?`<circle r=8 style="fill:rgba(224,0,122,.16);stroke:#e0007a;stroke-width:2" /><path d="M-4 -4L4 4M4 -4L-4 4" style="stroke:#e0007a;stroke-width:2;fill:none" />`:`<circle r=3.5 class=f />`,
 msg:c=>wnLoose(c)?[['wa',`Wire end ${c.label} (page ${pnum(c.pg)}) is not connected to any terminal`]]:[],
 pp:c=>wnLoose(c)?'<p class=mu style="color:#e0007a"><b>Loose end</b> – nothing is connected at this end. Click the ring and draw a wire from it to a terminal to join it.</p>':'<p class=mu>Joined: two or more wires meet at this point.</p>'};
function wnEnd(){if(!S.wiring)return;if(airK(S.wiring)){toast('An air line must end at an air port');return}
 const v=(S.wvia||[]).slice(),p=v.length?v.pop():wvBase(),c=add('wend',p[0],p[1]);S.wvia=v;finishWire(S.wiring,c.id+'.0');toast('Wire ends here (magenta = not connected to a terminal)')}
