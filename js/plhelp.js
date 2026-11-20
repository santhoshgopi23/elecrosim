/* ElectroSim – Help page of the PLC ladder editor (v8.21). Opened from the editor header (❓ Help) or the project tree.
   plHelpView() fills #plHelp; the examples are drawn with the editor's own plRungSVG and can be inserted into the program. */
'use strict';
const PLX=(()=>{const no=a=>({k:'no',a}),nc=a=>({k:'nc',a}),out=a=>({k:'out',a}),S=(...ch)=>({k:'s',ch}),P=(...r)=>({k:'p',ch:r.map(x=>S(...x))}),R=(t,cm,c,o)=>({t,cm,c:S(...c),o});
 return[
 {t:'Start / Stop with seal-in',d:'The classic motor starter. Press START (I0.0): the output Q0.0 comes on and its own contact <b>seals in</b> (holds) it, so you can let go. STOP (I0.1) is wired as a normally-closed contact in the circuit, so pressing it breaks the rung. The parallel branch is “START <b>or</b> Q0.0”.',
  need:['DI'],r:[R('Start / Stop','Q0.0 latches itself on',[P([no('I0.0')],[no('Q0.0')]),nc('I0.1')],[out('Q0.0')])]},
 {t:'On-delay timer (TON)',d:'When I0.0 has been on for 3 s the timer’s <b>done bit T0</b> turns on and switches Q0.1. If I0.0 goes off before the time is over, the timer resets to 0.',
  need:['DI'],r:[R('Start the timer','Runs only while I0.0 is on',[no('I0.0')],[{k:'ton',a:'T0',v:3}]),R('Delayed output','T0 is the done bit',[no('T0')],[out('Q0.1')])]},
 {t:'Counter (CTU)',d:'Every <b>rising edge</b> of I0.2 (off → on) adds 1. After 5 counts the done bit C0 turns on and switches Q0.2. I0.3 resets the counter to 0 with a RESET coil.',
  need:['DI'],r:[R('Count pulses','Counts each press of I0.2',[no('I0.2')],[{k:'ctu',a:'C0',v:5}]),R('Batch full','C0 = done bit',[no('C0')],[out('Q0.2')]),R('Reset the counter','',[no('I0.3')],[{k:'rst',a:'C0'}])]},
 {t:'Set / Reset latch',d:'<b>SET</b> turns the output on and it <b>stays on</b>, even after the input goes off, until a <b>RESET</b> turns it off. Like a memory (flip-flop).',
  need:['DI'],r:[R('Set','I0.4 sets Q0.3',[no('I0.4')],[{k:'set',a:'Q0.3'}]),R('Reset','I0.5 resets Q0.3',[no('I0.5')],[{k:'rst',a:'Q0.3'}])]},
 {t:'Analog compare (alarm level)',d:'The analog input AI0 is a percentage of its span (0-10 V or 4-20 mA). When it is <b>above 50 %</b> the output Q0.4 switches on – e.g. a high-level alarm from a level transmitter.',
  need:['AI'],r:[R('High level alarm','AI0 > 50 %',[{k:'cmp',a:'AI0',op:'>',v:50}],[out('Q0.4')])]}]})();
function plHelpExampleSVG(r){const sn=ED.nodes,ss=ED.slots,st=ED.sel,tg=ED.c.tags;ED.nodes=[];ED.slots=[];ED.sel=null;ED.c.tags={};
 try{return plRungSVG(JSON.parse(JSON.stringify(r)),-1).replace(/<rect class="sl [^>]*\/>/g,'')}finally{ED.nodes=sn;ED.slots=ss;ED.sel=st;ED.c.tags=tg}}
function plHelpView(){const cf=plCfg(ED.c);
 const ex=PLX.map((x,i)=>{const miss=x.need.includes('AI')&&!cf.AI?'This example needs an analog input: set AI to at least 1 in Device configuration.':x.need.includes('DI')&&!cf.DI?'This example needs digital inputs.':'';
  return`<div class=hx><h4>${i+1}. ${x.t}</h4><p>${x.d}</p>${x.r.map(r=>`<div class=hxr><div class=hxt>${r.t}${r.cm?` <span class=mu>– ${r.cm}</span>`:''}</div><div class=rs>${plHelpExampleSVG(r)}</div></div>`).join('')}<p><button class=pri data-ex=${i} ${miss?'disabled':''}>＋ Insert into my program</button> ${miss?`<span class=mu>${miss}</span>`:'<span class=mu>Adds the network(s) at the end. Press ▶ Run and use the Watch table to test.</span>'}</p></div>`}).join('');
 $p('plHelp').innerHTML=`<div class=hlp-in>
 <h2>PLC programming help</h2>
 <p class=mu>Everything you need to write a ladder program in ElectroSim, in the style of Siemens TIA Portal (LAD).</p>
 <nav class=hn><a href="#" data-hj=h1>How a PLC works</a><a href="#" data-hj=h2>Addresses</a><a href="#" data-hj=h3>Build a program</a><a href="#" data-hj=h4>Instructions</a><a href="#" data-hj=h5>Examples</a><a href="#" data-hj=h6>Wiring &amp; running</a><a href="#" data-hj=h7>Troubleshooting</a></nav>

 <h3 id=h1>1. How a PLC works</h3>
 <p>A PLC repeats the same <b>scan</b> again and again, many times per second:</p>
 <ol class=hs><li><b>Read the inputs</b> – the state of every switch and sensor (I0.0, I0.1 …) and analog input (AI0 …).</li><li><b>Run the program</b> – networks are solved <b>top to bottom</b>, each one <b>left to right</b>. “Power” flows from the left rail through contacts; a contact passes it when it is true.</li><li><b>Write the outputs</b> – coils set Q0.0, Q0.1 … which switch lamps, contactors and valves.</li></ol>
 <p>While the simulation runs, wires that carry power are shown <b style="color:var(--ok)">green</b>. If power reaches the end of a network, its coil / box is active.</p>
 <p>Because the networks are solved in order, a contact later in the program sees the result written by an earlier network <b>in the same scan</b>.</p>

 <h3 id=h2>2. Addresses and names</h3>
 <table class=hxtab><tr><th>Address</th><th>Meaning</th><th>Notes</th></tr>
 <tr><td><code>I0.0 … I1.7</code></td><td>Digital <b>inputs</b> (DI)</td><td>Read-only. Come from the terminals; use the Watch table to force them.</td></tr>
 <tr><td><code>Q0.0 … Q1.7</code></td><td>Digital <b>outputs</b> (DO)</td><td>Drive the output terminals (relay contacts).</td></tr>
 <tr><td><code>M0.0 … M1.7</code></td><td><b>Memory bits</b></td><td>Internal flags with no terminal. The HMI buttons write to M (and I) bits.</td></tr>
 <tr><td><code>T0 … T7</code></td><td><b>Timers</b></td><td>As a contact, T0 is the <b>done bit</b>. Compare it to read the elapsed seconds.</td></tr>
 <tr><td><code>C0 … C7</code></td><td><b>Counters</b></td><td>As a contact, C0 is the <b>done bit</b> (count ≥ preset).</td></tr>
 <tr><td><code>AI0 …</code> / <code>AO0 …</code></td><td><b>Analog</b> in / out</td><td>0 – 100 % of the span (0-10 V or 4-20 mA).</td></tr></table>
 <p>Give any address a <b>name</b> (e.g. I0.0 = START) in the <b>Tag table</b> or in Properties. Names appear on the ladder, in the Watch table and in the HMI.</p>

 <h3 id=h3>3. Building a program</h3>
 <ol class=hs>
 <li><b>Add a network.</b> Each network is one rung of logic (one “idea”). Press <b>＋ Network</b> or the <b>＋ Insert network</b> bar between networks. Give it a title and comment.</li>
 <li><b>Place instructions.</b> <b>Drag</b> an instruction from the <b>Components</b> list (left) onto the network: the free places light up, the nearest turns solid, release to drop. Contacts go on the left, coils / timers / counters on the right. Or just click an instruction to add it after the selected one. Keys: <kbd>C</kbd> NO · <kbd>N</kbd> NC · <kbd>A</kbd> compare · <kbd>O</kbd> OUT · <kbd>S</kbd> SET · <kbd>R</kbd> RST · <kbd>T</kbd> TON · <kbd>U</kbd> CTU · <kbd>M</kbd> MOVE.</li>
 <li><b>Make an OR with a branch.</b> Drag a contact onto the dashed <b>“parallel row” strip under the contacts</b> (or onto the bottom edge of one contact), or select a contact and press <b>⎇ Parallel row</b>. You can add as many parallel rows as you like, and drop contacts at the start, middle or end of any row. Contacts in a row are <b>AND</b>; rows in parallel are <b>OR</b>.</li>
 <li><b>Choose the address.</b> Click the instruction, then pick its address in the <b>Properties</b> panel on the right (and a preset, value or name if it has one).</li>
 <li><b>Move or delete.</b> Drag a placed element to a new place (even into another network). <kbd>Del</kbd> removes the selected element. <kbd>Ctrl+Z</kbd> / <kbd>Ctrl+Y</kbd> undo / redo; <kbd>Ctrl+D</kbd> duplicates a network.</li>
 <li><b>Run it.</b> Close the editor (or keep it open), press <b>▶ Run</b>, click the inputs in the Watch table to force them, and watch the green power flow.</li></ol>

 <h3 id=h4>4. Instruction reference</h3>
 <table class=hxtab><tr><th>Symbol</th><th>Name</th><th>What it does</th></tr>
 <tr><td><code>┤ ├</code></td><td>NO contact</td><td>Passes power when its bit is <b>1</b> (ON).</td></tr>
 <tr><td><code>┤/├</code></td><td>NC contact</td><td>Passes power when its bit is <b>0</b> (OFF). Use it for STOP buttons.</td></tr>
 <tr><td><code>( )</code></td><td>Output coil</td><td>Sets the bit to 1 while power reaches it, 0 otherwise (re-written every scan). Use each output address in <b>one</b> coil only.</td></tr>
 <tr><td><code>(S)</code></td><td>SET</td><td>Sets the bit to 1 and <b>keeps</b> it on until a RESET.</td></tr>
 <tr><td><code>(R)</code></td><td>RESET</td><td>Sets the bit to 0. On a timer or counter it also clears its value.</td></tr>
 <tr><td><code>== &lt;&gt; &gt; &gt;= &lt; &lt;=</code></td><td>Compare</td><td>Passes power if the value of AI / AO (%), a timer (seconds) or a counter (counts) matches the test.</td></tr>
 <tr><td><code>TON</code></td><td>On-delay timer</td><td>Counts seconds while power is on; its done bit turns on after <b>PT</b>. Power off resets it to 0.</td></tr>
 <tr><td><code>CTU</code></td><td>Up counter</td><td>Adds 1 on each off → on edge. Done bit on when the count ≥ <b>PV</b>. Reset with a RESET coil.</td></tr>
 <tr><td><code>MOVE</code></td><td>Move to analog output</td><td>While power is on, writes a constant % (or the value of an analog input) to an AO.</td></tr></table>

 <h3 id=h5>5. Examples – insert them and try them</h3>${ex}

 <h3 id=h6>6. Wiring the PLC and running</h3>
 <ol class=hs><li>Give the PLC <b>24 V</b>: <b>L+</b> to +24 V and <b>M</b> to 0 V. In Properties the <i>Mode</i> must be <b>RUN</b>.</li>
 <li><b>Inputs</b> (I0.0 …): connect +24 V through a switch or sensor to the input terminal. Sensors: a PNP sensor’s OUT goes to the input.</li>
 <li><b>Outputs</b> (Q0.0 …) are relay contacts: feed the common <b>1L</b> with the supply, and wire each load from its Q terminal to 0 V (a contactor coil A1 ← Q0.0, A2 → 0 V).</li>
 <li><b>Analog</b>: AI takes 0-10 V or 4-20 mA (set in Device configuration); use a signal injector or a transmitter.</li>
 <li>Press <b>▶ Run</b>. The PLC status in the editor header must say <b>RUN</b>. Use the Watch table to force inputs without wiring a switch.</li></ol>

 <h3 id=h7>7. Troubleshooting</h3>
 <table class=hxtab><tr><th>Problem</th><th>Check</th></tr>
 <tr><td>Status says “PLC has no power”</td><td>L+ / M not connected to 24 V / 0 V, or the supply is off.</td></tr>
 <tr><td>Status says “PLC in STOP mode”</td><td>Set <i>Mode</i> to RUN in Device configuration or Properties.</td></tr>
 <tr><td>Rung is green but the load does not switch</td><td>Is <b>1L</b> fed? Is the load wired from the right Q terminal to 0 V?</td></tr>
 <tr><td>An input never turns on</td><td>No 24 V at the terminal, or the address in the ladder is not the one you wired. Click the input in the Watch table to force it and see the program react.</td></tr>
 <tr><td>Output flickers or never stays on</td><td>The same output is used in <b>two coils</b> – the last one wins every scan. Use one coil per output, or SET / RESET.</td></tr>
 <tr><td>Timer does nothing</td><td>The input must stay on for the whole preset; a short pulse resets it. Use <b>T0</b> as a contact to use its done bit.</td></tr>
 <tr><td>Counter counts only once</td><td>It counts <b>rising edges</b>: the input has to go off and on again.</td></tr>
 <tr><td>Address shows “(not fitted)”</td><td>The PLC has fewer channels than the program uses – raise DI / DO / AI / AO in Device configuration.</td></tr></table>
 </div>`;
 $p('plHelp').querySelectorAll('[data-hj]').forEach(a=>a.onclick=e=>{e.preventDefault();const t=document.getElementById(a.dataset.hj);if(t)t.scrollIntoView({behavior:'smooth',block:'start'})})}
function plInsertEx(i){const x=PLX[i],R=ED.c.prog.rungs;if(!x)return;
 const empty=R.length===1&&!R[0].c.ch.length&&!R[0].o.length;if(empty)R.length=0;
 x.r.forEach(r=>R.push(JSON.parse(JSON.stringify(r))));ED.ri=R.length-1;ED.sel=null;ED.view='main';plChanged();
 toast('Example inserted – '+x.r.length+' network'+(x.r.length>1?'s':'')+' added at the end');
 setTimeout(()=>{const b=$p('plBody');if(b)b.scrollTop=b.scrollHeight},30)}
