import fs from 'node:fs/promises';
import path from 'node:path';
import {parseFragment,serialize} from 'parse5';
const root='/Volumes/Emil/neuraz/projects/west/west-web';
const dest='public/work-demos/west';await fs.mkdir(dest+'/assets',{recursive:true});
const data=JSON.parse(await fs.readFile('output/work-references/west-original-dom.json','utf8'));
let css=await (await fetch(data.styles[0])).text();
for(const match of [...css.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)]){
 if(!match[1].includes('/_next/static/media/'))continue;
 const filename=path.basename(match[1]);const bytes=await (await fetch(new URL(match[1],data.styles[0]))).arrayBuffer();await fs.writeFile(`${dest}/assets/${filename}`,Buffer.from(bytes));css=css.replaceAll(match[0],`url('assets/${filename}')`);
}
await fs.writeFile(`${dest}/original.css`,css);
function walk(node,fn){fn(node);node.childNodes?.forEach(child=>walk(child,fn));}
for(const [index,view] of ['inicio','equipo','proceso'].entries()){
 const tree=parseFragment(data.header+data.sections[index]);const jobs=[];
 walk(tree,node=>{
  if(!node.attrs)return;
  node.attrs=node.attrs.filter(a=>!['srcset','sizes','loading','data-nimg'].includes(a.name)&&!a.name.startsWith('on'));
  for(const attr of node.attrs){
   if(attr.name==='href')attr.value='#';
   if(attr.name==='style')attr.value=attr.value.replace(/opacity:\s*[\d.]+/g,'opacity:1').replace(/transform:[^;]+/g,'transform:none');
   if(attr.name==='src'){
    let source=attr.value;if(source.startsWith('/_next/image'))source=new URL(source,'http://localhost:3104').searchParams.get('url');
    if(!source?.startsWith('/'))continue;
    const name=path.basename(source);jobs.push(fs.copyFile(root+'/public'+source,`${dest}/assets/${name}`));attr.value='assets/'+name;
   }
  }
 });await Promise.all(jobs);
 await fs.writeFile(`${dest}/${view}.html`,`<!doctype html><html lang="es" class="${data.htmlClass}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>West · ${view}</title><link rel="stylesheet" href="original.css"><style>html,body{overflow:hidden!important;margin:0}body{isolation:isolate}header{position:relative!important;margin-bottom:0!important}body>section{min-height:calc(100vh - 64px)!important;z-index:0!important}body>section>div{z-index:1}body>section>div.absolute{z-index:-1!important}body>section img{opacity:1}body>section>div.max-w-7xl{position:relative}a{pointer-events:none}${view==='proceso'?'body>section{padding-top:36px!important;padding-bottom:36px!important}body>section>div h2{margin-bottom:32px!important}body>section>img{opacity:.5!important}':''}</style></head><body class="${data.bodyClass}">${serialize(tree)}</body></html>`);
}
console.log('West: HTML, CSS, tipografías y recursos originales copiados.');
