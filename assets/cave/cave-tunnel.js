/* A continuous, world-space cavern. Every surface travels past the camera. */
(function(){'use strict';
const TAU=Math.PI*2,STEP=3.2,FAR=112;
const profile=[[8,0],[8.3,1.5],[7.7,3.25],[6.1,4.7],[3.4,5.7],[0,6.1],[-3.4,5.7],[-6.1,4.7],[-7.7,3.25],[-8.3,1.5],[-8,0],[-5.2,0],[-2.6,0],[0,0],[2.6,0],[5.2,0]];
const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const bend=z=>Math.sin(z*.012)*2.2+Math.sin(z*.027)*.55;
const VERTEX=`attribute vec3 aPosition;attribute vec3 aNormal;attribute vec3 aColor;attribute float aMaterial;
uniform vec3 uCamera;uniform vec2 uScale;uniform vec2 uYaw;uniform float uHorizon;
varying vec3 vWorld;varying vec3 vNormal;varying vec3 vColor;varying float vMaterial;varying float vDepth;
void main(){vec3 p=aPosition-uCamera;float x=p.x*uYaw.x-p.z*uYaw.y;float z=p.x*uYaw.y+p.z*uYaw.x;
gl_Position=vec4(x*uScale.x,p.y*uScale.y+uHorizon*z,1.002503*z-.280350,z);
vWorld=aPosition;vNormal=aNormal;vColor=aColor;vMaterial=aMaterial;vDepth=z;}`;
const FRAGMENT=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D uStone;uniform vec3 uCamera;uniform float uTime;
varying vec3 vWorld;varying vec3 vNormal;varying vec3 vColor;varying float vMaterial;varying float vDepth;
float noise(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){vec3 n=normalize(vNormal),weights=pow(abs(n),vec3(4.0));weights/=max(.01,weights.x+weights.y+weights.z);
vec3 tex=texture2D(uStone,vWorld.yz*.27).rgb*weights.x+texture2D(uStone,vWorld.xz*.27).rgb*weights.y+texture2D(uStone,vWorld.xy*.27).rgb*weights.z;
vec3 p=vWorld-uCamera;vec3 l1=vec3(-4.8,1.8,7.0)-p,l2=vec3(5.7,.5,14.0)-p;
float warm=max(0.0,dot(n,normalize(l1)))/(1.0+dot(l1,l1)*.008);
float cool=max(0.0,dot(n,normalize(l2)))/(1.0+dot(l2,l2)*.006);
float front=max(0.0,dot(n,normalize(vec3(0.0,.8,4.0)-p)))*.38;
vec3 lit=vec3(.14,.18,.24)+vec3(1.2,.83,.48)*warm+vec3(.44,.65,.9)*cool+vec3(.34,.4,.42)*front;
vec3 color=vColor*(.52+tex*1.65)*lit;
if(vMaterial>.5){float vein=abs(sin(vWorld.x*4.1+sin(vWorld.z*2.7)*.7));color*=.68+.18*vein;
vec3 eye=normalize(-p),halfVector=normalize(normalize(l1)+eye);float spec=pow(max(0.0,dot(n,halfVector)),52.0);
color+=vec3(.58,.48,.31)*spec*.36;
if(vMaterial>1.5){float ripple=sin(vWorld.x*22.0+vWorld.z*16.0+uTime*2.0)*.5+.5;float fres=pow(1.0-max(0.0,dot(n,eye)),3.0);
color=mix(color,vec3(.15,.21,.25),.5)+vec3(.35,.40,.41)*fres*.23+vec3(.8,.62,.37)*spec*(.4+ripple*.6);}}
float fog=1.0-exp(-pow(max(0.0,vDepth-10.0)*.031,1.75));color=mix(color,vec3(.016,.023,.031),clamp(fog,0.0,1.0));
gl_FragColor=vec4(color,1.0);}`;
class CaveTunnel3D{
 constructor(images){this.images=images;this.canvas=document.createElement('canvas');this.canvas.className='cave-tunnel';this.canvas.setAttribute('aria-hidden','true');this.w=1;this.h=1;this.dpr=1;this.lastSegment=null;this.vertices=[];this.faces=[];this.dead=false;this.textureReady=false;this.camera={travel:0,x:0,y:2.1,yaw:0};
  this.lost=e=>{e.preventDefault();this.available=false;};this.restored=()=>{if(!this.dead){this.init();this.lastSegment=null;}};
  this.canvas.addEventListener('webglcontextlost',this.lost);this.canvas.addEventListener('webglcontextrestored',this.restored);this.init();
 }
 init(){try{const gl=this.canvas.getContext('webgl',{alpha:false,antialias:false,depth:true,powerPreference:'high-performance'});if(!gl){this.available=false;return;}this.gl=gl;
  const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
  const vs=shader(gl.VERTEX_SHADER,VERTEX),fs=shader(gl.FRAGMENT_SHADER,FRAGMENT),program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));this.program=program;
  this.buffer=gl.createBuffer();this.texture=gl.createTexture();this.textureReady=false;gl.useProgram(program);this.locations={};for(const n of ['uCamera','uScale','uYaw','uHorizon','uTime','uStone'])this.locations[n]=gl.getUniformLocation(program,n);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);for(const [n,size,offset]of [['aPosition',3,0],['aNormal',3,12],['aColor',3,24],['aMaterial',1,36]]){const a=gl.getAttribLocation(program,n);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,40,offset);}
  gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.clearColor(.016,.023,.031,1);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([82,91,101,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);this.available=true;
 }catch(e){this.available=false;this.error=String(e);}}
 resize(w,h,dpr){this.w=w;this.h=h;this.dpr=dpr;this.softwareFrame=null;this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);if(this.gl)this.gl.viewport(0,0,this.canvas.width,this.canvas.height);}
 reset(){this.lastSegment=null;this.softwareTravel=null;}
 setCamera(model,clock){const travel=model.distance,run=model.state==='running'||model.state==='outro',bob=run?Math.sin(travel/4*TAU*2)*.012:0;this.camera={travel,x:bend(travel)+Math.sin(clock*83)*(this.shake||0)*.08,y:2.1+bob+Math.cos(clock*67)*(this.shake||0)*.05,yaw:Math.atan2(bend(travel+6)-bend(travel),6)};}
 project(x,y,z,travel=this.camera.travel){const c=this.camera,worldZ=travel+z,dx=bend(worldZ)+x-c.x,cos=Math.cos(c.yaw),sin=Math.sin(c.yaw),rx=dx*cos-z*sin,depth=Math.max(.2,dx*sin+z*cos),scale=this.h*.88/depth;return{x:this.w/2+rx*scale,y:this.h*.42+(c.y-y)*scale,s:scale,z:depth};}
 roof(x,z){return 6.1-1.7*Math.pow(Math.min(1,Math.abs(x)/8),1.65)+Math.sin(z*.18)*.2;}
 ring(i){const z=i*STEP;return profile.map(([x,y],j)=>{const floor=j>=10||j===0,n=hash(i*39+j*13),xx=x+(floor?.12:.42)*(n-.5)*2,yy=y+(floor?.035:.36)*(hash(i*47+j*19)-.5)*2+(floor?0:Math.sin(z*.18)*.2);return[bend(z)+xx,yy,z];});}
 triangle(a,b,c,color,material=0,center=null){const u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]);let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const mid=a.map((v,i)=>(v+b[i]+c[i])/3),want=center?mid.map((v,i)=>v-center[i]):[bend(mid[2])-mid[0],2-mid[1],0];if(n.reduce((s,v,i)=>s+v*want[i],0)<0)n=n.map(v=>-v);const len=Math.hypot(...n)||1;n=n.map(v=>v/len);
  for(const p of[a,b,c])this.vertices.push(...p,...n,...color,material);this.faces.push({p:[a,b,c],color,material,z:mid[2],normal:n});}
 rock(x,y,z,rx,ry,rz,seed){const center=[bend(z)+x,y,z],ring=[];for(let k=0;k<6;k++){const a=k*TAU/6,v=.8+hash(seed+k)*.4;ring.push([center[0]+Math.cos(a)*rx*v,y+(hash(seed+k+13)-.5)*ry*.22,z+Math.sin(a)*rz*v]);}const top=[center[0]+rx*.12,y+ry,z],bottom=[center[0]-rx*.1,y-ry,z];for(let k=0;k<6;k++){const shade=.32+hash(seed+k+20)*.16,col=[shade*.88,shade*.97,shade*1.10];this.triangle(top,ring[k],ring[(k+1)%6],col,0,center);this.triangle(bottom,ring[(k+1)%6],ring[k],col,0,center);}}
 stalactite(x,z,seed){const y=this.roof(x,z)-.2,base=[bend(z)+x,y,z],tip=[base[0]+.15,y-.7-hash(seed)*1.2,z+.1],radius=.22+hash(seed+1)*.35;for(let i=0;i<6;i++){let a=i*TAU/6,b=(i+1)*TAU/6;this.triangle([base[0]+Math.cos(a)*radius,y,z+Math.sin(a)*radius],[base[0]+Math.cos(b)*radius,y,z+Math.sin(b)*radius],tip,[.36,.38,.41],0,[base[0],y-.25,z]);}}
 build(first){this.vertices=[];this.faces=[];for(let i=first-1;i<first+37;i++){const a=this.ring(i),b=this.ring(i+1),seed=i*73;
  for(let j=0;j<profile.length;j++){const k=(j+1)%profile.length,floor=j>=10,mid=a[j].map((v,n)=>(v+a[k][n]+b[j][n]+b[k][n])/4);if(!floor){mid[0]+=(bend(mid[2])-mid[0])*.02;mid[1]+=(2-mid[1])*.02;}
   const shade=(floor?.26:.33)+hash(seed+j*3)*.15,color=[shade*.92,shade,shade*1.12];for(const [p,q]of[[a[j],a[k]],[a[k],b[k]],[b[k],b[j]],[b[j],a[j]]])this.triangle(p,q,mid,color,floor?1:0);
  }
  for(const side of[-1,1]){const x=side*(6.7+hash(seed+side)*.7),z=(i+.35)*STEP,y=.6+hash(seed+side+4)*2.2;this.rock(x,y,z,.65+hash(seed+11)*.6,.7+hash(seed+5)*1.1,1.1+hash(seed+7)*.7,seed+side);}
  if(i%2===0)this.stalactite((hash(seed+15)-.5)*9,(i+.55)*STEP,seed+30);
  if(i%3!==1){const z=(i+.65)*STEP,x=(hash(seed+40)-.5)*8,rx=.45+hash(seed+41)*1.25,rz=.35+hash(seed+42)*.8,c=[bend(z)+x,.05,z];for(let k=0;k<9;k++){let a=k*TAU/9,b=(k+1)*TAU/9;this.triangle(c,[c[0]+Math.cos(a)*rx,.05,z+Math.sin(a)*rz],[c[0]+Math.cos(b)*rx,.05,z+Math.sin(b)*rz],[.19,.25,.28],2);}}
  if(i%2===1)for(let j=0;j<2;j++){const z=(i+.22+j*.4)*STEP,x=(hash(seed+50+j)-.5)*9;this.rock(x,.07,z,.14,.13,.22,seed+j+70);}
 }
 this.count=this.vertices.length/10;if(this.available){this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.buffer);this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array(this.vertices),this.gl.DYNAMIC_DRAW);}this.lastSegment=first;this.buildSoftware(first);}
 buildSoftware(first){
  // Fewer surfaces and atlas-backed wall stones keep the no-WebGL path responsive.
  this.softwareFaces=[];const add=(p,material=0)=>{const mid=p[0].map((v,j)=>(v+p[1][j]+p[2][j])/3),n=material?[0,1,0]:[bend(mid[2])-mid[0],2-mid[1],0],len=Math.hypot(...n)||1;this.softwareFaces.push({p,material,z:mid[2],normal:n.map(x=>x/len),color:[.33,.36,.39]});};
  for(let i=first-1;i<first+29;){const stride=i<first+5?1:2,a=this.ring(i),b=this.ring(i+stride),seed=i*73;for(let j=0;j<profile.length;j++){const k=(j+1)%profile.length;add([a[j],a[k],b[k]],j>=10?1:0);add([a[j],b[k],b[j]],j>=10?1:0);}
   for(const side of[-1,1]){const z=(i+.5)*STEP;this.softwareFaces.push({sprite:Math.abs(i+side)%8,z,x:side*(6.9+hash(seed+side)*.4),y:.8+hash(seed+side+4)*1.7,rx:1.0+hash(seed+11)*.5,ry:1.25+hash(seed+5)*.8});}
   const z=(i+1.4)*STEP,x=(hash(seed+15)-.5)*9;this.softwareFaces.push({sprite:3,z,x,y:this.roof(x,z)-.55,rx:.24+hash(seed+30)*.12,ry:.8+hash(seed+31)*.35});
   const pz=(i+.65)*STEP,px=(hash(seed+40)-.5)*8,rx=.45+hash(seed+41)*1.25,rz=.35+hash(seed+42)*.8,c=[bend(pz)+px,.05,pz];for(let k=0;k<7;k++){let a=k*TAU/7,b=(k+1)*TAU/7;add([c,[c[0]+Math.cos(a)*rx,.05,pz+Math.sin(a)*rz],[c[0]+Math.cos(b)*rx,.05,pz+Math.sin(b)*rz]],2);}
   if(i%3) this.softwareFaces.push({sprite:Math.abs(i)%8,z:(i+.7)*STEP,x:(hash(seed+50)-.5)*8,y:.08,rx:.12,ry:.13});i+=stride;
  }
 }

 syncTexture(){if(this.textureReady||!this.images.rocks||!this.available)return;const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.fillStyle='#39414b';g.fillRect(0,0,256,256);g.drawImage(this.images.rocks,60,58,138,138,0,0,256,256);const gl=this.gl;gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);this.textureReady=true;}
 draw(model,clock,g){this.setCamera(model,clock);const first=Math.floor(model.distance/STEP);if(first!==this.lastSegment)this.build(first);this.canvas.style.display=this.available?'block':'none';if(!this.available){
   if(!this.softwareFrame){this.softwareFrame=document.createElement('canvas');const scale=Math.min(1,760/this.w,620/this.h);this.softwareScale=scale;this.softwareFrame.width=Math.round(this.w*scale);this.softwareFrame.height=Math.round(this.h*scale);this.softwareG=this.softwareFrame.getContext('2d',{alpha:false});this.softwareG.setTransform(scale,0,0,scale,0,0);this.softwareTravel=null;}
   if(this.softwareTravel===null||Math.abs(model.distance-this.softwareTravel)>1||(model.distance!==this.softwareTravel&&clock-this.softwareTime>=1/30)){this.fallback(this.softwareG);this.softwareTravel=model.distance;this.softwareTime=clock;}
   g.drawImage(this.softwareFrame,0,0,this.w,this.h);return;}
const gl=this.gl,c=this.camera;this.syncTexture();gl.useProgram(this.program);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform3f(this.locations.uCamera,c.x,c.y,c.travel);gl.uniform2f(this.locations.uScale,1.76*this.h/this.w,1.76);gl.uniform2f(this.locations.uYaw,Math.cos(c.yaw),Math.sin(c.yaw));gl.uniform1f(this.locations.uHorizon,.16);gl.uniform1f(this.locations.uTime,clock);gl.uniform1i(this.locations.uStone,0);gl.drawArrays(gl.TRIANGLES,0,this.count);}
 fallback(g){
  g.fillStyle='#040608';g.fillRect(0,0,this.w,this.h);const c=this.camera;
  if(!this.softwarePattern&&this.images.rocks){const tile=document.createElement('canvas');tile.width=tile.height=256;const tg=tile.getContext('2d');tg.fillStyle='#303945';tg.fillRect(0,0,256,256);tg.drawImage(this.images.rocks,57,56,142,142,0,0,256,256);this.softwarePattern=g.createPattern(tile,'repeat');}
  const sorted=this.softwareFaces.slice().sort((a,b)=>b.z-a.z);
  for(const face of sorted){
   if(face.z-c.travel>86||face.z-c.travel<-.5)continue;
   if(face.sprite!==undefined){if(face.z-c.travel<.3||!this.images.rocks)continue;const p=this.project(face.x,face.y,face.z-c.travel),w=p.s*face.rx*2,h=p.s*face.ry*2;if(p.x+w<0||p.x-w>this.w||p.y+h<0||p.y-h>this.h)continue;g.globalAlpha=Math.max(0,Math.exp(-Math.pow(Math.max(0,face.z-c.travel-8)*.035,1.7)))*.92;g.drawImage(this.images.rocks,face.sprite%4*256,Math.floor(face.sprite/4)*256,256,256,p.x-w/2,p.y-h/2,w,h);g.globalAlpha=1;continue;}

   // Clip the near plane, so the walls continue all the way past the camera.
   let verts=[];for(let k=0;k<3;k++){const a=face.p[k],b=face.p[(k+1)%3],da=a[2]-c.travel-2.9,db=b[2]-c.travel-2.9;if(da>=0)verts.push(a);if((da>=0)!==(db>=0)){const t=da/(da-db);verts.push(a.map((n,j)=>n+(b[j]-n)*t));}}
   if(verts.length<3)continue;
   const points=verts.map(p=>this.project(p[0]-bend(p[2]),p[1],p[2]-c.travel));
   if(points.every(p=>p.x<0)||points.every(p=>p.x>this.w)||points.every(p=>p.y<0)||points.every(p=>p.y>this.h))continue;
   const depth=Math.max(0,face.z-c.travel),fog=Math.max(.015,Math.exp(-Math.pow(Math.max(0,depth-8)*.034,1.65))),n=face.normal,mid=face.p[0].map((v,j)=>(v+face.p[1][j]+face.p[2][j])/3),dx=mid[0]-c.x,dy=mid[1]-c.y;
   const light=(x,y,z)=>{const v=[x-dx,y-dy,z-depth],d=Math.hypot(...v);return Math.max(0,n.reduce((s,a,j)=>s+a*v[j]/d,0))/(1+d*d*.007);};
   const warm=light(-4.8,1.8,7),cool=light(5.7,.5,14),brightness=Math.min(.96,(.43+warm*.73+cool*.42)*fog);
   g.beginPath();points.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.closePath();
   if(this.softwarePattern&&face.material<1.5&&depth<65){
    // Affine mapping of world coordinates, repeated continuously over the moving mesh.
    const dominant=Math.abs(n[0])>Math.abs(n[1])&&Math.abs(n[0])>Math.abs(n[2])?0:Math.abs(n[1])>Math.abs(n[2])?1:2;
    const uv=verts.map(p=>dominant===0?[p[2]*61,p[1]*61]:dominant===1?[p[0]*61,p[2]*61]:[p[0]*61,p[1]*61]);
    const u1=uv[1][0]-uv[0][0],v1=uv[1][1]-uv[0][1],u2=uv[2][0]-uv[0][0],v2=uv[2][1]-uv[0][1],det=u1*v2-u2*v1;
    if(Math.abs(det)>.001){const x1=points[1].x-points[0].x,y1=points[1].y-points[0].y,x2=points[2].x-points[0].x,y2=points[2].y-points[0].y,a=(x1*v2-x2*v1)/det,b=(y1*v2-y2*v1)/det,cc=(x2*u1-x1*u2)/det,d=(y2*u1-y1*u2)/det;
     g.save();g.clip();g.transform(a,b,cc,d,points[0].x-a*uv[0][0]-cc*uv[0][1],points[0].y-b*uv[0][0]-d*uv[0][1]);g.fillStyle=this.softwarePattern;const us=uv.map(p=>p[0]),vs=uv.map(p=>p[1]);g.fillRect(Math.min(...us)-1,Math.min(...vs)-1,Math.max(...us)-Math.min(...us)+2,Math.max(...vs)-Math.min(...vs)+2);g.restore();
     g.fillStyle='rgba(4,7,10,'+(1-brightness)+')';g.fill();g.strokeStyle='rgba(4,7,10,'+Math.min(.6,1-brightness)+')';g.lineWidth=.35;g.stroke();
     if(warm>cool){g.fillStyle='rgba(133,81,32,'+(warm*.11*fog)+')';g.fill();}
    }else{g.fillStyle='#12191f';g.fill();}
   }else{
    g.fillStyle='rgb('+face.color.map((v,i)=>Math.round((v*brightness*.65+[.016,.023,.031][i]*(1-fog))*255)).join(',')+')';g.fill();
    if(face.material>1.5){g.fillStyle='rgba(99,125,137,'+(.14*fog)+')';g.fill();g.strokeStyle='rgba(135,151,145,'+(.16*fog)+')';g.lineWidth=.65;g.stroke();}
   }
  }
 }
 dispose(){this.dead=true;this.canvas.removeEventListener('webglcontextlost',this.lost);this.canvas.removeEventListener('webglcontextrestored',this.restored);const gl=this.gl;if(gl){gl.deleteBuffer(this.buffer);gl.deleteTexture(this.texture);gl.deleteProgram(this.program);}this.canvas.remove();this.vertices=[];this.faces=[];this.softwareFrame=null;this.softwareG=null;this.softwarePattern=null;this.softwareFaces=[];}
}
window.HealthiaCaveTunnel=CaveTunnel3D;
})();
