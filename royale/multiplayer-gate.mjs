import {MULTIPLAYER_ENABLED} from './release-config.mjs';
// Keep the existing migration receipt fence without importing networking code.
const MIGRATION_KEY='healthia.royale.multiplayer.links.v1';
export async function createMultiplayerMenu(hooks,{enabled=MULTIPLAYER_ENABLED,document:doc=globalThis.document,loadMenu=()=>import('./multiplayer/menu.mjs')}={}){
 if(enabled){const {MultiplayerMenu}=await loadMenu();return new MultiplayerMenu(hooks);}
 const unavailable=()=>{hooks.onError('Online Multiplayer — Coming Soon. Account-linked heroes require the account service; their saved backup is preserved. Choose a local hero to play solo.');return false;};
 for(const id of ['roster']){
  const button=doc.createElement('button');button.textContent='Online Multiplayer — Coming Soon';button.className='secondary';button.disabled=true;button.dataset.multiplayer='disabled';doc.getElementById(id).append(button);
 }
 return {session:null,dialog:{open:false},open:unavailable,connect:unavailable,run:unavailable,
  isLinked(id){try{const link=JSON.parse(hooks.getContext().storage.getItem(MIGRATION_KEY)||'{}')[id];return !!(link&&link.status!=='review');}catch{return true;}}
 };
}
