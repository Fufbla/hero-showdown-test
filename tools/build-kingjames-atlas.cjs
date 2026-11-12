// Atlas packing only: copies complete authored cells without segmenting limbs.
// Usage: node tools/build-kingjames-atlas.cjs [source.png]
const fs=require('fs'),path=require('path'),sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const source=process.argv[2]||path.join(root,'docs/kingjames/art/body-source.png');
const out=path.join(root,'royale-v3-staging/kingjames/outfits/kingjames-original');
const necks=[[106,59],[104,54],[103,54],[101,53],[117,78],[121,69],[111,66],[105,57],[109,55],[113,58],[116,56],[118,48],[112,59],[114,61],[113,55],[119,52],[109,84],[116,56],[111,33],[108,20],[108,78],[103,43],[109,20],[108,20],[104,44],[104,48],[103,56],[106,71],[107,83],[108,96],[103,72],[102,54],[103,52],[107,48],[96,52],[103,48],[97,45],[86,50],[84,46],[101,42],[63,43],[111,68],[107,74],[115,92],[144,117],[127,88],[102,64],[104,39]];
const bottom=[173,174,173,173,173,171,173,173,165,164,164,141,165,164,165,149,170,170,148,114,170,152,107,135,143,152,167,170,169,170,170,170,168,167,167,167,166,166,166,165,158,158,157,159,159,160,159,160];
const animations={idle:{frames:[0,1,2,3],duration:1.8,loop:true},start:{frames:[4,5],duration:.12},stop:{frames:[6,7],duration:.16},run:{frames:[8,9,10,11,12,13,14,15],duration:.52,loop:true},jump:{frames:[16,17,18,19],duration:.5},doubleJump:{frames:[20,21,22,23],duration:.5},fall:{frames:[24,25,26,27],duration:.5},land:{frames:[28,29,30,31],duration:.13},punch:{frames:[32,33,34,35],duration:.27},kick:{frames:[36,37,38,39],duration:.39},hurt:{frames:[40,41],duration:.16},defeat:{frames:[42,43,44],duration:.65},recovery:{frames:[45,46,47],duration:.6}};
(async()=>{
 fs.mkdirSync(out,{recursive:true});let overlays=[],frames=[];
 for(let i=0;i<48;i++){
  let dx=28,dy=230-bottom[i],angle=0;
  // Remove storyboard jump displacement; world physics owns the trajectory.
  if([11,15,18,19,21,22,23,24,25,26,27].includes(i))dy=112-necks[i][1];
  if(i===44){dx=10;angle=1.22;}else if(i===43)angle=.72;else if(i===45)angle=.5;else if(i===40)angle=-.20;
  const tile=await sharp(source).extract({left:i%8*181,top:Math.floor(i/8)*181,width:181,height:181}).png().toBuffer();
  overlays.push({input:tile,left:i%8*256+dx,top:Math.floor(i/8)*256+dy});
  const head=[necks[i][0]+dx,necks[i][1]+dy,angle];
  let hand=[head[0]+18,head[1]+58];
  if(i===34)hand=[dx+163,dy+64];
  frames.push({rect:[i%8*256,Math.floor(i/8)*256,256,256],head,hand});
 }
 await sharp({create:{width:2048,height:1536,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(overlays).webp({lossless:true}).toFile(path.join(out,'body.webp'));
 const manifest={version:1,id:'kingjames-original',label:'KingJames Original Red-and-Black Hero Suit',rig:'action-chibi-v1',atlas:'body.webp',cell:[256,256],foot:[128,230],worldScale:.62,strideDistance:164,head:{scale:.62},directions:{right:{mirror:false},left:{mirror:true}},cape:'none-in-approved-original',frames,animations};
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log('Packed 48 complete body frames; 13 animation states; no head pixels or limb rig.');
})().catch(e=>{console.error(e);process.exitCode=1;});
