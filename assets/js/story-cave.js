'use strict';
// Keep the story's starting/main hero, even after switching fighters during battles.
const caveMainHeroIntro=playStoryIntro;
playStoryIntro=function(...args){
 if(story.active&&!story.playing){
  story.mainHeroIndex=selected;story.chapter2Complete=false;story.chapter2Result=null;
  story.chapter3Complete=false;story.chapter3Result=null;
 }
 return caveMainHeroIntro(...args);
};
const caveMainHeroModes=showModeSelect;
showModeSelect=function(...args){story.mainHeroIndex=null;return caveMainHeroModes(...args);};

// Chapter 2 is isolated from fighters, tagging, versus/royal and all existing media.
function startCaveChapter(){
 const caveHero=story.mainHeroIndex??selected;let exited=false;
 story.cleanup?.();clearInput();mode='story-cave';paused=false;story.playing=true;
 window.HealthiaMenuMusic?.stop();stopScoreVoices();scoreTick();
 if(ambience&&ac)ambience.bus.gain.setTargetAtTime(0,ac.currentTime,.05);
 HealthiaCave.open({autoEnter:true,character:caveHero,sound:!muted,onComplete:detail=>{if(exited)return;story.chapter2Complete=true;story.chapter2Result=detail;HealthiaCave.scene?.close('complete');},onExit:reason=>{
  if(exited)return;exited=true;
  story.playing=false;clearInput();last=0;simulationRemainder=0;gamepadPrev={};story.releasePad=true;
  if(reason==='complete')playCaveRescue(caveHero);else showModeSelect();
 }});
}
const caveRescueMovies=['videos/rescue-summy.mp4','videos/rescue-sadie.mp4','videos/rescue-vee.mp4'];
function playCaveRescue(index=story.mainHeroIndex??selected){
 if(story.playing)return;
 selected=caveRescueMovies[index]?index:0;
 clearInput();story.active=true;story.waiting=false;story.tag=null;story.tagQueued=false;
 playStoryMovie(caveRescueMovies[selected],'CHAPTER 2 · '+heroes[selected].name+' RESCUE',null,true,()=>{
  if(story.active)showStoryChapterComplete(2,playShoreChapterIntro);
 });
 const movie=story.movie;
 movie?.addEventListener('error',()=>{
  if(story.movie===movie)document.querySelector('.story-movie-status').textContent='Rescue video could not load. Retry or skip to Chapter 3.';
 });
}
// Preserve the ending movie, then reveal the Chapter 2 resume code.
playStoryEnding=function(){
 if(!story.active||story.playing||mode!=='victory'||story.battle!==story.totalBattles||story.endingPlayed)return;
 return playStoryMovie('videos/is-this-the-end.mp4','CHAPTER 2 · THE COLLAPSING CAVE',null,true,()=>{
  story.endingPlayed=true;showStoryChapterComplete(1,startCaveChapter);
 });
};
