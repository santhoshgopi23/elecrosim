/* ElectroSim – wiring diagrams for the Help of every component (v8.38).
   WIR[type] = {s: one plain sentence, rows: [...], tip: [...], ti: box title, lg: legend overrides}
   A row is  [side, pin, label, colour, via, slot]
     side   'l' = wire comes from the LEFT into the pin, 'r' = wire goes from the pin to the RIGHT, 'c' = caption (pin = slot, label = text)
     pin    the terminal name printed on the part (exactly as on the symbol)
     label  what that wire goes to (the chip at the end of the wire)
     colour r +24 V · b 0 V / N · br L / L1 · k L2 · gy L3 · g switched / output · o signal · pe earth
     via    optional device drawn ON the wire (switch, fuse …)
     slot   row number; give two rows the same slot to draw them level (e.g. 1 and 2 of a breaker pole)
   wireHtml(type) returns the diagram plus a numbered “do this” list that is generated from the rows, so they always agree. */
'use strict';
const WCOL={r:'#d93a3a',b:'#2f7fae',g:'#12a36b',br:'#8b5a2b',k:'var(--tx)',gy:'#8a8f98',o:'#e08a00',pe:'#12a36b'};
const WLEG={r:'+24 V (DC positive)',b:'0 V / neutral (N)',br:'Live (L / L1)',k:'L2',gy:'L3',g:'Switched / output wire',o:'Signal wire',pe:'Earth (PE)'};
const WIR=(()=>{
const L=(pin,label,col,via,slot)=>['l',pin,label,col,via,slot],Rt=(pin,label,col,via,slot)=>['r',pin,label,col,via,slot],CP=(slot,text)=>['c',slot,text];
/* shortcuts used many times */
const two=(a,b,ca,cb,via)=>[L('1',a,ca||'r',via),Rt('2',b,cb||'g')];
const pole3=(la,ra,via)=>[L('1',la+' L1','br',null,0),L('3',la+' L2','k',null,1),L('5',la+' L3','gy',null,2),Rt('2',ra+' (L1)','br',null,0),Rt('4',ra+' (L2)','k',null,1),Rt('6',ra+' (L3)','gy',null,2)];
const load2=(a,b,via,ca)=>[L('1',a,ca||'r',via),Rt('2',b||'0 V (or N)','b')];
const coil2=(a)=>[L('A1',a||'+24 V from the START / STOP chain','r','Switch / contact'),L('A2','0 V','b')];

return{
/* ---------- power ---------- */
dc:{s:'A battery-like source that gives a steady voltage (for example 24 V) between + and −.',rows:[Rt('+','Loads (+24 V rail)','r','Fuse'),Rt('−','Loads (0 V rail)','b')],tip:['Never join + directly to − – that is a short circuit.']},
bat:{s:'A battery: a fixed DC voltage between + and −.',rows:[Rt('+','Loads (positive rail)','r','Fuse'),Rt('−','Loads (0 V rail)','b')],tip:['Never join + directly to −.']},
ac:{s:'A wall-socket style supply: live (L) and neutral (N).',rows:[Rt('L','Switch / load (live)','br','MCB'),Rt('N','Load (neutral)','b')],tip:['Put an MCB or fuse in the live wire before anything else.']},
ac3:{s:'The three-phase mains of a plant: three live wires (L1, L2, L3), neutral and earth.',rows:[Rt('L1','3-pole breaker pole 1','br'),Rt('L2','3-pole breaker pole 2','k'),Rt('L3','3-pole breaker pole 3','gy'),Rt('N','Neutral bar (if needed)','b'),Rt('PE','Earth bar (PE)','pe')],tip:['N is only needed for 1-phase loads, such as a 230 V coil between L1 and N.']},
psu:{s:'Turns mains (230 V AC) into a steady low voltage such as 24 V DC for the control circuit.',rows:[L('L','Live (230 V)','br','MCB',0),L('N','Neutral','b',null,1),Rt('+','+24 V rail','r',null,0),Rt('−','0 V rail','b',null,1)]},
pe:{s:'The protective-earth (safety ground) symbol. Every PE symbol is the same electrical point.',rows:[L('PE','PE of the supply, motor, panel','pe')]},
ups:{s:'Keeps your load running for a while when the mains fails, using a battery.',rows:[L('L (in)','Mains live (from breaker)','br','MCB',0),L('N (in)','Mains neutral','b',null,1),L('PE','Earth bar (optional)','pe',null,2),Rt('L (out)','Protected load (live)','br',null,0),Rt('N (out)','Protected load (neutral)','b',null,1)],tip:['To test a power cut, switch off the breaker in front of the UPS while the simulation runs.']},

/* ---------- protection ---------- */
mcb:{s:'A switch that opens by itself when the current is too high (overload or short circuit).',rows:[L('1','Supply (live wire)','br'),Rt('2','Load / next device','br')],tip:['Put one in front of every circuit.']},
mccb:{s:'A bigger breaker for large currents – works like the MCB.',rows:[L('1','Supply (live wire)','br'),Rt('2','Load / next device','br')]},
mcb2:{s:'A 2-pole breaker for single-phase circuits: it switches and protects the live AND the neutral together.',rows:[L('1','Live from supply','br',null,0),L('3','Neutral from supply','b',null,1),Rt('2','Load live','br',null,0),Rt('4','Load neutral','b',null,1)],tip:['Supply on 1 and 3 (top), load on 2 and 4 (bottom).','Either pole tripping opens both.']},
mcb3:{s:'A 3-phase breaker: all three phases switch off together if any phase is overloaded.',rows:pole3('Supply','To load')},
mccb3:{s:'A big 3-phase breaker for heavy feeders.',rows:pole3('Supply','To load')},
mpcb3:{s:'A breaker made for motors: protects against short circuit and overload and also works as the on/off switch.',rows:pole3('Supply','To contactor / motor'),tip:['Set <i>Trip current</i> to the motor’s rated current.']},
rcd:{s:'A safety device that switches off when current leaks to earth (protects people from shock).',rows:[L('1','Live from supply','br',null,0),L('3','Neutral from supply','b',null,1),Rt('2','Load live','br',null,0),Rt('4','Load neutral','b',null,1)],tip:['Fit an MCB in front – an RCD does not protect against short circuit.']},
fus:{s:'A wire that melts and opens the circuit if the current is too high.',rows:[L('1','Supply (live wire)','r'),Rt('2','Protected load','r')]},
iso:{s:'A manual on/off switch to make equipment safe to work on.',rows:[L('1','Supply in','br'),Rt('2','Equipment (out)','br')]},
iso3:{s:'The main on/off switch of a 3-phase panel.',rows:pole3('Supply','To breaker / load')},
ovl:{s:'Protects a motor from long overload. When it trips, its 95-96 contact opens and stops the contactor.',rows:[CP(0,'Power circuit'),L('1','From the contactor','br',null,1),Rt('2','To the motor','br',null,1),CP(2,'Control circuit'),L('95','+24 V (control supply)','r',null,3),Rt('96','Contactor coil A1','g',null,3)],tip:['The 95-96 contact is normally closed and sits in series with the contactor coil.']},
ovl3:{s:'Sits between the contactor and the motor. If the motor draws too much for too long it trips and opens 95-96.',rows:[CP(0,'Power circuit'),L('1','Contactor 2 (L1)','br',null,1),L('3','Contactor 4 (L2)','k',null,2),L('5','Contactor 6 (L3)','gy',null,3),Rt('2','Motor U1','br',null,1),Rt('4','Motor V1','k',null,2),Rt('6','Motor W1','gy',null,3),CP(4,'Control circuit'),L('95','+24 V (control supply)','r',null,5),Rt('96','Contactor coil A1','g',null,5)],tip:['Set the trip current to the motor’s rated current.']},
spd:{s:'Protects against voltage spikes (lightning, switching) by sending them to earth.',rows:[L('L','Phase after the main breaker','br'),L('PE','Earth bar','pe')]},
fut:{s:'A terminal with a fuse inside. A red LED shows the fuse has blown.',rows:[L('1 (in)','Supply (+24 V)','r'),Rt('2 (out)','Load','r')]},
plr:{s:'Watches the 3 phases and blocks the motor if a phase is missing, unbalanced, too low/high or in the wrong order.',rows:[L('L1','Phase L1','br',null,0),L('L2','Phase L2','k',null,1),L('L3','Phase L3','gy',null,2),Rt('15','+24 V (common)','r',null,0),Rt('18','Contactor coil (on when supply is OK)','g',null,1),Rt('16','Alarm lamp (on when fault)','o',null,2)],tip:['Put 15-18 in series with the contactor coil so the motor cannot start on a bad supply.']},
vmr:{s:'Watches a single-phase voltage and switches its contact when it is too high or too low.',rows:[L('L','Supply live (to watch)','br',null,0),L('N','Supply neutral','b',null,1),Rt('15','+24 V (common)','r',null,0),Rt('18','Contactor coil (on when voltage OK)','g',null,1),Rt('16','Alarm lamp (voltage bad)','o',null,2)],tip:['Name a contact after this relay (e.g. KV1) to use its output anywhere in the drawing.']},

/* ---------- switching ---------- */
sw:{s:'A simple on/off switch. Closed means current can flow from 1 to 2.',rows:two('Supply (+24 V)','Next device (coil, lamp…)')},
ky:{s:'A switch that needs a key – stops unauthorised use.',rows:two('Supply (+24 V)','Next device (coil, lamp…)')},
pb:{s:'A START button: the contact closes only while you hold it pressed.',rows:two('Supply (+24 V)','Contactor coil / PLC input'),tip:['For latching (start and stay on), add a contactor contact in parallel with this button.']},
pbnc:{s:'A STOP button: the contact is closed until you press it, then it opens.',rows:two('Supply (+24 V)','START button / coil'),tip:['Put the STOP button first in the chain, before START.']},
estop:{s:'The red mushroom button. Press it and the whole control circuit opens and stays open.',rows:two('+24 V (after the fuse)','STOP / START chain'),tip:['Always put the emergency stop first in the control circuit.']},
sel2:{s:'A 2-position switch: turn to ON or OFF and it stays there.',rows:two('Supply (+24 V)','Next device (coil, lamp…)')},
sel3:{s:'A HAND – OFF – AUTO switch: manual run, off, or let the automatic system decide.',rows:[L('COM','Supply (+24 V)','r'),Rt('HAND','Contactor coil (manual run)','g',null,0),Rt('AUTO','PLC output / level switch (auto)','o',null,1)],tip:['In OFF, COM connects to neither terminal.']},
ths:{s:'A switch that opens or closes with temperature.',rows:two('Supply','Heater contactor / fan'),tip:['In the simulator you set its state by hand.']},
prs:{s:'A switch that follows a pressure condition.',rows:two('Supply','Pump contactor / alarm'),tip:['In the simulator you set its state by hand.']},
lvs:{s:'A float switch: opens or closes with the liquid level.',rows:two('Supply','Pump contactor / alarm'),tip:['In the simulator you set its state by hand.']},
rel:{s:'A small relay: a little coil current switches a separate contact that can carry a different circuit.',rows:[CP(0,'Coil (control)'),L('A1','Control + (+24 V)','r','Switch / PLC Q0.0',1),L('A2','0 V','b',null,2),CP(3,'Contact (output)'),L('COM','Supply for the load','r',null,4),Rt('NO/NC','Load (lamp, coil…)','g',null,4)],tip:['Set the contact type (NO or NC) in Properties. NO: closes when the coil is on. NC: opens.']},
con:{s:'A contactor: a small coil current switches heavy power contacts.',rows:[CP(0,'Coil (control)'),L('A1','+24 V','r','START / STOP chain',1),L('A2','0 V','b',null,2),CP(3,'Power contacts'),L('1','Supply live','br',null,4),Rt('2','Load','br',null,4),L('3','Supply 2nd pole','k',null,5),Rt('4','Load 2nd pole','k',null,5)]},
con3:{s:'A 3-phase contactor: a small coil switches the three power contacts for a motor.',rows:[CP(0,'Coil (control)'),L('A1','+24 V','r','START / STOP chain',1),L('A2','0 V','b',null,2),CP(3,'Power contacts'),L('1','Supply L1','br',null,4),L('3','Supply L2','k',null,5),L('5','Supply L3','gy',null,6),Rt('2','To overload 1','br',null,4),Rt('4','To overload 3','k',null,5),Rt('6','To overload 5','gy',null,6)]},
ton:{s:'A timer relay: after you power the coil, the contact changes only after the delay time.',rows:[CP(0,'Coil (control)'),L('A1','Control + (+24 V)','r','Switch / PLC',1),L('A2','0 V','b',null,2),CP(3,'Contact (delayed)'),L('COM','Supply for the load','r',null,4),Rt('NO/NC','Load (after the delay)','g',null,4)]},
alt:{s:'Alternates two pumps: each new start signal runs the other pump, so both wear evenly.',rows:[L('A1','Supply +','r',null,0),L('A2','Supply − / N','b',null,1),L('S','Start signal (float / pressure switch)','g',null,2),Rt('15','+24 V (pump 1)','r',null,0),Rt('18','Pump 1 contactor coil','g',null,1),Rt('25','+24 V (pump 2)','r',null,2),Rt('28','Pump 2 contactor coil','g',null,3)],tip:['The S input must be the same voltage as the supply.']},
mpr:{s:'One coil moves three or four changeover contacts at the same time.',rows:[CP(0,'Coil'),L('A1','Control + (+24 V)','r','Switch / PLC',1),L('A2','0 V','b',null,2),CP(3,'Contact 1'),L('COM 1','Supply for load 1','r',null,4),Rt('NO 1','Load 1 (on when relay is on)','g',null,4),Rt('NC 1','Load (on when relay is off)','o',null,5),CP(6,'Contact 2'),L('COM 2','Supply for load 2','r',null,7),Rt('NO 2','Load 2 (on when relay is on)','g',null,7)],tip:['Contacts 3 and 4 are wired the same way. Unused contacts can stay empty.']},
rl2:{s:'A relay with one coil and two separate contacts.',rows:[CP(0,'Coil'),L('A1','Control + (+24 V)','r','Switch / PLC',1),L('A2','0 V','b',null,2),CP(3,'Contacts'),L('COM 1','Supply for load 1','r',null,4),Rt('NO/NC 1','Load 1','g',null,4),L('COM 2','Supply for load 2','r',null,5),Rt('NO/NC 2','Load 2','g',null,5)],tip:['The two contacts are separate circuits and can carry different voltages.']},
pws:{s:'A mechanical pressure switch: its contact moves when the pressure reaches the set point.',rows:[L('COM','Supply (+24 V)','r'),Rt('NO','Pump / lamp (closes at set pressure)','g',null,0),Rt('NC','Alarm (closed at rest, opens)','o',null,1)]},
pwd:{s:'A pressure switch with an ON and an OFF set point – good for pump or compressor control.',rows:[L('COM','Supply (+24 V)','r'),Rt('NO','Pump contactor (closes when actuated)','g',null,0),Rt('NC','Alarm (closed at rest)','o',null,1)]},

/* ---------- control coils / contacts ---------- */
coil:{s:'The coil of a contactor, drawn alone. Its contacts are other symbols that use the same label.',rows:coil2(),tip:['Give it a label such as KM1, then type the same label in each contact’s “Coil / relay label”.']},
rcoil:{s:'The coil of a small control relay (KA), drawn alone.',rows:coil2(),tip:['Label it e.g. KA1 and use the same label in its contacts.']},
tcoil:{s:'A timer coil: its contacts change after the delay time.',rows:coil2(),tip:['Label it e.g. KT1 and use the same label in its contacts.']},
tcoff:{s:'A timer coil with OFF delay: contacts change at once and return later after the coil is off.',rows:coil2(),tip:['Label it e.g. KT2.']},
cno:{s:'A contact that CLOSES when its coil is on. It belongs to a coil drawn elsewhere.',ti:'Contact NO',rows:[L('13','From the circuit','r'),Rt('14','To the next device','g')],tip:['Type the coil’s label (e.g. KM1) in “Coil / relay label”.']},
cnc:{s:'A contact that OPENS when its coil is on. It belongs to a coil drawn elsewhere.',ti:'Contact NC',rows:[L('21','From the circuit','r'),Rt('22','To the next device','g')],tip:['Type the coil’s label (e.g. KM1) in “Coil / relay label”.']},
cco:{s:'A changeover contact: the common (11) connects to 12 at rest and to 14 when the coil is on.',ti:'Contact changeover',rows:[L('11','Supply (common)','r'),Rt('12','Load when coil is OFF','o',null,0),Rt('14','Load when coil is ON','g',null,1)],tip:['Type the coil’s label in “Coil / relay label”.']},
cp3:{s:'The three main power contacts of a contactor, drawn apart from its coil.',rows:pole3('Supply','To overload / motor'),tip:['Type the contactor label (e.g. KM1) in “Coil / relay label”.']},

/* ---------- sensors ---------- */
sens:{s:'A proximity sensor as a simple contact: it closes when something is near.',rows:two('+24 V','PLC input (I0.x)')},
lim:{s:'A limit switch: pressed by a moving part and closes (normally open).',rows:two('+24 V','PLC input / relay coil')},
limnc:{s:'A limit switch that is closed at rest and opens when pressed.',rows:two('+24 V','Next device (breaks at end of travel)')},
pnp:{s:'A 3-wire sensor. When it detects metal it puts +24 V on the OUT wire (PLC input).',rows:[L('+','+24 V','r',null,0),L('−','0 V','b',null,1),Rt('OUT','PLC input (I0.x)','g',null,0)],tip:['The PLC input then sees +24 V when something is detected.']},
npn:{s:'A 3-wire sensor. When it detects metal it pulls OUT to 0 V.',rows:[L('+','+24 V','r',null,0),L('−','0 V','b',null,1),Rt('OUT','Load (its other end goes to +24 V)','g',null,0)],tip:['The load connects between +24 V and OUT, not to 0 V.']},
lrod3:{s:'Three metal rods of different length in a tank. Water touching a rod carries a tiny current to the controller.',rows:[Rt('E','Controller terminal E','o'),Rt('L','Controller terminal L','o'),Rt('H','Controller terminal H','o')],tip:['E (the longest rod) must always be in the water.']},
lrod5:{s:'Five metal rods in a tank: very low, low, high and very high water levels.',rows:[Rt('E','Controller terminal E','o'),Rt('LL','Controller terminal LL','o'),Rt('L','Controller terminal L','o'),Rt('H','Controller terminal H','o'),Rt('HH','Controller terminal HH','o')]},
lvc3:{s:'Reads the 3 rods and runs the pump: starts at the low rod, stops at the high rod.',rows:[L('A1','Supply +','r',null,0),L('A2','Supply −','b',null,1),L('E','Probe rod E (longest)','o',null,2),L('L','Probe rod L','o',null,3),L('H','Probe rod H','o',null,4),Rt('15','+24 V (common)','r',null,0),Rt('18','Pump contactor coil','g',null,1)],tip:['Choose Fill tank or Empty tank mode in Properties.']},
lvc5:{s:'Like the 3-rod controller, plus dry-run protection (LL) and a high-level alarm (HH).',rows:[L('A1','Supply +','r',null,0),L('A2','Supply −','b',null,1),L('E','Probe rod E (longest)','o',null,2),L('LL','Probe rod LL','o',null,3),L('L','Probe rod L','o',null,4),L('H','Probe rod H','o',null,5),L('HH','Probe rod HH','o',null,6),Rt('15','+24 V (common)','r',null,0),Rt('18','Pump contactor coil','g',null,1),Rt('25','+24 V (common)','r',null,2),Rt('28','Alarm lamp / buzzer','g',null,3)]},

/* ---------- loads ---------- */
lamp:{s:'A lamp that lights when voltage is across it.',rows:load2('+24 V (or L)','0 V (or N)','Switch')},
pl:{s:'A small indicator light, e.g. green = running, red = fault.',rows:load2('+24 V (or L)','0 V (or N)','Switch / contact')},
htr:{s:'A heater: turns electrical power into heat.',rows:load2('Supply live (L)','Neutral (N)','Contactor','br')},
sol:{s:'The coil of a solenoid valve: opens the valve when voltage is applied.',rows:load2('+24 V','0 V','PLC Q0.x / relay')},
res:{s:'A resistor: limits current and turns the extra into heat.',rows:two('From the source','To the load / 0 V','r','b')},
brr:{s:'A resistor that absorbs the energy a motor sends back when it brakes fast.',rows:[L('1','Drive brake terminal (+)','r'),Rt('2','Drive brake terminal (−)','b')]},
cap:{s:'A capacitor: stores charge. Passes AC, blocks steady DC after charging.',rows:two('Positive side','0 V side','r','b')},
buz:{s:'A buzzer / horn that sounds when powered.',rows:load2('+24 V','0 V','Switch / PLC Q0.x')},
bcn:{s:'A flashing beacon used as a visual alarm.',rows:load2('+24 V','0 V','Switch / PLC Q0.x')},
twr:{s:'A stack light: one lamp for each colour, all sharing one common (0 V).',rows:[L('R','+24 V from a PLC output (red lamp)','g',null,0),L('A','+24 V from a PLC output (amber lamp)','g',null,1),L('G','+24 V from a PLC output (green lamp)','g',null,2),Rt('COM','0 V','b',null,0)],tip:['Only wire the lamps you need.']},
fan:{s:'A cooling fan for a panel.',rows:load2('+24 V or L (via thermostat)','0 V or N','Thermostat')},

/* ---------- motors and drives ---------- */
mot:{s:'A DC or single-phase motor.',rows:[L('1','Supply + (via contactor)','r','Contactor'),Rt('2','0 V (or N)','b')]},
mot1:{s:'A single-phase motor for small machines: fans, pumps, compressors.',rows:[L('L','Live (via contactor)','br','Contactor',0),L('N','Neutral','b',null,1),L('PE','Earth bar','pe',null,2)]},
mot3:{s:'A 3-phase motor. Swap any two phases and it turns the other way.',rows:[L('U1','Overload 2 (L1)','br',null,0),L('V1','Overload 4 (L2)','k',null,1),L('W1','Overload 6 (L3)','gy',null,2),L('PE','Earth bar','pe',null,3)],tip:['Set Winding to Star or Delta and give the matching voltage in Properties.']},
vfd:{s:'A programmable variable frequency drive: runs a 3-phase motor at any speed, with 6 digital inputs, 2 analog inputs, 2 analog outputs, 2 transistor outputs and 2 changeover relays (fault relay, timer relay).',ti:'Frequency drive (VFD)',
 rows:[CP(0,'Power circuit'),L('L1','Breaker L1','br',null,1),L('L2','Breaker L2','k',null,2),L('L3','Breaker L3','gy',null,3),L('PE','Earth bar','pe',null,4),Rt('U','Motor U1','br',null,1),Rt('V','Motor V1','k',null,2),Rt('W','Motor W1','gy',null,3),
  CP(5,'Analog terminals'),L('AI1','Pot wiper W / 0-10 V / 4-20 mA +','o',null,6),L('AI2','Sensor signal (PID feedback)','o',null,7),L('COM','0 V of every signal','b',null,8),Rt('+10V','Pot end 1 (reference)','r',null,6),Rt('AO1','Meter / PLC AI (+)','o',null,7),Rt('AO2','Meter / PLC AI (+)','o',null,8),Rt('AGND','Return of AO / DO loads','b',null,9),
  CP(10,'Digital terminals'),L('DI1','+24 V via START switch','g',null,11),L('DI2','+24 V via REV switch','g',null,12),L('DI3','+24 V via RESET button','g',null,13),L('DI4','+24 V via switch (optional)','g',null,14),L('DI5','+24 V via switch (optional)','g',null,15),L('DI6','+24 V via switch (optional)','g',null,16),Rt('+24V','Common of the DI switches','r',null,11),Rt('DO1','Lamp / PLC input (+)','g',null,12),Rt('DO2','Lamp / PLC input (+)','g',null,13),
  CP(17,'Relay outputs (potential-free)'),Rt('K1C','Supply of the alarm','g',null,18),Rt('K1NO','Alarm lamp / PLC input','g',null,19),Rt('K1NC','Contactor coil chain (opens on fault)','g',null,20),Rt('K2C','Supply of the timed load','g',null,21),Rt('K2NO','Fan / brake / lamp','g',null,22),Rt('K2NC','Closed while K2 is off','g',null,23)],
 tip:['COM is the 0 V of every signal. Switches, sensors, lamps and the PLC must share it: join the external 0 V to COM (or use the drive’s own +24V and COM).','Run command source = Terminal needs 12 V or more on DI1 (forward) or DI2 (reverse) against COM.','AI1 / AI2 type is set in Properties (0-10 V, 2-10 V, 0-20 mA, 4-20 mA).','K1 and K2 are changeover relays: C = common, NO closes when the relay is on, NC is closed when it is off or the drive has no power.','The Help page below the diagram lists every terminal in detail and gives wiring examples.']},
sst:{s:'A soft starter: raises the voltage slowly so the motor starts gently.',rows:[L('L1','Breaker L1','br',null,0),L('L2','Breaker L2','k',null,1),L('L3','Breaker L3','gy',null,2),L('PE','Earth bar','pe',null,3),Rt('U','Motor U1','br',null,0),Rt('V','Motor V1','k',null,1),Rt('W','Motor W1','gy',null,2)]},
pot:{s:'A knob (variable resistor) that divides a voltage. Used as a manual speed setting.',rows:[L('1','+10 V reference','r',null,0),L('3','0 V','b',null,1),Rt('W','Drive input AI1','o',null,0)],tip:['The wiper W is the slider – it gives 0 to 10 V depending on the knob.']},

/* ---------- magnetics, semiconductors ---------- */
xf:{s:'Changes AC voltage up or down. No direct electrical link between primary and secondary.',rows:[L('P1','Supply live','br',null,0),L('P2','Supply neutral','b',null,1),Rt('S1','Load live','br',null,0),Rt('S2','Load neutral','b',null,1)],tip:['Set the ratio in Properties.']},
ind:{s:'A coil that smooths the current; often placed in front of a drive.',rows:two('Supply line','Drive / load','br','br')},
dio:{s:'A one-way valve for current: flows from A (anode) to K (cathode) only.',rows:[L('A','More positive side','r'),Rt('K','Load / return','b')],tip:['Across a coil (cathode to +), a diode absorbs the voltage spike when the coil switches off.']},
led:{s:'A light-emitting diode: lights when current flows A → K.',rows:[L('A','+24 V','r','Resistor'),Rt('K','0 V','b')],tip:['Always add a series resistor to limit the current.']},

/* ---------- connection ---------- */
term:{s:'A screw terminal where wires join. Both sides are the same point.',rows:[L('1','Wire in','r'),Rt('2','Wire out','r')]},
tpe:{s:'A green/yellow earth terminal. Both sides are the same point.',rows:[L('1','Earth wire in','pe'),Rt('2','Earth wire out','pe')]},
buspe:{s:'An earth bar. Every terminal on it is one electrical point.',rows:[L('PE 1','Supply PE','pe',null,0),Rt('PE 2','Motor PE','pe',null,0),Rt('PE 3','Panel PE','pe',null,1)],tip:['Use any terminal on the top or bottom row.']},
busn:{s:'A neutral bar. Every terminal on it is one electrical point.',rows:[L('N 1','Supply N','b',null,0),Rt('N 2','Load 1 N','b',null,0),Rt('N 3','Load 2 N','b',null,1)]},
busl:{s:'A phase bar. It carries one phase (L1, L2 or L3) to many loads.',rows:[L('L1 1','From breaker','br',null,0),Rt('L1 2','Load 1','br',null,0),Rt('L1 3','Load 2','br',null,1)]},
bus24:{s:'A distribution bar for the +24 V rail.',rows:[L('+24 V 1','Power supply +','r',null,0),Rt('+24 V 2','Consumer 1','r',null,0),Rt('+24 V 3','Consumer 2','r',null,1)]},
bus0:{s:'The common return bar for the 24 V circuit (0 V).',rows:[L('0 V 1','Power supply −','b',null,0),Rt('0 V 2','Consumer 1 return','b',null,0),Rt('0 V 3','Consumer 2 return','b',null,1)]},

/* ---------- instruments ---------- */
vm:{s:'Measures voltage. Connect it ACROSS (in parallel with) the thing you measure.',rows:[L('1','One side of the load / supply','o'),Rt('2','Other side of the load / supply','o')],tip:['Parallel = both leads touch the two ends of the part you measure.']},
am:{s:'Measures current. Connect it IN SERIES: break the wire and put the meter in the gap.',rows:[L('1','From the supply','r'),Rt('2','To the load','r')],tip:['Series = the current flows through the meter. Never put it across a supply.']},
mltm:{s:'A digital multimeter: pick the function on the dial and plug the leads into the right sockets.',rows:[L('VΩ','Red lead: volts, Ω, continuity, diode','o',null,0),L('COM','Black lead (always)','b',null,1),Rt('A (10 A)','Red lead for current up to 10 A','r',null,0),Rt('mA','Red lead for small current','r',null,1)],tip:['Voltage: leads across the part. Current: leads in series with the load.']},
finj:{s:'A training tool that creates a fault: short circuit, open circuit or leakage.',rows:two('One side of the circuit','Other side (or 0 V)','o','o'),tip:['“Open circuit” goes in series. “Short” and “leakage” go across a load.']},
inj:{s:'Makes a 0-10 V or 4-20 mA test signal for a PLC analog input.',rows:[Rt('+','PLC analog input (AI)','o'),Rt('−','PLC analog common / 0 V','b')],tip:['In 4-20 mA simulate mode, connect it in a loop powered by 24 V.']},
ct:{s:'Passes a big line current and gives a small copy (5 A or 1 A) to a meter.',rows:[CP(0,'Primary (power line)'),L('P1','Line in (from supply)','br',null,1),Rt('P2','Line out (to the load)','br',null,1),CP(2,'Secondary (meter)'),Rt('S1','Meter current input S1','o',null,3),Rt('S2','Meter current input S2','o',null,4)],tip:['Never leave S1-S2 open while the line carries current. Short them if nothing is connected.']},
pt:{s:'Scales a high voltage down to a safe value (e.g. 110 V) for meters.',rows:[CP(0,'Primary (high voltage)'),L('A','Line (phase)','br',null,1),L('N / B','Neutral (or 2nd line)','b',null,2),CP(3,'Secondary (meter)'),Rt('a','Meter voltage input','o',null,4),Rt('n','Meter neutral','b',null,5)]},

/* ---------- automation ---------- */
plc:{s:'The brain of the machine: reads switches and sensors, runs your ladder program, switches outputs.',rows:[CP(0,'Power'),L('L+','+24 V','r',null,1),L('M','0 V','b',null,2),CP(3,'Inputs'),L('I0.0','+24 V via switch / sensor','g',null,4),L('I0.1','+24 V via switch / sensor','g',null,5),CP(6,'Outputs'),L('1L','+24 V (relay common)','r',null,7),Rt('Q0.0','Load (other end to 0 V)','g',null,7),Rt('Q0.1','Load (other end to 0 V)','g',null,8)],tip:['More inputs and outputs (I0.2 …, Q0.2 …) are wired the same way.','Analog AI / AO take 0-10 V or 4-20 mA signals.']}
}})();
/* parts that have no wires to draw */
const WNONE={wend:'Draw a wire from a terminal, click corners, then double-click (or press Enter) where it should stop.',nl:'Place one on each wire end and give both the same name (for example +24V). All links with the same name are connected.',hmi:'There are no wires: link it to a PLC in Properties, then double-click it to open the HMI Designer.',txt:'It is only a note – it has no terminals.',box:'It is only a frame – it has no terminals.'};

const wEs=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function wWrap(t,n){const w=String(t).split(/\s+/),o=[];let cur='';for(const x of w){if((cur+' '+x).trim().length>n&&cur){o.push(cur);cur=x}else cur=(cur+' '+x).trim()}if(cur)o.push(cur);return o}
function wText(x,y,t,n,cls,anchor,fs){const ln=wWrap(t,n).slice(0,3),lh=(fs||11)+1.5,y0=y-(ln.length-1)*lh/2;
 return ln.map((s,i)=>`<text x="${x}" y="${y0+i*lh+4}" text-anchor="${anchor||'middle'}" style="font:${cls||''} ${fs||11}px Arial,sans-serif;fill:var(--tx)">${wEs(s)}</text>`).join('')}
function wWire(x1,x2,y,col){const c=WCOL[col]||WCOL.o;
 return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${c}" stroke-width="3.2" stroke-linecap="round" />`+(col==='pe'?`<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#f1c40f" stroke-width="3.2" stroke-dasharray="7 7" />`:'')}
function wDiagram(type,w){
 const d=D[type],SH=48,BX=250,BW=140,BT=40,rows=w.rows,used={};
 const slot=new Map();let ns=0;const left=[],right=[],caps=[];
 const next={l:0,r:0};
 for(const r of rows){if(r[0]==='c'){caps.push(r);ns=Math.max(ns,r[1]+1);continue}
  let s=r[5];if(s==null)s=next[r[0]]++;else next[r[0]]=Math.max(next[r[0]],s+1);ns=Math.max(ns,s+1);(r[0]==='l'?left:right).push({r,s})}
 const BH=ns*SH+12,H=BT+BH+14;
 let g=`<rect x="${BX}" y="${BT}" width="${BW}" height="${BH}" rx="8" fill="var(--pn)" stroke="var(--tx)" stroke-width="2" />`+
  wText(BX+BW/2,BT-14,w.ti||String(d.n).replace(/\s*\(.*$/,'')||d.n,34,'700','middle',13);
 for(const c of caps)g+=`<text x="${BX+BW/2}" y="${BT+6+c[1]*SH+SH/2+4}" text-anchor="middle" style="font:italic 700 10.5px Arial,sans-serif;fill:var(--mu,#6b7280)">${wEs(c[2])}</text>`;
 const side=(arr,isL)=>{for(const {r,s} of arr){const [,pin,label,col,via]=r,y=BT+6+s*SH+SH/2;used[col]=1;
   const cx=isL?4:506,x0=isL?134:BX+BW,x1=isL?BX:506,bx=isL?BX:BX+BW;
   g+=wWire(Math.min(x0,x1),Math.max(x0,x1),y,col);
   g+=`<rect x="${cx}" y="${y-17}" width="130" height="34" rx="7" fill="var(--pn)" stroke="${WCOL[col]||WCOL.o}" stroke-width="2.2" />`+wText(cx+65,y,label,21,'600','middle',11);
   if(via){const vx=isL?150:404;g+=`<rect x="${vx}" y="${y-16}" width="92" height="32" rx="5" fill="var(--pn2)" stroke="var(--tx)" stroke-width="1.5" />`+wText(vx+46,y,via,14,'','middle',10.5)}
   g+=`<circle cx="${bx}" cy="${y}" r="5" fill="var(--pn)" stroke="var(--tx)" stroke-width="2" />`;
   g+=`<text x="${isL?bx+10:bx-10}" y="${y+4}" text-anchor="${isL?'start':'end'}" style="font:700 12px Arial,sans-serif;fill:var(--tx)">${wEs(pin)}</text>`}};
 side(left,true);side(right,false);
 /* legend */
 const keys=Object.keys(used),lgn=Object.assign({},WLEG,w.lg||{});let lx=8,ly=H+14,lg='';
 for(const k of keys){const t=lgn[k]||k,wd=44+t.length*6.4;if(lx+wd>630){lx=8;ly+=18}
  lg+=`<line x1="${lx}" y1="${ly-4}" x2="${lx+22}" y2="${ly-4}" stroke="${WCOL[k]}" stroke-width="4" />`+(k==='pe'?`<line x1="${lx}" y1="${ly-4}" x2="${lx+22}" y2="${ly-4}" stroke="#f1c40f" stroke-width="4" stroke-dasharray="5 5" />`:'')+`<text x="${lx+28}" y="${ly}" style="font:11px Arial,sans-serif;fill:var(--tx)">${wEs(t)}</text>`;lx+=wd}
 const TH=ly+10;
 return `<svg viewBox="0 0 640 ${TH}" role="img" aria-label="Wiring diagram: ${wEs(d.n)}">${g}${lg}</svg>`}
/* “Connect … to …” sentences, one per wire, in the order of the diagram */
function wSteps(w){const out=[];
 const one=r=>{const [side,pin,label,,via]=r,lb=String(label).replace(/\n/g,' ');
  return side==='l'?`Connect <b>${wEs(lb)}</b>${via?` <i>through the ${wEs(via)}</i>`:''} to terminal <b>${wEs(pin)}</b>.`
   :`Connect terminal <b>${wEs(pin)}</b> to <b>${wEs(lb)}</b>${via?` <i>(${wEs(via)} in between)</i>`:''}.`};
 const L2=w.rows.filter(r=>r[0]==='l'),R2=w.rows.filter(r=>r[0]==='r');
 let cap='';for(const r of w.rows){if(r[0]==='c'){cap=r[2];continue}out.push((cap?`<span class=whg>${wEs(cap)}</span> `:'')+one(r));cap=''}
 return out}
/* the block put into every help page */
function wireHtml(type){
 const w=WIR[type];
 if(!w){return WNONE[type]?`<h4>How to connect it</h4><p>${WNONE[type]}</p>`:''}
 const st=wSteps(w);
 return `<h4>Wiring diagram</h4><p class=mu style="margin:0 0 6px">Each coloured line is one wire. The box on a wire is a device that goes in between.</p>${wDiagram(type,w)}
  <h4>Wire it step by step</h4><ol class=whs>${st.map(x=>`<li>${x}</li>`).join('')}</ol>
  ${w.tip&&w.tip.length?`<div class=whtip><b>Good to know</b><ul>${w.tip.map(x=>`<li>${x}</li>`).join('')}</ul></div>`:''}
  <p class=mu style="margin:6px 0 0">How to draw a wire: click a terminal, then click the terminal it should go to. Remember: every circuit must come back to 0 V (or N), otherwise no current flows.</p>`}
