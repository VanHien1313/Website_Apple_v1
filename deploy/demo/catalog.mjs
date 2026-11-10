import { createHash } from 'node:crypto';

export const demoId = key => {
  const hash = createHash('sha256').update(`aura-demo-v1:${key}`).digest('hex');
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
};
export const categories = [{id:'iphone',name:'iPhone'}, {id:'ipad',name:'iPad'}, {id:'mac',name:'Mac'}, {id:'watch',name:'Apple Watch'}];
export const demoProducts = [
  ['iphone','iPhone 16',10000000,'#6679aa'], ['iphone','iPhone 16 Pro',22000000,'#b89a7b'],
  ['ipad','iPad Air',16000000,'#8d8bc5'], ['ipad','iPad Pro',24000000,'#586779'],
  ['mac','MacBook Air',25000000,'#d4bda5'], ['mac','MacBook Pro',35000000,'#687482'],
  ['watch','Apple Watch SE',6000000,'#c58f99'], ['watch','Apple Watch Series 10',11000000,'#669c9a'],
].map(([categoryId,name,price,tint], index) => {
  const slug = `demo-${categoryId}-${index+1}`, id = demoId(slug), mediaId = demoId(`${slug}:image`);
  const thumbnail = `/api/v1/media/${mediaId}`;
  const configurations = ['Tiêu chuẩn', 'Nâng cao'].map((storage,i) => ({id:demoId(`${slug}:config:${i}`),storage,chip:'Cấu hình minh họa'}));
  const colors = [{id:demoId(`${slug}:color:0`),name:'Đen',hex:'#253044',image:thumbnail},{id:demoId(`${slug}:color:1`),name:'Trắng',hex:'#eeeeee',image:thumbnail}];
  return { id, slug, categoryId, name:`${name} · Demo`, active:true, tagline:'Sản phẩm minh họa cho đồ án — không phải chào bán.',
    thumbnail,gallery:[thumbnail],description:['Giá, cấu hình và tồn kho là dữ liệu giả phục vụ demo nghiệp vụ.','Ảnh minh họa do nhóm tạo bằng hình học, không phải ảnh sản phẩm thực tế.'],
    warrantyInfo:'Dữ liệu học tập; không áp dụng cam kết bảo hành thương mại.',subCategory:'Bộ sưu tập demo',badge:index===0?'Ưu đãi':'Mới',
    keySpecs:[{label:'Mục đích',value:'Kiểm thử và trình diễn'},{label:'Dữ liệu',value:'Minh họa, không dùng làm thông số thương mại'}],detailedSpecs:[],
    configurations,colors,
    skus:[{configurationId:configurations[0].id,colorId:colors[0].id,price,onHand:20},{configurationId:configurations[0].id,colorId:colors[1].id,price:price+500000,onHand:0},{configurationId:configurations[1].id,colorId:colors[0].id,price:price+2000000,onHand:5}].map((sku,i)=>({...sku,id:demoId(`${slug}:sku:${i}`),sku:`DEMO-${categoryId.toUpperCase()}-${index+1}-${i+1}`,originalPrice:sku.price+2000000})),
    mediaId,tint,
  };
});

/** Original geometric illustrations, rasterized to WebP during setup. No remote assets. */
export function illustration(category, tint) {
  const screen = '<rect x="0" y="0" width="800" height="600" fill="#f5f6fa"/><defs><linearGradient id="s" x2="1" y2="1"><stop stop-color="'+tint+'"/><stop offset="1" stop-color="#17273f"/></linearGradient></defs>';
  const shape = category === 'mac'
    ? '<rect x="140" y="105" width="520" height="330" rx="20" fill="#263244"/><rect x="155" y="120" width="490" height="295" rx="10" fill="url(#s)"/><path d="M100 440h600l-50 40H150z" fill="#aab4c1"/>'
    : category === 'watch'
      ? '<rect x="325" y="45" width="150" height="510" rx="60" fill="'+tint+'"/><rect x="275" y="170" width="250" height="260" rx="65" fill="#263244"/><rect x="292" y="187" width="216" height="226" rx="50" fill="url(#s)"/><circle cx="400" cy="300" r="70" fill="none" stroke="#fff" stroke-width="9"/><path d="M400 250v50l35 20" fill="none" stroke="#fff" stroke-width="9"/>'
      : category === 'ipad'
        ? '<rect x="220" y="65" width="360" height="470" rx="30" fill="#263244"/><rect x="235" y="80" width="330" height="440" rx="18" fill="url(#s)"/>'
        : '<rect x="285" y="55" width="230" height="490" rx="40" fill="#263244"/><rect x="298" y="68" width="204" height="464" rx="30" fill="url(#s)"/><rect x="360" y="80" width="80" height="20" rx="10" fill="#17273f"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">${screen}${shape}</svg>`;
}
