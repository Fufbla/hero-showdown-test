// Run from a git checkout. Reference files live only in an automatically removed temp directory.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {Game,STEP} from '../core.mjs';
const base='d2fd2bfb902c1a778d50a2608fbf56a5e5dc54b4',root=fileURLToPath(new URL('../../',import.meta.url));
const dir=mkdtempSync(join(tmpdir(),'royale-phase1-'));
try{
  for(const file of['core.mjs','world.mjs'])writeFileSync(join(dir,file),execFileSync('git',['show',`${base}:royale/${file}`],{cwd:root}));
  const {Game:Phase1}=await import(pathToFileURL(join(dir,'core.mjs')));
  const actual=new Game(),expected=new Phase1();
  const snapshot=g=>{const hero={...g.hero};hero.missingHealth=hero.dead?0:hero.maxHp-hero.hp;delete hero.hp;delete hero.maxHp;for(const key of['jumpAge','hurtAge','defeatAge','respawnAge','castAge','flying','steel','agile'])delete hero[key];const enemies=g.enemies.map(e=>{const result={...e};for(const key of ['rooted','lifted','airborne','vy'])delete result[key];return result;});return{hero,enemies,time:g.time,checkpoint:g.checkpoint,kills:g.kills,species:g.species,reachedEnd:g.reachedEnd,deathTimer:g.deathTimer};};
  for(let i=0;i<7200;i++){
    const input={move:Math.floor(i/900)%2?-1:1,run:i%120>30,jump:i%49===0||i%49===12,punchHeld:i%120<70,kickHeld:i%120>=70,interact:i%20===0};
    if(i===1800){actual.hurt(1000,0);expected.hurt(1000,0);}if(i===3600){actual.respawn();expected.respawn();}
    actual.step(STEP,input);expected.step(STEP,input);assert.deepEqual(snapshot(actual),snapshot(expected),`simulation frame ${i}`);assert.deepEqual(actual.drain(),expected.drain());
  }
  const changes=execFileSync('git',['diff','--name-only',base,'--','.'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);
  assert.ok(changes.every(file=>file.startsWith('royale/')),'Royale changes must stay inside royale/');
  console.log('PASS: 7,200 steps match Phase 1 physics, basic combat, enemies, rewards and events (HP growth is intentionally +15 per level); Phase 3 is isolated to royale/.');
}finally{rmSync(dir,{recursive:true,force:true});}
