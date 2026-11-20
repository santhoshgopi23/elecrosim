/* ElectroSim v8.44 – Programmable VFD (replaces the simple drive of v4).  Library group "Motors & Drives".  Loaded after vmr.js, before view.js.
   A general-purpose drive in the style of a Siemens SINAMICS V20 / MICROMASTER: many parameters, programmable inputs and outputs.
   Parameter numbers shown in brackets (P0700, P1120 …) follow the Siemens convention; the simulator uses plain-English choices instead of numeric codes.

   Terminals (fixed index – index 0-12 are the same as the old drive, so old projects still load):
     0 L1  1 L2  2 L3   mains in          3 U  4 V  5 W   motor out          6 PE
     7 DI1  8 DI2  13 DI3  14 DI4  15 DI5  16 DI6   digital inputs, 24 V, ON at >= 12 V against COM          9 COM  common 0 V   30 AGND  (= COM inside)
     10 AI1  17 AI2   analog inputs (0-10 V, 2-10 V, 0-20 mA, 4-20 mA)       18 +10V  reference out      19 +24V  supply out (for DI, transmitters)
     20 AO1  21 AO2   analog outputs (0-10 V / 2-10 V / 0-20 mA / 4-20 mA)    22 DO1  23 DO2  24 V sourcing outputs (return to COM)
     24 K1C 25 K1NO 26 K1NC   relay 1, changeover (default: fault)           27 K2C 28 K2NO 29 K2NC   relay 2, changeover (default: timer relay on RUN)
     11 *  12 #  31  32   hidden internal nodes (input star, output star, +10 V node, +24 V node)
   Elements (fixed order, used by sim):  0-2 mains  3-5 output sources  6-11 DI1..DI6 (terminals 7 8 13 14 15 16)  12 AI1  13 AI2  14-15 +10 V  16-17 +24 V
     18-19 AO1  20-21 AO2  22 DO1  23 DO2  24 K1 C-NO  25 K1 C-NC  26 K2 C-NO  27 K2 C-NC  28 COM-AGND tie
   State (c.s):  pw mains present · vl line volts · phl phase loss · di[6] · aif[2] / aiv[2] / aiw[2] analog in (fraction, V or mA, signal lost) · fl linear ramp · fo output Hz · dir ±1 · rq run active
     tripped (fault) with fc code, ft text · lock start-inhibit · th motor I²t · rl[4] outputs K1 K2 DO1 DO2 · od / ot output delay state and timers · ao[2] analog out fractions · al[2] mA-loop alarms */
'use strict';
const VCMD=['Terminal','Keypad RUN','Keypad STOP'],VWR=['2-wire (level)','3-wire (pulse start, stop contact)'],
 VSRC=['Keypad','AI1','AI2','AI1 + AI2','Fixed frequency (DI)','MOP (DI up / down)','PID controller'],
 VDI=['Not used','Run forward (ON/OFF1)','Run reverse (ON reverse/OFF1)','Reverse direction','Jog forward','Jog reverse','Fault reset','External fault (trips when OFF)','Coast stop OFF2 (stops when OFF)','Quick stop OFF3 (stops when OFF)','Fixed freq bit 0','Fixed freq bit 1','Fixed freq bit 2','MOP up','MOP down','Stop OFF1 (3-wire, stops when OFF)'],
 VDO=['Not used','Drive ready','Drive running','Running forward','Running reverse','Fault active','Alarm active','At setpoint (f = reference)','Frequency ≥ threshold','Frequency < threshold','Current ≥ threshold','Motor overload alarm (I²t)','Drive stopped','Mains present','Run command active','Always ON (test)'],
 VDOS=['—','RDY','RUN','FWD','REV','FLT','ALM','SET','f≥','f<','I≥','OVL','STP','MNS','CMD','ON'],
 VAT=['0-10 V','2-10 V','0-20 mA','4-20 mA'],
 VAF=['Not used (0 %)','Output frequency','Frequency setpoint','Motor current','Motor speed','Output voltage','Output power','DC-link voltage'],
 VGR=['1 Quick setup','2 Motor and drive data','3 Digital inputs DI1-DI6','4 Analog inputs AI1, AI2','5 Relays K1, K2 and outputs DO1, DO2','6 Analog outputs AO1, AO2','7 Ramps and limits','8 Fixed freq, MOP, jog','9 PID controller','10 Protection and restart'],
 VGH=['The settings you need first: where START and the speed come from, limits and ramps.','Motor name-plate values and the V/f curve.','Choose what each digital input does. A DI is ON when it sees 12 V or more against COM.','Signal type and scaling of the two analog inputs.','Function, on-delay, off-delay and inversion of the two relays and two transistor outputs. Use the delays to make a timer relay.','What each analog output reports, its signal type and scaling.','OFF3 quick stop, ramp rounding, skip frequency, reverse inhibit.','Seven preset speeds, the motorised potentiometer and jogging.','A simple process controller (pressure, flow, level) that sets the drive speed from a feedback signal.','Voltage and phase monitoring, motor I²t, automatic restart, start inhibit.'];
const VOK=[['k1f','k1on','k1off','k1inv'],['k2f','k2on','k2off','k2inv'],['o1f','o1on','o1off','o1inv'],['o2f','o2on','o2off','o2inv']],VOKN=['K1','K2','DO1','DO2'];
/* parameter table:  key, default, unit, label, options, group, Siemens ref, help (the same table builds Properties and the Help page) */
const VPS=[
 ['cmd',VCMD[0],'','Run command source',VCMD,0,'P0700','Terminal = START/STOP from the digital inputs. Keypad RUN / STOP = the buttons on the drive face (pressing them also sets this).'],
 ['wire',VWR[0],'','Terminal control type',VWR,0,'P0727','2-wire: the drive runs while the input is ON. 3-wire: a momentary START button latches the drive; a normally-closed STOP contact (DI = Stop OFF1) releases it.'],
 ['rsrc',VSRC[0],'','Frequency setpoint source',VSRC,0,'P1000','Where the speed comes from: keypad value, analog input, preset speeds, motorised pot or the PID controller.'],
 ['fset',40,'Hz','Keypad frequency setpoint',null,0,'','Speed used when the source is Keypad.'],
 ['fmin',0,'Hz','Minimum frequency',null,0,'P1080','Lowest speed while running (the drive never runs slower than this).'],
 ['fmax',50,'Hz','Maximum frequency',null,0,'P1082','Highest speed. Also the 100 % reference for ramps, analog scaling and AO scaling.'],
 ['acc',5,'s','Ramp-up time (0 → max)',null,0,'P1120','Time to accelerate from 0 Hz to maximum frequency.'],
 ['dec',5,'s','Ramp-down time (max → 0, OFF1)',null,0,'P1121','Time to decelerate from maximum frequency to 0 Hz on a normal stop.'],
 ['stp','Ramp','','Stop mode (OFF1)',['Ramp','Coast'],0,'','Ramp = decelerate along the ramp. Coast = switch the output off at once, the motor runs down by itself.'],
 ['P',2200,'W','Rated power',null,1,'P0307','Motor / drive power. Used for the AO "Output power" scaling.'],
 ['V',400,'V','Supply / motor voltage (line)',null,1,'P0304','Rated mains voltage (line to line). The drive also gives this voltage to the motor at base frequency.'],
 ['Imot',4.8,'A','Motor rated current',null,1,'P0305','From the motor name-plate. Overcurrent trip, I²t protection and AO current scaling refer to it.'],
 ['rpm',1440,'rpm','Motor rated speed',null,1,'P0311','Used for the rpm shown on the keypad and the AO speed scaling.'],
 ['fb',50,'Hz','Motor rated (base) frequency',null,1,'P0310','Frequency at which the output reaches full voltage.'],
 ['mode','V/f linear','','Control mode',['V/f linear','V/f quadratic'],1,'P1300','Linear: voltage rises in proportion to frequency (constant torque). Quadratic: voltage rises with the square (fans, pumps).'],
 ['bst',3,'%','Continuous boost (low-speed voltage)',null,1,'P1310','Extra voltage at low speed so the motor can start against its load.'],
 ['ilim',150,'%','Overcurrent trip level (of motor current)',null,1,'','Output current above this trips F0001.'],
 ['d1',VDI[1],'','DI1 function',VDI,2,'P0701','Default: run forward.'],
 ['d2',VDI[2],'','DI2 function',VDI,2,'P0702','Default: run reverse.'],
 ['d3',VDI[6],'','DI3 function',VDI,2,'P0703','Default: fault reset.'],
 ['d4',VDI[0],'','DI4 function',VDI,2,'P0704','Not used by default.'],
 ['d5',VDI[0],'','DI5 function',VDI,2,'P0705','Not used by default.'],
 ['d6',VDI[0],'','DI6 function',VDI,2,'P0706','Not used by default.'],
 ['a1t',VAT[0],'','AI1 signal type',VAT,3,'P0756[0]','0-10 V or 2-10 V (10 kΩ input), 0-20 mA or 4-20 mA (250 Ω shunt). 2-10 V and 4-20 mA can detect a broken wire.'],
 ['a1lo',0,'%','AI1 value at minimum signal (% of max freq)',null,3,'P0758','Setpoint when the signal is at its minimum (0 V, 2 V, 0 mA or 4 mA).'],
 ['a1hi',100,'%','AI1 value at maximum signal (% of max freq)',null,3,'P0760','Setpoint when the signal is at its maximum (10 V or 20 mA).'],
 ['a2t',VAT[0],'','AI2 signal type',VAT,3,'P0756[1]','As AI1.'],
 ['a2lo',0,'%','AI2 value at minimum signal (% of max freq)',null,3,'P0758[1]','As AI1.'],
 ['a2hi',100,'%','AI2 value at maximum signal (% of max freq)',null,3,'P0760[1]','As AI1.'],
 ['awb','Ignore','','Analog input signal loss',['Ignore','Trip F0080'],3,'','What to do when an analog input that is in use (setpoint or PID) loses its signal (2-10 V below 1 V, 4-20 mA below 3.5 mA).'],
 ['k1f',VDO[5],'','K1 relay function',VDO,4,'P0731','Default: fault active.'],
 ['k1on',0,'s','K1 on-delay',null,4,'','The function must be true this long before the relay pulls in.'],
 ['k1off',0,'s','K1 off-delay',null,4,'','The function must be false this long before the relay drops out.'],
 ['k1inv','Normal','','K1 output logic',['Normal','Inverted'],4,'P0748','Inverted = relay is energised when the function is NOT true (fail-safe: it also drops when the mains is lost).'],
 ['k2f',VDO[2],'','K2 relay function',VDO,4,'P0732','Default: drive running – with its delays it is a timer relay.'],
 ['k2on',2,'s','K2 on-delay',null,4,'','E.g. release a holding brake 2 s after start.'],
 ['k2off',5,'s','K2 off-delay',null,4,'','E.g. run a cooling fan 5 s after stop.'],
 ['k2inv','Normal','','K2 output logic',['Normal','Inverted'],4,'','As K1.'],
 ['o1f',VDO[2],'','DO1 function',VDO,4,'','Transistor output: 24 V on the DO1 terminal when true.'],
 ['o1on',0,'s','DO1 on-delay',null,4,'','As K1.'],
 ['o1off',0,'s','DO1 off-delay',null,4,'','As K1.'],
 ['o1inv','Normal','','DO1 output logic',['Normal','Inverted'],4,'','As K1.'],
 ['o2f',VDO[6],'','DO2 function',VDO,4,'','Transistor output: 24 V on the DO2 terminal when true.'],
 ['o2on',0,'s','DO2 on-delay',null,4,'','As K1.'],
 ['o2off',0,'s','DO2 off-delay',null,4,'','As K1.'],
 ['o2inv','Normal','','DO2 output logic',['Normal','Inverted'],4,'','As K1.'],
 ['fth',30,'Hz','Frequency threshold for outputs',null,4,'P2155','Used by the functions Frequency ≥ threshold and Frequency < threshold.'],
 ['ith',100,'%','Current threshold for outputs (% of motor current)',null,4,'P2170','Used by the function Current ≥ threshold.'],
 ['ao1f',VAF[1],'','AO1 function',VAF,5,'P0771[0]','What the first analog output reports.'],
 ['ao1t',VAT[0],'','AO1 signal type',VAT,5,'P0776[0]','Voltage or current output. A current output needs a closed loop (max about 600 Ω).'],
 ['ao1lo',0,'%','AO1: value giving the minimum signal (% of rated)',null,5,'P0777','% of the rated value (max frequency, motor current, rated speed, supply voltage, rated power or DC-link voltage).'],
 ['ao1hi',100,'%','AO1: value giving the maximum signal (% of rated)',null,5,'P0779','Signal is at its maximum (10 V / 20 mA) at this value.'],
 ['ao2f',VAF[3],'','AO2 function',VAF,5,'P0771[1]','Default: motor current.'],
 ['ao2t',VAT[0],'','AO2 signal type',VAT,5,'P0776[1]','As AO1.'],
 ['ao2lo',0,'%','AO2: value giving the minimum signal (% of rated)',null,5,'P0777[1]','As AO1.'],
 ['ao2hi',100,'%','AO2: value giving the maximum signal (% of rated)',null,5,'P0779[1]','As AO1.'],
 ['dec3',1,'s','Quick-stop ramp-down time (OFF3)',null,6,'P1135','Ramp used by the Quick stop OFF3 input.'],
 ['rnd',0,'s','Ramp rounding (smoothing time)',null,6,'P1130','0 = straight ramps. A larger value rounds the start and end of every ramp (S-curve feel).'],
 ['skp',0,'Hz','Skip frequency (0 = off)',null,6,'P1091','A speed to avoid (mechanical resonance). The drive passes through it on the ramp but does not stay in it.'],
 ['skw',2,'Hz','Skip frequency bandwidth',null,6,'P1101','Width of the forbidden band around the skip frequency.'],
 ['rinh','Allowed','','Reverse direction',['Allowed','Inhibited'],6,'','Inhibited = the drive refuses to run reverse.'],
 ['ff1',10,'Hz','Fixed frequency 1',null,7,'P1001','Preset speed 1 (select with the Fixed freq bit inputs).'],
 ['ff2',15,'Hz','Fixed frequency 2',null,7,'P1002','Preset speed 2.'],
 ['ff3',20,'Hz','Fixed frequency 3',null,7,'P1003','Preset speed 3.'],
 ['ff4',25,'Hz','Fixed frequency 4',null,7,'P1004','Preset speed 4.'],
 ['ff5',30,'Hz','Fixed frequency 5',null,7,'P1005','Preset speed 5.'],
 ['ff6',40,'Hz','Fixed frequency 6',null,7,'P1006','Preset speed 6.'],
 ['ff7',50,'Hz','Fixed frequency 7',null,7,'P1007','Preset speed 7.'],
 ['mopu',10,'s','MOP ramp-up time (0 → max)',null,7,'P1047','How fast the MOP setpoint rises while MOP up is held.'],
 ['mopd',10,'s','MOP ramp-down time (max → 0)',null,7,'P1048','How fast it falls while MOP down is held.'],
 ['mop0',0,'Hz','MOP start value',null,7,'P1040','MOP setpoint at power-up.'],
 ['jgf',5,'Hz','Jog frequency forward',null,7,'P1058','Speed while a Jog forward input is ON (and no run command).'],
 ['jgr',5,'Hz','Jog frequency reverse',null,7,'P1059','Speed while a Jog reverse input is ON.'],
 ['jgrt',2,'s','Jog ramp time (up and down)',null,7,'P1060','Ramp time for jogging.'],
 ['pid_sp','Keypad (%)','','PID setpoint source',['Keypad (%)','AI1','AI2'],8,'P2253','Where the wanted process value comes from.'],
 ['pid_set',50,'%','PID setpoint (keypad)',null,8,'P2240','Wanted process value in % of the sensor range.'],
 ['pid_fb','AI2','','PID feedback source',['AI1','AI2'],8,'P2264','The analog input that has the process sensor (for example a 4-20 mA pressure transmitter).'],
 ['pid_dir','Normal','','PID action',['Normal','Inverse'],8,'','Normal: feedback below setpoint → faster (pressure / flow). Inverse: feedback above setpoint → faster (cooling, temperature).'],
 ['pid_kp',1,'','PID proportional gain Kp',null,8,'P2280','Bigger = stronger reaction to the error.'],
 ['pid_ti',5,'s','PID integral time Ti (0 = off)',null,8,'P2285','Smaller = removes the remaining error faster.'],
 ['pid_td',0,'s','PID derivative time Td',null,8,'P2274','Usually 0.'],
 ['uvt',70,'%','Supply under-voltage trip level (% of rated)',null,9,'F0003','Mains below this for 0.3 s trips F0003. 0 = off.'],
 ['ovt2',115,'%','Supply over-voltage trip level (% of rated)',null,9,'F0002','Mains above this for 0.3 s trips F0002.'],
 ['phl','Trip','','Input phase loss',['Trip','Ignore'],9,'F0020','Trip = missing or very unbalanced mains phase trips F0020.'],
 ['ovl','Off','','Motor I²t protection',['Off','On'],9,'P0610','On = the drive models motor heating and trips F0011 when it gets too hot.'],
 ['ovt',60,'s','Motor thermal time constant',null,9,'P0611','How quickly the motor heats up (and cools down).'],
 ['ovf',115,'%','Motor overload level (of rated current)',null,9,'P0640','Steady current above this level eventually trips F0011.'],
 ['arst','Disabled','','Automatic restart after fault',['Disabled','Reset fault automatically'],9,'P1210','Automatically acknowledges a fault after the wait time and starts again.'],
 ['arn',3,'','Number of restart attempts',null,9,'P1211','After this many failed attempts the drive stays tripped with F0035.'],
 ['ard',2,'s','Wait time before each restart',null,9,'','Delay between the fault and the automatic reset.'],
 ['sinh','Off','','Start inhibit after fault',['Off','On'],9,'','On = after a fault the run command must be removed once before the drive may start again.']];
const VSK=['cmd','rsrc','fset','fmin','fmax','acc','dec','stp','P','V','Imot','rpm','fb','mode','bst','ilim','a1t','a1lo','a1hi'];
function vForce(c){const p=c.p;p.wire=VWR[0];p.d1=VDI[1];p.d2=VDI[2];['d3','d4','d5','d6'].forEach(k=>p[k]=VDI[0]);if(p.rsrc!=='Keypad'&&p.rsrc!=='AI1')p.rsrc='Keypad'}
const VP={kind:['Programmable','','Drive type',['Simple','Programmable']],grp:[VGR[0],'','Parameter group (choose which settings to show)',VGR]},VG=VGR.map(()=>[]);
VPS.forEach(r=>{VP[r[0]]=[r[1],r[2],r[3]+(r[6]?' ('+r[6]+')':''),r[4]||undefined];VG[r[5]].push(r[0])});
Object.keys(VP).forEach(k=>{if(VP[k][3]===undefined)VP[k].length=3});

/* ---------- helpers ---------- */
const vIsI=t=>t==='0-20 mA'||t==='4-20 mA',vcl=(x,a,b)=>Math.max(a,Math.min(b,x)),vfi=c=>{c.p.rsrc==='AI1 0-10V'&&(c.p.rsrc='AI1');c.p.kind==='Simple'&&vForce(c)};
const vFn=(c,i)=>VDI.indexOf(c.p['d'+(i+1)]);
function vInit(s){const a=(k,n)=>{if(!Array.isArray(s[k])||s[k].length!==n)s[k]=new Array(n).fill(0)};
 a('di',6);a('dip',6);a('aif',2);a('aiv',2);a('aiw',2);a('rl',4);a('od',4);a('ot',4);a('ao',2);a('al',2);a('iDO',2);a('ik',2);['fl','fo','io','vo','pin','th','vl'].forEach(k=>{if(!(s[k]>=0))s[k]=0});if(!s.dir)s.dir=1}
function vReset(s){Object.assign(s,{pw:0,vl:0,vdc:0,phl:0,fl:0,fo:0,dir:1,rq:0,run:0,fref:0,io:0,vo:0,pin:0,pout:0,iin:0,i24:0,tripped:0,fc:'',ft:'',perm:0,rtc:0,rtt:0,okt:0,lat:0,lock:0,th:0,oa:0,alm:'',jg:0,off2:0,pi:0,pe:0,mop:null,tph:0,tuv:0,tov:0,rst:0,raw:0,vai:0});
 ['di','dip','aif','aiv','aiw','rl','od','ot','ao','al','iDO','ik'].forEach(k=>delete s[k]);vInit(s)}
const vAOsig=(c,k)=>{const s=c.s,ty=c.p['ao'+(k+1)+'t'],f=(s.ao&&s.ao[k])||0;if(!s.pw)return 0;return ty==='2-10 V'?2+8*f:ty==='0-20 mA'?20*f:ty==='4-20 mA'?4+16*f:10*f};
const vAOu=c=>k=>vIsI(c.p['ao'+(k+1)+'t'])?'mA':'V';
const vShort=c=>{const s=c.s,p=c.p;return s.tripped?'FAULT '+s.fc:!s.pw?'NO POWER':s.off2?'COAST STOP':s.lock&&s.raw?'START LOCK':s.run?(s.dir<0?'REV':'FWD')+(s.fo<.05?'  0 Hz':''):'READY'};

D.vfd={n:'Frequency Drive (VFD – simple or programmable)',ds:'Programmable variable frequency drive: 6 digital inputs, 2 analog inputs, 2 analog outputs, 2 transistor outputs, 2 changeover relays with on / off delay (fault relay, timer relay), Siemens-style parameters, ramps, fixed speeds, MOP, jog, PID, motor protection',
 cat:'Motors & Drives',pre:'U',sx:80,sy:120,anyNum:1,bb:[-106,-148,212,296],lp:[-100,-152,'start'],
 t:[[-20,-140,'L1'],[0,-140,'L2'],[20,-140,'L3'],[-20,140,'U'],[0,140,'V'],[20,140,'W'],[60,-140,'PE','o'],
  [100,-20,'DI1','o'],[100,0,'DI2','o'],[100,100,'COM','o'],[100,-80,'AI1','o'],[0,-60,'*','h'],[0,60,'#','h'],
  [100,20,'DI3','o'],[100,40,'DI4','o'],[100,60,'DI5','o'],[100,80,'DI6','o'],[100,-60,'AI2','o'],[100,-100,'+10V','o'],[100,-40,'+24V','o'],
  [-100,-100,'AO1','o'],[-100,-80,'AO2','o'],[-100,-60,'DO1','o'],[-100,-40,'DO2','o'],
  [-100,0,'K1C','o'],[-100,20,'K1NO','o'],[-100,40,'K1NC','o'],[-100,60,'K2C','o'],[-100,80,'K2NO','o'],[-100,100,'K2NC','o'],
  [-100,-20,'AGND','o'],[0,-80,'*','h'],[0,80,'#','h']],
 p:VP,
 pv:c=>{vfi(c);if(c.p.kind==='Simple'){const o={kind:VP.kind};VSK.forEach(k=>o[k]=VP[k]);o.rsrc=['Keypad','',VP.rsrc[2],['Keypad','AI1']];return o}
  const g=Math.max(0,VGR.indexOf(c.p.grp)),o={kind:VP.kind,grp:VP.grp};VG[g].forEach(k=>o[k]=VP[k]);return o},
 chg:(c,k)=>{if(k==='kind'){if(c.p.kind==='Simple'){vForce(c);const n=typeof plcPrune==='function'?plcPrune(c):0;if(n)toast(n+' wire'+(n>1?'s':'')+' on removed terminals deleted')}S.dirty=1;return true}return k==='grp'},
 el:c=>{vfi(c);const s=c.s,p=c.p;vInit(s);const pw=!!s.pw,fo=s.fo||0,r=Math.min(1,fo/Math.max(1,+p.fb||50));
  let vl=p.mode==='V/f quadratic'?r*r:r;vl=Math.min(1,vl+(fo>0?(+p.bst||0)/100*(1-r):0));
  const vo=pw&&fo>.01&&!s.tripped?(+p.V||400)*vl/SQ3:0,ang=s.dir<0?[120,-120]:[-120,120],ri=(+p.V||400)*(+p.V||400)/Math.max(20,s.pin||20),
   E=[0,1,2].map(i=>RR(i,11,ri));
  E.push({k:'V',a:3,b:12,v:vo,ang:0,hz:fo},{k:'V',a:4,b:12,v:vo,ang:ang[0],hz:fo},{k:'V',a:5,b:12,v:vo,ang:ang[1],hz:fo});
  [7,8,13,14,15,16].forEach(t=>E.push(RR(t,9,3000)));                                   /* 6-11  DI1..DI6 */
  E.push(RR(10,9,vIsI(p.a1t)?250:10000),RR(17,9,vIsI(p.a2t)?250:10000));              /* 12-13 AI1, AI2 */
  E.push({k:'V',a:31,b:9,v:pw?10:0},RR(31,18,100),{k:'V',a:32,b:9,v:pw?24:0},RR(32,19,10));   /* 14-17 +10 V, +24 V */
  [0,1].forEach(k=>{const t=20+k,ty=p['ao'+(k+1)+'t'],fr=vcl((s.ao[k])||0,0,1);
   if(!vIsI(ty))E.push({k:'V',a:t,b:9,v:pw?(ty==='2-10 V'?2+8*fr:10*fr):0},RR(t,9,1e9));
   else if(s.al[k])E.push({k:'V',a:t,b:9,v:AOLIM},RR(t,9,1e9));
   else E.push({k:'I',a:9,b:t,i:(pw?(ty==='4-20 mA'?4+16*fr:20*fr):0)/1e3},RR(t,9,1e9))});   /* 18-21 AO1, AO2 */
  E.push(RR(22,s.rl[2]?32:9,s.rl[2]?150:1e6),RR(23,s.rl[3]?32:9,s.rl[3]?150:1e6));    /* 22-23 DO1, DO2 */
  E.push(RR(24,25,s.rl[0]?.005:1e9),RR(24,26,s.rl[0]?1e9:.005),RR(27,28,s.rl[1]?.005:1e9),RR(27,29,s.rl[1]?1e9:.005));   /* 24-27 relays */
  E.push(RR(30,9,.001));return E},                                                       /* 28 AGND = COM */
 sim:(c,E)=>{vfi(c);const p=c.p,s=c.s;vInit(s);let ch=0;const V=+p.V||400,
   ph=[0,1,2].map(i=>Math.hypot(E[i].vr,E[i].vi)),mx=Math.max(...ph),mn=Math.min(...ph),pw=mx*SQ3>=.4*V;
  if(pw!==!!s.pw){s.pw=pw?1:0;ch=1}
  s.vl=(ph[0]+ph[1]+ph[2])/3*SQ3;s.vdc=pw?s.vl*Math.SQRT2:0;s.phl=pw&&mn<.7*mx?1:0;
  s.di=[6,7,8,9,10,11].map(i=>Math.abs(E[i].v2)>=12?1:0);
  [0,1].forEach(i=>{const ty=p['a'+(i+1)+'t'],v=Math.max(0,E[12+i].v2);let sig,fr,lost=false;
   if(vIsI(ty)){sig=v/250*1e3;const lo=ty==='4-20 mA'?4:0;fr=(sig-lo)/(20-lo);lost=ty==='4-20 mA'&&sig<3.5}
   else{sig=v;const lo=ty==='2-10 V'?2:0;fr=(sig-lo)/(10-lo);lost=ty==='2-10 V'&&sig<1}
   s.aiv[i]=sig;s.aif[i]=vcl(fr,0,1);s.aiw[i]=lost?1:0});
  s.vai=s.aiv[0];
  const io=Math.max(...[3,4,5].map(i=>Math.hypot(E[i].cr,E[i].ci))),po=[3,4,5].reduce((a,i)=>a+E[i].vr*E[i].cr+E[i].vi*E[i].ci,0),pin=Math.max(0,po)/.96+(pw?20:0);
  s.io=io;s.pout=Math.max(0,po);s.vo=Math.hypot(E[3].vr,E[3].vi)*SQ3;s.iin=Math.max(...[0,1,2].map(i=>Math.hypot(E[i].cr,E[i].ci)));
  s.i24=Math.abs(E[17].cur);s.iDO=[Math.abs(E[22].cur),Math.abs(E[23].cur)];s.ik=[Math.max(Math.abs(E[24].cur),Math.abs(E[25].cur)),Math.max(Math.abs(E[26].cur),Math.abs(E[27].cur))];
  if(Math.abs(pin-(s.pin||0))>.5){s.pin=pin;ch=1}
  [0,1].forEach(k=>{const ty=p['ao'+(k+1)+'t'];if(!vIsI(ty)){if(s.al[k]){s.al[k]=0;ch=1}return}
   const src=E[18+2*k],lk=E[19+2*k],fr=vcl(s.ao[k]||0,0,1),want=(s.pw?(ty==='4-20 mA'?4+16*fr:20*fr):0)/1e3;let nl=s.al[k]?1:0;
   if(!nl&&Math.abs(lk.v2)>AOLIM+.01)nl=1;else if(nl&&Math.abs(src.cur)>=want*.999)nl=0;
   if(nl!==(s.al[k]?1:0)){s.al[k]=nl;ch=1}});
  return ch},
 tk:c=>{vfi(c);const p=c.p,s=c.s;vInit(s);
  const di=s.di,dip=s.dip,ix=[0,1,2,3,4,5],
   any=f=>ix.some(i=>vFn(c,i)===f&&di[i]),asg=f=>ix.some(i=>vFn(c,i)===f),low=f=>ix.some(i=>vFn(c,i)===f&&!di[i]),edge=f=>ix.some(i=>vFn(c,i)===f&&di[i]&&!dip[i]);
  const fmax=Math.max(.1,+p.fmax||50),fmin=vcl(+p.fmin||0,0,fmax),Im=Math.max(.1,+p.Imot||1),V=+p.V||400;
  if(!s.pw){const o=s.rl;Object.assign(s,{fo:0,fl:0,rq:0,run:0,fref:0,tripped:0,fc:'',ft:'',perm:0,rtc:0,rtt:0,okt:0,lat:0,lock:0,th:0,oa:0,alm:'',jg:0,off2:0,pi:0,pe:0,mop:null,tph:0,tuv:0,tov:0,raw:0,dir:1});
   s.rl=[0,0,0,0];s.od=[0,0,0,0];s.ot=[0,0,0,0];s.ao=[0,0];s.dip=di.slice();return}
  /* 1. acknowledge a fault */
  if(!s.tripped&&s.fc){s.fc='';s.ft='';s.perm=0;s.rtc=0;s.rtt=0}                       /* reset from Properties / keypad */
  if(s.tripped&&(edge(6)||s.rst)){s.tripped=0;s.fc='';s.ft='';s.perm=0;s.rtc=0;s.rtt=0}
  s.rst=0;
  if(s.tripped&&p.arst!=='Disabled'&&!s.perm){s.rtt=(s.rtt||0)+DT;if(s.rtt>=Math.max(0,+p.ard||0)){s.rtc=(s.rtc||0)+1;s.tripped=0;s.fc='';s.ft='';s.rtt=0}}
  const fault=(code,text)=>{s.hist=[code+' '+text].concat(s.hist||[]).slice(0,8);s.tripped=1;s.fc=code;s.ft=text;s.fo=0;s.fl=0;s.rtt=0;if(p.sinh==='On')s.lock=1;
   if(p.arst!=='Disabled'&&(s.rtc||0)>=Math.max(0,+p.arn||0)){s.perm=1;s.fc='F0035';s.ft='Automatic restart attempts used up ('+code+')'}};
  const used=i=>{const n='AI'+(i+1);return p.rsrc===n||p.rsrc==='AI1 + AI2'||(p.rsrc==='PID controller'&&(p.pid_fb===n||p.pid_sp===n))},
   lost=[0,1].some(i=>used(i)&&s.aiw[i]),L=Math.pow((+p.ovf||115)/100,2);
  /* 2. protection */
  if(!s.tripped){
   s.tph=p.phl==='Trip'&&s.phl?(s.tph||0)+DT:0;s.tuv=s.vl<V*(+p.uvt||0)/100?(s.tuv||0)+DT:0;s.tov=s.vl>V*(+p.ovt2||200)/100?(s.tov||0)+DT:0;
   if(low(7))fault('F0085','External fault (input)');
   else if(s.tph>.2)fault('F0020','Mains phase missing');
   else if(s.tov>.3)fault('F0002','Supply over-voltage');
   else if(s.tuv>.3)fault('F0003','Supply under-voltage');
   else if(s.fo>.01&&s.io>Im*(+p.ilim||150)/100)fault('F0001','Overcurrent');
   else if(lost&&p.awb!=='Ignore')fault('F0080','Analog input signal lost');
   else if(p.ovl==='On'&&s.th>=L)fault('F0011','Motor overtemperature (I²t)')}
  /* 3. run command */
  let rq=0,dir=1,jg=0;
  if(p.cmd==='Terminal'){const f=any(1),r=any(2);
   if(p.wire===VWR[0]){rq=f!==r;dir=r&&!f?-1:1}
   else{if(low(15))s.lat=0;else if(edge(1))s.lat=1;else if(edge(2))s.lat=-1;rq=!!s.lat;dir=s.lat<0?-1:1}
   if(rq&&any(3))dir=-dir}
  else if(p.cmd===VCMD[1]){rq=1;dir=any(3)?-1:1}
  if(!rq&&!s.tripped){if(any(4)){jg=1;dir=1}else if(any(5)){jg=-1;dir=-1}}
  const raw=rq||jg;s.raw=raw?1:0;if(s.lock&&!raw)s.lock=0;
  const off2=low(8),off3=low(9);s.off2=off2?1:0;
  let en=!!raw&&!s.lock&&!s.tripped&&!off2&&!off3;if(p.rinh==='Inhibited'&&dir<0)en=false;
  /* 4. frequency reference */
  const aiHz=i=>fmax*((+p['a'+(i+1)+'lo']||0)+(s.aif[i]||0)*((+p['a'+(i+1)+'hi']||0)-(+p['a'+(i+1)+'lo']||0)))/100;
  if(s.mop==null)s.mop=vcl(+p.mop0||0,0,fmax);
  if(p.rsrc===VSRC[5]){const u=any(13),d=any(14);if(u&&!d)s.mop=Math.min(fmax,s.mop+fmax/Math.max(.1,+p.mopu||10)*DT);else if(d&&!u)s.mop=Math.max(0,s.mop-fmax/Math.max(.1,+p.mopd||10)*DT)}
  let ref=0;const rs=p.rsrc;
  if(rs===VSRC[0])ref=+p.fset||0;else if(rs==='AI1')ref=aiHz(0);else if(rs==='AI2')ref=aiHz(1);else if(rs===VSRC[3])ref=aiHz(0)+aiHz(1);
  else if(rs===VSRC[4]){const code=(any(10)?1:0)+(any(11)?2:0)+(any(12)?4:0);ref=code?+p['ff'+code]||0:0}
  else if(rs===VSRC[5])ref=s.mop;
  else if(rs===VSRC[6]){
   if(en){const sp=p.pid_sp==='AI1'?s.aif[0]*100:p.pid_sp==='AI2'?s.aif[1]*100:+p.pid_set||0,fb=(p.pid_fb==='AI1'?s.aif[0]:s.aif[1])*100,kp=+p.pid_kp||0,ti=+p.pid_ti||0,td=+p.pid_td||0;
    let e=(sp-fb)/100;if(p.pid_dir==='Inverse')e=-e;
    let u=kp*e+(s.pi||0)+(td>0?kp*td*(e-(s.pe||0))/DT:0);s.pe=e;
    if(ti>0){const du=kp*e/ti*DT,un=vcl(u,0,1);if(!((un>=1&&du>0)||(un<=0&&du<0)))s.pi=vcl((s.pi||0)+du,0,1)}
    ref=vcl(u,0,1)*fmax}
   else{s.pi=0;s.pe=0}}
  ref=Math.abs(ref);let r=jg?Math.min(fmax,jg>0?+p.jgf||0:+p.jgr||0):vcl(ref,fmin,fmax);
  const sk=+p.skp||0,sw=Math.max(0,+p.skw||0)/2;if(!jg&&sk>0&&sw>0&&Math.abs(r-sk)<sw)r=r<sk?sk-sw:sk+sw;
  s.fref=r;
  /* 5. ramps */
  let tg=en?r:0;if(en&&dir!==s.dir&&s.fl>.05)tg=0;else if(dir!==s.dir&&s.fl<=.05)s.dir=dir;
  const coast=!en&&p.stp==='Coast'&&!off3,kill=off2||s.tripped||coast;
  if(kill){s.fl=0;s.fo=0}
  else{const rate=jg?fmax/Math.max(.1,+p.jgrt||2):off3?fmax/Math.max(.1,+p.dec3||1):tg>s.fl?fmax/Math.max(.1,+p.acc||5):fmax/Math.max(.1,+p.dec||5),d=Math.abs(tg-s.fl),st=rate*DT;
   s.fl=d<=st?tg:s.fl+Math.sign(tg-s.fl)*st;
   const rn=+p.rnd||0;s.fo=rn>0?s.fo+(s.fl-s.fo)*Math.min(1,DT/rn):s.fl;if(s.fl===0&&s.fo<.02)s.fo=0}
  s.rq=en?1:0;s.run=!kill&&(en||s.fo>.05)?1:0;s.jg=jg;
  /* 6. motor model, alarms, outputs */
  const x=(s.io||0)/Im;s.th=(s.th||0)+(x*x-(s.th||0))*Math.min(1,DT/Math.max(.5,+p.ovt||60));
  s.oa=p.ovl==='On'&&s.th>.8*L?1:0;
  s.alm=s.oa?'Motor I²t – motor is getting hot':lost&&p.awb==='Ignore'?'Analog input signal lost':s.phl&&p.phl==='Ignore'?'Mains phase missing (ignored)':'';
  if(s.fo>.05&&!s.tripped){s.okt=(s.okt||0)+DT;if(s.okt>10)s.rtc=0}else s.okt=0;
  const run=!!s.run,ready=!s.tripped&&!off2&&!s.lock,fo=s.fo,
   ST=[0,ready,run,run&&s.dir>0,run&&s.dir<0,!!s.tripped,!!s.alm,run&&Math.abs(fo-s.fref)<=Math.max(.2,fmax*.01),fo>=(+p.fth||0)-1e-9,fo<(+p.fth||0),(s.io||0)>=Im*(+p.ith||100)/100,!!s.oa,!run,1,!!raw,1];
  VOK.forEach((K,k)=>{const fn=VDO.indexOf(p[K[0]]);let t=fn>0?!!ST[fn]:false;if(fn>0&&p[K[3]]==='Inverted')t=!t;
   if(t===!!s.od[k])s.ot[k]=0;else{s.ot[k]=(s.ot[k]||0)+DT;if(s.ot[k]>=Math.max(0,+(t?p[K[1]]:p[K[2]])||0)-1e-9){s.od[k]=t?1:0;s.ot[k]=0}}
   s.rl[k]=s.od[k]?1:0});
  [0,1].forEach(k=>{const fn=VAF.indexOf(p['ao'+(k+1)+'f']);let q=0,rated=1;
   if(fn===1){q=fo;rated=fmax}else if(fn===2){q=s.fref;rated=fmax}else if(fn===3){q=s.io||0;rated=Im}else if(fn===4){q=fo/Math.max(1,+p.fb||50)*(+p.rpm||1440);rated=Math.max(1,+p.rpm||1440)}
   else if(fn===5){q=s.vo||0;rated=V}else if(fn===6){q=s.pout||0;rated=Math.max(1,+p.P||1000)}else if(fn===7){q=s.vdc||0;rated=V*Math.SQRT2}
   const lo=+p['ao'+(k+1)+'lo']||0,hi=+p['ao'+(k+1)+'hi']||0;s.ao[k]=fn>0&&hi>lo?vcl((q/rated*100-lo)/(hi-lo),0,1):0});
  s.dip=di.slice()},
 fin:c=>{if(c.o)c.o={v:c.s.vl||0,i:c.s.iin||0,p:c.s.pin||0}},
 st:c=>{const s=c.s,p=c.p;if(!c.o)return'STOPPED';
  if(s.tripped)return`FAULT ${s.fc} ${s.ft}`;if(!s.pw)return'NO POWER';if(s.off2)return'COAST STOP (OFF2)';if(s.lock&&s.raw)return'START LOCKED – remove the run command first';
  if(s.run)return`${s.jg?'JOG ':'RUN '}${(s.fo||0).toFixed(1)} Hz${s.dir<0?' REV':''}${s.alm?' · ALARM':''}`;return s.alm?'READY · ALARM':'READY'},
 msg:c=>{const s=c.s,p=c.p,r=[];if(!c.o)return r;const w=m=>r.push(['wa',`${c.label}: ${m}`]);
  if(s.tripped)w(`FAULT ${s.fc} – ${s.ft}. ${s.perm?'Reset it with the keypad, a Fault reset input or in Properties.':p.arst!=='Disabled'?'Restarting automatically in '+Math.max(0,(+p.ard||0)-(s.rtt||0)).toFixed(1)+' s (attempt '+((s.rtc||0)+1)+' of '+p.arn+').':'Reset it with the keypad (RST), a Fault reset input or in Properties.'}`);
  if(s.pw&&s.alm)w('ALARM – '+s.alm);
  if(s.pw&&s.lock&&s.raw&&!s.tripped)w('start inhibited after the fault – remove the run command once, then give it again');
  if(p.cmd==='Terminal'&&p.wire===VWR[1]&&![0,1,2,3,4,5].some(i=>vFn(c,i)===15))w('3-wire control needs one input set to “Stop OFF1” (a normally-closed stop contact) – otherwise the drive cannot be stopped from the terminals');
  if(s.pw&&s.i24>.2)w(`+24V terminal overloaded (${s.i24.toFixed(2)} A, maximum 0.2 A)`);
  [0,1].forEach(k=>{if(s.pw&&s.iDO[k]>.1)w(`DO${k+1} overloaded (${(s.iDO[k]*1e3).toFixed(0)} mA, maximum 100 mA)`);if(s.ik[k]>2)w(`relay K${k+1} contact carries ${s.ik[k].toFixed(1)} A (maximum 2 A) – use a contactor`)});
  [0,1].forEach(k=>{if(s.pw&&s.al[k])w(`AO${k+1} current loop is open or the load is too high (max about ${Math.round(AOLIM/.02)} Ω at 20 mA)`)});
  return r},
 pp:c=>{const s=c.s,p=c.p,g=Math.max(0,VGR.indexOf(p.grp)),on=S.run&&c.o;
  return`<p class=mu>${p.kind==='Simple'?'Simple drive: RUN = DI1, REV = DI2 (24 V from +24V), speed from the keypad or AI1. Set Drive type to Programmable for relays, outputs, presets and PID. ':VGH[g]+' '}Parameter numbers in brackets are the Siemens equivalents. Press <b>Help</b> for every terminal, wiring examples and the full parameter list.${on?'<br><b>Now:</b> '+esc(D.vfd.st(c)):''}</p>`+
   `<div class=row><button data-clk=prog class=pri>Open programming page</button><button data-clk=run>▶ RUN</button><button data-clk=stop>■ STOP</button><button data-clk=factory>Factory reset</button></div>`},
 clk:(c,a)=>{const s=c.s;if(a==='prog')vpOpen(c);else if(a==='run')c.p.cmd=VCMD[1];else if(a==='stop')c.p.cmd=VCMD[2];else if(a==='reset'){if(s.tripped)s.tripped=0}
  else if(a==='factory'&&confirm('Set every VFD parameter back to its factory value?'))Object.keys(VP).forEach(k=>{if(k!=='grp'&&k!=='kind')c.p[k]=VP[k][0]})},
 rst:c=>vReset(c.s),
 help:c=>vfdHelp(c),
 g:c=>{const s=c.s,p=c.p;vInit(s);const sm=p.kind==='Simple',fo=s.fo||0,rpm=Math.round(fo/Math.max(1,+p.fb||50)*(+p.rpm||1440)),bad=!!s.tripped,col=bad?'#ff6b6b':'#6cf5a4',mono='font-family:monospace;text-anchor:middle',
   T=(x,y,t,z,an,st)=>`<text x=${x} y=${y} class=mt style=\"font-size:${z||7.5}px;text-anchor:${an||'middle'};${st||''}\">${esc(t)}</text>`,
   dot=(x,y,on,cl)=>`<circle cx=${x} cy=${y} r=2.7 style=\"fill:${on?(cl||'var(--ok)'):'#c8d3dc'};stroke:var(--w);stroke-width:.6\" />`,
   RL=['+10V','AI1','AI2','+24V','DI1','DI2','DI3','DI4','DI5','DI6','COM'],LL=['AO1','AO2','DO1','DO2','AGND','K1C','K1NO','K1NC','K2C','K2NO','K2NC'],
   sg=(v,u)=>(u==='mA'?v.toFixed(1)+'mA':v.toFixed(1)+'V'),btn=(x,w,t,f,a)=>`<g data-clk=${a} style=\"cursor:pointer\"><rect x=${x} y=-47 width=${w} height=12 rx=2 style=\"fill:${f};stroke:var(--w);stroke-width:.8\" /><text x=${x+w/2} y=-38.5 style=\"fill:#fff;font:700 7px Arial;text-anchor:middle\">${t}</text></g>`;
  let h=`<rect x=-80 y=-120 width=160 height=240 rx=4 class=s style=\"fill:var(--pn)\" />`;
  h+=`<rect x=-40 y=-104 width=80 height=50 rx=2 style=\"fill:#12301f;stroke:var(--w);stroke-width:1\" /><text y=-87 style=\"fill:${col};font-weight:700;font-size:14px;${mono}\">${fo.toFixed(1)} Hz</text>`+
   `<text y=-74 style=\"fill:${col};font-size:10px;${mono}\">${s.dir<0&&fo>.05?'-':''}${rpm} rpm</text><text y=-62 style=\"fill:${col};font-size:8.5px;${mono}\">${esc(vShort(c))}${s.alm&&!bad?' !':''}</text>`;
  h+=btn(-40,24,'RUN','#2b9f6b','run')+btn(-12,24,'STOP','#c0392b','stop')+btn(16,24,'RST','#d98400','reset');
  h+=T(0,-24,`I ${(s.io||0).toFixed(1)} A   U ${(s.vo||0).toFixed(0)} V`,8)+T(0,-13,`Set ${(s.fref||0).toFixed(1)} Hz`,8)+
   T(0,-2,p.cmd==='Terminal'?(p.wire===VWR[0]?'CMD: terminals 2-wire':'CMD: terminals 3-wire'):'CMD: keypad',7)+T(0,8,'REF: '+(p.rsrc==='Keypad'?'keypad':p.rsrc==='AI1'||p.rsrc==='AI2'||p.rsrc===VSRC[3]?p.rsrc:p.rsrc===VSRC[4]?'fixed freq':p.rsrc===VSRC[5]?'MOP':'PID'),7);
  VOK.forEach((K,k)=>{if(sm)return;const fn=Math.max(0,VDO.indexOf(p[K[0]])),dl=(+p[K[1]]||0)||(+p[K[2]]||0)?` ${+p[K[1]]||0}/${+p[K[2]]||0}s`:'';
   h+=T(-36,26+k*10,`${VOKN[k]} `,7,'start','font-weight:700')+T(-18,26+k*10,`${p[K[3]]==='Inverted'?'/':''}${VDOS[fn]}${dl}`,7,'start')+dot(36,24+k*10,s.rl[k])});
  h+=T(0,72,`${p.mode==='V/f linear'?'V/f lin':'V/f quad'} · boost ${p.bst}%`,7)+T(0,82,`Imot ${p.Imot} A · ${p.fb} Hz`,7)+T(0,92,`ramp ${p.acc} / ${p.dec} s`,7);
  [['L1',-20],['L2',0],['L3',20]].forEach(([n,x])=>h+=T(x,-111,n,8));h+=T(60,-111,'PE',8);[['U',-20],['V',0],['W',20]].forEach(([n,x])=>h+=T(x,114,n,8));
  h+=dot(-68,-113,s.run&&!bad,'var(--ok)')+T(-63,-111,'RUN',6,'start')+dot(-44,-113,bad,'var(--er)')+T(-39,-111,'FLT',6,'start')+T(0,112,sm?'VFD simple':'VFD',9,'middle','font-weight:700')+T(-58,114,Math.round((+p.P||0)/10)/100+' kW',7);
  RL.forEach((n,i)=>{if(sm&&!['AI1','+10V','+24V','DI1','DI2','COM'].includes(n))return;const y=-100+20*i;h+=T(74,y+3,n,8,'end');
   if(i>=4&&i<=9)h+=dot(54,y,s.di[i-4]);else if(i===0||i===3)h+=dot(52,y,s.pw);else if(i===1||i===2)h+=T(46,y+3,s.pw||s.aiv[i-1]?sg(s.aiv[i-1],vIsI(p['a'+i+'t'])?'mA':'V'):'',7,'end')});
  LL.forEach((n,i)=>{if(sm)return;const y=-100+20*i;h+=T(-74,y+3,n,8,'start');
   if(i<2)h+=T(-55,y+3,sg(vAOsig(c,i),vIsI(p['ao'+(i+1)+'t'])?'mA':'V'),7,'start');
   else if(i<4)h+=dot(-48,y,s.rl[i]);else if(i===6||i===9)h+=dot(-48,y,s.rl[i===6?0:1]);else if(i===7||i===10)h+=dot(-48,y,!s.rl[i===7?0:1])});
  return h}};
const VSV=['L1','L2','L3','U','V','W','PE','DI1','DI2','COM','AI1','+10V','+24V'];let VSD=null;
D.vfd.dyn=c=>c.p.kind!=='Simple'?D.vfd:(VSD||(VSD=Object.assign(Object.create(D.vfd),{dyn:undefined,t:D.vfd.t.map(([x,y,n,f])=>VSV.includes(n)||(f&&f.includes('h'))?[x,y,n,f]:[x,y,n,'h'])})));
/* terminal meanings for the hover / help tables */
if(typeof hlTerm==='function'){const _h=hlTerm;hlTerm=(type,n)=>type==='vfd'?(VTM[String(n).trim()]||''):_h(type,n)}
const VTM={'L1':'Mains phase L1 (input)','L2':'Mains phase L2 (input)','L3':'Mains phase L3 (input)','PE':'Protective earth','U':'Motor phase U (output)','V':'Motor phase V (output)','W':'Motor phase W (output)','DI1':'Digital input 1 (default: run forward)','DI2':'Digital input 2 (default: run reverse)','DI3':'Digital input 3 (default: fault reset)','DI4':'Digital input 4','DI5':'Digital input 5','DI6':'Digital input 6','COM':'Common 0 V of all signals','AGND':'Analog / output ground (= COM inside)','AI1':'Analog input 1','AI2':'Analog input 2','+10V':'10 V reference output','+24V':'24 V DC supply output','AO1':'Analog output 1','AO2':'Analog output 2','DO1':'Transistor output 1 (24 V, to COM)','DO2':'Transistor output 2 (24 V, to COM)','K1C':'Relay K1 common','K1NO':'Relay K1 normally open','K1NC':'Relay K1 normally closed','K2C':'Relay K2 common','K2NO':'Relay K2 normally open','K2NC':'Relay K2 normally closed'};
