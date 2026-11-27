import {createHash} from 'node:crypto';
import type {Database} from './database.ts';
import {lockTransaction} from './database.ts';
import {parseProduct} from '../products-input.ts';

export interface CatalogImport {
 categories:{id:string;name:string}[];
 products:unknown[];
 media:{id:string;width:number;height:number;sha256:string;content:Buffer}[];
}

/** Additive only: reruns never overwrite existing prices, stock or admin edits. */
export async function importProducts(db:Database,data:CatalogImport,apply=false) {
 const products=data.products.map(parseProduct);
 const unique=(keys:string[])=>{if(new Set(keys).size!==keys.length)throw Error('Duplicate import identity');};
 unique(products.map(p=>p.id));unique(products.map(p=>p.slug));
 unique(data.media.map(m=>m.id));unique(data.categories.map(c=>c.id));
 for(const m of data.media){
  if(!/^[a-f0-9-]{36}$/i.test(m.id)||!Number.isInteger(m.width)||!Number.isInteger(m.height)||m.width<1||m.height<1||m.width>2400||m.height>2400||!m.content.length||m.content.length>5*1024*1024||createHash('sha256').update(m.content).digest('hex')!==m.sha256)throw Error('Invalid catalog image');
 }
 for(const c of data.categories)if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.id)||!c.name.trim()||c.name.length>120)throw Error('Invalid category');
 return db.transaction(async tx=>{
  await lockTransaction(tx,'catalog:products');
  const owner=(await tx.query("SELECT TOP(1) id FROM admin_users WHERE active=1 AND role='owner' ORDER BY id")).rows[0];
  if(!owner)throw Error('Active owner required');
  let created=0,skipped=0;
  const before=(await tx.query('SELECT (SELECT COUNT(*) FROM orders) orders,(SELECT COUNT(*) FROM customers) customers,(SELECT COUNT(*) FROM admin_users) admins')).rows[0];
  for(const c of data.categories){
   const old=(await tx.query('SELECT id,name FROM categories WHERE id=@arg1',[c.id])).rows[0];
   if(old&&old.name!==c.name)throw Error('Category name collision: '+c.id);
   if(apply&&!old)await tx.query('INSERT INTO categories(id,name) VALUES (@arg1,@arg2)',[c.id,c.name]);
  }
  if(apply)for(const m of data.media){
   const old=(await tx.query('SELECT content FROM media_images WHERE id=@arg1',[m.id])).rows[0];
   if(old){if(!Buffer.from(old.content as Uint8Array).equals(m.content))throw Error('Media collision: '+m.id);continue;}
   await tx.query('INSERT INTO media_images(id,created_by,content,width,height) VALUES (@arg1,@arg2,@arg3,@arg4,@arg5)',[m.id,owner.id,m.content,m.width,m.height]);
  }
  for(const p of products){
   const old=(await tx.query('SELECT id,slug FROM products WITH (UPDLOCK,HOLDLOCK) WHERE id=@arg1 OR slug=@arg2',[p.id,p.slug])).rows;
   if(old.length){
    if(old.length!==1||String(old[0]!.id).toLowerCase()!==p.id||old[0]!.slug!==p.slug)throw Error('Product identity collision: '+p.slug);
    skipped++;continue;
   }
   if(!data.categories.some(c=>c.id===p.categoryId)&&!(await tx.query('SELECT id FROM categories WHERE id=@arg1',[p.categoryId])).rows.length)throw Error('Missing category: '+p.categoryId);
   if(apply){
    for(const image of new Set([p.thumbnail,...p.gallery,...p.colors.map(c=>c.image)])){
     if(!image.startsWith('/api/v1/media/'))throw Error('Imported catalog must use database media');
     if(!(await tx.query('SELECT id FROM media_images WHERE id=@arg1',[image.slice('/api/v1/media/'.length)])).rows.length)throw Error('Missing catalog image');
    }
    await tx.query('INSERT INTO products(id,category_id,slug,name,tagline,thumbnail,gallery,description,key_specs,detailed_specs,warranty_info,sub_category,badge,active) VALUES (@arg1,@arg2,@arg3,@arg4,@arg5,@arg6,@arg7,@arg8,@arg9,@arg10,@arg11,@arg12,@arg13,@arg14)',[p.id,p.categoryId,p.slug,p.name,p.tagline,p.thumbnail,JSON.stringify(p.gallery),JSON.stringify(p.description),JSON.stringify(p.keySpecs),JSON.stringify(p.detailedSpecs),p.warrantyInfo,p.subCategory||null,p.badge,p.active]);
    for(const v of p.configurations)await tx.query('INSERT INTO variants(id,product_id,storage,screen_size,connectivity,chip) VALUES (@arg1,@arg2,@arg3,@arg4,@arg5,@arg6)',[v.id,p.id,v.storage||null,v.screenSize||null,v.connectivity||null,v.chip||null]);
    for(const c of p.colors)await tx.query('INSERT INTO colors(id,product_id,name,hex,image) VALUES (@arg1,@arg2,@arg3,@arg4,@arg5)',[c.id,p.id,c.name,c.hex,c.image]);
    for(const k of p.skus)await tx.query('INSERT INTO inventory_skus(id,product_id,variant_id,color_id,sku,price,original_price,on_hand) VALUES (@arg1,@arg2,@arg3,@arg4,@arg5,@arg6,@arg7,@arg8)',[k.id,p.id,k.configurationId,k.colorId,k.sku,k.price,k.originalPrice,k.onHand]);
   }
   created++;
  }
  const after=(await tx.query('SELECT (SELECT COUNT(*) FROM orders) orders,(SELECT COUNT(*) FROM customers) customers,(SELECT COUNT(*) FROM admin_users) admins')).rows[0];
  if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Protected data changed');
  return {mode:apply?'applied':'preview',created,skipped,products:products.length,skus:products.reduce((n,p)=>n+p.skus.length,0),protectedData:after};
 });
}
