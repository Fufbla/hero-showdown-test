// Registered separation mattes for the original approved default hairstyles.
// Coordinates are local to each original turnaround head plate. They remove
// the *entire* old face/ear/accessory, not individual facial-feature patches.
// Hair RGB, cuffs and silhouette are retained; these are alpha-only mattes.
export function separateNativeHair(context,sex,view){
 const polygon=points=>{context.beginPath();points.forEach(([x,y],i)=>i?context.lineTo(x,y):context.moveTo(x,y));context.closePath();context.fill();};
 const oval=(x,y,rx,ry)=>{context.beginPath();context.ellipse(x,y,rx,ry,0,0,Math.PI*2);context.fill();};
 context.save();context.globalCompositeOperation='destination-out';context.fillStyle='#000';
 if(view==='side'&&sex==='female'){
  polygon([[207,66],[193,68],[181,69],[169,71],[160,75],[158,82],[153,87],[151,94],[147,101],[145,108],[146,123],[139,116],[135,112],[128,112],[123,115],[120,121],[120,130],[124,137],[130,140],[141,143],[144,159],[162,168],[215,168]]);
  oval(139,150,11.5,14.5);
 }else if(view==='side'){
  polygon([[166,78],[151,79],[139,78],[128,78],[120,81],[118,90],[113,96],[109,105],[108,126],[102,119],[96,115],[89,115],[82,118],[78,125],[78,135],[83,145],[92,150],[101,148],[104,156],[117,166],[174,175]]);
 }else if(sex==='female'){
  polygon([[16,118],[21,121],[22,127],[27,135],[30,142],[21,143],[13,138],[11,130]]);
  polygon([[134,124],[138,127],[140,136],[138,143],[132,144],[129,138]]);
  oval(27,152,9.8,13);oval(132,152,10,13);
 }else {
  polygon([[35,119],[41,122],[42,129],[45,136],[49,143],[44,148],[35,145],[30,139],[29,130]]);
  polygon([[131,120],[137,122],[141,130],[140,140],[134,147],[125,148],[123,142],[128,134]]);
 }
 context.restore();
}
