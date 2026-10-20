'use strict';
// Initialization order preserved from the original single script.

const pedestrianSheet=new Image();
pedestrianSheet.src="assets/images/pedestrian-sheet-18.webp";

const pedestrianDefinitions=[{"name":"volleyball-visitor","referenceHeight":486,"frames":[{"rect":[58,13,332,492],"anchor":[157,490]},{"rect":[491,13,238,493],"anchor":[89,491]},{"rect":[794,13,338,491],"anchor":[166,489]},{"rect":[1233,12,244,494],"anchor":[97,492]}]},{"name":"beach-walker","referenceHeight":486,"frames":[{"rect":[60,519,335,472],"anchor":[155,470]},{"rect":[503,519,236,468],"anchor":[82,466]},{"rect":[820,519,331,473],"anchor":[140,471]},{"rect":[1242,518,248,469],"anchor":[88,467]}]}];

// Living stages use their own visual clock, cached 1280x720 scenery and bounded effects.
// No environmental code reads input or changes fighter positions, damage, or simulation time.
const environment={time:0,quality:2,averageMs:16.7,slow:0,fast:0,lastStamp:-1,lastVenue:-1,lastQuality:-1,base:[],surface:null,builds:0,stats:{}};

let fountainMist=null;
