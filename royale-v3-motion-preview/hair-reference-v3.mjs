// Four authored views registered to the approved heads. Sprite sheets contain
// hair only; no face, skin, ear, body or costume pixels are imported.
const entry=(name,frames,front,side,back,options={})=>({name,frames:Object.fromEntries(['front','side','left','back'].map((v,i)=>[v,frames[i]])),fits:{front,side,left:side,back},...options});
export const HAIR_REFERENCE_V3={
 'fade':entry('Fade',[[60,147,426,363],[595,146,430,402],[1143,147,431,400],[1684,147,433,406]],[-30,-42,55,44],[-27.4,-35,44,42],[-21.5,-33,43,40],{fade:true}),
 'high-top':entry('High-top fade',[[75,142,392,358],[601,138,424,417],[1146,138,427,419],[1689,138,409,430]],[-30,-44,55,46],[-28,-37,45,44],[-22,-36,44,43],{fade:true}),
 'high-ponytail':entry('High ponytail',[[56,56,462,575],[572,58,506,598],[1136,58,511,594],[1720,47,392,640]],[-43,-58,68,83],[-43,-52,61,73],[-24,-52,48,66],{tail:true}),
 'double-puffs':entry('Double puffs',[[32,137,480,386],[575,139,412,419],[1161,140,411,419],[1637,142,504,417]],[-43,-48,68,55],[-31,-41,49,50],[-30,-41,60,49]),
 'afro-puff':entry('Afro puff',[[57,71,420,567],[568,75,454,578],[1155,74,452,579],[1679,71,451,586]],[-36,-70,61,81],[-35,-63,54,69],[-25,-61,50,70]),
 'short-afro':entry('Short afro',[[58,138,419,411],[597,139,421,413],[1152,140,423,413],[1693,138,425,413]],[-31,-43,56,51],[-28,-36,46,45],[-23,-34,46,43]),
 'medium-afro':entry('Medium afro',[[35,113,491,451],[565,112,471,469],[1142,111,474,470],[1655,111,499,488]],[-36,-48,61,56],[-33,-41,51,51],[-27,-38,54,53]),
 'high-loc-bun':entry('High loc bun',[[58,98,423,526],[537,102,485,534],[1137,99,475,533],[1684,103,429,526]],[-33,-57,58,72],[-34,-51,52,58],[-24,-49,48,59]),
 'braided-ponytail':entry('Braided ponytail',[[44,67,442,588],[576,66,484,588],[1146,66,483,590],[1734,64,365,618]],[-43,-57,68,90],[-40,-51,58,71],[-24,-51,48,63],{tail:true}),
};
export const HAIR_REFERENCE_IDS=Object.keys(HAIR_REFERENCE_V3);
export const hairReferenceURL=id=>new URL('./assets/hero/style-c-accurate/hair/reference-v3/'+id+'.png',import.meta.url);
