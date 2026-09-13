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
const size=160,extent=1.28,mc=new MarchingCubes(size,new MeshBasicMaterial(),false,false,500000);mc.isolation=0;
for(let z=0;z<size;z++)for(let y=0;y<size;y++)for(let x=0;x<size;x++){
 const p=[x,y,z].map(v=>(v-size/2)/(size/2)*extent),r=Math.hypot(...p),n=p.map(v=>v/Math.max(r,.001));
 const w=n.map(v=>Math.abs(v)**6),sum=w.reduce((a,b)=>a+b,0)||1;
 const d=(mask(n[0]*1.1,n[1]*1.1)*w[2]+mask(n[2]*1.1,n[1]*1.1)*w[0]+mask(n[0]*1.1,n[2]*1.1)*w[1])/sum+.012;
 mc.field[x+y*size+z*size*size]=-(Math.hypot(Math.max(d+.09,0),r-1.12)-.09);
}
mc.update();const vertices=mc.positionArray.slice(0,mc.count*3);for(let i=0;i<vertices.length;i++)vertices[i]*=extent;
writeFileSync('/tmp/neuraz-sphere-mesh.bin',Buffer.from(vertices.buffer));
console.log(`${mc.count/3} rounded surface triangles exported`);
