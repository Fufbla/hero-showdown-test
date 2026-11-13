// Capture one existing authored sprite per mascot for the unified trial menu.
// No source artwork, animation frames or character registrations are changed.
import {writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {CostumeEngine} from '../royale-v3-staging/costumes/engine.mjs';
import {COSTUMES} from '../royale-v3-staging/costumes/catalog.mjs';
import {kingJamesLook} from '../royale-v3-staging/kingjames/selection.mjs';
import {DEFAULT_LOOK} from '../royale/appearance.mjs';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
const engine=new CostumeEngine({canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u)),jsonLoader:async u=>JSON.parse(await readFile(u))});
for(const outfit of COSTUMES){
 if(!await engine.preload(outfit.id))throw Error(engine.error);
 const canvas=engine.compose(outfit.id,0,kingJamesLook(DEFAULT_LOOK));
 await writeFile(new URL('../royale-v3-staging/costumes/assets/'+outfit.id+'/preview.png',import.meta.url),canvas.toBuffer('image/png'));
}
console.log('Rendered '+COSTUMES.length+' existing costume thumbnails');
