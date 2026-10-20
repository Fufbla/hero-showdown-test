'use strict';
// Initialization order preserved from the original single script.

let hitStop=0;

let mode='title',selected=0,hero,boss,shots=[],hazards=[],effects=[],particles=[],t=0,elapsed=0,shake=0,combo=0,comboTime=0,best=0,paused=false,muted=false,phase=1,ending=0,banner='',bannerTime=0,loaded=false,gamepadPrev={},keys={},padHeld={},musicStep=0,musicClock=0,ac=null,master=null;

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),rand=(a,b)=>a+Math.random()*(b-a);
