// Container-only, explicitly invoked catalog import. Never runs on application startup.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createDatabase,lockTransaction} from '/app/backend/dist/db/database.js';
import {readConfig} from '/app/backend/dist/config.js';
import {assertSchemaReady} from '/app/backend/dist/db/migrate.js';
import {parseProduct} from '/app/backend/dist/products-input.js';
import {demoProducts} from './demo/catalog.mjs';
const config=readConfig(), target=config.database.database;
if(config.mode!=='development'||config.database.server!=='db'||!['AuraStoreDocker','AuraDemoDocker'].includes(target))throw Error('Local targets only');
const data=JSON.parse(await fs.readFile(new URL('./catalog/catalog.json',import.meta.url),'utf8'));
const products=data.products.map(parseProduct);
const db=createDatabase(config.database);
const demoSlugs=['iphone-16','iphone-16-pro','ipad-air-m2','ipad-pro-m4','macbook-air-13-m3','macbook-pro-14-m4','apple-watch-se','apple-watch-series-10'];
try {
 await assertSchemaReady(db);
 const result=await db.transaction(async tx=>{
  await lockTransaction(tx,'catalog:products');
  const owner=(await tx.query("SELECT TOP(1) id FROM admin_users WHERE role='owner' AND active=1 ORDER BY id")).rows[0];
  if(!owner)throw Error('Active owner required; no account will be created');
  const before=(await tx.query('SELECT (SELECT COUNT(*) FROM products) products,(SELECT COUNT(*) FROM orders) orders,(SELECT COUNT(*) FROM admin_users) admins,(SELECT COUNT(*) FROM customers) customers')).rows[0];
  if(!process.argv.includes('--apply'))return {target,mode:'preview',before,sourceProducts:products.length};
  const inventoryBefore=target==='AuraDemoDocker' ? JSON.stringify((await tx.query('SELECT id,on_hand,reserved,revision FROM inventory_skus ORDER BY id')).rows):null;
  for(const asset of data.media){
   const bytes=await fs.readFile(new URL('./catalog/'+asset.file,import.meta.url));
   if(createHash('sha256').update(bytes).digest('hex')!==asset.sha256)throw Error('Asset checksum mismatch');
   const existing=(await tx.query('SELECT content FROM media_images WHERE id=@arg1',[asset.id])).rows[0];
   if(existing){if(!Buffer.from(existing.content).equals(bytes))throw Error('Existing media differs');continue;}
   await tx.query('INSERT INTO media_images(id,created_by,content,width,height) VALUES (@arg1,@arg2,@arg3,@arg4,@arg5)',[asset.id,owner.id,bytes,asset.width,asset.height]);
  }
  let created=0,updatedImages=0,skipped=0;
  if(target==='AuraStoreDocker'){
   for(const c of data.categories)await tx.query('IF NOT EXISTS(SELECT 1 FROM categories WHERE id=@arg1) INSERT INTO categories(id,name) VALUES (@arg1,@arg2)',[c.id,c.name]);
   for(const p of products){
    const old=(await tx.query('SELECT id,slug FROM products WHERE id=@arg1 OR slug=@arg2',[p.id,p.slug])).rows;
    if(old.length){if(old.length!==1||old[0].id.toLowerCase()!==p.id||old[0].slug!==p.slug)throw Error('Catalog identity collision: '+p.slug);skipped++;continue;}
    await tx.query('INSERT INTO products(category_id,slug,name,tagline,thumbnail,gallery,description,key_specs,detailed_specs,warranty_info,sub_category,badge,active,id) VALUES (@arg1,@arg2,@arg3,@arg4,@arg5,@arg6,@arg7,@arg8,@arg9,@arg10,@arg11,@arg12,@arg13,@arg14)',[p.categoryId,p.slug,p.name,p.tagline,p.thumbnail,JSON.stringify(p.gallery),JSON.stringify(p.description),JSON.stringify(p.keySpecs),JSON.stringify(p.detailedSpecs),p.warrantyInfo,p.subCategory||null,p.badge,p.active,p.id]);
    for(const v of p.configurations)await tx.query('INSERT INTO variants(storage,screen_size,connectivity,chip,id,product_id) VALUES (@arg1,@arg2,@arg3,@arg4,@arg5,@arg6)',[v.storage||null,v.screenSize||null,v.connectivity||null,v.chip||null,v.id,p.id]);
    for(const c of p.colors)await tx.query('INSERT INTO colors(name,hex,image,id,product_id) VALUES (@arg1,@arg2,@arg3,@arg4,@arg5)',[c.name,c.hex,c.image,c.id,p.id]);
    for(const k of p.skus)await tx.query('INSERT INTO inventory_skus(id,product_id,variant_id,color_id,sku,price,original_price,on_hand) VALUES (@arg1,@arg2,@arg3,@arg4,@arg5,@arg6,@arg7,@arg8)',[k.id,p.id,k.configurationId,k.colorId,k.sku,k.price,k.originalPrice,k.onHand]);
    created++;
   }
  }else{
   for(let i=0;i<demoProducts.length;i++){
    const d=demoProducts[i],p=products.find(p=>p.slug===demoSlugs[i]);
    if(!p)throw Error('Missing demo image mapping');
    const current=(await tx.query('SELECT thumbnail FROM products WHERE id=@arg1 AND slug=@arg2',[d.id,d.slug])).rows[0];
    if(!current)throw Error('Demo identity missing');
    if(current.thumbnail===p.thumbnail){skipped++;continue;}
    // Do not overwrite user-customized demo photos.
    if(current.thumbnail!==d.thumbnail){skipped++;continue;}
    await tx.query('UPDATE products SET thumbnail=@arg1,gallery=@arg2,description=@arg3,updated_at=SYSUTCDATETIME() WHERE id=@arg4',[p.thumbnail,JSON.stringify(p.gallery),JSON.stringify(['Dữ liệu giá, cấu hình và tồn kho dùng để thử nghiệp vụ.','Ảnh sản phẩm được chuyển từ catalog frontend ban đầu; xem nguồn và giới hạn tại tài liệu catalog.']),d.id]);
    await tx.query('UPDATE colors SET image=@arg1 WHERE product_id=@arg2 AND image=@arg3',[p.thumbnail,d.id,d.thumbnail]);
    updatedImages++;
   }
   if(inventoryBefore!==JSON.stringify((await tx.query('SELECT id,on_hand,reserved,revision FROM inventory_skus ORDER BY id')).rows))throw Error('Inventory must remain unchanged');
  }
  const after=(await tx.query('SELECT (SELECT COUNT(*) FROM products) products,(SELECT COUNT(*) FROM orders) orders,(SELECT COUNT(*) FROM admin_users) admins,(SELECT COUNT(*) FROM customers) customers')).rows[0];
  for(const key of ['orders','admins','customers'])if(before[key]!==after[key])throw Error('Protected data changed');
  return {target,mode:'applied',created,updatedImages,skipped,before,after};
 });
 console.log(JSON.stringify(result));
}finally{await db.close();}
