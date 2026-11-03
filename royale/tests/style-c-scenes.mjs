import {sanitizeLook} from '../appearance.mjs';
import {Game,STEP} from '../core.mjs';
import {Renderer} from '../renderer.mjs';
import {COSTUME_CATALOG} from '../costume-catalog.mjs';
import {MERGE_CATALOG} from '../legendary-data.mjs';
import {POWER_IDS, normalizePowers} from '../powers.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';

export function styleCPracticeSnapshot(presentation) {
 const levels = Object.fromEntries(POWER_IDS.map(id => [id, 1]));
 const level = 15, powers = normalizePowers({levels, equipped:['fireball', 'superKick', null]}, level);
 const game = new Game({save:{level, powers}, look:styleCDefault(presentation)});
 return game.save();
}
export const STYLE_C_SAMPLES=[
 sanitizeLook({name:'Style C Guardian',presentation:'male',skin:'#b97343',eyes:'#855024',hair:'short-locs',hairColor:'#29212b',suit:'#263778',trim:'#e2bf60',capeColor:'#263399',emblem:'star',emblemColor:'#f1ce64',brows:'bold',mouth:'neutral',build:'balanced'}),
 sanitizeLook({name:'Style C Sentinel',presentation:'female',skin:'#b97343',eyes:'#855024',hair:'curly-ponytail',hairColor:'#382335',suit:'#71328c',trim:'#e2bf60',capeColor:'#7738a0',emblem:'star',emblemColor:'#f1ce64',brows:'bold',mouth:'neutral',build:'balanced'})
];
export function styleCOutfit(kind){
 if(kind==='starter'||!kind)return {id:'starter-basic',origin:'starter'};
 const ids=kind.startsWith('merge:')?['helmet','chest','boots'].map(p=>MERGE_CATALOG[`merge-${kind.slice(6)}-${p}`]):
  ['helmet','chest','boots'].map(p=>COSTUME_CATALOG[`eris-cavern-${kind==='rare'?'rare':'ordinary'}-${p}`]);
 const pieces=Object.fromEntries(ids.filter(Boolean).map(i=>[i.part,i]));
 if(pieces.helmet)pieces.mask=pieces.helmet;
 if(pieces.chest){pieces.suit=pieces.chest;pieces.emblem={...pieces.chest,color:pieces.chest.accent};}
 return {id:'starter-basic',origin:'starter',pieces};
}
export function createStyleCScene(canvas,{look=STYLE_C_SAMPLES[0],outfit='starter',imageLoader,canvasFactory}={}){
 const game=new Game({look}),renderer=new Renderer(canvas);game.started=true;game.look=look;
 // Deterministic review encounter uses the real renderer and real integrated
 // monsters. The game entry point never imports this review-only module.
 game.hero.x=340;game.hero.prevX=340;game.hero.y=600;game.hero.prevY=600;game.hero.grounded=true;game.hero.respawnAge=100;
 game.visualOutfit=()=>styleCOutfit(outfit);
 return {game,renderer,step(input={}){game.step(STEP,input);renderer.draw(game,1,STEP);},destroy(){renderer.destroy();}};
}
