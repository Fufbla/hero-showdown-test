// Offline menu portraits, rendered by the released character engines. No player
// storage or new gameplay outfits: only existing customization combinations.
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {DEFAULT_LOOK,sanitizeLook} from '../../royale/appearance.mjs';
import {StarterSuitEngine} from '../../royale-v3-staging/starter-suit/engine.mjs';
import {CostumeEngine} from '../../royale/fashion/engine.mjs';
const options={canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u)),jsonLoader:async u=>JSON.parse(await readFile(u,'utf8'))};
const starter=new StarterSuitEngine(options),costumes=new CostumeEngine(options);
const team=[
 {file:'santa',outfit:'santa-street',look:{presentation:'male',skin:'#ba7952',hair:'curly-fade',brows:'bold',nose:'broad',mouth:'smile',facialHair:'stubble'},face:1},
 {file:'chic',outfit:'summer-chic',look:{presentation:'female',skin:'#75462f',hair:'afro-puff',hairColor:'#231927',eyeShape:'wide',brows:'soft',nose:'small',mouth:'smile'},face:1},
 {file:'volt',outfit:'starter-superhero',look:{presentation:'male',skin:'#aa6943',hair:'short-locs',hairColor:'#221c2c',eyes:'#693e23',brows:'bold',nose:'broad',mouth:'smile',suit:'#6941d7',trim:'#ffcf35',capeColor:'#4230a8',emblem:'bolt',emblemColor:'#ffe66a'},face:1},
 {file:'nova',outfit:'starter-superhero',look:{presentation:'female',skin:'#ebba91',hair:'layered-bob',hairColor:'#612336',eyes:'#327d86',eyeShape:'almond',mouth:'smile',suit:'#21b9b9',trim:'#fff3ce',capeColor:'#0c7b94',emblem:'star',emblemColor:'#ffe66a'},face:-1,cast:true},
 {file:'ace',outfit:'midnight-leather',look:{presentation:'male',skin:'#cc936b',hair:'pompadour',hairColor:'#322333',brows:'straight',nose:'straight',mouth:'neutral',facialHair:'beard'},face:-1},
];
if(!await starter.preload())throw Error(starter.error);
const dir=new URL('../../royale/welcome/assets/',import.meta.url);await mkdir(dir,{recursive:true});
for(const member of team){
 const look=sanitizeLook({...DEFAULT_LOOK,...member.look});
 const hero={face:member.face,grounded:true,vx:0,vy:0,jumps:0,jumpAge:10,respawnAge:2,castAge:member.cast?.25:-1};
 const canvas=createCanvas(480,600),c=canvas.getContext('2d');
 if(member.outfit==='starter-superhero')starter.draw(c,240,560,look,hero,1,{scale:3.1});
 else{if(!await costumes.preload(member.outfit))throw Error(costumes.error);costumes.draw(c,240,560,look,hero,1,{id:member.outfit,scale:3.1});}
 const portrait=createCanvas(400,500);
 portrait.getContext('2d').drawImage(canvas,40,80,400,500,0,0,400,500);
 await writeFile(new URL(member.file+'.webp',dir),await portrait.encode('webp',92));
 member.look=look;
}
await writeFile(new URL('heroes.json',dir),JSON.stringify({source:'Existing production character engines and approved outfits',team},null,2)+'\n');
console.log('Rendered five existing-game custom heroes.');
