// Reserved public review code; never a cloud credential. All other codes continue
// through the unchanged account handler. This module does not access save data.
export function installTestCodeEntry(doc,loc,moduleURL){
 const input=doc.getElementById('input'),button=doc.getElementById('load');
 if(!input||!button)return;
 const open=event=>{
  if(input.value.trim()!=='0000000000')return;
  event.preventDefault();event.stopImmediatePropagation();
  loc.assign(new URL('../four-powers-test/gameplay/?testAccount=0000000000',moduleURL).href);
 };
 doc.addEventListener('click',event=>{if(event.target===button||button.contains(event.target))open(event);},true);
 input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.isComposing)open(event);},true);
}
if(typeof document!=='undefined')installTestCodeEntry(document,location,import.meta.url);
