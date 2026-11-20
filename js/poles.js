/* ElectroSim v8.59 – 2-pole and 4-pole MCCB / isolator / RCCB, and the RCBO (MCB + RCCB in one device).
   The parts themselves are in registry.js (mccb2 mccb4 iso2 iso4 rcd rcd4 rcbo rcbo4); symbols follow IEC 60617 (see RCG / P3 there).
   This file only adds their Help page, wiring guide, easy-help sentence and panel (GA) size.  Loaded after easyall.js, before app.js. */
'use strict';
(()=>{
const T4H='<b>1 3 5 7</b> = supply (L1 L2 L3 <b>N</b>), <b>2 4 6 8</b> = load (L1 L2 L3 <b>N</b>).',T2H='<b>1</b> = live in, <b>3</b> = neutral in, <b>2</b> = live out, <b>4</b> = neutral out.';
const SW2='Click to open / close all poles together.';
if(typeof HLP!=='undefined'){
 HLP.mccb2=HL('A <b>2-pole moulded-case breaker</b>: live and neutral are switched and protected together, for single-phase feeders above the MCB range. It trips if <b>either</b> pole is over its trip current.',[T2H],['Works like the MCB with a bigger rating. Press <b>Reset breaker</b> in Properties after a trip.'],['Single-phase sub-board feeders, big heaters.']);
 HLP.mccb4=HL('A <b>4-pole moulded-case breaker</b>: it switches L1, L2, L3 <b>and the neutral</b> together. Used where the neutral must be disconnected as well (TN-S supplies, generators, changeover).',[T4H,'The neutral pole sits on the same column as the <b>N</b> of the 3-phase supply.'],['Trips if any of the four poles is above the trip current. Press <b>Reset breaker</b> in Properties.'],['Main incomer of a 3-phase + neutral board.']);
 HLP.iso2=HL('A <b>2-pole switch-disconnector</b>: manual on/off for a single-phase circuit, switching live and neutral together. It isolates; it does not protect.',[T2H],[SW2],['Isolating a single-phase machine or sub-board.']);
 HLP.iso4=HL('A <b>4-pole switch-disconnector</b>: manual on/off for L1, L2, L3 and neutral together. IEC 60617 switch-disconnector symbol (bar across each blade). It does not protect against overload.',[T4H],[SW2],['Main switch of a 3-phase + neutral panel.']);
 HLP.rcd4=HL('A <b>4-pole residual-current device (RCCB)</b> for 3-phase + neutral circuits. It compares the current in all four conductors; if they do not add up to zero, current is leaking to earth and it switches off <b>fast</b>. It protects people, not cables.',[T4H,'Put an MCB / MCCB in front of it – an RCCB has no short-circuit protection.'],['Sensitivity (e.g. 30 mA) is shown for information. In the simulator it trips on its rated current like a breaker; press <b>Reset breaker</b> in Properties.'],['Main RCD of a 3-phase board, 3-phase socket circuits.']);
 HLP.rcbo=HL('An <b>RCBO</b> (residual-current <i>breaker with overcurrent protection</i>): an MCB and an RCCB in <b>one</b> device, 2-pole (live + neutral). It trips on overload, short circuit <b>and</b> earth leakage, so one device protects both the cable and the person.',[T2H],['Set <i>Trip current</i> like an MCB. The mA value is shown for information. Press <b>Reset breaker</b> in Properties after a trip.'],['Final circuits (sockets, lighting) – one RCBO per circuit, so a fault only drops that circuit.']);
 HLP.rcbo4=HL('A <b>4-pole RCBO</b>: MCB and RCCB in one device for a 3-phase + neutral circuit. It trips on overcurrent in any pole and on earth leakage.',[T4H],['Set <i>Trip current</i> like an MCB. Press <b>Reset breaker</b> in Properties after a trip.'],['3-phase final circuits that need RCD protection.']);
}
if(typeof WIR!=='undefined'){
 const L=(pin,label,col,via,slot)=>['l',pin,label,col,via,slot],Rt=(pin,label,col,via,slot)=>['r',pin,label,col,via,slot];
 const p2=(a,b)=>[L('1',a+' live','br',null,0),L('3',a+' neutral','b',null,1),Rt('2',b+' live','br',null,0),Rt('4',b+' neutral','b',null,1)];
 const p4=(a,b)=>[L('1',a+' L1','br',null,0),L('3',a+' L2','k',null,1),L('5',a+' L3','gy',null,2),L('7',a+' neutral','b',null,3),Rt('2',b+' (L1)','br',null,0),Rt('4',b+' (L2)','k',null,1),Rt('6',b+' (L3)','gy',null,2),Rt('8',b+' (neutral)','b',null,3)];
 WIR.mccb2={s:'A bigger 2-pole breaker for single-phase feeders: it switches and protects live AND neutral.',rows:p2('Supply','Load'),tip:['Supply on 1 and 3 (top), load on 2 and 4 (bottom).']};
 WIR.mccb4={s:'A big 4-pole breaker for 3-phase + neutral feeders.',rows:p4('Supply','Load'),tip:['The neutral goes on 7 (in) and 8 (out).']};
 WIR.iso2={s:'A manual on/off switch for a single-phase circuit: opens live and neutral together.',rows:p2('Supply','Equipment')};
 WIR.iso4={s:'The main on/off switch of a 3-phase + neutral panel.',rows:p4('Supply','To breaker / load')};
 WIR.rcd4={s:'A safety device for 3-phase + neutral circuits: switches off when current leaks to earth.',rows:p4('Supply','Load'),tip:['Fit an MCB / MCCB in front – an RCCB does not protect against short circuit.','Every conductor of the circuit, neutral included, must pass through it.']};
 WIR.rcbo={s:'MCB and RCCB in one: protects the cable (overload, short circuit) and the person (earth leakage). 2-pole: live + neutral.',rows:p2('Supply','Load'),tip:['One RCBO per final circuit.']};
 WIR.rcbo4={s:'4-pole RCBO: overload, short-circuit and earth-leakage protection in one device, for 3-phase + neutral.',rows:p4('Supply','Load')};
}
if(typeof CET!=='undefined'){
 CET.mccb2='two big resettable fuses (live and neutral) and one switch in one box.';
 CET.mccb4='four big resettable fuses (three phases and neutral) and one switch in one box.';
 CET.iso2='a heavy-duty on/off switch that opens live and neutral together. It only switches; it does not protect.';
 CET.iso4='a heavy-duty on/off switch that opens three phases and neutral together. It only switches; it does not protect.';
 CET.rcd4=CET.rcd;
 CET.rcbo='an MCB and a person-saver in one box: it opens on overload, short circuit and current leaking to earth.';
 CET.rcbo4='an MCB and a person-saver in one box for a 3-phase circuit: it opens on overload, short circuit and current leaking to earth.';
}
if(typeof PNL_MAP!=='undefined'){   /* [zone, width mm, height mm, rail group] – typical catalogue sizes (18 mm per DIN module) */
 Object.assign(PNL_MAP,{mccb2:['p',90,130,0],mccb4:['p',140,130,0],iso2:['p',36,90,0],iso4:['p',72,90,0],rcd4:['p',72,90,0],rcbo:['p',36,90,0],rcbo4:['p',72,90,0]});
}
if(typeof HLP!=='undefined'){   /* the symbols that were simplified before */
 const add=(k,t)=>{if(HLP[k])HLP[k].n.push(t)};
 add('ths','Symbol (IEC 60617): switch blade with a dashed operating link to the temperature actuator <b>θ</b>.');
 add('prs','Symbol (IEC 60617): switch blade with a dashed operating link to the pressure actuator <b>p</b>.');
 add('lvs','Symbol (IEC 60617): switch blade with a dashed operating link to a float resting on the liquid surface.');
 add('sol','Symbol: IEC 60617 operating coil <b>Y</b> with a dashed link to the ISO 1219 symbol of a 2/2 valve (solenoid actuator on the left, return spring on the right). When the coil is powered the flow box moves over the ports.');
 add('buz','Symbol (IEC 60617): the buzzer – a dome on a thick bar. Sound waves appear while it is powered.');
 if(HLP.mot1)add('mot1','Symbol (IEC 60617): <b>M</b> over <b>1~</b> (single-phase AC motor). Speed and direction show inside the circle while it runs.');
}
})();
