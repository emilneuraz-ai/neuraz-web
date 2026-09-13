import fs from 'node:fs';
import sharp from 'sharp';
const motion=JSON.parse(fs.readFileSync('public/models/neuraz-logo-motion.json'));
const original=fs.readFileSync('public/images/isotipo.svg','utf8');
const N=512, tiles=3, out=new Uint8Array(N*N*9);
function distance(mask,target){const d=new Float32Array(N*N);for(let i=0;i<d.length;i++)d[i]=(mask[i]>127)===target?0:1e5;for(let y=0;y<N;y++)for(let x=0;x<N;x++){const i=y*N+x;if(x)d[i]=Math.min(d[i],d[i-1]+1);if(y){d[i]=Math.min(d[i],d[i-N]+1);if(x)d[i]=Math.min(d[i],d[i-N-1]+Math.SQRT2);if(x<N-1)d[i]=Math.min(d[i],d[i-N+1]+Math.SQRT2);}}for(let y=N-1;y>=0;y--)for(let x=N-1;x>=0;x--){const i=y*N+x;if(x<N-1)d[i]=Math.min(d[i],d[i+1]+1);if(y<N-1){d[i]=Math.min(d[i],d[i+N]+1);if(x)d[i]=Math.min(d[i],d[i+N-1]+Math.SQRT2);if(x<N-1)d[i]=Math.min(d[i],d[i+N+1]+Math.SQRT2);}}return d;}
for(let frame=0;frame<9;frame++){
 const path=frame?motion.paths[motion.timeline[(frame-1)*24]]:null;
 const svg=frame?`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 129 130"><path fill="black" d="${path}"/></svg>`:original;
 const {data}=await sharp(Buffer.from(svg)).resize(N,N,{fit:'fill'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const mask=Uint8Array.from({length:N*N},(_,i)=>data[i*4+3]);const inside=distance(mask,true),outside=distance(mask,false);
 for(let i=0;i<N*N;i++){const signed=(inside[i]-outside[i])*2.2/N;out[frame*N*N+i]=Math.round(Math.max(0,Math.min(1,.5+signed/.4))*255);}
}
const atlas=new Uint8Array(N*N*9);for(let f=0;f<9;f++)for(let y=0;y<N;y++)atlas.set(out.subarray(f*N*N+y*N,f*N*N+(y+1)*N),(Math.floor(f/3)*N+y)*N*3+(f%3)*N);
await sharp(atlas,{raw:{width:N*3,height:N*3,channels:1}}).png().toFile('public/models/neuraz-sphere-field.png');
console.log('Sphere distance atlas generated from original SVG + 8 fluid keyframes');
