// Explicit, repeatable catalog preparation. Never runs at application startup.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {historicalAirpods} from './airpods-history.mjs';
const sharp=createRequire(new URL('../backend/package.json',import.meta.url))('sharp');

const directory=new URL('./catalog/',import.meta.url);
const sources=JSON.parse(await fs.readFile(new URL('airpods-sources.json',directory),'utf8'));
const uuid=(key)=>{const h=createHash('sha256').update('aura-airpods:'+key).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;};
const media=[];
const images=new Map();
await fs.mkdir(new URL('images/',directory),{recursive:true});
for(const [key,source] of Object.entries(sources.assets)){
 const id=uuid('image:'+key),file=`images/${id}.webp`,destination=new URL(file,directory);
 let bytes;
 try{bytes=await fs.readFile(destination);}catch(error){
  if(error.code!=='ENOENT')throw error;
  const response=await fetch(source,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error(`Apple image failed: ${key} (${response.status})`);
  bytes=await sharp(Buffer.from(await response.arrayBuffer())).resize(900,900,{fit:'contain',background:'#ffffff'}).webp({quality:88}).toBuffer();
  await fs.writeFile(destination,bytes);
 }
 const metadata=await sharp(bytes).metadata();
 media.push({id,source,file,width:metadata.width,height:metadata.height,sha256:createHash('sha256').update(bytes).digest('hex')});
 images.set(key,`/api/v1/media/${id}`);
}
const rows=[
 {slug:'airpods-5',name:'AirPods 5',price:3799000,series:'AirPods',charging:'Hộp sạc USB-C',battery:'Tối đa 4 giờ khi bật khử tiếng ồn; 20 giờ cùng hộp sạc',tagline:'Tai nghe mở với khử tiếng ồn chủ động.',features:['Khử tiếng ồn chủ động, âm thanh thích ứng và xuyên âm.','Sạc hộp bằng USB-C; cảm biến lực điều khiển nhạc và cuộc gọi.'],colors:[['white','Trắng','#ffffff','airpods-5']]},
 {slug:'airpods-5-wireless',name:'AirPods 5 — Hộp Sạc Không Dây',price:4299000,series:'AirPods',charging:'Hộp sạc không dây USB-C, Qi, Apple Watch',battery:'Tối đa 5 giờ khi bật khử tiếng ồn; 22 giờ cùng hộp sạc',tagline:'Sạc không dây, vuốt chỉnh âm lượng.',features:['Khử tiếng ồn chủ động, xuyên âm và âm thanh thích ứng.','Vuốt để chỉnh âm lượng; hộp sạc có loa hỗ trợ tìm vị trí.'],colors:[['white','Trắng','#ffffff','airpods-5-wireless']]},
 {slug:'airpods-pro-3',name:'AirPods Pro 3',price:6799000,series:'Pro',charging:'Hộp sạc MagSafe USB-C, Qi, Apple Watch',battery:'Tối đa 8 giờ khi bật khử tiếng ồn; 24 giờ cùng hộp sạc',tagline:'Khử tiếng ồn và cảm biến nhịp tim.',features:['Tai nghe có nút silicon, khử tiếng ồn chủ động và cảm biến nhịp tim khi luyện tập.','Có các tính năng sức khỏe thính giác; khả dụng tùy khu vực và thiết bị.'],colors:[['white','Trắng','#ffffff','airpods-pro-3']]},
 {slug:'airpods-max-2',name:'AirPods Max 2',price:14999000,series:'Max',charging:'USB-C; kèm Smart Case',battery:'Tối đa 20 giờ khi bật khử tiếng ồn',tagline:'Tai nghe chụp tai với âm thanh lossless qua USB-C.',features:['Khử tiếng ồn chủ động, âm thanh thích ứng và xuyên âm.','Điều khiển bằng Digital Crown; nghe lossless khi kết nối USB-C.'],colors:[['blue','Xanh Dương','#a6bdcf','airpods-max-2-blue'],['purple','Tím','#b8a5cc','airpods-max-2-purple'],['midnight','Đêm Xanh Thẳm','#303944','airpods-max-2-midnight'],['starlight','Ánh Sao','#e7dfcf','airpods-max-2-starlight'],['orange','Cam','#e8a37f','airpods-max-2-orange']]},
];
const products=[...rows,...historicalAirpods.map(row=>({...row,historical:true}))].map(row=>{
 const id=uuid(row.slug);
 const options=row.options??[{key:'default',label:row.charging,price:row.price}];
 const configurations=options.map(option=>({id:uuid(option.key==='default'?row.slug+':configuration':row.slug+':configuration:'+option.key),storage:option.label,screenSize:'',connectivity:row.connection??'Bluetooth',chip:row.chip??'H2'}));
 const colors=row.colors.map(([key,name,hex,image])=>({id:uuid(row.slug+':color:'+key),name,hex,image:images.get(image)}));
 const keySpecs=[{label:'Kiểu tai nghe',value:row.series==='Max'?'Chụp tai':row.series==='Pro'?'In-ear với nút silicon':'Tai nghe mở'},{label:'Âm thanh',value:row.audio??'Khử tiếng ồn chủ động, âm thanh thích ứng, xuyên âm'},{label:'Pin',value:row.battery},{label:'Sạc',value:options.map(option=>option.label).join(' / ')},{label:'Chip',value:row.chip??'H2'},...(row.year?[{label:'Năm ra mắt',value:row.year}]:[])];
 return {id,slug:row.slug,name:row.name,categoryId:'airpods',active:true,tagline:row.tagline,thumbnail:colors[0].image,gallery:[...new Set([...colors.map(color=>color.image),...(row.extraGallery??[]).map(key=>images.get(key))])],description:row.features,keySpecs,
  detailedSpecs:[{groupName:'Âm thanh và sử dụng',items:keySpecs},{groupName:'Màu sắc',items:[{label:'Lựa chọn',value:colors.map(color=>color.name).join(', ')}]},{groupName:'Thông tin tham khảo',items:[{label:'Giá',value:row.historical?'Giá thử nghiệm do Aura cấu hình; không phải giá Apple niêm yết hiện hành':'Apple Store Việt Nam, kiểm tra ngày 25/11/2026'},...(row.technicalSource?[{label:'Tài liệu kỹ thuật Apple',value:row.technicalSource}]:[]),{label:'Tồn kho',value:'Dữ liệu thử nghiệm của Aura; không phải tồn kho Apple'}]}],
  warrantyInfo:row.historical?'Đời cũ bổ sung theo yêu cầu. Giá và tồn kho là dữ liệu thử nghiệm Aura, không phải giá bán hay tồn kho hiện tại của Apple. Ảnh Apple minh họa dòng sản phẩm; xem đúng loại hộp sạc và tính năng theo cấu hình đã chọn. Bảo hành thực tế chưa được thiết lập.':'Sản phẩm phục vụ đồ án Aura. Thông số và giá tham khảo Apple Store Việt Nam ngày 25/11/2026; thời lượng pin tùy cách sử dụng. Tồn kho là dữ liệu thử nghiệm, không phải tồn kho Apple.',subCategory:row.series,badge:null,
  configurations,colors,
  skus:options.flatMap((option,optionIndex)=>colors.map((color,i)=>({id:uuid(row.slug+':sku:'+(option.key==='default'?'':option.key+':')+row.colors[i][0]),configurationId:configurations[optionIndex].id,colorId:color.id,sku:`AURA-${row.slug}-${option.key==='default'?'':option.key+'-'}${row.colors[i][0]}`.toUpperCase(),price:option.price,originalPrice:option.price,onHand:10})))};
});
const catalog={version:2,checkedAt:sources.checkedAt,sources:sources.pages,categories:[{id:'airpods',name:'AirPods'}],media,products};
await fs.writeFile(new URL('airpods.json',directory),JSON.stringify(catalog,null,2)+'\n');
const destination=new URL('catalog.json',directory),full=JSON.parse(await fs.readFile(destination,'utf8'));
// Preserve the rest of the prepared catalog, including edits unrelated to AirPods.
for(const field of ['categories','media','products'])for(const item of catalog[field]){
 const existing=full[field].findIndex(old=>old.id===item.id);
 if(existing<0)full[field].push(item);else full[field][existing]=item;
}
await fs.writeFile(destination,JSON.stringify(full,null,2)+'\n');
console.log(JSON.stringify({products:products.length,skus:products.reduce((n,p)=>n+p.skus.length,0),images:media.length}));
