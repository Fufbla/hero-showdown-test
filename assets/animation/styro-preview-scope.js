/* This hosted copy is a focused Versus animation review. Campaign media stays in the production repository. */
(function(){
 const original=showModeSelect;
 showModeSelect=function(){const result=original();const button=document.getElementById('story-mode');if(button){button.disabled=true;button.setAttribute('aria-label','Story Mode is available in the main game');button.title='Story Mode is available in the main game';}return result;};
 if(document.getElementById('story-mode'))showModeSelect();
})();
