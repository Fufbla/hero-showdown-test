import {DEFAULT_LOOK,LOOK_OPTIONS,LOOK_RANGES,COLOR_FIELDS,sanitizeLook} from '../appearance.mjs';
import {drawHero} from '../hero-art.mjs';
import {previewHero,PREVIEW_POSES} from '../hero-rig.mjs';
import {PROFILE_KEY} from '../saves.mjs';
import {SAVE_KEY} from '../core.mjs';
const frame=document.getElementById('phone'),report=document.getElementById('report'),button=document.getElementById('test-creator');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const until=async fn=>{const end=Date.now()+12000;while(!fn()){if(Date.now()>end)throw Error('Timed out waiting for UI');await wait(35);}};
button.onclick=async()=>{
  button.disabled=true;document.getElementById('test').disabled=true;report.textContent='Running creator / save checks…\n';let passed=0;
  const check=(name,ok)=>{report.textContent+=`${ok?'PASS':'FAIL'} · ${name}\n`;if(!ok)throw Error(name);passed++;};
  const session=`creator-${Date.now()}`,prefix=`royale-test-${session}:`;
  const legacy=JSON.stringify({version:1,look:{...DEFAULT_LOOK,name:'Legacy Guardian',build:'strong',trim:'#5fcad3'},coins:87,level:4,xp:31,checkpoint:1,kills:8,species:['bottle','slime','crawler']});
  sessionStorage.setItem(prefix+SAVE_KEY,legacy);
  let d,w,el;
  const attach=async()=>{d=frame.contentDocument;w=frame.contentWindow;el=id=>d.getElementById(id);await until(()=>d.querySelectorAll('.hero-slot').length===3);};
  const reload=async()=>{await new Promise(resolve=>{frame.onload=resolve;frame.contentWindow.location.reload();});await attach();};
  const data=()=>JSON.parse(sessionStorage.getItem(prefix+PROFILE_KEY));
  const set=(id,value)=>{const node=el(id);if(node.type==='checkbox')node.checked=value;else node.value=value;node.dispatchEvent(new w.Event('input',{bubbles:true}));};
  const clickSlot=(index,action)=>d.querySelector(`[data-slot="${index}"] [data-action="${action}"]`).click();
  const inside=node=>{const r=node.getBoundingClientRect();return r.width>0&&r.height>0&&r.left>=-1&&r.right<=w.innerWidth+1&&r.top>=-1&&r.bottom<=w.innerHeight+1;};
  try{
    await new Promise(resolve=>{frame.onload=resolve;frame.src=`../?qa=1&touch=1&testSession=${session}`;});await attach();frame.focus();
    check('three-slot selection and legacy import',d.querySelectorAll('.hero-slot').length===3&&d.querySelector('[data-slot="0"]').textContent.includes('Legacy Guardian'));
    check('legacy progress and original backup preserved',data().slots[0].snapshot.coins===87&&data().slots[0].snapshot.level===4&&sessionStorage.getItem(prefix+SAVE_KEY)===legacy);
    clickSlot(1,'create');check('new hero creator opens',!el('creator').hidden);
    for(const invalid of['','  ','1234','Hero<script>','A'.repeat(23)]){set('name',invalid);el('begin').click();check(`invalid name rejected: ${invalid||'(empty)'}`,!el('creator').hidden&&!el('name-error').hidden);}
    set('name','Azure Beacon');
    const choices={name:'Azure Beacon',presentation:'female',age:'older',skin:'#a66e53',eyes:'#51c4e6',hair:'braids',hairColor:'#683b92',face:'angular',eyeShape:'wide',brows:'bold',nose:'broad',mouth:'full',facialHair:'stubble',build:'full',height:1.12,shoulders:1.2,muscle:1,torso:1.15,arms:.85,legs:1.15,suit:'#343e87',trim:'#d9ae69',emblem:'sun',emblemColor:'#ffd66b',capeColor:'#724b85',cape:true};
    for(const [key,value] of Object.entries(choices))set(key,value);
    check('live preview immediately reflects name',el('hero-preview').getAttribute('aria-label').includes('Azure Beacon'));
    el('view-back').click();check('back preview is selectable',el('view-back').getAttribute('aria-pressed')==='true'&&el('hero-preview').getAttribute('aria-label').startsWith('Back'));
    el('view-front').click();check('front preview is selectable',el('view-front').getAttribute('aria-pressed')==='true'&&el('hero-preview').getAttribute('aria-label').startsWith('Front'));
    for(const section of['identity','face','body','suit']){
      el(`tab-${section}`).click();check(`${section} panel visible`,!el(`panel-${section}`).hidden);
      for(const node of el(`panel-${section}`).querySelectorAll('input,select')){node.scrollIntoView({block:'nearest'});check(`${node.id} reachable without horizontal clipping`,inside(node));}
      check(`${section} actions remain visible`,inside(el('begin'))&&inside(el('cancel-look')));
    }
    check('no outer page overflow',d.documentElement.scrollWidth===w.innerWidth);
    el('begin').click();await until(()=>el('creator').hidden);el('pause').click();check('new hero enters gameplay',!el('pause-menu').hidden&&el('hero-name').textContent==='Azure Beacon');
    check('all chosen fields save without losing legacy slot',JSON.stringify(data().slots[1].snapshot.look)===JSON.stringify(sanitizeLook(choices))&&data().slots[0].snapshot.coins===87);
    el('return-camp').click();el('pause').click();el('edit-look').click();
    check('appearance survives checkpoint respawn',Object.entries(choices).every(([key,value])=>String(el(key).type==='checkbox'?el(key).checked:el(key).value)===String(value)));
    set('name','Unsaved Edit');el('cancel-look').click();el('close-tree').click();el('pause').click();el('choose-hero').click();
    check('cancel leaves saved identity unchanged',data().slots[1].snapshot.look.name==='Azure Beacon');
    // Canceling a new-slot creator must not redirect the current hero's autosave.
    clickSlot(2,'create');el('cancel-look').click();el('back-to-patrol').click();el('pause').click();
    check('canceling slot creation preserves active save identity',data().slots[2]===null&&data().slots[1].snapshot.look.name==='Azure Beacon');
    await reload();check('reload restores roster portrait and metadata',d.querySelector('[data-slot="1"] canvas').getAttribute('aria-label').includes('Azure Beacon')&&d.querySelector('[data-slot="1"]').textContent.includes('Last saved:'));
    clickSlot(1,'continue');el('pause').click();el('edit-look').click();check('all customization persists after reload',Object.entries(choices).every(([key,value])=>String(el(key).type==='checkbox'?el(key).checked:el(key).value)===String(value)));
    el('cancel-look').click();el('close-tree').click();el('pause').click();el('choose-hero').click();clickSlot(2,'create');set('name','Third Guardian');el('begin').click();el('pause').click();el('choose-hero').click();
    check('three independent slots are usable',data().slots.every(Boolean)&&new Set(data().slots.map(s=>s.id)).size===3);
    d.querySelector('[data-slot="2"] .delete-hero').click();check('delete requires confirmation',!el('delete-dialog').hidden&&data().slots[2]!==null);el('cancel-delete').click();check('cancel deletion keeps hero',data().slots[2]!==null);
    d.querySelector('[data-slot="2"] .delete-hero').click();el('confirm-delete').click();check('confirmed delete only clears selected test slot',data().slots[2]===null&&data().slots[0]&&data().slots[1]);
    // Render pixel checks at a fixed clock, independent of idle animation timing.
    const canvas=document.createElement('canvas');canvas.width=480;canvas.height=480;const c=canvas.getContext('2d',{willReadFrequently:true});
    const fingerprint=(look,view='front',pose='idle')=>{c.clearRect(0,0,480,480);drawHero(c,240,435,look,previewHero(pose,.12),.12,3,{view});const p=c.getImageData(0,0,480,480).data;let hash=2166136261;for(let i=0;i<p.length;i++){hash=Math.imul(hash^p[i],16777619);}return hash;};
    const base=fingerprint(DEFAULT_LOOK);let variants=0;
    for(const [key,values] of Object.entries(LOOK_OPTIONS))for(const value of values){if(value===DEFAULT_LOOK[key])continue;const hash=fingerprint({...DEFAULT_LOOK,[key]:value});check(`rendered ${key}: ${value}`,hash!==base);variants++;}
    for(const [key,values] of Object.entries(LOOK_RANGES))for(const value of values){check(`rendered ${key}: ${value}`,fingerprint({...DEFAULT_LOOK,[key]:value})!==base);variants++;}
    for(const key of COLOR_FIELDS){check(`rendered ${key}`,fingerprint({...DEFAULT_LOOK,[key]:'#ff00cc'})!==base);variants++;}
    check('cape toggle changes rendered silhouette',fingerprint({...DEFAULT_LOOK,cape:false})!==base);
    check('back has a distinct appearance',fingerprint(DEFAULT_LOOK,'back')!==base);
    for(const key of['skin','hair','hairColor','capeColor','cape','height','build','torso','arms','legs','shoulders']){const value=key==='hair'?'braids':key==='build'?'full':key==='cape'?false:COLOR_FIELDS.includes(key)?'#ff00cc':1.12;check(`back honors ${key}`,fingerprint({...DEFAULT_LOOK,[key]:value},'back')!==fingerprint(DEFAULT_LOOK,'back'));}
    for(const pose of PREVIEW_POSES.filter(p=>p!=='idle'))check(`rendered animation: ${pose}`,fingerprint(DEFAULT_LOOK,'game',pose)!==fingerprint(DEFAULT_LOOK,'game','idle'));
    report.textContent+=`COMPLETE · ${passed} creator / save / render checks passed · ${w.innerWidth} × ${w.innerHeight}\nPhysical-device testing remains separate.\n`;
  }catch(error){report.textContent+=`STOPPED · ${error.message}\n`;}
  finally{button.disabled=false;document.getElementById('test').disabled=false;}
};
