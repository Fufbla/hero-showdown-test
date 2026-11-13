// Generated from collection.json. Every released entry is also free to try.
export const COSTUME_PRICE=700;
export const COLLECTION=Object.freeze([
  {
    "id": "dolphin-costume",
    "name": "Dolphin Costume",
    "hideHair": true,
    "renderer": "mascot"
  },
  {
    "id": "pink-shark-costume",
    "name": "Pink Shark Costume",
    "hideHair": true,
    "renderer": "mascot"
  },
  {
    "id": "hamburger-costume",
    "name": "Hamburger Costume",
    "hideHair": true,
    "renderer": "mascot"
  },
  {
    "id": "stuffed-animal-costume",
    "name": "Stuffed Animal Costume",
    "hideHair": true,
    "renderer": "mascot"
  },
  {
    "id": "zombie-costume",
    "name": "Zombie Costume",
    "hideHair": false,
    "renderer": "mascot"
  },
  {
    "id": "reaper-costume",
    "name": "Reaper Costume",
    "hideHair": true,
    "renderer": "mascot"
  },
  {
    "id": "fishsticks-costume",
    "name": "I Love Fishsticks Costume",
    "hideHair": true,
    "renderer": "mascot"
  },
  {
    "id": "pizza-slice-costume",
    "name": "Pizza Slice Costume",
    "hideHair": true,
    "renderer": "mascot"
  },
  {
    "id": "black-business-suit",
    "name": "Black Business Suit",
    "hideHair": false,
    "renderer": "mascot"
  },
  {
    "id": "white-business-suit",
    "name": "White Business Suit",
    "hideHair": false,
    "renderer": "mascot"
  },
  {
    "id": "santa-street",
    "name": "Santa Street",
    "hideHair": false,
    "renderer": "approved"
  },
  {
    "id": "snowflake-knit",
    "name": "Snowflake Knit",
    "hideHair": false,
    "renderer": "approved"
  },
  {
    "id": "holiday-velvet",
    "name": "Holiday Velvet",
    "hideHair": false,
    "renderer": "approved"
  },
  {
    "id": "purple-puffer",
    "name": "Purple Puffer",
    "hideHair": false,
    "renderer": "approved"
  },
  {
    "id": "classic-varsity",
    "name": "Classic Varsity",
    "hideHair": false,
    "renderer": "approved"
  },
  {
    "id": "olive-bomber",
    "name": "Olive Bomber",
    "hideHair": false,
    "renderer": "approved"
  },
  {
    "id": "midnight-leather",
    "name": "Midnight Leather",
    "hideHair": false,
    "renderer": "approved"
  },
  {
    "id": "sherpa-denim",
    "name": "Sherpa Denim",
    "hideHair": false,
    "renderer": "approved"
  },
  {
    "id": "blossom-kimono",
    "name": "Blossom Kimono",
    "hideHair": false,
    "renderer": "approved"
  },
  {
    "id": "plum-gold-kimono",
    "name": "Plum & Gold Kimono",
    "hideHair": false,
    "renderer": "approved"
  },
  {
    "id": "emerald-gala",
    "name": "Emerald Gala",
    "hideHair": false,
    "renderer": "approved"
  },
  {
    "id": "sapphire-starlight",
    "name": "Sapphire Starlight",
    "hideHair": false,
    "renderer": "approved"
  }
].map(o=>Object.freeze({...o,coinPrice:COSTUME_PRICE,
 category:'set',collection:'Mascots & Formal',availability:'released',
 thumbnail:o.renderer==='approved'?'../kingjames/outfits/'+o.id+'/preview.webp':'./assets/'+o.id+'/preview.png',
 review:Object.freeze({referenceFidelity:true,universalFit:true,animations:true,hairCompatibility:true}),
 pieces:Object.freeze([Object.freeze({id:o.id+'.fullbody',category:'fullbody',coinPrice:COSTUME_PRICE,
 assetManifest:o.renderer==='approved'?'../kingjames/outfits/'+o.id+'/manifest.json':'./assets/'+o.id+'/manifest.json'})])})));
// Keep the original mascot atlas review suite scoped to its 48-frame format.
export const COSTUMES=Object.freeze(COLLECTION.filter(o=>o.renderer==='mascot'));
export const costumeById=id=>COLLECTION.find(c=>c.id===id)||null;
export const costumeForState=state=>{
 if(!state?.visible)return null;
 const piece=state.equipped?.fullbody;
 if(Array.isArray(state.owned)&&!state.owned.includes(piece))return null;
 return COLLECTION.find(c=>c.pieces[0].id===piece)||null;
};
export const costumeHairVisible=(costume,steel=false)=>!steel;
