// Retired test bookmarks must leave before loading any of the former game systems.
export async function startRoyaleEntry({
  href=globalThis.location?.href,
  redirect=url=>globalThis.location.replace(url),
  loadMotion=()=>new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=new URL('../assets/animation/motion-core.js',import.meta.url).href;
    script.onload=resolve;script.onerror=()=>reject(new Error('The game motion library could not load.'));
    document.head.append(script);
  }),
  loadCatalog=()=>import('./clothing-catalog-preview.mjs'),
  loadGame=()=>import('./app.mjs'),
}={}){
  const url=new URL(href,import.meta.url);
  if(url.searchParams.get('v2TestCharacter')==='0000000000'){
    const destination=new URL('../royale-v3-staging/character-test/index.html',url);
    destination.searchParams.set('v','fresh-character-20261111');
    redirect(destination.href);
    return 'character-test';
  }
  await loadMotion();
  await loadCatalog();
  await loadGame();
  return 'game';
}

if(typeof document!=='undefined')await startRoyaleEntry();
