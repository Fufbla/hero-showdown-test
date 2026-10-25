'use strict';
// Chapter passwords resume a fresh chapter. Chapter 1 remains public and finishing
// a chapter can still continue directly into the next chapter's existing movie.
const storyChapterAccess=Object.freeze({
 2:Object.freeze({code:'1992',title:'THE COLLAPSING CAVE'}),
 3:Object.freeze({code:'2014',title:'SHORE FRONT'})
});
story.resumeChapter=1;
let storyChapterCompletion=null,storyChapterBackDown=false;
function storyChapterForCode(value){
 const code=String(value??'').trim();
 return Object.keys(storyChapterAccess).map(Number).find(chapter=>storyChapterAccess[chapter].code===code)||null;
}
function refreshStoryChapterChoice(){
 const chapter=story.resumeChapter,button=document.getElementById('story-begin');
 if(!story.active||!button||!storyChapterAccess[chapter])return;
 button.disabled=!loaded;button.textContent=loaded?'START CHAPTER '+chapter+' →':'LOADING HEROES…';
 const retry=document.getElementById('story-reload');if(retry)retry.hidden=true;
}
const chapterOriginalReady=updateStoryReady;
updateStoryReady=function(...args){const result=chapterOriginalReady(...args);refreshStoryChapterChoice();return result;};
const chapterOriginalSelect=showSelect;
showSelect=function(...args){
 overlay.classList.remove('story-chapter-overlay');
 const result=chapterOriginalSelect(...args),begin=document.getElementById('story-begin');
 if(!story.active||!begin)return result;
 const chapter=storyChapterAccess[story.resumeChapter]?story.resumeChapter:1,row=begin.closest('.row');
 if(chapter>1){
  overlay.querySelector('.eyebrow').textContent='STORY MODE / CHAPTER 0'+chapter;
  overlay.querySelector('h2').textContent=chapter===2?'Choose your cave hero.':'Choose your starting hero.';
  const note=row.previousElementSibling;
  if(note?.tagName==='P')note.textContent=chapter===2?
   'Your code opens The Collapsing Cave. Your chosen hero gets her own entrance movie, cave mission, and rescue scene.':
   'Your code opens Shore Front from its opening movie. All three girls join the battle with fresh health. Tag with Q, the TAG button, or RT / R2.';
  begin.onclick=()=>beginStoryChapter(chapter);
 }
 const code=document.createElement('button');code.id='story-enter-code';code.textContent='ENTER CHAPTER CODE';code.onclick=showStoryChapterCode;row.append(code);
 if(chapter>1){const restart=document.createElement('button');restart.id='story-start-first';restart.textContent='START FROM CHAPTER 1';restart.onclick=()=>{story.resumeChapter=1;showStorySelect();};row.append(restart);}
 refreshStoryChapterChoice();syncMenuFocus();return result;
};
function beginStoryChapter(chapter){
 if(!story.active||story.playing||!loaded||!storyChapterAccess[chapter])return false;
 story.cleanup?.();clearInput();coLeave();
 story.resumeChapter=chapter;story.mainHeroIndex=selected;story.waiting=false;story.endingPlayed=chapter>1;
 story.chapter2Complete=false;story.chapter2Result=null;story.chapter3Complete=false;story.chapter3Result=null;
 story.team=[];story.tag=null;story.tagQueued=false;story.tagCooldown=0;story.releasePad=true;
 shore.active=false;shore.phase='';shore.model=null;shore.completed=false;shore.endingPlayed=false;
 hitStop=0;simulationRemainder=0;last=0;storyChapterCompletion=null;
 if(chapter===2){story.battle=6;startCaveChapter();}
 else{story.battle=7;playShoreChapterIntro();}
 return true;
}
function showStoryChapterCode(value=''){
 if(!story.active||story.playing)return;
 mode='story-code';paused=false;story.waiting=false;clearInput();storyTagButton.hidden=true;
 document.querySelectorAll('.pad-focused').forEach(button=>button.classList.remove('pad-focused'));menuFocusElement=null;menuFocus=0;overlay.classList.remove('hidden');overlay.classList.add('story-chapter-overlay');
 overlay.innerHTML='<form id="story-code-form" class="panel chapter-code-panel"><div class="eyebrow">STORY MODE / CHAPTER CODE</div><h2>Continue your story.</h2><p id="story-code-hint">Enter the four-digit code earned at the end of a chapter.</p><label class="chapter-code-label" for="story-code-input">CHAPTER CODE</label><input id="story-code-input" class="chapter-code-input" type="text" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" spellcheck="false" aria-describedby="story-code-hint story-code-error" placeholder="0000"><p id="story-code-error" class="chapter-code-error" role="alert" aria-live="polite"></p><div class="chapter-code-keypad" aria-label="Chapter code keypad">'+[1,2,3,4,5,6,7,8,9,'CLEAR',0,'DELETE'].map(key=>'<button type="button" data-code-key="'+key+'" aria-label="'+(key==='DELETE'?'Delete last digit':key==='CLEAR'?'Clear code':key)+'">'+key+'</button>').join('')+'</div><div class="row"><button type="button" id="story-code-back">← STORY</button><button type="submit" class="primary" id="story-code-submit" disabled>UNLOCK CHAPTER →</button></div><p class="chapter-code-note">Type the code, tap the keypad, or use your controller to select digits.</p></form>';
 const input=document.getElementById('story-code-input');input.value=typeof value==='string'?value.replace(/[^0-9]/g,'').slice(0,4):'';
 input.addEventListener('input',()=>refreshStoryCodeInput());
 overlay.querySelectorAll('[data-code-key]').forEach(button=>button.onclick=()=>{
  overlay.querySelectorAll('[data-code-key]').forEach(key=>key.classList.remove('selected'));button.classList.add('selected');
  const key=button.dataset.codeKey;input.value=key==='CLEAR'?'':key==='DELETE'?input.value.slice(0,-1):(input.value+key).slice(0,4);
  refreshStoryCodeInput();if(input.value.length===4)syncMenuFocus(document.getElementById('story-code-submit'));
 });
 document.getElementById('story-code-form').onsubmit=event=>{event.preventDefault();submitStoryChapterCode();};
 document.getElementById('story-code-back').onclick=leaveStoryChapterScreen;
 refreshStoryCodeInput();story.releasePad=true;scoreTick();syncMenuFocus(overlay.querySelector('[data-code-key="1"]'));
}
function refreshStoryCodeInput(clearError=true){
 const input=document.getElementById('story-code-input'),submit=document.getElementById('story-code-submit');if(!input||!submit)return;
 input.value=input.value.replace(/[^0-9]/g,'').slice(0,4);submit.disabled=input.value.length!==4;submit.classList.toggle('selected',!submit.disabled);if(!submit.disabled)overlay.querySelectorAll('[data-code-key]').forEach(key=>key.classList.remove('selected'));
 if(clearError){document.getElementById('story-code-error').textContent='';input.removeAttribute('aria-invalid');}
}
function submitStoryChapterCode(){
 if(mode!=='story-code'||!story.active)return false;
 const input=document.getElementById('story-code-input');if(!input||input.value.length!==4)return false;
 const chapter=storyChapterForCode(input.value);
 if(!chapter){input.value='';refreshStoryCodeInput(false);input.setAttribute('aria-invalid','true');document.getElementById('story-code-error').textContent='That code isn’t right. Check your chapter code and try again.';syncMenuFocus(overlay.querySelector('[data-code-key="1"]'));return false;}
 story.resumeChapter=chapter;clearInput();showStorySelect();story.releasePad=true;syncMenuFocus(document.getElementById('story-begin'));return true;
}
function leaveStoryChapterScreen(){
 if(mode==='story-code')showStorySelect();else if(mode==='story-chapter-complete')showModeSelect();
 story.releasePad=true;
}
function showStoryChapterComplete(chapter,onContinue){
 const next=chapter+1,access=storyChapterAccess[next];
 if(!story.active||story.playing||!access||typeof onContinue!=='function')return;
 storyChapterCompletion={chapter,onContinue};story.resumeChapter=next;
 mode='story-chapter-complete';paused=false;story.waiting=false;story.tag=null;story.tagQueued=false;
 clearInput();storyTagButton.hidden=true;document.querySelectorAll('.pad-focused').forEach(button=>button.classList.remove('pad-focused'));menuFocusElement=null;menuFocus=0;overlay.classList.remove('hidden');overlay.classList.add('story-chapter-overlay');
 overlay.innerHTML='<section class="panel chapter-complete-panel"><div class="eyebrow">STORY MODE / CHAPTER 0'+chapter+'</div><h2>CHAPTER '+chapter+' COMPLETE!</h2><p>Next: '+access.title+'</p><div class="chapter-code-reward"><span>CHAPTER '+next+' CODE</span><strong id="story-earned-code">'+access.code+'</strong></div><p>Save this code. Use <b>Enter Chapter Code</b> in Story Mode to start here next time.</p><div class="row"><button id="story-chapter-exit">GAME MODES</button><button class="primary" id="story-chapter-continue">CONTINUE TO CHAPTER '+next+' →</button></div></section>';
 let continued=false;document.getElementById('story-chapter-continue').onclick=()=>{
  if(continued||!story.active||mode!=='story-chapter-complete')return;continued=true;storyChapterCompletion=null;mode='story-transition';overlay.classList.remove('story-chapter-overlay');clearInput();onContinue();
 };
 document.getElementById('story-chapter-exit').onclick=showModeSelect;
 story.releasePad=true;scoreTick();syncMenuFocus(document.getElementById('story-chapter-continue'));
}
const chapterOriginalIntro=playStoryIntro;
playStoryIntro=function(...args){if(story.active&&!story.playing){story.resumeChapter=1;storyChapterCompletion=null;}return chapterOriginalIntro(...args);};
const chapterOriginalModes=showModeSelect;
showModeSelect=function(...args){overlay.classList.remove('story-chapter-overlay');story.resumeChapter=1;storyChapterCompletion=null;storyChapterBackDown=false;return chapterOriginalModes(...args);};
const chapterOriginalPoll=pollPad;
pollPad=function(...args){
 const screen=['story-code','story-chapter-complete'].includes(mode);
 if(screen&&!story.releasePad&&!document.getElementById('closehelp')){
  const back=storyPads().some(p=>[1,8].some(i=>p.buttons[i]?.pressed||p.buttons[i]?.value>.5));
  if(back&&!storyChapterBackDown){storyChapterBackDown=true;leaveStoryChapterScreen();return;}
  storyChapterBackDown=back;
 }else storyChapterBackDown=false;
 return chapterOriginalPoll(...args);
};
window.addEventListener('keydown',event=>{
 if(!['story-code','story-chapter-complete'].includes(mode)||story.playing)return;
 const help=document.getElementById('closehelp');
 if(help){if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();help.click();}return;}
 if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();leaveStoryChapterScreen();return;}
 if(event.key===' '&&event.target.matches('button')){event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)event.target.click();return;}
 if(mode!=='story-code')return;
 const input=document.getElementById('story-code-input');if(!input)return;
 if(event.key==='Enter'&&(event.target===input||input.value.length===4)){event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)submitStoryChapterCode();return;}
 if(event.target===input){event.stopImmediatePropagation();return;}
 if(!event.ctrlKey&&!event.metaKey&&(/^[0-9]$/.test(event.key)||['Backspace','Delete'].includes(event.key))){
  event.preventDefault();event.stopImmediatePropagation();if(event.repeat)return;
  input.value=event.key==='Backspace'?input.value.slice(0,-1):event.key==='Delete'?'':(input.value+event.key).slice(0,4);refreshStoryCodeInput();
 }
},true);
// The header's help button returns to the same code / completion screen.
const chapterOriginalHelp=document.getElementById('help').onclick;
document.getElementById('help').onclick=function(...args){
 const screen=mode,value=document.getElementById('story-code-input')?.value,completion=storyChapterCompletion;
 const result=chapterOriginalHelp.apply(this,args),close=document.getElementById('closehelp');
 if(close&&screen==='story-code')close.onclick=()=>showStoryChapterCode(value);
 if(close&&screen==='story-chapter-complete'&&completion)close.onclick=()=>showStoryChapterComplete(completion.chapter,completion.onContinue);
 return result;
};
