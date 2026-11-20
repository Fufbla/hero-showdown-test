export const PUPPY_ID='golden-puppy-costume';
export const PUPPY_PRICE=700;
export const PUPPY_STATES=Object.freeze([
 'idle','start','run','stop','jump','doubleJump','fall','land','punch','kick',
 'strength','superKick','fireball','fireballAir','flightStart','hover','fly',
 'hurt','defeat','recovery','seismicSmash'
]);
export const PUPPY_COSTUME=Object.freeze({
 id:PUPPY_ID,name:'Golden Puppy',unisex:true,coinPrice:PUPPY_PRICE,
 // Existing mascot semantics: retain original hair within the hood opening.
 hideHair:true,renderer:'puppy',category:'set',collection:'Mascots & Formal',
 availability:'released',thumbnail:new URL('./assets/preview.png',import.meta.url).href,
 review:Object.freeze({referenceFidelity:true,universalFit:true,animations:true,hairCompatibility:true}),
 pieces:Object.freeze([Object.freeze({id:PUPPY_ID+'.fullbody',category:'fullbody',
  coinPrice:PUPPY_PRICE,assetManifest:new URL('./assets/manifest.json',import.meta.url).href})])
});
