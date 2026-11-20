// Approved November 13 additions. IDs are permanent ownership references.
export const FASHION_OUTFITS=Object.freeze([
  {
    "id": "summer-chic",
    "name": "Summer Chic"
  },
  {
    "id": "tropical-beauty",
    "name": "Tropical Beauty"
  },
  {
    "id": "sunset-elegance",
    "name": "Sunset Elegance"
  },
  {
    "id": "little-black-dress",
    "name": "Little Black Dress"
  },
  {
    "id": "red-carpet-romance",
    "name": "Red Carpet Romance"
  },
  {
    "id": "midnight-glamour",
    "name": "Midnight Glamour"
  }
].map(Object.freeze));
// A complete enclosed mascot; the same design is worn by both presentations.
export const ROBOT_OUTFIT=Object.freeze({id:'robot-costume',name:'Flex Bot',unisex:true,coinPrice:0});
// The approved puppy keeps its permanent ID and all existing test ownership.
export const PUPPY_OUTFIT=Object.freeze({id:'golden-puppy-costume',name:'Fancy Costume',unisex:true,coinPrice:700});
// Live approval retains the ownership ID used by the reserved test version.
export const VICE_ID='vice-costume';
export const VICE_OUTFIT=Object.freeze({id:VICE_ID,name:'Vice Costume',unisex:true,coinPrice:700});
