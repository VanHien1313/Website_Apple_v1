import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {expansion} from './catalog-expansion.mjs';
const dir=new URL('./catalog/',import.meta.url), research=new URL('../logs/catalog-research/',import.meta.url);
const sharp=createRequire(new URL('../backend/package.json',import.meta.url))('sharp');
const id=key=>{const h=createHash('sha256').update('aura-catalog-expansion-v1:'+key).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
let sources;
if(process.argv.includes('--capture-sources')){
 sources=[];
 for(const p of expansion){
  const page=JSON.parse(await fs.readFile(new URL(p.retailer+'.json',research),'utf8'));
  const imagePage=p.imageRetailer?JSON.parse(await fs.readFile(new URL(p.imageRetailer+'.json',research),'utf8')):page;
  const schema=page.schemas.find(s=>s['@type']==='Product'&&Number(s.offers?.price)>0);
  const imageSchema=imagePage.schemas.find(s=>s['@type']==='Product');
  if(!schema||!imageSchema||page.status!==200)throw Error('No verified price/image: '+p.slug);
  const price=Number(schema.offers.price);if(!Number.isSafeInteger(price)||price<1000000)throw Error('Invalid price');
  sources.push({slug:p.slug,retailer:page.url,retailerTitle:schema.name,price,priceCurrency:'VND',availability:schema.offers.availability??'not-specified',imageSourcePage:imagePage.url,image:Array.isArray(imageSchema.image)?imageSchema.image[0]:imageSchema.image,technicalSource:'https://support.apple.com/vi-vn/'+p.apple,checkedOn:'2026-11-11'});
 }
 await fs.writeFile(new URL('expansion-sources.json',dir),JSON.stringify(sources,null,2));
}else sources=JSON.parse(await fs.readFile(new URL('expansion-sources.json',dir),'utf8'));
const bundle=JSON.parse(await fs.readFile(new URL('catalog.json',dir),'utf8'));
const newIds=new Set(expansion.map(p=>id(p.slug)));
bundle.products=bundle.products.filter(p=>!newIds.has(p.id));
// Existing catalog facts are reorganized, not represented as newly verified manufacturer data.
for(const p of bundle.products){
 if(p.detailedSpecs?.length)continue;
 p.detailedSpecs=[{groupName:'Thông số sản phẩm',items:p.keySpecs},
 {groupName:'Cấu hình trong cửa hàng',items:p.configurations.map((c,i)=>({label:'Cấu hình '+(i+1),value:[c.storage,c.screenSize,c.connectivity,c.chip].filter(Boolean).join(' · ')||'Theo SKU'}))},
 {groupName:'Màu sắc và bảo hành',items:[{label:'Màu sắc',value:p.colors.map(c=>c.name).join(', ')},{label:'Bảo hành',value:p.warrantyInfo}]},
 {groupName:'Thông tin tham khảo',items:[{label:'Nguồn dữ liệu',value:'Catalog frontend ban đầu; giá và tồn là dữ liệu phục vụ đồ án, chưa đối chiếu lại từng thông số.'}]}];
}
for(const p of expansion){
 const s=sources.find(s=>s.slug===p.slug);if(!s)throw Error('Missing source');
 const host=new URL(s.image).hostname;if(!['cdn.topzone.vn','cdn2.cellphones.com.vn','cdn.tgdd.vn'].includes(host))throw Error('Unexpected image host');
 const mediaId=id('image:'+s.image),file='images/'+mediaId+'.webp';let bytes;
 try{bytes=await fs.readFile(new URL(file,dir));}catch{
  const r=await fetch(s.image,{signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('Image HTTP '+r.status);
  const raw=Buffer.from(await r.arrayBuffer());if(raw.length>10000000)throw Error('Image too large');
  bytes=await sharp(raw,{limitInputPixels:16000000}).resize({width:1000,height:1000,fit:'inside',withoutEnlargement:true}).webp({quality:88}).toBuffer();await fs.writeFile(new URL(file,dir),bytes);
 }
 const meta=await sharp(bytes).metadata(),asset={id:mediaId,source:s.image,file,width:meta.width,height:meta.height,sha256:createHash('sha256').update(bytes).digest('hex')};
 if(!bundle.media.some(m=>m.id===mediaId))bundle.media.push(asset);
 const thumbnail='/api/v1/media/'+mediaId,configurationId=id(p.slug+':configuration'),colorId=id(p.slug+':color');
 const sourceName=new URL(s.retailer).hostname.includes('cellphones')?'CellphoneS':'TopZone';
 const details=[...p.details,{groupName:'Phiên bản và nguồn tham khảo',items:[{label:'Cấu hình bán',value:p.storage},{label:'Màu trong catalog',value:p.color},{label:'Thông số',value:'Apple Support '+p.apple},{label:'Giá tham khảo',value:sourceName+' · ghi nhận '+s.checkedOn+'; giá có thể thay đổi'},{label:'Tồn kho',value:'Dữ liệu mô phỏng phục vụ đồ án, không phải tồn kho của nhà bán lẻ.'}]}];
 bundle.products.push({id:id(p.slug),slug:p.slug,name:p.name,categoryId:p.category,active:true,tagline:p.tagline,subCategory:p.category==='iphone'?(p.slug.includes('pro')?'Pro Series':'Standard'):p.category==='ipad'?(p.chip==='M3'?'Air':'Standard'):p.category==='mac'?'MacBook Air':p.slug.includes('se')?'SE':'Series',badge:'Mới',thumbnail,gallery:[thumbnail],description:p.description,keySpecs:p.details.flatMap(g=>g.items).slice(0,8),detailedSpecs:details,warrantyInfo:'Tham khảo bảo hành giới hạn một năm của Apple theo điều kiện và chứng từ hợp lệ. Website đồ án không thực hiện bán hàng hoặc bảo hành thực tế.',configurations:[{id:configurationId,storage:p.storage,chip:p.chip,connectivity:p.category==='ipad'?'Wi-Fi':p.category==='watch'?'GPS':''}],colors:[{id:colorId,name:p.color,hex:p.hex,image:thumbnail}],skus:[{id:id(p.slug+':sku'),configurationId,colorId,sku:'AURA-NEW-'+p.slug.toUpperCase(),price:s.price,originalPrice:s.price,onHand:p.outOfStock?0:10}]});
}
bundle.version=2;await fs.writeFile(new URL('catalog.json',dir),JSON.stringify(bundle,null,2));
console.log(JSON.stringify({products:bundle.products.length,skus:bundle.products.reduce((n,p)=>n+p.skus.length,0),images:bundle.media.length,newProducts:expansion.length}));
