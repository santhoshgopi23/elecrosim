/* ElectroSim v8.29 – File menu (top right): Open…, Save, Save As…   Ctrl+O / Ctrl+S / Ctrl+Shift+S.
   Chrome / Edge (File System Access): Save writes back into the SAME file you opened or saved; Save As asks for a new name / place.
   Other browsers (Firefox, Safari, phones): Save and Save As download a .json file; Open uses the normal file chooser.
   The project format is unchanged (same as "Download project file"). Loaded after app.js. */
'use strict';
(()=>{
const Q=s=>document.querySelector(s),menu=Q('#fmenu'),btn=Q('#bFile');
let fh=null,name='';
const base=()=>(S.tb.dwgNo||S.tb.project||'electrosim').replace(/[^\w\-. ]+/g,'_').trim()||'electrosim';
const clean=n=>String(n||'').replace(/\.json$/i,'').replace(/[^\w\-. ]+/g,'_').trim();
const OPT={types:[{description:'ElectroSim project',accept:{'application/json':['.json']}}]};
const close=()=>menu.classList.remove('open');
const label=()=>{const n=fh?fh.name:name?name+'.json':'';Q('#fName').textContent=n;document.title=(n?n+' – ':'')+'ElectroSim – Electrical Simulator'};
function download(n){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(snapshot())],{type:'application/json'}));a.download=n+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
async function write(h){const w=await h.createWritable();await w.write(JSON.stringify(snapshot()));await w.close()}
async function saveAs(){close();
 if(window.showSaveFilePicker){try{const h=await showSaveFilePicker({suggestedName:(name||base())+'.json',...OPT});await write(h);fh=h;name=clean(h.name);label();toast('Saved as '+h.name)}catch(e){if(e.name!=='AbortError')toast('Save failed: '+e.message)}return}
 const n=clean(prompt('File name',name||base()));if(!n)return;name=n;download(n);label();toast('Downloaded '+n+'.json')}
async function save(){close();
 if(fh){try{await write(fh);toast('Saved '+fh.name)}catch(e){toast('Save failed – use Save As');fh=null}return}
 if(window.showSaveFilePicker)return saveAs();
 name=name||base();download(name);label();toast('Downloaded '+name+'.json')}
async function open(){close();
 if(window.showOpenFilePicker){try{const[h]=await showOpenFilePicker({...OPT,multiple:false});const t=await(await h.getFile()).text();loadData(JSON.parse(t));fh=h;name=clean(h.name);label();toast('Opened '+h.name)}
  catch(e){if(e.name!=='AbortError')toast('Not a valid project file')}return}
 Q('#fileIn').click()}
btn.onclick=e=>{e.stopPropagation();Q('#menu').classList.remove('open');menu.classList.toggle('open')};
addEventListener('click',e=>{if(!e.target.closest('#fmenu'))close()});
Q('#fOpen').onclick=open;Q('#fSave').onclick=save;Q('#fSaveAs').onclick=saveAs;
Q('#bMore').addEventListener('click',close);
addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey)||e.altKey)return;const k=e.key.toLowerCase();
 if(k==='s'){e.preventDefault();e.shiftKey?saveAs():save()}else if(k==='o'){e.preventDefault();open()}},true);
/* a file chosen through the fallback chooser: remember its name */
Q('#fileIn').addEventListener('change',e=>{const f=e.target.files&&e.target.files[0];if(f){fh=null;name=clean(f.name);label()}},true);
label();
})();
