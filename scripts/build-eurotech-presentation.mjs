/** Rebuild a local, inert HTML presentation from reviewed public DOM references.
 * No live commerce scripts, account data, analytics or remote resources are shipped.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {parseFragment,serialize} from 'parse5';
const base='public/work-demos/eurotech';
await fs.mkdir(`${base}/assets`,{recursive:true});
const cache=new Map();
const manifest=[];
async function asset(raw,origin='https://eurotech.uy/'){
 if(!raw||raw.startsWith('data:')||raw.startsWith('#'))return raw;
 const url=new URL(raw,origin);if(!['eurotech.uy','fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname))return '';
 const key=url.href;if(cache.has(key))return cache.get(key);
 const task=(async()=>{
  const name=crypto.createHash('sha256').update(key).digest('hex').slice(0,14)+(path.extname(url.pathname)||'.css');
  const dest=`assets/${name}`;const disk=`${base}/${dest}`;
  let bytes;
  try{bytes=await fs.readFile(disk);}catch{const response=await fetch(key);if(!response.ok)throw Error(`${response.status} ${key}`);bytes=Buffer.from(await response.arrayBuffer());}
  if(name.endsWith('.css')){
   let css=bytes.toString();const refs=[...css.matchAll(/url\(\s*['"]?([^'"\)]+)['"]?\s*\)/g)];
   for(const match of refs){if(match[1].startsWith('data:')||match[1].startsWith('#')||!match[1].includes('/')&&match[1].match(/^[a-f0-9]{14}\./))continue;const local=await asset(match[1],key);css=css.replaceAll(match[0],`url("${local.replace('assets/','')}")`);}bytes=Buffer.from(css);
  }
  await fs.writeFile(disk,bytes);manifest.push({source:key,file:dest});return dest;
 })();cache.set(key,task);return task;
}
function attr(node,name){return node.attrs?.find(a=>a.name===name)?.value||'';}
function walk(node,fn){fn(node);node.childNodes?.forEach(child=>walk(child,fn));}
for(const [input,output] of [['home','inicio'],['catalogo','catalogo'],['producto','producto']]){
 const data=JSON.parse(await fs.readFile(`output/work-references/eurotech-${input}-dom.json`,'utf8'));
 const tree=parseFragment(data.header+data.main);
 if(input==='home')walk(tree,node=>{if(node.tagName==='article'){const hero=node.childNodes?.find(child=>attr(child,'class').includes('wp-block-columns'));if(hero)node.childNodes=[hero];}});
 walk(tree,node=>{
  if(!node.childNodes)return;
  node.childNodes=node.childNodes.filter(child=>!['script','noscript','iframe'].includes(child.tagName)&&!(child.tagName==='input'&&attr(child,'type')==='hidden')&&!attr(child,'class').includes('related products'));
 });
 const jobs=[];
 walk(tree,node=>{
  if(!node.attrs)return;
  node.attrs=node.attrs.filter(a=>!/^on/i.test(a.name)&&!['srcset','sizes','action','formaction','target','nonce','integrity','loading','data-srcset'].includes(a.name));
  for(const a of node.attrs){
   if(a.name==='href'&&node.tagName==='a')a.value='#';
   if(a.name==='src'&&node.tagName==='img')jobs.push(async()=>{a.value=await asset(a.value);});
   if(a.name==='style')jobs.push(async()=>{for(const m of [...a.value.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)])a.value=a.value.replaceAll(m[0],`url('${await asset(m[1])}')`);});
  }
  if(node.tagName==='img')node.attrs.push({name:'decoding',value:'async'});
 });
 for(let i=0;i<jobs.length;i+=5)await Promise.all(jobs.slice(i,i+5).map(run=>run()));
 const css=[];for(const url of data.styles){if(url.includes('leaflet'))continue;css.push(await asset(url));}
 const inline=data.inlineStyles||JSON.parse(await fs.readFile('output/work-references/eurotech-home-dom.json','utf8')).inlineStyles;
 const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Eurotech · ${output} · Presentación</title>${css.map(file=>`<link rel="stylesheet" href="${file}">`).join('')}<style>${inline||''}\nhtml,body{overflow:hidden!important;scrollbar-width:none}body{margin:0}.et-site-header{position:relative!important}.swiper-wrapper{transform:none!important}.ecw-hero-slider__slide,.ecw-hero-banner__slide{width:100%!important}.swiper-slide{flex-shrink:0}.swiper-slide:not(:first-child){visibility:hidden}.et-mega-menu,.et-mega-overlay,.et-mobile-menu,.et-mobile-menu-overlay{display:none!important}</style></head><body class="${data.bodyClass}">${serialize(tree)}</body></html>`;
 await fs.writeFile(`${base}/${output}.html`,html);console.log(`${output}: ${html.length} bytes`);
}
await fs.writeFile(`${base}/sources.json`,JSON.stringify(manifest,null,2));
