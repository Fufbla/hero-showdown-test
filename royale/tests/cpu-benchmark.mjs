import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import {Game as Current} from '../core.mjs';
import {SCENARIOS,scenarioGame,scenarioInput} from './benchmark-scenes.mjs';
const baselinePath=process.argv[2];if(!baselinePath)throw Error('Pass a read-only baseline checkout/royale path');
const {Game:Baseline}=await import(pathToFileURL(resolve(baselinePath,'core.mjs')));
const run=(Game,scene)=>{const g=scenarioGame(Game,scene);g.paused=false;const start=performance.now();for(let i=0;i<6000;i++){g.step(1/60,scenarioInput(g,scene,i));g.drain();}return performance.now()-start;};
const rows=[];for(const scene of SCENARIOS.filter(s=>s!=='touch')){run(Baseline,scene);run(Current,scene);const before=[],after=[];for(let i=0;i<7;i++){if(i%2){after.push(run(Current,scene));before.push(run(Baseline,scene));}else{before.push(run(Baseline,scene));after.push(run(Current,scene));}}const median=a=>[...a].sort((x,y)=>x-y)[3];rows.push({scene,ticks:6000,baselineMedianMs:median(before),currentMedianMs:median(after),baselineRuns:before,currentRuns:after});}
console.log(JSON.stringify({environment:`${process.version} ${process.platform} ${process.arch}`,method:'Seven interleaved runs after warm-up; 6,000 fixed simulation steps each. No rendering; these are CPU timings, not FPS.',rows},null,2));
