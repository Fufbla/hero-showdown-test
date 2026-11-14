// Retain the connected whole-character pose and its one-pixel antialias edge.
// This changes transparency, not the costume's colors or authored pose.
export function removeDetachedPixels(data,w,h){
 const labels=new Int32Array(w*h),queue=new Uint32Array(w*h);let label=0,best=0,size=0;
 for(let p=0;p<labels.length;p++){
  if(labels[p]||data[p*4+3]<64)continue;let start=0,end=1;queue[0]=p;labels[p]=++label;
  while(start<end){const at=queue[start++],x=at%w,y=Math.floor(at/w);for(const next of [x?at-1:-1,x<w-1?at+1:-1,y?at-w:-1,y<h-1?at+w:-1])if(next>=0&&!labels[next]&&data[next*4+3]>=64){labels[next]=label;queue[end++]=next;}}
  if(end>size){size=end;best=label;}
 }
 const keep=new Uint8Array(w*h);
 for(let p=0;p<labels.length;p++)if(labels[p]===best){const x=p%w,y=Math.floor(p/w);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h)keep[p+dy*w+dx]=1;}
 for(let p=0;p<keep.length;p++)if(!keep[p])data[p*4+3]=0;
}
