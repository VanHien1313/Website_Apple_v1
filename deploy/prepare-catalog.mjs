// Prepare the original frontend catalog for SQL import. No database writes.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(new URL('../frontend/package.json',import.meta.url));
const ts=require('typescript');
const sharp=createRequire(new URL('../backend/package.json',import.meta.url))('sharp');
const root=path.resolve(import.meta.dirname,'..'), dir=path.join(root,'deploy/catalog');
await fs.mkdir(path.join(dir,'images'),{recursive:true});
const source=await fs.readFile(path.join(root,'frontend/src/data/mockProducts.ts'),'utf8');
const context={exports:{}};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
const originals=context.exports.MOCK_PRODUCTS;
export const catalogId=key=>{const h=createHash('sha256').update('aura-original-catalog-v1:'+key).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const urls=[...new Set(originals.flatMap(p=>[p.thumbnail,...p.gallery,...p.colors.map(c=>c.image)]))];
const media=[], failures=[];
for(const url of urls){
  if(!['cdn.topzone.vn','cdn.tgdd.vn','store.storeimages.cdn-apple.com'].includes(new URL(url).hostname))throw Error('Unexpected asset host');
  const id=catalogId('image:'+url), file=`images/${id}.webp`;
  try {
    let buffer;
    try {buffer=await fs.readFile(path.join(dir,file));} catch {
      const response=await fetch(url,{signal:AbortSignal.timeout(25000)});
      if(!response.ok)throw Error('HTTP '+response.status);
      const raw=Buffer.from(await response.arrayBuffer());
      if(raw.length>10000000)throw Error('Oversized asset');
      buffer=await sharp(raw,{limitInputPixels:16000000}).resize({width:1000,height:1000,fit:'inside',withoutEnlargement:true}).webp({quality:88}).toBuffer();
      await fs.writeFile(path.join(dir,file),buffer);
    }
    const meta=await sharp(buffer).metadata();
    media.push({id,source:url,file,width:meta.width,height:meta.height,sha256:createHash('sha256').update(buffer).digest('hex')});
  }catch(error){failures.push({url,error:error.message});}
}
await fs.writeFile(path.join(dir,'asset-results.json'),JSON.stringify({media,failures},null,2));
if(failures.length){console.log(JSON.stringify({downloaded:media.length,failures}));process.exitCode=1;}
else {
  const image=url=>'/api/v1/media/'+catalogId('image:'+url);
  const products=originals.map(p=>({id:catalogId(p.id),slug:p.slug,name:p.name,categoryId:p.category,active:true,tagline:p.tagline,badge:p.badge,subCategory:p.subCategory,thumbnail:image(p.thumbnail),gallery:p.gallery.map(image),description:p.description,keySpecs:p.keySpecs,detailedSpecs:p.detailedSpecs??[],warrantyInfo:p.warrantyInfo,
    configurations:p.variants.map(v=>({id:catalogId(p.id+':'+v.id),storage:v.storage,screenSize:v.screenSize,connectivity:v.connectivity,chip:v.chip})),
    colors:p.colors.map(c=>({...c,id:catalogId(p.id+':'+c.id),image:image(c.image)})),
    skus:p.variants.flatMap(v=>p.colors.map((c,i)=>({id:catalogId(p.id+':'+v.id+':'+c.id),configurationId:catalogId(p.id+':'+v.id),colorId:catalogId(p.id+':'+c.id),sku:v.sku+'-C'+(i+1),price:v.price,originalPrice:v.originalPrice,onHand:v.inStock?10:0}))) }));
  await fs.writeFile(path.join(dir,'catalog.json'),JSON.stringify({version:1,categories:[{id:'iphone',name:'iPhone'},{id:'ipad',name:'iPad'},{id:'mac',name:'Mac'},{id:'watch',name:'Apple Watch'}],media,products},null,2));
  console.log(JSON.stringify({products:products.length,skus:products.reduce((n,p)=>n+p.skus.length,0),images:media.length}));
  // Preserve the researched expansion when regenerating the original dataset.
  await import('./build-expanded-catalog.mjs');
}

