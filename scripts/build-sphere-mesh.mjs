// Static counterpart of the spherical surface field used by spherical-logo.ts.
import sharp from 'sharp';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import { MeshBasicMaterial } from 'three';
import { writeFileSync } from 'node:fs';
const {data,info}=await sharp('public/models/neuraz-sphere-field.png').raw().toBuffer({resolveWithObject:true});
function mask(x,y){
 const u=Math.max(0,Math.min(511,(x/2.2+.5)*511)),v=Math.max(0,Math.min(511,(.5-y/2.2)*511));
 const ix=Math.floor(u),iy=Math.floor(v),fx=u-ix,fy=v-iy;
 const at=(a,b)=>data[(b*info.width+a)*info.channels];
 return ((at(ix,iy)*(1-fx)*(1-fy)+at(Math.min(511,ix+1),iy)*fx*(1-fy)+at(ix,Math.min(511,iy+1))*(1-fx)*fy+at(Math.min(511,ix+1),Math.min(511,iy+1))*fx*fy)/255-.5)*.4;
}
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
const size=160,extent=1.28,mc=new MarchingCubes(size,new MeshBasicMaterial(),false,false,800000);mc.isolation=0;
for(let z=0;z<size;z++)for(let y=0;y<size;y++)for(let x=0;x<size;x++){
 const p=[x,y,z].map(v=>(v-size/2)/(size/2)*extent),r=Math.hypot(...p),n=p.map(v=>v/Math.max(r,.001));
 let d=mask(p[0],p[1]);const shell=Math.abs(r-1.02)-.10,rim=.88-Math.hypot(p[0],p[1]);
 const u=Math.max(0,Math.min(1,.5+.5*(rim-shell)/.06));
 const joined=rim*(1-u)+shell*u-.06*u*(1-u);
 const w=Math.abs(p[1])/Math.max(Math.abs(p[0])+Math.abs(p[1]),.001);
 const side=mask(p[2],p[1])*(1-w)+mask(p[0],p[2])*w;
 const weight=1-smooth(.15,.40,Math.abs(p[2]));
 const cut=side-.005-(1-weight)*.3,c=Math.max(0,Math.min(1,.5+.5*(cut-d)/.045));
 d=d*(1-c)+cut*c+.045*c*(1-c);
 const envelope=Math.max(r-1.12,joined);
 const h=Math.max(0,Math.min(1,.5+.5*(envelope-d)/.10));
 mc.field[x+y*size+z*size*size]=-(d*(1-h)+envelope*h+.10*h*(1-h));
}
mc.update();if(mc.count*3>mc.positionArray.length)throw Error('Mesh capacity exceeded');const vertices=mc.positionArray.slice(0,mc.count*3);for(let i=0;i<vertices.length;i++)vertices[i]*=extent;
writeFileSync('/tmp/neuraz-sphere-mesh.bin',Buffer.from(vertices.buffer));
console.log(`${mc.count/3} rounded surface triangles exported`);
