import {clearLegacyCharacterTest} from './reset.mjs';

// Keep earlier test saves intact when an old preview bookmark is opened.

const image=document.getElementById('character-art');
const stage=document.getElementById('character-stage');
const status=document.getElementById('image-status');
const error=document.getElementById('image-error');
const originalSource=new URL(image.getAttribute('src'),document.baseURI);

function ready(){
  image.hidden=false;
  error.hidden=true;
  stage.setAttribute('aria-busy','false');
  status.textContent='';
}

function unavailable(){
  image.hidden=true;
  error.hidden=false;
  stage.setAttribute('aria-busy','false');
  status.textContent='The character image couldn’t load.';
}

image.addEventListener('load',ready);
image.addEventListener('error',unavailable);
document.getElementById('retry-image').addEventListener('click',()=>{
  const source=new URL(originalSource);
  source.searchParams.set('retry',Date.now());
  error.hidden=true;
  image.hidden=false;
  stage.setAttribute('aria-busy','true');
  status.textContent='Loading character…';
  image.src=source.href;
});

if(image.complete){
  if(image.naturalWidth>0)ready();
  else unavailable();
}
