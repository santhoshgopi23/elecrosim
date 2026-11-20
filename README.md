# ElectroSim – Electrical Simulator

Browser-based electrical and industrial automation simulator (HTML, CSS, JavaScript – no build step).

## Run
The landing page is `index.html`; the editor is `app.html`. Open `index.html`, or serve the folder (`python3 -m http.server`). GitHub Pages: Settings → Pages → `main` / root.

## v8.76 – Launch preparation
- **Licence** changed from MIT to proprietary (all rights reserved).
- **Landing page:** new "ElectroSim Pro is coming" section with a waitlist form (email, role, fair yearly price); nav and footer links; `legal.html` (Privacy & Terms, template – set your contact email).
- **Hosting files:** `functions/api/waitlist.js` (stores the list in Cloudflare KV, binding `WAITLIST`), `_headers` (HTTPS and security headers, no-cache for `sw.js` and the HTML pages), `DEPLOY.md` (step-by-step Cloudflare Pages setup). The editor itself is unchanged.

## v8.75 – Presets (Simulation tab → Presets)
- **Save preset** stores your current look and sound under a name (for example "Training" or "Presentation"); a **button for each preset** appears in the group – one click switches everything. The preset that matches the current settings is highlighted; change any control and the highlight goes out. **Delete preset** removes the highlighted one. Saving with an existing name asks before replacing it. Up to 12 presets, names up to 24 characters.
- A preset holds: animation style, every Simulation option (wire / dot / part colours, glow, thickness, dots, ring / sparks, wire colour mode, speed, sound volume and the Relays / Switches / Alarms groups) and sound On / Off. Realism and Live values are not included. Selected-wire colours belong to the project, not to a preset.
- Type **PRESET** on the sheet to list them and switch from the keyboard. Presets are kept in this browser (`electrosim.presets`).
- **Top-bar switches:** two buttons next to the 🔊 sound button – **💬 Hover tooltip** and **🔖 Presets** – each On / Off with one click (dimmed = off, the tooltip shows the state). Presets off hides the Presets group and the PRESET commands but keeps your saved presets; the tooltip and Presets buttons are hidden on very narrow phone screens (use the Simulation tab there). Type **PRESETS** to switch the presets on / off from the keyboard.
- Code: `js/presets.js` (new, loaded last), `js/simopt.js` (one line: `window.simoptSet`), `css/polish.css`, `app.html`, `sw.js`.

## v8.74 – Live values on the sheet and hover tooltip (Simulation tab → Live values)
- **Live values** (toggle button): while the simulation runs, volts and amps are written beside every part and wire. **Show on:** parts · wires · parts and wires. **Values:** V and A · V only · A only · V, A and W. **Hide idle (0 V, 0 A)** leaves out parts and wires that carry nothing. Labels are placed so they do not sit on top of each other (parts first, then the longest wires), keep a readable size when you zoom, stay visible while paused, and are never in the PDF export. Type **LIVE** on the sheet to switch.
- **Hover tooltip** (toggle button, on by default): while running (or paused) hover a **part** to see voltage, current, power and state (for example `LIT 100%`, `ENERGISED`, `TRIPPED`; green / amber / red); a **terminal** to see the voltage and current of that connection plus the part state; a **wire** to see where it runs (`KM1 · A1 → S1 · 13`), its voltage, current, power carried and whether it is live, at voltage with no current, or dead; an **air line** to see the pressure. On a phone or tablet **tap** a part or wire (the tooltip stays about 3 s). It hides while you drag, pan, draw a wire or have a dialog open. Type **TIP** on the sheet to switch.
- **Good to know:** the solver treats a wire as ideal, so a wire value belongs to the whole connection (net): every wire on one net shows the same voltage, and the current is the largest current of any part on that net. The tooltip says so. Currents and powers are shown without sign; the voltage keeps its sign so a reversed supply is easy to spot.
- All choices are remembered (`electrosim.livevals`). Code: `js/livevals.js` (new, loaded last; own layer `#gLV`, no existing file's logic changed), `css/polish.css` (tooltip), `app.html`, `sw.js`.

## v8.73 – Realism (Simulation tab → Realism)
- **Real relay timing**: relays and contactors pull in / drop out in about 10–30 ms instead of instantly (one step = 20 ms). "Delay" can slow it ×3 or ×10 so you can see race conditions in seal-in circuits; a coil pulse shorter than the pull-in time never closes the contacts. The status shows PULLING IN… / DROPPING OUT… / CONTACT BOUNCE.
- **Contact bounce**: contacts chatter closed-open-closed after the armature arrives (exaggerated to whole steps so it is visible; it clicks too).
- **Arc on opening**: a contact that opens while carrying ≥ 0.4 A flashes and crackles; length, brightness, number of sparks and crackle follow the current.
- **Fault replay**: the last 3 s are recorded. When a fuse blows or a breaker / overload trips a banner appears – ⏪ Replay pauses the run and lets you step back frame by frame, shows the current of the device against its limit, which parts and wires went over first, and colours the overloaded wires red. Options: Record faults, Pause on fault.
- Code: `js/realism.js` (new), small hooks in `js/solver.js` (separate coil state), `js/app.js` (Stop resets it), `js/sound.js` (`sndArc`), `app.html`, `sw.js`.

## v8.72 – Wire colour modes (Simulation tab → Wire colours)
- **Mode:** *One colour* (as chosen in Colours) · *Different for every wire* · *Different for every connection (net)* – wires that are the same electrical point share a colour · *By voltage level* (0 V grey, 6 V cyan, 12 V blue, 24 V green, 48 V light green, 110 V amber, 230 V red, 400 V purple, above black) with a **colour key** on the sheet · *By current (heat)*.
- **Selected wire:** click a wire, then pick its own live colour (11 colours) – saved with the project. **Clear wire colours** removes them all. A wire colour set this way beats the mode.
- Glow follows the wire colour. Code: `js/simopt.js`, `sw.js`.

## v8.71 – More Simulation options
Simulation tab, all remembered, **Defaults** button resets them:
- **Colours:** live **wires** (Auto, Amber, Red, Green, Blue, Cyan, Purple, Pink, Black, Heat by current) · flow **dots** (Auto, White, Yellow, Cyan, Lime, Red, Black) · **parts that are on** (coils, relays; Auto green, Blue, Amber, Red, Purple, Cyan) · **Glow** (Auto, Off, Low, High; glow takes the chosen colour).
- **Wires & dots:** thickness (Thin … Extra thick), dot speed (Slow … Very fast), dot size, show / hide dots. **Switching:** ring / sparks on or off.
- **Sound:** On / Off, volume (Low / Medium / High), **Test sound**, and separate On / Off for Relays, Switches, Alarms (trip, fuse, buzzer).
- **Speed:** ¼×, ½×, 1×, 2×, 4× (slow motion to fast – timers and delays follow).
- Code: `js/simopt.js` (new), `js/polish.js`, `js/sound.js`, `css/polish.css`, `app.html`, `sw.js`.

## v8.70 – "Simulation" tab: 4 animation styles + sound On / Off
- New ribbon tab **Simulation** (top, next to Output): **Animation style** – **Standard** (plain original look), **Moderate** (warm live wires, green coils, a ring when a part switches), **Good** (Moderate + glow), **Realistic** (wire thickness, colour and dot speed follow the real current; breathing coil glow; flash with sparks when a relay / switch operates; small room echo on the sounds). **Sound** button (ON / OFF) and **Run / Pause / Stop** are in the same tab. Choices are remembered. Also: type **ANIM** or **SOUND** on the sheet; the 🔊 button in the top bar still works.
- Code: `js/polish.js` (styles, Simulation tab), `css/polish.css`, `js/sound.js` (echo, change event), `sw.js`.

## v8.69 – Sound (with On / Off) and a better-looking live simulation
- **Sound** (made in the browser with Web Audio, no sound files). While the simulation runs you hear: **relay click** when a relay / timer contact pulls in (and a softer one when it drops out), a heavier **contactor clunk** for contactors and contactor coils, the **alternating relay** outputs, a **latch tick** when you let go of a START button and the relay stays on (seal-in / self-holding), the voltage-monitor relay latching on a fault, **push button** press and release, **toggle / selector switch**, **circuit breaker / RCD** thunk, **emergency stop** (heavy latch clunk + a softer release), limit / sensor ticks, **overload trip**, **fuse blowing**, and a continuous **buzzer** while it is powered. Sounds are slightly different each time and panned left / right by where the part is on the sheet.
- **On / Off:** the 🔊 / 🔇 button in the top bar (next to RUNNING), or menu ⋯ → Sound, or type **SOUND** on the sheet. It is remembered. Browsers only allow sound after a click – pressing Run or any button starts it.
- **Better simulation look:** the current-flow dots on the wires now really **move** (the sheet is redrawn every frame, which used to restart the animation – the phase is now shared), live wires glow, energised coils / relays glow green, and a **soft ring pulses** around a part the moment it switches (same moment as its sound). Large drawings (over 260 parts + wires) switch the glow off automatically to stay smooth. The PDF export is not changed.
- Code: `js/sound.js` and `js/polish.js` (new, loaded last, existing parts not changed), `css/polish.css` (new), `app.html`, `sw.js`.

## v8.68 – Ctrl+click multi-select, easy page switching, results closed at start
- **Multi-select:** click item 1, then **Ctrl + click** item 2, item 3 … (Cmd or Shift also work). Ctrl + click a selected item to take it out again. Works for parts, wires and drawn objects. **Ctrl + A** selects everything on the page. With several selected: **drag** any selected part = all move together (wire corners between moved parts move too) · **arrow keys** nudge · **Copy** (wires between copied parts are copied too) · **Rotate** · **Delete** · **Esc** or a click on empty sheet clears. A plain click on one of the selected parts selects just that one. The right panel and the bar on the sheet show the count and the buttons.
- **Page switching:** **◀ 1 / 3 ▶** in the page bar, **PageUp / PageDown**, mouse wheel scrolls the page bar, every page remembers its own zoom and position, clicking the page you are already on no longer opens the settings dialog (use the ✎ or double-click the tab to rename / move / delete). When the page bar is hidden a small ◀ ▶ switcher shows on the sheet.
- **Results table starts closed** (also on desktop). Open it with the **▴ Results** button at the bottom-left of the sheet, or menu ⋯ → Show / hide results. It stays closed when you press Run.
- Code: `js/multisel.js` and `js/easynav.js` (new, loaded last, wrap existing functions – no existing part changed), `js/app.js` (results closed at start), `app.html`, `css/ide.css`, `sw.js`.

## v8.67 – Ethernet switch and networks (PHASE 2 of 2, library group "Communication")
- **Ethernet switch** (`ethsw`, unmanaged): terminals `L+` `M` and ports `P1` … `P8`. Properties: number of ports 5 or 8 (ports 6-8 are drawn grey and flagged when wired on a 5-port switch; the app has no variable terminal count), fastest speed, supply. **Auto MDI-X is always on** (straight cable to every device). Every port is a link endpoint like a device LAN: the Phase 1 walk plug - cable - plug and `etLink` run for each port, so every port has its **own link LED, negotiated speed (10 / 100 / 1000 side by side) and activity LED**.
- **Devices** (`ethp`) now have a **MAC address** (from the part id), **IP address** (empty = automatic 192.168.1.x), **subnet mask** and **Send ping to**.
- **Network simulation** (`etNet`, a new 4.5 s exchange per slot): an unknown destination starts an **ARP broadcast** that the switch **floods** to all other ports; the owner answers; **MAC learning** from every source address (the table in the switch's Properties grows while the frame arrives); then unicast pings go **only to the learned port**; round-trip time from store-and-forward delay (84 byte frame, link speed, 5 ns/m, 5 us per switch). Coloured frames move along the cables (orange = broadcast / ARP, blue = data, green = reply) and the activity LEDs follow the traffic.
- **Warnings:** another subnet (a router is needed), duplicate IP in one network, invalid IP / mask, nobody answers ARP, **loop between switch ports = broadcast storm** (red switch, flooding capped, MAC table flaps, no reliable communication), wire on an unfitted port, plus all Phase 1 link warnings.
- **Help:** child explanation (the post office that learns the streets), store-and-forward, MAC learning, collision vs broadcast domain, full duplex, auto-negotiation, IP vs MAC, loops and Spanning Tree, comparison **hub vs unmanaged vs managed switch**.
- **Fix (Phase 1):** the RJ45 plug and cable had no reset and their runtime state was serialised with the project (Save / Download threw "circular structure"). Runtime state of the Ethernet and RS232 / RS422 parts is now never saved. (`rs485.js` still shows that quirk when saving while running; not changed.)
- New example `examples/ethernet_switch.json` (switch + 3 PCs, on `index.html`). Code: `js/ethswitch.js` (new, after `ethernet.js`), `js/ethernet.js` (endpoints generalised for switch ports, hooks), `js/rs232.js` (save guard), `js/view.js`, `app.html`, `sw.js`.

## v8.66 – Ethernet cable, RJ45 plug and device port (PHASE 1 of 2, library group "Communication")
- **Ethernet device port** (`ethp`): terminals `L+` `M` (own supply) and `LAN`. Properties: device type PC / PLC (MDI) or switch (MDI-X), fastest speed 10 / 100 / 1000 / 10000 Mbps, Auto MDI-X. Shows the **link LED** (green up / red down), the **speed** and an activity LED.
- **RJ45 plug** (`rj45`): terminals `PORT` (to the device LAN) and `CABLE`. Draws the **8 pins with their wire colours** (striped = white/colour). Wiring **T568A**, **T568B** or **Custom** (colour of every pin); Help has the T568A/B pin table and the crossover pinout. Optional shielded plug.
- **Ethernet cable** (`ethc`): terminals `A` `B`. **CAT5e / CAT6 / CAT6A / CAT7**, length (warning above 100 m for the whole channel), shielded / unshielded, **straight-through / crossover**, noise around the cable. Draws 4 twisted pairs and moving pulses while the link is up (2 pairs at 10/100, 4 pairs at 1000+).
- **Simulation** (`etAnalyse`): chain device LAN – plug – cable – plug – LAN device (patch panels: several cables in a row, lengths add up, weakest category decides). The 8 wires are followed pin by pin, so **a wrong order really breaks the link**: swapped pins, a colour used twice, split pairs, MDI to MDI on a straight cable, crossed cable between PC and switch, plug the wrong way round, missing plug / far end, no power. Speed = highest standard that both ports, the wiring (10/100 use pins 1 2 3 6, 1000 all 8), the length (150 / 120 / 100 m, 10G: CAT6 55 m, CAT6A / CAT7 100 m) and the noise margin (category + shielding - noise) allow; shield needs shielded plugs.
- **Help:** a child's explanation (a road with pairs of lanes), then twisted pairs and why twisting reduces noise, category / frequency / speed tables, T568A/B and crossover tables, what the simulator checks. Example `examples/ethernet_link.json` (also on `index.html`).
- Code: `js/ethernet.js` (new, after `rs232.js`), `js/view.js`, `app.html`, `sw.js`, `index.html`. Phase 2 (unmanaged switch, multi-device networks) follows.

## v8.65 – RS232 and RS422 serial links (library group "Communication")
- **RS232** (`rs232`): terminals `L+` `M` (own supply), `TX` `RX` `GND`, optional `RTS` `CTS`. Point-to-point, full duplex, **15 m** limit (shorter above 19 200 baud), driver level **±12 V** (±9 V, ±5 V or 0/5 V TTL selectable). DB9 pin table in Help. TX to RX must be crossed; TX-to-TX, one-way wiring, missing GND, RTS/CTS flow control without its wires, TTL against RS232 levels and a cable that is too long are all detected. TX wired to RX of the same part = loop-back test.
- **RS422** (`rs422`): terminals `L+` `M`, `TX+` `TX-` `RX+` `RX-`, `GND`. Role Master / Slave: **4-wire full duplex**, one driver feeding up to **10 receivers**, **1200 m** (min of 1200 m and 1e8 / baud, like the RS485 node), termination of the last receiver and of the master's answer pair, swapped + / - (bits inverted), two masters (collision), no answer path.
- **Properties (both):** baud rate, data bits 5–8, parity None / Even / Odd / Mark / Space, stop bits 1 / 1.5 / 2, byte sent (hex), cable length, supply. **A mismatch really garbles the data:** the receiver decodes with its own settings (start-bit edge, middle of each of its own bits, LSB first, parity check, stop bit), so wrong baud / data bits / parity / stop bits give wrong bytes, **PE** parity errors and **FE** framing errors. Some settings look right by luck for some bytes (7E1 "A" read as 8N1) - this is real UART behaviour.
- **Simulation:** every part is a two-trace oscilloscope (top = sent, bottom = received) animating a real frame: idle, start bit, data bits, parity, stop bit(s), at 5 bit/s; both directions at once. Status text `TX 41 · RX 48 ✓`, `✗ PE`, `✗ FE`, `WAIT CTS`, `NO SIGNAL`, `COLLISION`. **Properties → ▶ Serial Viewer:** the byte drawn big with every bit named, the receiver's sampling points (green dots, red on PE/FE), the decoded byte, a sender-vs-receiver settings table and the reason for any difference; pause, replay, speed.
- **Help button:** explained for a child first (string phones / megaphone and ropes), then the UART frame, why settings must match, RS232 voltages, DB9 pin table, flow control, RS422 differential signalling, 4-wire wiring table, and a comparison table **RS232 vs RS422 vs RS485**. Wiring diagram and terminal table like the other parts.
- New examples: `examples/rs232_link.json`, `examples/rs422_bus.json` (also on `index.html`). Break them on purpose and read the warnings.
- Code: `js/rs232.js` (new, loaded after `modbus.js`; reuses `rsMax`, `rsLc`, `rsH` and the supply / Properties of `rs485.js`), `js/view.js` (symbol captions), `app.html`, `css/ide.css` (Serial Viewer), `sw.js` (cache list and name). No existing part was changed.

## v8.64 – Modbus Register Map phase 2: Link, Format, 0/1-based address, Help
- **Link column (slave Register Map):** tie a row to a component by its label. Input registers / discrete inputs **read** the component every tick; coils / holding registers **write back** to it when the master writes (otherwise they mirror it). Channels: transmitters (process value, % of span, output signal), VFD (output Hz, rpm, current, keypad set-point, run command coil, running, fault), relays / contactors (coil energised), modulating valve (position), multi-function meter (V, I, P, Hz, PF). To make another part linkable add a branch in `mbCh()` (`js/mbmap.js`). A link whose component was renamed shows “not available” and the row keeps its own value.
- **Format column:** 16-bit (default, old projects unchanged) or **32-bit float over 2 registers** (address and address + 1) with byte / word order **ABCD · CDAB · BADC · DCBA**. Overlaps with the next row are flagged; the example map has a float row.
- **Master: “Start address numbering”** 0-based (default) or 1-based (wire address = number typed − 1). Properties show the wire address.
- **Help:** new child-friendly “numbered boxes holding numbers” explanation, then 0-based vs 1-based, 16-bit values (signed / scaled), float32 over two registers and byte order with a worked example (123.456 = 0x42F6E979).
- Code: `js/mbmap.js` (formats, `mbCh`, `mbLk`, `mbSync`, editor columns), `js/modbus.js` (master option, slave `tk`, warnings, Help), `sw.js` cache name.

## v8.63 – Modbus function codes and Register Map editor (phase 1 of 2)
- **Function codes 01, 02, 03, 04, 05, 06, 15, 16** (master and slave) and the **four data types**: coil (1 bit, read/write), discrete input (1 bit, read only), input register (16 bit, read only), holding register (16 bit, read/write). Each type has its own addresses starting at 0. New file `js/mbmap.js` (loaded before `modbus.js`): `mbReq` (request a master builds), `mbExec` (what a slave answers: exceptions in the real order 01 → 03 → 02 → 04), `mbMap` (Frame Viewer colours), `mbDec`, `mbRows` / `mbSave` / `mbRegs` (register map).
- **Master Properties:** function code list now has all eight (08 stays as the “unsupported → exception 01” demo); start address, quantity (reads), coil ON/OFF (05), value (06), a comma list of values (15 bits / 16 numbers).
- **Slave: Register Map editor** (Properties → ▦ Register Map…): table with type, address, PLC number (40001 style), name, value, scaling (e.g. 0.1), unit, raw, hex and the function codes that reach the row. Value = raw × scaling; the master only sees the raw 16-bit number (shown signed). Add / delete / sort rows, “Load example map”, live values while running. Stored as JSON in `c.p.rm`; old projects (`c.p.rt`, “addr:value,…”) still load and are read as holding registers.
- Frame Viewer, status line, results table and Help table understand all eight codes. New example: `examples/modbus_register_map.json` (change the master’s function code and watch the frames).
- Phase 2 (links, formats, 0/1-based, Help) is in v8.64 above.

## v8.62 – Modbus RTU Master and Modbus RTU Slave (library group "Communication")
- **Two new parts on the existing RS485 bus:** `mbm` Modbus RTU Master and `mbs` Modbus RTU Slave. Same terminals as the RS485 node (`L+` `M` `A` `B` `G`), same wiring rule (A–A, B–B), and the same bus checks (A/B swapped, baud mismatch, termination, bias, cable length, two masters, short). `js/rs485.js` only got two helpers (`rsIs`, `rsM`) so the new parts join the same bus groups; its own behaviour is unchanged.
  - **Master Properties:** slave address (0 = broadcast), function code (**03** read holding registers, **06** write single register; 08 only to demonstrate exception 01), start register, quantity (FC03) / value (FC06), poll interval, response timeout, baud, parity, termination, bias, cable length, supply. The request frame (hex, CRC included) is shown in Properties.
  - **Slave Properties:** address, **editable register table** (address / value / hex, add and delete rows; stored as the string `c.p.rt`, live values in `c.s.rv` and thrown away at Stop), baud, parity, termination, bias, *Simulate device failure*, supply.
  - **Protocol simulation** (`js/modbus.js`): real RTU frames `[address][function][data][CRC-16 low, high]`, CRC-16 (0xA001), 11-bit characters, 3.5-character silence, turnaround and timeout. Exceptions **01** (function 08), **02** (register not in the table), **03** (quantity 0 or > 125), **04** (device failure). Timeouts for a wrong address, baud / parity mismatch, A/B swapped or a cable too long (the slave sees a bad CRC and stays silent). Two slaves with the same address → overlapping answers → CRC error. Two masters → collision. Broadcast (address 0) → writes only, nobody answers.
  - **Frame Viewer** (button in the Properties of a master or a slave, works in preview before Run too): every poll byte by byte, coloured by field (address, function, data, byte count, exception code, CRC); the **request travels from the master to the slave along the wire, then the response comes back**, in slow motion (Slow / Normal / Fast, Pause, Step one byte, Replay, Follow live). Below: what the bytes mean in words, the CRC check (and *CRC steps*), the timing at your baud rate, the slave's register table (registers just read / written highlighted), the values the master has read, and a history table (click a row to replay it). The symbol on the sheet shows the first bytes of the latest frame and a status (OK, EXCEPTION, TIMEOUT, CRC ERROR, COLLISION).
  - **Help button:** first explained like to a child (teacher asks, student answers, exceptions, timeouts, check number, shouting to the whole class), then the technical part: frame structure and examples, CRC-16 step by step, timing (11-bit characters, 3.5 / 1.5 character gaps, turnaround, timeout, polls per second), exception code table (which ones the simulator produces and how to provoke them), settings that must match; plus wiring diagram and terminal table.
  - New example: `examples/modbus_rtu.json` (master + 2 slaves) – and a card on `index.html`. Try the changes listed on the sheet.
  - Code: `js/modbus.js` (new, loaded after `rs485.js`), `js/rs485.js` (helpers), symbol-view entry in `js/view.js`, styles at the end of `css/ide.css`, `sw.js` cache list.

## v8.60 – RS485 node (new library group "Communication")
- **RS485 node** (`rs485`, 2-wire half-duplex): terminals `L+` `M` (own supply), `A` (D−), `B` (D+), `G` (signal ground / shield, optional). One part, two roles (Properties → *Role*): **Master** (asks) or **Slave** (answers).
  - **Properties:** baud rate (1200 – 1 M), termination 120 Ω ON/OFF, bias (fail-safe) resistors ON/OFF, cable length of the whole bus (set on the master), the byte this node sends (hex), supply voltage.
  - **The wiring is the bus:** nodes whose A and B are wired together (A–A, B–B) are on one bus. The solver now exposes the net of every terminal as `S.net(key)`; `js/rs485.js` groups the nodes once per tick.
  - **Simulation – a live oscilloscope on every node** (make the part bigger with *Size %*): orange = wire B, blue = wire A (B above A = 1). It scrolls a real 8N1 frame (idle, start bit, 8 data bits LSB first, stop bit): a **request** from the master, then a **reply** from one slave (slaves answer in turn). Text under the screen: `TX`, `RX ✓ / ✗`, `NO REPLY`, `COLLISION`, `NO POWER`. `T` and `B` light up when termination / bias are ON.
  - **What the simulator checks (warnings in the results table, in plain words):** A/B swapped, a node on only one wire, A and B shorted, baud rate differing from the master, termination (needed above ~2·10⁷ / baud m; exactly the two ends), bias (one set; idle ≥ 0.2 V), cable length vs baud (limit 10⁸ / baud m, max 1200 m), signal at the far end (24 AWG pair, loaded by terminations and unit loads), more than 32 nodes, two masters, no master, no slave that can answer, no common G reference, no power.
  - **Help button:** explained first like to a child (two tin cans on a string, only one talks at a time), then the technical part (differential signalling, 8N1, termination, bias, G, rules of a good bus), wiring diagram and terminal table, plus what to look at on the scope.
  - New example: `examples/rs485_bus.json` (master + 2 slaves). Break it on purpose and read the warnings.
  - Code: `js/rs485.js` (new, loaded after `procsw.js`), one line in `js/solver.js` (`S.net`), symbol-view entry in `js/view.js`.

## v8.59 – 2-pole / 4-pole MCCB, isolator and RCCB, RCBO, IEC pass for valve / buzzer / sensor switches / 1-ph motor
- **More poles (Protection library):** `mccb2` MCCB 2-pole, `mccb4` MCCB 4-pole, `iso2` isolator 2-pole, `iso4` isolator 4-pole, `rcd4` RCCB 4-pole (`rcd` stays the 2-pole RCCB, so old projects load unchanged), and the new **RCBO** (MCB + RCCB in one): `rcbo` 2-pole and `rcbo4` 4-pole.
  - **2-pole:** terminals 1-3 (supply live / neutral) and 2-4 (load), same as the 2-pole MCB.
  - **4-pole:** L1 L2 L3 **N**, supply 1 3 5 7, load 2 4 6 8. The neutral pole sits on the same column as the **N** of the 3-phase supply, so the wire drops straight down. A breaker trips if **any** of its poles (neutral included) is above the trip current; an isolator opens all poles together.
  - **RCBO symbol (IEC 60617):** breaker poles with cross, thermal and magnetic release on every pole, plus the core-balance ring and its release on the dashed link. Trip current like an MCB, sensitivity (mA) for information. *Reset breaker* in Properties.
  - Also added to the physical view (width follows the number of poles), panel layout (GA), wiring guide, help and the easy-help text. Code: parts in `js/registry.js` (`RCG`, `T4`, `el4`), help / wiring / GA sizes in the new `js/poles.js`, physical looks in `js/phys.js`.
- **IEC pass finished:**
  - **Thermostat / pressure switch / level switch:** switch blade with a **dashed operating link** to the actuator symbol: **θ** (temperature), **p** (pressure), float on a wave (level). The link follows the blade.
  - **Solenoid valve:** IEC operating coil **Y** with a dashed link to the ISO 1219 symbol of a 2/2 valve (solenoid actuator left, spring right); when the coil is powered the flow box moves over the ports.
  - **Buzzer:** IEC buzzer symbol (dome on a thick bar) with sound waves while powered.
  - **Single-phase motor:** **M** over **1~** is always shown (it used to disappear while running); speed and direction are shown below it inside the circle.

## v8.58 – 2-pole MCB, IEC 60617 breaker symbols, Auto-save ON / OFF, close confirmation
- **MCB (2-pole)** in the Protection library (`mcb2`): phase + neutral switch together, terminals 1-3 (supply) and 2-4 (load), trips if either pole is over the trip current. Click to switch, *Reset breaker* in Properties; also added to the physical view, panel layout (GA, 2 modules), wiring guide and help.
- **International-standard symbols (IEC 60617):** MCB / MCCB / MPCB now use the circuit-breaker symbol (cross on the contact, series thermal release, filled half-disc magnetic release, dashed linkage between poles). RCCB shows the two breaker poles with the core-balance ring and its release. The isolator is the switch-disconnector (bar across the blade). The push button has the dashed mechanical link to its head. The heater is the standard heating-element box. Contactor, overload relay, fuse, lamp, motor, transformer, diode, LED, capacitor, coil and meters already followed IEC.
- **Auto-save ON / OFF:** *left 3-bar (☰) menu → Auto-save*. Saves to the browser a few seconds after each change and when the tab is hidden or closed, in its own slot (never overwrites *Save in browser*). *3-bar menu → Restore auto-saved work*; at start-up you are asked Yes / No whether to restore it. The untouched demo circuit is never auto-saved.
- **Close confirmation:** closing the tab or browser, or reloading, asks first (the browser shows its own *Leave / Stay* box – web pages cannot restyle it, and it only appears after you have clicked in the page). ElectroSim's own *About ElectroSim* link uses a Yes / No box. Code: `js/autosave.js`.

## v8.57 – Load calculation sheet (cable Cu / Al, MCB, RCCB, isolator)
Open it from **Home / Insert / Output → Load calculation**, or type `LC`. Code: `js/loadcalc.js` (engine + dialog), styles at the end of `css/ide.css`.
- **Per load** (motor DOL / soft starter / VFD, single-phase motor, lighting, sockets, heater, air-con, sub-board, other): enter quantity, rating (kW, HP, W, kVA or A), supply (1-phase, 3-phase 3-wire, 3-phase + neutral) and cable length. PF, efficiency and demand factor have type defaults you can change.
- **Result for each load:** design current Ib, **MCB / MCCB / ACB** (rating, curve B/C/D, poles, kA), **cable size in copper or aluminium** (PVC 70 °C or XLPE 90 °C; method B1, C or E; ambient and grouping factors; voltage-drop limit; parallel cables when one is not enough; PE size), **RCCB** (rating, 2P/4P, 30/100/300 mA, Type AC/A/F/B) and **isolator** (rating, poles, AC-21A/22A/23A duty). Motors also get contactor and overload hints.
- **Whole board:** connected and maximum-demand kW, kVA, power factor (and kVAr to reach 0.95), phase currents and neutral current (single-phase loads are balanced across L1/L2/L3 automatically or set by you), with spare capacity and diversity → **main breaker, main isolator, main RCCB / RCD relay and main cable**.
- **Design basis:** supply, voltages, default Cu or Al (each load can override), insulation, installation method, ambient, grouped circuits, voltage-drop limits, fault level, spare capacity, diversity, default RCCB type.
- **Import from schematic** reads motors, VFDs, soft starters, heaters, lamps, fans and power supplies from your drawing. **Insert as sheets in drawing** adds pages *LC 1* (basis + main incomer) and *LC 2…* (load schedule) that are plotted to PDF; regenerate to replace them. **Download CSV** exports the schedule. Everything is saved in the project file.
- Cable ratings: IEC 60364-5-52 simplified table C.52.1 with temperature (B.52.14) and grouping (C.52.3) factors; aluminium from 16 mm²; breaker rule Ib ≤ In ≤ Iz (MCCB / ACB use the adjustable setting Ir). This is a preliminary selection – check your local code (SS 638 / BS 7671 / NEC / IS 732), maker data, short-circuit withstand and discrimination.

## v8.52 – professional site + Footer table + click-to-locate faults + Panel design (GA)
- **Panel design (GA drawings)** (Output tab → *Panel layout (GA)*, or type `GA`): builds EPLAN-style general-arrangement drawings from the schematic – **GA 1** mounting plate (enclosure, plate, DIN rails, wiring ducts, devices to scale, item balloons, overall and rail-pitch dimensions), **GA 2** door (cut-outs for pushbuttons, lamps, meters, HMI, fan) and **GA 3+** parts list (plate, door and field devices with brand/model from the Material fields). Enclosure is chosen automatically (smallest standard size with 12 % spare) or picked by you; paper and scale are chosen to fit. Everything is normal editable shapes and is plotted to PDF like any other sheet. Regenerating replaces the old GA pages. Device sizes are typical catalogue sizes – adjust the drawing if your product differs.
- **Click a fault or warning** in Simulation Results (or any result row): the editor switches to that sheet, selects the part, centres it and pulses a red box around it for 5 seconds. Messages that belong to the whole circuit (e.g. “No power supply”) are not clickable.
- **Footer table** (Home → Annotation → *Footer table*, or type `FOOTER`): an editable title-block table that is on every sheet. Type in the cells in the right-hand panel (or double-click a cell); add / remove rows and columns; set column widths, row height, text size, colours. Cells accept `{page}` `{pages}` `{title}` `{project}` `{dwgno}` `{rev}` `{date}`, so each sheet shows its own number and title. It is plotted in the PDF and kept in the project file.
- New landing page (`index.html`); the editor moved to `app.html` (manifest and service worker updated).
- Ribbon icons are now SVG instead of text symbols; the ⋯ menu has an *About ElectroSim* link.

## v8.51 – AutoCAD-style drawing + Create Block (your own components)

**Drawing works like AutoCAD now (click – move – click, no holding the mouse)**
- **Line**: click the start point, move the mouse (the line follows it smoothly), click the next point. Keep clicking to continue the chain. **Enter** or **right-click** = finish, **Backspace** or **Ctrl+Z** = undo the last segment, **Esc** = cancel.
- **Circle**: click the centre, move, click again for the radius. **Rectangle**, **Dimension** and **Arrow**: click the first point, move, click the second point.
- A live read-out next to the pointer shows the length and angle (or radius / size) while you draw.
- **Object snap (F3, OSNAP button)**: the pointer jumps to end points, middle points, centres, quadrants and component terminals of what is already drawn, with a green marker. Hold **Alt** for free movement (no snapping). Ortho (F8) and Snap (F9) work as before.
- Dragging still works too (press, drag, release), for touch screens and for people who prefer it.

**Create Block (Home tab and Insert tab, or type `B`)**
1. Draw your symbol with Line / Circle / Rectangle / Text.
2. **Create Block** – click the objects, or click two corners (left→right = objects fully inside, right→left = objects touching the window). **A** = everything on the sheet. **Enter**.
3. Click every point where a wire must connect (terminals). They snap to the wire grid and to line ends. **Enter**. (No terminals = drawing-only block.)
4. Give it a name, a label prefix and terminal names.
5. The block appears at the top of the library under **My Blocks** (and in the command line). Place it as often as you like: drag, rotate, resize, wire its terminals, label, parts list, PDF plot.
- Blocks are saved inside the project file and also kept in this browser, so they are available in every new project.
- Select a placed block: **Explode** turns it back into plain lines, **Delete block from library** removes the definition.
- A custom block is a symbol (drawn, wired, listed), not a simulated device.

## v8.50 – terminal looks like the EPLAN strip
The round terminal (`trm`) is drawn like your picture: one blue stem with a small round contact on it, the number small at the lower right, the strip name (X1) in blue on the left. Each terminal is one part; wires connect to the **top end** and to the **bottom end** of the stem (both are the same point).

## v8.49 – arrow link like EPLAN + round numbered terminal
- **Net / Page Link** is a small **filled arrow** on the wire end with the **name** next to it and, in green, **where the other end is** (e.g. `/ p.2 C4`) – like `-L1 / 2.1` in an EPLAN drawing. The arrow takes the colour of the default wire; Rotate turns it. If no other link has the name, the orange warning is shown under it as before. Code: `js/registry.js` (`nl`), `js/xref.js`.
- **New part: Terminal (round, numbered)** (Connection, `trm`): a small round terminal with a stem on both ends, the **number** beside it and the **strip name** (X1) in blue. Properties: strip name, number, show / hide strip name. The number counts up by itself for the same strip name. Both stems are the same electrical point.

## v8.47 – easy Help for every component
`js/easyall.js`: every part's Help page starts with *How it works in very simple words* and has *one card per terminal* (what it is, what it does, connect it to, wire colour), *Key words* and *If it does not work*. Built from each part's own terminals and wiring recipe; missing terminal meanings (PLC / remote I/O channels, multimeter sockets, tower light, level probes, valve limit switches, CT / PT, stepper driver …) were added.

## v8.46 – separate Help pages for the Simple and the Programmable VFD
`js/vfdhelp.js` has one Help page per drive type, both with the extra easy sections from `js/vfdeasy.js` (*How it works*, one card per terminal, *Key words*, *If it does not work*).

## v8.45 – VFD phase 1 and 2a: choose Simple or Programmable drive + VFD programming page
Code: `js/vfdprog.js`, small changes in `js/vfd2.js`, `js/app.js`, `css/ide.css`.
- **Drive chooser:** placing a Frequency Drive (VFD) asks *Simple drive* or *Programmable drive (Siemens-style)*. Change it any time in Properties → **Drive type** (switching to Simple deletes wires on terminals that disappear).
- **Simple drive:** L1 L2 L3 / U V W / PE, **RUN (DI1), REV (DI2), COM, +24V, AI1, +10V**. Speed from the keypad or AI1; min / max, ramps, stop mode, V/f boost, motor data (19 settings).
- **VFD programming page** (Properties → *Open programming page*): full screen, parameter groups, **search by P-number or name**, table with Siemens P-number, name, value, unit and factory value, changed-from-factory filter, help line, and a **keypad** with live Hz, A, V, rpm, status, fault and **fault history**.
- **Connection macros** (keypad, 2-wire + analog, fixed speeds, 3-wire push buttons, MOP, PID) and a **Quick commissioning** wizard.
- **Plan – phase 2b (still to do):** motor data identification and vector control (SLVC), DC / compound braking, flying restart, energy saving, PID sleep / wake, Modbus / USS settings, parameter trace, access levels, parameter copy.

## v8.44 – programmable VFD (Siemens-style)

**Frequency Drive (VFD)** (Motors & Drives, label `U`) – code: `js/vfd2.js` (part and logic), `js/vfdhelp.js` (Help page), example: `examples/vfd_programmable.json`
- **Terminals:** L1 L2 L3 / U V W / PE as before, plus **DI1–DI6**, **AI1, AI2**, **AO1, AO2**, **DO1, DO2** (24 V transistor outputs), **K1 and K2 changeover relays**, **+10V** and **+24V** supplies, **COM / AGND**. Old projects still load (terminals 0–10 keep their numbers; RUN / REV are now DI1 / DI2).
- **Relays:** K1 = fault relay (default), K2 = timer relay (Drive running, 2 s on-delay / 5 s off-delay). Every relay and DO has a function, on-delay, off-delay and Normal / Inverted logic.
- **Programmable inputs:** run fwd / rev, reverse, jog, fault reset, external fault, coast stop (OFF2), quick stop (OFF3), 3 preset-speed bits, MOP up / down, 3-wire stop. 2-wire or 3-wire terminal control.
- **Analog:** AI types 0-10 V, 2-10 V, 0-20 mA, 4-20 mA with scaling and signal-loss trip; AO functions (frequency, setpoint, current, speed, voltage, power, DC link) with type and scaling.
- **Parameters (about 85, shown in 10 groups, with the Siemens P-numbers):** command / setpoint source, min / max, ramps, OFF3, ramp rounding, skip frequency, reverse inhibit, 7 fixed frequencies, MOP, jog, PID controller, motor I²t, mains under / over voltage, phase loss, automatic restart, start inhibit, factory reset.
- **Faults:** F0001 overcurrent, F0002 / F0003 supply voltage, F0011 motor I²t, F0020 phase missing, F0035 restart attempts used up, F0080 analog signal lost, F0085 external fault. Reset with the RST key on the drive, a DI, or Properties.
- **Help page** (Properties → Help): wiring diagram, a table of every terminal (data, function, how to wire it), 11 step-by-step wiring examples, all input / output functions, every parameter, fault list.

## v8.43 – raw temperature sensors: RTD and thermocouple
Two new parts in *Sensors* (code `js/sensors.js`). They are the bare sensing elements – no electronics – so you read them with a **multimeter** (Ω or mV). Type the temperature in Properties (°C / °F / K) or use the −10 −1 +1 +10 buttons, also while running.
- **RTD (Pt100 / Pt500 / Pt1000, label `RT`):** resistance follows IEC 60751 (Pt100 = 100.00 Ω at 0 °C, 138.51 Ω at 100 °C, 80.31 Ω at −50 °C). **2-, 3- or 4-wire** connection (R, R′ = the red wires, W, W′ = the white wires; changing the wiring deletes wires on terminals that disappear). Faults: open element, short. Warns about self-heating above 2 mA and outside −200 … 850 °C.
- **Thermocouple (types K J T E N R S B, label `TC`):** a millivolt source, voltage = E(hot junction) − E(cold junction), interpolated from the standard ITS-90 tables (K at 100 °C = 4.096 mV, at 1000 °C = 41.276 mV). Set the **cold junction temperature** (0 °C as in the tables, or e.g. 25 °C) to see the error an instrument must compensate. Fault: open (burnout). Warns outside the type's range. Properties shows the wire colours of the type.
- Both have a Help page with wiring notes. Tip: a PLC 0-10 V / 4-20 mA input cannot read these raw signals – use the *Temperature transmitter* for that.

## v8.42 – wire numbers show / hide button + Remote I/O (expansion) module
**Wire numbers: one-click show / hide** – code: `js/wnum.js`
- **View → Wire numbers → Show / hide** (stays highlighted while the numbers are shown), **⋯ → Show / hide wire numbers**, or type `WN` in the command line. Same switch as *Show wire numbers on the sheet* in Properties. Hiding keeps every number (also the ones you typed); the PDF follows the switch.

**Remote I/O module** (Automation, label `RIO`) – code: `js/rio.js`, example: `examples/remote_io_expansion.json`
- A field I/O station that adds inputs and outputs to a PLC. Channels: **DI, DO (relay contact to 1L), AI, AO** – same presets and counts as the PLC (Properties). It has its own **L+ / M** 24 V supply.
- **Link:** *Master PLC* (name, or Auto = first PLC) and *Node number* 1–4 in Properties. No bus wires are drawn.
- **Addresses in the PLC program:** node *k* → DI `I(2k).0…`, DO `Q(2k).0…`, AI `AI(8k)…`, AO `AO(4k)…` (node 1: `I2.0-I3.7`, `Q2.0-Q3.7`, `AI8-15`, `AO4-7`). They appear in the ladder editor drop-downs, tag names, watch / force bar and the HMI.
- **Behaviour:** ONLINE only while the module has power and the master PLC is powered and in RUN; otherwise inputs read 0 and outputs are off. Warnings for a missing master, duplicate node numbers, a PLC program that does not use the module, 4-20 mA wire break / loop overload. Includes a Help page with a wiring diagram.
- Saved in the project file like any part. The PLC code only gained three small hooks (`rioAdrs`, `rioPull`, `rioIO`).

## v8.41 – automatic wire numbers + brand / model / price in Material
**Wire numbers (like EPLAN connection numbers)** – code: `js/wnum.js`
- Every wire is numbered automatically and the number is drawn on the wire (also printed in the PDF). Wires that are the same electrical point – joined at a terminal, a wire end, a busbar, or through *Net / Page Link* parts with the same name – are one **net** and share one number.
- **Change a number:** double-click the wire (or its number), or select the wire, then type in **Properties → Wire number**. By default the number goes to every wire of that net (also wires you draw later); untick *Same number on all wires of this net* to change just that wire. **Auto number** gives the automatic number back; type `-` to hide a number. Typed numbers that are used on two different nets are shown in red and flagged in the panel.
- **Move a number:** drag it on the sheet (Properties → *Reset position* puts it back).
- **Numbering settings:** click an empty place on the sheet → Properties → *Wire numbers*: show / hide, prefix (e.g. `W`), start, step, text size, and the order (order drawn, or position on the sheet). Automatic numbers skip numbers you typed. *Clear all typed numbers* makes everything automatic again.
- Saved in the project file (`wn` settings, `wn` / `wg` / `wo` on wires). Old projects open with numbering on. The simulation is not affected.

**Material (parts list)** – in every component's Properties
- New fields **Brand**, **Model**, **Part no.** and **Unit price** (the old *Manufacturer* box is now *Brand*; existing data is kept). Set the **Currency** in Sheet setup (default `$`).
- The PDF parts list has new columns Brand · Model · Part no. · Unit price · Total, groups identical parts (same data and same price) and shows the **total cost**. Parts without a price are left out of the total (a note says so).
- New menu item **⋯ → Download parts list (CSV)** (opens in Excel / Google Sheets, with line totals and a grand total).

## v8.38 – wiring diagrams in every component's Help
- The ❓ **Help** button of every part now shows a **coloured wiring diagram** (red = +24 V, blue = 0 V / N, brown / black / grey = L1 / L2 / L3, green-yellow = earth, green = switched output, orange = signal) with the devices that go in between, a plain **“In one line”** summary and a numbered **“Wire it step by step”** list that is generated from the same data as the diagram, so they always agree.
- Terminal table now says what each terminal is **and** what to wire it to. CT and PT help also got a diagram.
- **New parts: Flow Switch, Vacuum Switch, Speed / Zero-speed Switch** (Switching) – changeover contact COM / NC / NO, set point with differential, type the process value while running; the speed switch can read a motor's speed by label (`js/procsw.js`).
- **New part: Stepper Motor + Driver** (Motors & Drives): V+ / V− supply, PUL step input, DIR direction, DIS release; step counter, shaft angle, stall warning (`js/stepper.js`).
- New file `js/wiring.js` (one recipe per part, shared drawing engine). Parts that already had illustrated help (transmitters, valves, pneumatic, e-valve, MFM) are unchanged.

## v8.37 – multi-pole relay and 2-pole relay
Two new parts in *Switching* (label `K`, code `js/relays.js`). Both have a coil **A1 / A2** (coil voltage and resistance in Properties), pull in at about 70 % of the coil voltage, drop out below 30 %, warn above 115 %, and are found by contacts that name their label (like the other relays).
- **Multi-pole Relay (3 or 4 changeover contacts):** each contact has **COM / NC / NO**. Choose *Number of changeover contacts* = 3 or 4 in Properties; going to 3 hides the 4th contact and deletes wires on it.
- **Relay 2-pole (2 contacts):** a plain relay with two separate contacts (**COM 1 – NO/NC 1**, **COM 2 – NO/NC 2**); set *Contact 1 type* and *Contact 2 type* to NO or NC independently.

## v8.36 – voltage monitoring relay (single phase)
New part **Voltage Monitoring Relay (1-ph, under / over voltage)** in *Protection* (label `KV`). Connect **L / N** to the voltage to watch (it is also the relay's supply); one changeover output **15 (common) / 16 (NC) / 18 (NO)**. Everything is set in Properties:
- **Monitoring mode:** Window (under + over) · Undervoltage · Overvoltage. **Thresholds** in % of the nominal voltage **Un**, plus a **hysteresis** (% of Un) so the relay does not chatter around a limit.
- **Trip delay** (a fault must last this long – short dips are ignored) and **restart delay** (voltage must be good this long; it also runs after power-up). The LED blinks while a delay runs.
- **Output relay:** *Energised when voltage OK* (fail-safe) or *Energised on fault* (alarm). **Fault memory:** *Auto reset* or *Latch* – a latched fault is cleared with **Reset** (Properties or the red button on the device) or by removing the supply.
- Below 20 % of Un the relay has no power and its output is always off. The device shows a bar with the allowed window and a needle for the measured voltage; the results table shows the state (OK / trips in x s / TRIPPED / NO SUPPLY) and a warning appears on a fault.
- Name a contact after the relay (e.g. `KV1`) to use its output anywhere; it also has the *Physical device / Drawing symbol* appearance and a Help page.
- Example: `examples/voltage_monitoring_relay.json` (motor protected by KV1, red fault lamp on the NC contact – change the supply voltage and watch it trip). Code: `js/vmr.js`.

## v8.35 – edit parameters right on the ladder
Every element in the ladder now carries its own controls: a **drop-down for the address** above it, a **tag-name box** below it, and (where it has one) the **compare operator / value, timer or counter preset, MOVE source / value** inside it. Change them in place – no need to use the Properties panel. Double-click a contact to switch NO / NC. Code: `js/plc.js`, `css/ide.css`.

## v8.34 – HMI editor is full screen too
The HMI designer (double-click an HMI panel) now opens full screen with the same engineering look as the PLC editor: dark title bar (Design / Simulate, Run, Stop, Close), docked *Screens / Widgets / Process symbols* list on the left, flat canvas, and a *Properties* inspector on the right. Light and dark mode. Code: `css/ide.css`.

## v8.33 – simpler PLC editor: components left, properties right, parallel rows anywhere
- **Components list on the left** (flat list with symbols and a search box), **Properties on the right** – click an element in the ladder and its address / type / value / name appear there, with *Parallel row* and *Delete* buttons. The project tree became tabs above the ladder: *Ladder*, *Tag table*, *Device configuration*, *Help*.
- **Second, third … row:** drag a contact onto the dashed *“drop a contact here for a parallel row”* strip under the contacts (as many rows as you like), or select a contact and press *Parallel row*. Every row now has drop targets at its start, after each contact and at its end, and drop targets are larger and easier to hit.
- Code: `js/plc.js`, `css/ide.css`.

## v8.32 – PLC programming window matches the engineering workbench
The PLC ladder editor (double-click a PLC) now uses the same look as the main window (`css/ide.css`): full-screen window with a dark title bar (status, green Run / red Stop, Close), flat toolbar, docked *Project tree* and *Instructions* panels with title bars, square flat networks with grey header bars, a docked *Properties* window and a dark-titled *Watch & force table*. The tag table, device configuration and help pages use the same grid / inspector styling. Light and dark mode both work.

## v8.31 – engineering-workbench look (like industrial PLC / automation software)
The interface was restyled (`css/ide.css`, replaces the v8.30 `solid.css`) to look like professional PLC engineering software instead of a web app: flat square controls, dark title / menu bar with the Run / Stop controls and a status indicator, light toolbar with grouped tools, **docked windows with title bars** (*Component library*, *Properties*), a **tree + list component library** with small thumbnails, an **inspector-style Properties table** (name left, value right), workbook-style sheet tabs, and a **Simulation results diagnostics window** with a grid table and coloured message bars. Segoe UI typography, no gradients, pills, emoji or rounded corners. Light and dark (follows the system) and phone layouts keep working.

## v8.30 – solid UI, movable labels, single-phase motor
- **Solid look** (`css/solid.css`, loaded after `style.css`): firmer panels with clear borders and depth, stronger buttons, round search box, card-style library, framed section headings in Properties, striped results table, solid Run / Stop buttons, thin scroll bars. The command bar no longer covers the status bar and the Help button no longer covers the part name.
- **Move component text:** drag a part's label (R1, Q1, M1 …) anywhere on the sheet – a dashed box shows the grab area. **Double-click the label** to put it back. The position is saved with the project and applies to prints / PDF too (`c.lo` = offset).
- **Single-phase motor** (Motors & Drives → *Motor 1-phase (L N PE)*, `js/motor1.js`): capacitor run / capacitor start / split-phase, 230 V 50 Hz defaults. Draws 3–6× current until ~75 % speed, then the running current; spins up and coasts down; CW / CCW; warns about low voltage (cannot start below 80 %), overvoltage and a jammed rotor. Has the Physical look (capacitor can on the terminal box) and a Help page.

## File menu: Open / Save / Save As (v8.29)
A blue **💾 File** button sits in the top-right corner of the top bar: **Open…** (Ctrl+O), **Save** (Ctrl+S) and **Save As…** (Ctrl+Shift+S). In Chrome / Edge, *Save* writes back into the same file you opened or saved, and *Save As* lets you choose a new name and folder. In other browsers (Firefox, Safari, phones) *Save* and *Save As* download a `.json` file and *Open* uses the normal file chooser. The current file name is shown in the menu and the browser tab title. The old *⋯* menu entries (save in browser, download, open) still work. Code: `js/file.js`.

## Physical look for every part (v8.28)
Every part now has **Properties → Appearance: Physical device (for simulation) / Drawing symbol (for submission)** – not only the ones from v8.26. Push buttons (green / red, pressed in when held), E-stop (latches), toggle / selector / key switches, MCB / MCCB / RCD / isolators (lever up, down or tripped), fuse (blown), overload relays, contactors and relays (armature moves), coils, contact blocks, proximity / limit / float / pressure / thermostat switches, lamps, pilot lamps, buzzer, beacon, heater, solenoid valve, resistors (colour bands), capacitor, choke, diode, LED, motors (fan turns), potentiometer, transformer, voltmeter / ammeter (needle), terminals, power supplies and battery. The picture follows the live state while the simulation runs.
- New parts keep the **drawing symbol** by default, so existing drawings look the same until you choose *Physical* (per part, or *View → Device look → all physical*). PDF *Draw devices as drawing symbols* still applies.
- Multimeter, signal injector, PLC, CT and PT (already realistic) can now also be shown as a symbol.
- Code: `js/phys.js` (add a part: `ph.<type> = (c,o,cl) => svg`).

## Free wire ends (v8.27)
A wire no longer has to finish on a terminal: while drawing, **double-click** (or press **Enter**) where it should stop. The end is a small *Wire end* part. While only that one wire is attached, the end is a **magenta ring with a cross** and the wire is drawn **magenta dashed**, so loose ends are easy to find (the results table lists them too). Draw a wire from the ring to a terminal and it becomes a normal junction dot. Code: `js/wend.js`.

## Physical device or drawing symbol (v8.26)
Parts that are drawn like the real device (level rods, level controller, phase relay, pressure switches, all transmitters, actuated valves and valve panel, tower light, panel fan, UPS, VFD, soft starter, fused terminal, alternating relay, MFM, CDA) have an **Appearance** setting in Properties: **Physical device (for simulation)** or **Drawing symbol (for submission)** – a clean box (or instrument bubble for transmitters) with a code, caption and terminal names. Terminals, wires and simulation do not change.
- **Whole drawing:** *View → Device look* cycles *as set in each part → all symbols → all physical*; the choice is saved with the project.
- **PDF:** *Plot → Draw devices as drawing symbols* (on by default) prints every such device as a symbol without changing your screen.
- Code: `js/view.js` (add a part's code to `VWC` to give it the option).

## Cross-references between pages and the alternating relay (v8.25)
- **Call a terminal from anywhere:** place a **Net / Page Link** (*Connection*) on the wire end and give it a name; place another link with the **same name** on any page – they are one wire. Under each link the drawing shows **where the other ends are** (e.g. `▸ p.2 C4`; orange `✖` = no other end yet). In Properties, **Call an existing link name** lists the names from every page.
- **Contacts show their coil:** a contact (NO / NC / changeover / 3-pole) shows the **page and zone of its coil**; a coil shows where all its contacts are (`→ p.2 B4, p.3 A1`). Pick a coil from any page in the contact's Properties (**Call a coil / relay from any page**).
- **Go there:** select the contact / link / coil and press **↗ Go** (bottom bar or Properties), or **double-click** it. The sheet switches page, centres on the part and flashes it. **↩ Back** returns. A coil with several contacts cycles through them.
- **Alternating relay** (*Switching*): duty / standby pumps. Supply on A1 / A2, start signal on **S**, pump 1 contact **15–18**, pump 2 contact **25–28**. Each new start closes the other output. Modes: Alternate, Pump 1 only, Pump 2 only, Both. Code: `js/xref.js`, `js/alt.js`.

## UPS (v8.24)
**UPS (uninterruptible power supply)** in *Power*: single-phase, one component, everything chosen in Properties – **type** (Online / Line-interactive / Offline), **rating (VA)**, **power factor** (W = VA × PF), **input / output voltage**, and **battery backup time at full load** (battery V / Wh / Ah are worked out). Terminals L / N in, L / N out, PE.
- Cut the mains (open a switch or breaker in front of it) and it runs the load from the battery, drains it (lighter load = longer), and switches the output off when empty; when the mains returns it recharges. *Battery time speed* (1× – 300×) speeds this up.
- Overload shuts the output off after a delay (105 % → 120 s, 125 % → 30 s, 150 % → 1 s); an output short circuit shuts it off at once. Switch the UPS off and on again to restart. Click it while running to switch it.
- Example: `examples/ups_backup.json`. Code: `js/ups.js`.

## Help for every component and for PLC programming (v8.22)
- Select any component → **❓ Help** (Properties header, and the bar under the sheet). Every one of the 121 components now has a page: what it is and how it works, a table of its terminals, how to connect it, what the simulator does, and a table of its settings. Parts that already had illustrated help (valves, transmitters, MFM / CT / PT …) keep it.
- PLC editor → **❓ Help** (header or project tree): how a PLC scans, addresses (I, Q, M, T, C, AI, AO), step-by-step programming with drag and drop, an instruction reference, wiring and running, and troubleshooting. Five worked examples (start / stop seal-in, TON, CTU, SET / RESET, analog compare) are drawn as ladders and can be inserted into your program with one click.
- Code: `js/help.js` (component help – add a line to `HLP` for a new part), `js/plhelp.js` (PLC help and examples).

## PLC ladder editor – TIA Portal style (v8.21)
Double-click a PLC. The editor now has the layout of Siemens TIA Portal:
- **Project tree (left)** – *Main [OB1]* (the ladder), *Tag table* (name every I / Q / M / T / C / AI / AO address, filter, see where it is used) and *Device configuration* (DI / DO / AI / AO counts, signal types, RUN / STOP).
- **Instructions task card (right)** – *Bit logic* (NO, NC, coil, SET, RESET), *Comparator* (== <> > >= < <=), *Timers* (TON), *Counters* (CTU), *Move*. **Drag** an instruction onto the network: the free places light up, the nearest one turns solid, release to drop. Drop on the bottom edge of a contact to make a **parallel branch**. Click an instruction to add it after the selected element instead.
- **Networks (centre)** – numbered *Network n* with title and comment, collapse arrow, move / duplicate / delete, and **＋ Insert network** between networks. **Drag a placed element** to move it (also to another network). TON / CTU are drawn as boxes with IN / Q pins and a live value.
- **Properties (bottom)**, **Watch & force table** (click an input to force it, drag an analog input), **Undo / Redo** (Ctrl+Z / Ctrl+Y), zoom 75 – 150 %. On a phone the panes stack and the instructions become a scrolling strip.

## Install as an app (v8.21)
Settings (⚙) or ⋯ → **⬇ Download app** installs ElectroSim as a stand-alone window (no address bar, works offline). It must be opened from `https://` or `localhost`, not from a file.

## Busbars and HMI (v8.15)
- **Busbars** (*Connection*): **Earth bar (PE)**, **Neutral bar (N)**, **Phase bar (L1/L2/L3)**, **+24 V DC bar**, **0 V DC bar**. All terminals of a bar are one electrical point, on a top and a bottom row. Choose 4 – 16 terminals per row in Properties (wires on removed terminals are deleted); the phase bar has an L1 / L2 / L3 choice that sets its colour. Wire every PE to the earth bar, every neutral to the neutral bar, and so on.
- **HMI panel** (*Automation*) – a touch-screen linked to a PLC **by address, no wires**. Since v8.18 it has its own **HMI Designer**, with several screens and alarms since v8.19 (see below); the part on the sheet shows a live miniature of the screen.

## HMI Designer (v8.18 phase 1, v8.19 phase 2, v8.20 phase 3)
Double-click an HMI panel on the sheet (or select it and press **✎ Open HMI designer** in Properties). Like the PLC ladder editor it opens in its own window:
- **Screens (left, top)** – the list of screens of the panel. **＋ Screen** adds one, **＋ Alarms** adds an *alarm screen*, **⧉** duplicates, **▲ ▼** reorder, **🗑** deletes (a panel keeps at least one screen). **Double-click** a name to rename it. The first screen (⌂) is the **home** screen. Panel size is the same for all screens; the background is per screen.
- **Palette (left)** – *Push button, Toggle switch, Lamp, Numeric display, Bar graph, Text, Panel, Navigation*, and since v8.20 the *Process symbols* and *Trend*. Click one to add it, then drag it into place.
- **Canvas (centre)** – the screen with grid and snap. Click to select, drag to move, drag the blue corner handle to resize, arrow keys nudge (Shift = 8 px), **Del** deletes, **Ctrl+D** duplicates. Zoom with − / + / Fit. Widget positions are measured from the top of the area *under the header bar*.
- **Inspector (right)** – for a widget: PLC address (with a list of the addresses and tag names of the linked PLC), text, colour, font size, decimals, bar min / max, position and size, front / back. With nothing selected: screen name, panel size, background, linked PLC, grid options, **Header bar**, **Alarms** and a **Checks** list (missing PLC, unknown address, a write to a bit the HMI cannot write, a navigation button without a target, an alarm on a missing bit, alarms without an alarm screen).
- **Design / Simulate** – *Simulate* makes the screens work like the real panel (start the simulation with ▶ Run; the PLC must be powered and in RUN). Push button = bit is 1 while held; Toggle switch = stays on / off; Lamp, Numeric display and Bar graph read Q / M / I bits, AI / AO (%), timers (s) and counters. Navigation, the alarm banner and the alarm list also work in Simulate without ▶ Run (alarms of course need the PLC running).
- The HMI writes only **I and M bits**. Use an M bit and a contact of the same address in the ladder, e.g. START = M0.0, STOP = M0.1, lamp = Q0.0: **[NO M0.0 or NO Q0.0] – [NC M0.1] – (Q0.0)**.

### Phase 2 – screens, navigation, header, alarms (v8.19)
- **Navigation button** (palette *Navigation*): *Action* = **Go to screen** (choose the *Target screen*), **Back** (the previous screen, up to 20 steps) or **Home** (first screen in the list). On the sheet and in Simulate it works with a tap. Stop resets the panel to the home screen.
- **Header bar** – shown on every screen: title (default = the part label), the **current screen name**, **date and time**, and an accent colour. Switch it off or choose its parts in the inspector (*Header bar*).
- **Alarms** – define them in the inspector (*Alarms → ＋ Add alarm*): **PLC bit** (I, Q, M bit, timer or counter), **priority** and **text**. When the bit turns **on** the alarm is raised with its time. Priority colours: **Critical = red**, **Warning = amber**, **Info = blue**.
  - **Alarm screen** (**＋ Alarms**): header, an **ACTIVE** tab and a **HISTORY** tab, **ACK** per alarm, **ACK ALL** and ▲ ▼ page buttons. A new alarm screen comes with a **BACK** navigation button; the strip under the list is left free for your own buttons. In Design mode it shows sample rows so you can see the layout.
  - **Life of an alarm:** on → *ACTIVE* (flashes until acknowledged) → ACK → *ACKED* → when the bit goes off it moves to the **history** (ON, ACK and OFF times). If the bit goes off before it was acknowledged it stays in the active list as *CLEARED* until you press ACK. A bit that turns on again raises a new alarm. The history keeps the latest 200.
  - Alarm times are the computer clock. Alarms, history and the current screen are cleared when you press ■ Stop.
- **Alarm banner** – a strip at the bottom of **every screen** (except the alarm screen) showing the **newest** alarm with its time, priority colour, an **ACK** button and “+n more”; it flashes until acknowledged. **Tap the banner to open the alarm screen** (or to acknowledge it if the panel has no alarm screen). With no alarm it shows “No active alarms”. Switch it off in the inspector (*Alarms → Banner*).
- Panels saved with v8.18 open normally: they get the header and banner, and widgets are squeezed into the new content area if they were placed low on the screen. Panels saved with v8.15 – v8.17 are converted automatically (their 1 – 8 widgets become widgets on the first screen).
- Limits: alarm bits are read once per PLC scan (before the ladder), so an alarm shows one scan after the ladder sets the bit. Alarm text is fixed (no values inserted yet) – planned for phase 4 with the tag table.
- Roadmap: phase 4 tag table, numeric entry, PDF export of the screens.
- Code: runtime and drawing in `js/hmi.js`, designer in `js/hmid.js`, process graphics in `js/hmip.js` (header comments explain the data model and how to add a widget kind).

### Phase 3 – process graphics and animation (v8.20)
Example: `examples/hmi_process_graphics.json` (Menu ⋯ → *Open project file…*, press ▶ Run, then **START** on the HMI; the tank fills while the pump runs, the **FAULT** switch trips the pump).
- **Process symbols** (designer palette, *Process symbols*): **Tank** (level), **Pump**, **Valve**, **Motor**, **Fan**, **Pipe**, **Conveyor**, **Tower lamp**, **Gauge** and **Meter**. Pick the *Symbol* in the inspector at any time; size them by dragging the corner handle. The text under a symbol is its label.
  - **Tank, Gauge, Meter** show a *value*: AI / AO (%), a timer (s), a counter. *Min* / *Max* set the range. Tank fill, gauge needle and meter needle move smoothly.
  - **Pump, Motor, Fan, Conveyor** take a *Running bit* and an optional *Fault bit*: running = the widget colour, off = grey, fault = **red, flashing** and the symbol stops. Impellers, rotors and blades spin up and down; the conveyor belt and its boxes move. *Speed* is in deg/s (px/s for belt and pipe).
  - **Valve** takes an *Open bit* (or a position in AI / AO %, shown as a number) and an optional fault bit. **Pipe** takes a *Flow bit* (or an AI / AO flow): the fluid colour and moving dashes show the flow; *Flow direction* is left→right / top→bottom or reverse; make the pipe long and thin (width > height = horizontal, otherwise vertical).
  - **Tower lamp**: red, amber and green lamp bits, each *Steady*, *Flashing (slow)* or *Flashing (fast)*.
- **Animation rules (any widget)** – inspector → *Animation* → choose a type → **＋ Add**; give the rule a PLC address (bit, AI, AO, timer, counter). A rule is *on* when the bit is 1, a timer / counter is done / non-zero, or an analog value is above 0. Rules run in order and a later colour rule wins.
  - **Colour** – colour when ON / when OFF, e.g. rule 1: `Q0.0` ON = Green, OFF = Grey; rule 2: `M0.2` ON = Red, OFF = no change → green when running, red when faulted.
  - **Blinking** – slow (1 Hz) or fast (2 Hz) while ON. **Visibility** – show when ON or hide when ON.
  - **Fill level** – a coloured overlay fills the widget (up, down, left, right) between *Empty at* and *Full at*; **Rotation** – spins at a speed in deg/s while ON (an analog address gives a proportional speed; negative = reverse); **Movement** – the widget slides by X / Y px as the value goes from *At value* to *… to value* (a bit moves it fully or not at all).
- **Limits (colours)** – numeric display, bar graph, tank, gauge, meter and trend have *Low alarm*, *Low warning*, *High warning*, *High alarm*. The value turns **amber** at a warning limit and **red** at an alarm limit (value at or beyond it); *Blink at an alarm* is optional. Bars and tanks show limit marks, gauges and meters show coloured zones, the trend draws dashed limit lines. Limits are in the unit of the value (%, s, count).
- **Trend chart** (palette *Trend*): up to **4 pens** (any bit, AI, AO, timer or counter), *Time span* 10 s … 1 h, *Y min / Y max* (empty = automatic). One point every 0.1 s of simulation time, kept for the whole run (cleared by ■ Stop). On the real panel and in **Simulate**: **− / +** change the time scale, **pause** freezes the view (the recording goes on), and while paused **‹ ›** scroll back in time. Bits are drawn as on / off lines; the legend shows the live values and tag names.
- Design tab: symbols show sample values (a 62 % tank, a green lamp) and rules are not applied, so everything stays visible while editing; use **Simulate** + ▶ Run to see the animation. *Checks* now also report missing / unknown addresses in symbols, rules and pens, and limits in the wrong order.
- Limits of this phase: values are shown in the unit of the PLC value (no engineering-unit scaling yet – phase 4 with the tag table); trend history is not saved with the project.


## Wire drawing (v8.15) – click-to-place corners
- **Click a terminal** to start a wire. **Click anywhere on the sheet** to fix a corner there – the wire stays on a horizontal / vertical line from the previous point and snaps to the grid (a blue dot shows where the next corner will go). Keep clicking to add corners. The wire is **finished only when you click another terminal**.
- **Backspace** removes the last corner, **Esc** or **right-click** cancels the wire. Dragging on empty space still pans the sheet, and pinch-zoom no longer cancels a wire in progress.
- Clicking a terminal straight away (no corners) still gives the old automatic route, and drag-from-terminal-to-terminal still works.
- **Edit later:** select a wire to see a handle on every corner – **drag** a handle to move the corner, **double-click** it to remove it. Corners are saved with the project.

## What's new (v8.9) – one multi-function meter, type chosen in Properties
- The three separate meters in the *Instruments* library (direct, CT operated, CT + PT operated) were hard to tell apart, so there is now **one "Multi-function meter (MFM)"** component. Pick the **Meter type** in Properties: **Direct**, **CT operated (/5 A or /1 A)** or **CT + PT operated**.
- The type changes everything that should differ: terminal names (**IN / OUT** → **S1 / S2 (CT secondary)**, **V1…** → **(PT secondary)**), the properties shown (rated current; CT primary / secondary; PT primary / secondary), the symbol (grey / amber / green body, display title and a side tag with the rating or ratios), the Help diagram, the warnings and the parts list.
- Wires stay connected when you change the type (the terminal positions are the same).
- Projects saved with v8.8 (separate CT / CT + PT meters) are converted automatically when opened; the two example files were updated.
- **Tower Light (stack light)** (*Loads*): a signal tower with **1 to 5 lamps (red, amber, green, blue, white)** and an optional **buzzer**, one **COM** terminal. Set the *Number of lamps* and *Buzzer* in Properties: only the terminals in use are shown (**R, A, G, B, W, BZ**, listed top to bottom like the real tower) and wires stay connected when you change them. Each lamp lights with its own power (rated voltage and power per lamp are set in Properties), so you can drive each colour from a contactor, relay contact or PLC output. Warns on overvoltage.
- **Fused Terminal (blown-fuse LED)** (*Protection*): a DIN-rail fuse terminal block. Supply on **1**, load on **2**. It blows above its rating like the normal fuse (**Replace fuse** in Properties) and a **red LED** lights when the fuse is blown and there is voltage across it, as on the real terminal. Set the *Fuse rating* and the *LED rated voltage*.
- **Panel Exhaust Fan** (*Motors & Drives*): an axial cooling / exhaust fan for a control panel, AC (230 V) or DC (24 V), 80 to 172 mm. The blades spin up and down with the power it gets, the speed and air flow follow the voltage (an undervoltage warning appears when it runs slow), and an overvoltage warns. Put a **Thermostat** in series to start it only when the panel is hot.
- **Pressure Switch – mechanical, 1 set point** and **Pressure Switch – mechanical, 2 set points** (*Valves & Actuators*) – **stand-alone since v8.15: no air line / AIR IN port any more.** You apply the pressure yourself: click the **−** / **+** buttons on the symbol (0.5 bar per click), use the buttons in Properties (0 bar, trigger, reset, ±0.5, ±1, max), or type a value in *Pressure applied*. Both have a changeover contact: **COM–NC** at rest, **COM–NO** when actuated, and a dial with the set-point marks.
  - **1 set point:** actuates when the pressure rises to the *Set point*, returns at *set point − Differential*.
  - **2 set points** (*ON point* / *OFF point*, e.g. 2 bar and 5 bar): *Action = Pump* – actuates when the pressure falls to the ON point (2 bar) and releases when it rises to the OFF point (5 bar), holding its state in between (compressor / pump control); *Action = Window* – actuated only from the ON point up to the OFF point. Warns if OFF ≤ ON.
  - Old sheets: the 1-set-point switch keeps the same part name; its old air wire is dropped when the sheet is opened. The older *Pressure Switch* in *Switching* is a plain manual switch and is unchanged.

## What's new (v8.8) – CT and PT: instrument transformers and the meters that use them
- **Current transformer (CT)** (*Instruments*): the line passes through **P1 → P2**; **S1 / S2** give the secondary current (**1 A or 5 A**, ratio set in Properties). The secondary keeps the phase angle, so kW / kVAr / PF stay correct. An **open secondary** raises a danger error with the voltage that would appear; primary above rating warns.
- **Voltage transformer (PT / VT)**: primary **A / N**, secondary **a / n** (default 6351 V → 63.5 V; rated burden in VA is checked). Keeps the voltage angle and frequency.
- **Multi-function meter, Meter type = CT operated / CT + PT operated** (v8.8 had these as separate parts; since v8.9 they are one part): the current terminals are the CT secondary inputs (**I1 / I2 / I3 S1 / S2**), and for the CT + PT type the voltage terminals take the PT secondaries. Set the **CT primary / secondary** (and **PT primary / secondary**) in the meter: it shows the *primary* values. A wrong ratio gives wrong readings, S1 / S2 swapped gives reverse power, and a secondary input above range warns. Single-phase wiring and the energy counters work as on the direct meter.
- Solver: current sources can now carry an imaginary part (`ii`), which is how a CT keeps the phase angle.
- Examples: `examples/mfm_ct_operated.json` (400 V, CT 100/5) and `examples/mfm_ct_pt_operated.json` (11 kV, CT 50/5, PT 6351/63.5 V).

## What's new (v8.7) – multi-function meter (MFM)
- **Multi-function meter** (*Instruments*): a panel power / energy meter. Wire each phase **through** it (supply → **I1 / I2 / I3 IN**, **OUT** → load) and tap **V1 / V2 / V3 / N** for the voltage. Measures **V (L-N and L-L), I, P (kW), Q (kVAr), S (kVA), power factor, frequency and energy (kWh import / export, kVArh, kVAh)**, per phase and total.
- Paged LCD on the symbol (click it, or ◀ ▶, to change page); the full readings table is in Properties. **Reset energy** button; *Energy clock speed* (3600 = one simulated second counts as one hour).
- Works on DC, single-phase and three-phase AC (3- or 4-wire; with N open it forms a virtual star point). *Wiring = Single-phase* hides the unused terminals. Warnings: current above the direct rating, current with no voltage reference, reverse power.
- Calculated from the solver's complex phasors: P = Re(V·I*), Q = Im(V·I*), S = √(P²+Q²), PF = P/S (`js/mfm.js`).

## What's new (v8.6) – electric modulating valve, bigger ZSO / ZSC, smaller valves
- **Electric modulating valve** (*Valves & Actuators*): a motorised control-valve actuator – **no air, no single / double acting**. Supply **L+ / N** (24 V) and a **Control type** you pick in Properties, as on real Belimo / Danfoss AME / Siemens / Honeywell actuators:
  - **Modulating 0-10 V** – terminal **Y** (signal +, common = N): 0 V = closed, 10 V = open, anything between = that position.
  - **Modulating 2-10 V** – 2 V = closed, 10 V = open; below 1 V = wire break (valve closes).
  - **Modulating 4-20 mA** – 4 mA = closed, 20 mA = open (500 Ω input); below 3.6 mA = wire break.
  - **Open / Close (2-position)** – terminals **OPEN** and **CLOSE**: 24 V on OPEN drives fully open, 24 V on CLOSE fully closed, neither = holds.
  - **3-point floating** – OPEN / CLOSE terminals: runs only while energised and stops when the voltage is removed (pulses give part-way positions).
  - Terminals change with the control type (CLOSE and X are hidden when not needed), so old wires survive a change.
- Also: *If the power fails* (stay / spring return closed / spring return open), *Stroke time*, *Position at start*, optional **position feedback X** (0-10 V or 2-10 V that follows the real position), **ZSO / ZSC** limit-switch dry contacts (NO or NC), supply-voltage and signal warnings, and a ❓ Help button with a wiring diagram per control type. Works with PLC analogue outputs (0-10 V and 4-20 mA) and the signal injector. Code: `js/evalve.js`.
- **ZSO / ZSC boxes are bigger** (larger boxes, text and indicator dot) on the air-operated valves and the new electric valve.
- **Smaller valves:** the air-operated valves (single / double acting + limit switches) and the electric valve are now placed at **80 %** size (change *Size (%)* or drag the handle as usual). Valves already on a saved sheet keep their size. New part option `sc0` = default size of a part.
- Example: `examples/electric_modulating_valve.json` (Menu ⋯ → *Open project file…*).

## What's new (v8.4) – compressed air: CDA source → solenoid valve panel → actuator, with limit-switch feedback
- **CDA source** (*Valves & Actuators*): clean dry air at a set pressure, one **AIR OUT** port. Click it while running (or set *Air supply = Off*) to switch the air off.
- **Air lines.** Air ports (blue-ringed terminals) connect **only to other air ports**; tap one, then the other. An air line is drawn **blue with small tick marks**; it is pale when there is no pressure and bright with moving dashes when pressurised. Wires between an air port and an electrical terminal are refused. Select an air line to see its pressure.
- **Solenoid valve panel** now has an **air inlet P** and an **air outlet A1…An** per valve. Air passes P → An only while the valve is open (coil energised, or manual override); a closed valve vents its outlet to 0 bar. Old projects load unchanged.
- **Air-operated valve – single acting** (spring return) and **double acting** (ports A = open, B = close): driven only by the air on their ports (min. pressure and stroke time are settings), with **ZSO (open) and ZSC (closed) limit switches** as dry contacts (NO or NC) for feedback to a lamp or PLC input.
- **Control mode** (Properties of both air-operated valves): *On / Off (air only)*, *Modulating 0-10 V* or *Modulating 4-20 mA*. In a modulating mode the terminals **SIG + / SIG −** appear and the valve goes to the position given by the signal (0 V / 4 mA = closed, 10 V / 20 mA = open); the air port is then the positioner supply. 4-20 mA below 3.6 mA is a wire break (valve to 0 %). Works with the PLC analogue outputs and the signal injector.
- The air network is solved separately from the electrical network (`airSolve()` in `js/pneumatic.js`, called from `step()`). Results table shows air pressure; warnings for no air at P, low pressure, air on both sides of a double-acting piston.
- Example: `examples/cda_sov_actuator.json` (Menu ⋯ → *Open project file…*).
- The older all-in-one valves (*Actuated valve – single / double acting*, with their own pilot coil) are unchanged.

## What's new (v8) – configurable PLC I/O + friendlier ladder editor
- **Choose the I/O of the PLC.** Select the PLC and set **Digital inputs (0–16), Digital outputs (0–16), Analog inputs (0–8), Analog outputs (0–4)** in Properties – or pick a preset (8/8, 8/8 + 2 AI/1 AO, 16/16, 16/16 + 4 AI/2 AO, 4/4 micro). The symbol grows / shrinks and only the fitted terminals appear (`I0.0…I1.7`, `Q0.0…Q1.7`, `AI0…AI7`, `AO0…AO3`). Wires on terminals that disappear are removed (Undo brings them back). Old v7 projects load unchanged (8 DI / 8 DO).
- **Analog I/O is simulated.** AI and AO can each be **0–10 V** or **4–20 mA** (set in Properties). AI uses a 100 kΩ input (V) or 250 Ω shunt (mA); AO is a voltage source or a current source with 12 V compliance. Values are handled as 0–100 % of the span. Warnings: 4–20 mA wire break (< 3.6 mA), AO cannot drive its loop. Works with the Signal Injector, Potentiometer, level parts etc.
- **New ladder instructions:** **Compare** (`AI0 > 60`, also for timer seconds and counter values; operators > >= = <= < <>) and **MOVE → AO** (constant or copy of an AI).
- **Ladder editor, friendlier:** a *PLC setup* bar (change DI / DO / AI / AO counts, signal types and RUN / STOP without leaving the editor), **names / tags** for any address (shown on the rung, in the address lists and on the I/O strip), address lists that only offer fitted channels (and mark missing ones “not fitted”), **drag-to-force sliders for analog inputs**, live analog values in V / mA, **duplicate rung**, keyboard shortcuts (C NO · N NC · A compare · B branch · O OUT · S SET · R RST · T TON · U CTU · M MOVE · Del · Ctrl+D · +).
- **On the sheet:** clickable **RUN / STOP badge** on the PLC symbol, live LEDs for analog channels, an I/O map and wiring help in Properties, and a warning if the program uses an address the PLC does not have.
- **Transmitters (new library group, 21 parts):** pressure, differential pressure, temperature (RTD/TC), level, flow, weight / load cell, humidity, pH, conductivity, dissolved oxygen, turbidity, vibration, gas, speed, position, torque / force, density, current, voltage and power transducers, plus a *Universal* one with your own unit text. Enter the **process value** (any number, negative too), range low / high and the engineering unit in Properties – or use the 0-100 % / ± buttons, or the − / + buttons on the symbol while running. Output: **4-20 mA 2-wire loop powered** (needs ≥ 10 V, saturates at 3.8–20.5 mA) or **0-10 V 3-wire**; *Simulate sensor fault* gives burnout low / high so you can test the PLC's wire-break alarms. New file `js/transmitters.js` (add a row to `TXD` for another type).
- **Transmitter wiring selector + Help:** every transmitter now has *Transmitter type (wires)* in Properties – **2-wire** (loop powered 4-20 mA), **3-wire** (+ / − / OUT, 4-20 mA sourcing or 0-10 V) or **4-wire** (V+ / V− supply and isolated S+ / S− output). Terminals change with the type. A **❓ Help** button in Properties explains how the sensor works, scaling, wiring diagrams, and troubleshooting. Old projects are converted automatically.
- **Valves & Actuators (new library group, 3 parts):** **Solenoid valve panel** with a terminal block (COM + Y1…Y8, 1-8 valves, normally closed / normally open, click a valve for manual override), **Actuated valve – single acting** (spring return, fail-closed / fail-open, one solenoid pilot A1 / A2) and **Actuated valve – double acting** (5/2 double solenoid, OPEN / CLOSE / COM, holds its last position). Each valve shows **OPEN (green) / CLOSED (red) / travelling (amber)** on the symbol, in the results table and in Properties; stroke time and air-supply failure are simulated. Every part has a ❓ Help button with a wiring diagram. Code: `js/valves.js`.
- Under the hood: parts may now define `dyn(c)` (per-instance terminals / size) and `chg(c,key)` (reaction to a changed property); see `dd()` in `draw.js` and the PLC in `plc.js`.

## v7 – PLC with ladder logic
- **PLC (Automation group)** is now simulated: 8 inputs **I0.0–I0.7** (24 V sinking), 8 relay outputs **Q0.0–Q0.7** with common **1L**, supply **L+ / M**, RUN / STOP mode in Properties. A small LED beside every I/O terminal shows its live state on the sheet (inputs yellow, outputs green; forced inputs have an orange ring).
- **Double-click the PLC** (or *Edit ladder logic* in Properties) to open the ladder editor: **NO / NC contacts, parallel branches, OUT / SET / RST coils, TON timer, CTU counter**, rung comments, add / move / delete rungs. Addresses: I, Q, M0.0–M1.7 (memory bits), T0–T7, C0–C7.
- Editor workflow: click a rung, press a contact button to add it (new elements go *after* the selected one), **Branch** wraps the selected contact in a parallel row (default address = the rung's output, so a seal-in is two clicks), click the left/right bar of a branch to select the whole branch. **Delete** key removes the selection.
- **Live view** while the simulation runs: energised wires / contacts turn green, timers and counters show their values, and the I/O strip shows every bit; click an input chip to *force* it for testing without wiring a switch.
- The program is saved with the project, copied by *Duplicate*, and stops (memory cleared) when the simulation stops or the PLC loses power. One scan per 20 ms tick.
- New file `js/plc.js`.

## v6
- **Multimeter (Fluke-style)** – click the dial (left half = back, right half = forward) or pick the function in Properties: **V AC, V DC, mV, Ω, Continuity (beep), Diode, Hz, mA, A**. Four jacks: A (10 A), mA, COM, VΩ. DC readings are signed (swap the leads and you get a minus), AC reads RMS, Ω / continuity / diode read the *dead* network like a real meter, current modes must be wired in series. Leads left in a current jack across a supply short it and blow the meter fuse (*Replace fuse* in Properties). Works even with no supply on the sheet for Ω / continuity / diode.
- **Signal Injector** – 0–10 V source, 4–20 mA source (24 V compliance) and 4–20 mA *simulate* (loop-powered, needs an external supply). MODE, − / + (0.1 steps) and 0 / 25 / 50 / 75 / 100 % buttons on the device and in Properties. 25 mA limit on the volt range. Acts as a supply, so it can run a circuit on its own.
- **Phase Failure / Sequence Relay** – monitors L1 L2 L3: phase loss, asymmetry, under / over-voltage, wrong sequence; trip delay; changeover output 15-16-18. Contacts (e.g. `cno` named KP1) can follow it.
- **Level Rods 3-rod / 5-rod** – tank with E + L/H (or E + LL/L/H/HH) rods; set the water level with the −5 % / +5 % buttons or in Properties.
- **Level Controller 3-rod / 5-rod** – fill / empty mode with hysteresis; 5-rod adds dry-run lock-out (LL) and a high-level alarm contact (HH → 25-28).
- New file `js/parts2.js`; parts can now define `sim`, `tk`, `st`, `msg`, `fin`, `clk`, `pp` hooks (see the header of that file).

## v5
- **Multimeter (DMM)** – yellow handheld symbol with LCD and dial; functions V, A (in series) and Ω (de-energised circuit). Reading also appears in the results table.
- **Fault Injector** – arm it across (or in series with) any part, pick *Short circuit / Open circuit / Leakage*, then click it while running (or tick *Fault ACTIVE*) to test breakers, fuses and overloads.
- New parts: Reactor / Choke, Braking Resistor, Beacon / Strobe, Key Switch.
- Professional CAD-style look: dark workspace with the sheet floating on it, refined ribbon, panels, tables and fields.

## v4
- **VFD is now simulated** – ramps up/down, V/f control (linear or quadratic) with torque boost, run from terminals (RUN / REV + COM, 24 V), keypad, or an **AI1 0–10 V speed pot** (new *Potentiometer* part). The drive's keypad display shows Hz, rpm, status, output A / V and the set frequency. Settings in Properties: motor current, rated speed, base / min / max frequency, accel & decel time, stop mode (ramp / coast), control mode, boost, overcurrent trip (with *Reset fault*).
- **Motor speed** – the 3-phase motor follows the drive frequency (or the mains) with slip, load torque (constant or fan/pump), direction from phase sequence and run-up / coast-down inertia. rpm is shown on the motor symbol and in the results table; current follows load and frequency.
- **3-pole contactor with coil** added.
- **AutoCAD-style**: Undo / Redo (Ctrl+Z, Ctrl+Y), *Dimension* and *Arrow / leader* tools, *Array* (rows × columns), *Scale*, status bar with cursor X/Y in mm and **GRID (F7) · SNAP (F9) · ORTHO (F8)**, plus matching command-line entries (`DIM`, `LE`, `U`, `AR`, `SC` …).
- Soft starter is still symbol-only (the PLC is simulated since v7).

## v3
- **Resize parts** – select a part and drag the round handle at its corner to make it bigger or smaller (40 %–400 %), or type *Size (%)* in Properties. Wires follow.
- **Command line (like AutoCAD)** – just start typing on the sheet: `L` suggests Line, `C` Circle / Copy, `T` Text, `RO` Rotate, `E` Erase, `PLOT`, `RUN`, or any component name (e.g. `lamp`). Up/Down to choose, Enter or click to run, Tab to complete, Esc to cancel. Enter on an empty line repeats the last command.
- **One top bar** – the separate title bar is gone. Tabs are on the left; Run / Pause / Stop, status, Sheet setup, Print, menu and Properties are small buttons on the right.
- **Dragging** – smaller terminal hit-zones (parts are easier to grab), no dead-zone before a part moves, wires stay smooth while moving.

## Earlier changes
- **Smooth dragging** – a part now follows the pointer exactly (no grid-jumping); on release it glides onto the nearest grid point so its terminals stay aligned with wires. Rendering was also lightened (static sheet cached, results table throttled while dragging).
- **Lamp colour** – Lamp and Pilot Lamp have a *Lamp colour* option in Properties (yellow, white, red, green, blue, orange, amber, violet); the glow follows the chosen colour.
- **AutoCAD-style ribbon** – tabs **Home · Insert · Annotate · View · Output** with panels: Draw (Line, Circle, Rectangle), Modify (Move, Rotate, Copy, Erase), Annotation (Text, Logo), Zoom, Palettes, Plot, Page setup.
- **Circle tool** – drag from the centre outwards; resize with the handles; set radius, colours, fill and line style in Properties.
- **Plot dialog** – *Print* / *Plot* asks for **paper size (A5, A4, A3, A2)** and **orientation (landscape / portrait)**, with a live preview, and whether to plot all sheets or the current one. Paper and orientation can also be set from the Output tab or Sheet setup.

## Earlier changes
- **Drag parts from the library** – press and drag a part (mouse, pen or finger); a ghost follows the pointer and a snapped preview shows exactly where it will land. Tap a part to drop it in the middle of the view instead. Placed parts can be dragged freely; arrow keys nudge the selection.
- **Draw your own title block** – no fixed title block any more. The tool strip on the sheet has **Select · Line · Box · Text · Logo**. Draw lines and boxes, type text (auto-fill tokens `{page} {pages} {title} {project} {dwgno} {rev} {date}`), add a logo and drag its corners to resize. Tick *Show on every page* to repeat it on all sheets and in the PDF. Hold Alt for free (un-snapped) placement; Shift or a near-straight drag keeps lines straight.
- **Wire colours** – after you connect two terminals the new wire is selected and the right panel asks for its colour (24 swatches incl. light colours, a custom picker, thickness, solid / dashed / dotted). With nothing selected the same controls set the colour of *new* wires. Wires can also be drawn by dragging from one terminal to another.
- **Hideable bottom bars** – the results table and the sheet tabs each have a ▾ button; a ▴ button on the sheet (and the ⋯ menu) brings them back.
- **3-phase supply redone** – L1 L2 L3 now sit in the same columns as 3-pole breakers, contactors and motors (wires drop straight down), N and PE to the right. Supply power is computed with complex power so line-to-line and mixed loads add up correctly. The 3-phase motor now honours Star / Delta.
- Multiple pages, PDF export (sheets + parts list), hideable library / properties panels and the touch UI are unchanged.

## Simulation notes
- AC is solved as steady-state RMS phasors; 3-phase sources are 0°/−120°/+120°, so line-to-line loads and phase loss work.
- Contacts follow the coil with the same label (any page). “Net / Page Link” parts with the same name are one node.
- The VFD, motor speed and potentiometer are simulated (see v4). Soft starter is symbol-only.

## Extending
Add a part to `D` in `js/registry.js`. Terminal coordinates should be multiples of 20.
Files: `evalve.js` (electric modulating valve) · `pneumatic.js` (CDA, air-operated valves) · `registry.js` (parts) · `parts2.js` (v6 instruments, relays, level parts) · `plc.js` (PLC part, scan engine, ladder editor) · `solver.js` (MNA engine) · `draw.js` (sheet, wires, drawn shapes) · `export.js` (PDF) · `app.js` (UI). PDF uses bundled jsPDF (MIT) in `js/vendor`.
