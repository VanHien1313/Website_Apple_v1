import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID,randomBytes} from 'node:crypto';
import {once} from 'node:events';
import {isolatedDatabase} from './database.ts';
import {migrate} from '../src/db/migrate.ts';
import {seedDemo} from '../src/db/seed.ts';
import {bootstrapOwner} from '../src/auth/bootstrap.ts';
import {createAuthService} from '../src/auth/service.ts';
import {importProducts,type CatalogImport} from '../src/db/import-products.ts';
import {parseProduct} from '../src/products-input.ts';
import {quoteCart} from '../src/checkout/quote.ts';
import {createOrderService} from '../src/checkout/orders.ts';
import {walletService} from '../src/payments/service.ts';
import {createApp} from '../src/app.ts';
import type {PaymentConfig} from '../src/payments/config.ts';

let f:Awaited<ReturnType<typeof isolatedDatabase>>,data:CatalogImport,customer:string;
before(async()=>{
 f=await isolatedDatabase();await migrate(f.db);await seedDemo(f.db,{ALLOW_DEMO_SEED:'true'});
 await bootstrapOwner(f.db,'owner@example.test','Owner','Owner!123');
 const manifest=JSON.parse(await readFile(new URL('../../deploy/catalog/airpods.json',import.meta.url),'utf8'));
 data={...manifest,media:await Promise.all(manifest.media.map(async(m:{file:string})=>({...m,content:await readFile(new URL('../../deploy/catalog/'+m.file,import.meta.url))})))};
 const auth=createAuthService(f.db);
 await auth.register({fullName:'AirPods QA',email:'airpods@example.test',phone:'0901234567',password:'AirPods!123',shippingAddress:{address:'QA only',ward:'QA',province:'QA'}});
 customer=(await auth.login('customer','airpods@example.test','AirPods!123')).token;
});
after(async()=>await f?.cleanup());

test('AirPods import is additive, preview does not write, and reruns preserve stock/prices',async()=>{
 const before=(await f.db.query('SELECT id,price,on_hand,reserved,revision FROM inventory_skus ORDER BY id')).rows;
 assert.equal((await importProducts(f.db,data)).mode,'preview');
 assert.equal((await f.db.query("SELECT id FROM categories WHERE id='airpods'")).rows.length,0);
 const result=await importProducts(f.db,data,true);assert.equal(result.created,12);assert.equal(result.skus,29);
 const p=parseProduct(data.products[0]);
 await f.db.query('UPDATE inventory_skus SET on_hand=7,price=3800000,original_price=3800000 WHERE id=@arg1',[p.skus[0]!.id]);
 assert.equal((await importProducts(f.db,data,true)).skipped,12);
 const kept=(await f.db.query('SELECT price,on_hand FROM inventory_skus WHERE id=@arg1',[p.skus[0]!.id])).rows[0]!;
 assert.equal(Number(kept.price),3800000);assert.equal(kept.on_hand,7);
 const after=(await f.db.query('SELECT id,price,on_hand,reserved,revision FROM inventory_skus ORDER BY id')).rows.filter(row=>before.some(old=>old.id===row.id));
 assert.deepEqual(after,before);
 await f.db.query('UPDATE inventory_skus SET price=@arg1,original_price=@arg1 WHERE id=@arg2',[p.skus[0]!.price,p.skus[0]!.id]);
});

test('API category/search/details expose every AirPods model and all five Max colors',async()=>{
 const server=createApp(f.db,()=>{}).listen(0,'127.0.0.1');await once(server,'listening');const a=server.address();assert.ok(a&&typeof a!=='string');const base=`http://127.0.0.1:${a.port}/api/v1`;
 try{
  const categories=await(await fetch(base+'/categories')).json();assert.ok(categories.some((c:{id:string})=>c.id==='airpods'));
  const catalog=await(await fetch(base+'/products?category=airpods&sort=price_asc')).json();assert.equal(catalog.total,12);
  assert.deepEqual(catalog.items.map((p:{basePrice:number})=>p.basePrice),[1499000,1999000,3299000,3299000,3499000,3799000,4299000,4999000,6799000,9999000,11999000,14999000]);
  assert.equal((await(await fetch(base+'/products?q=AirPods')).json()).total,12);
  for(const raw of data.products){
   const expected=parseProduct(raw),r=await fetch(base+'/products/by-slug/'+expected.slug);assert.equal(r.status,200);const p=await r.json();
   assert.equal(p.variants.length,expected.skus.length);assert.equal(p.colors.length,expected.colors.length);
   for(const v of p.variants)assert.ok(p.colors.some((color:{id:string})=>color.id===v.colorId));
   assert.equal((await fetch(`http://127.0.0.1:${a.port}`+p.thumbnail)).status,200);
  }
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});

test('AirPods SKUs use server quotes, COD reservations and signed wallet flow without special checkout logic',async()=>{
 const products=data.products.map(parseProduct);
 const allItems=products.flatMap(p=>p.skus.map(sku=>({skuId:sku.id,quantity:1})));
 const quote=await quoteCart(f.db,{items:allItems,shippingMethod:'standard'});
 assert.ok(quote.canCheckout);assert.equal(quote.lines.length,29);
 const config:PaymentConfig={mode:'sandbox',publicOrigin:'https://example.test',zalopay:{appId:123,key1:'key1',key2:'key2'}};
 for(const [product,method] of [[products[0]!,'cod'],[products[3]!,'zalopay']] as const){
  const sku=product.skus[0]!;
  const q=await quoteCart(f.db,{items:[{skuId:sku.id,quantity:1}],shippingMethod:'standard'});
  const input={requestId:randomUUID(),receiptToken:randomBytes(32).toString('hex'),items:[{skuId:sku.id,quantity:1}],shippingMethod:'standard',paymentMethod:method,expectedTotal:q.grandTotal,expectedPrices:[{skuId:sku.id,price:sku.price}],customer:{fullName:'AirPods QA',email:'airpods@example.test',phone:'0901234567'},shippingAddress:{address:'QA only',ward:'QA',province:'QA'}};
  const result=await createOrderService(f.db,config).create(input,customer);
  const held=(await f.db.query('SELECT reserved FROM inventory_skus WHERE id=@arg1',[sku.id])).rows[0]!;assert.equal(held.reserved,1);
  if(method==='zalopay'){
   const service=walletService(f.db,config,{create:async(_provider,_id,_orderId,amount)=>{assert.equal(amount,14999000);return {payUrl:'https://qcgateway.zalopay.vn/pay',qrPayload:'test-provider-qr'};},query:async()=>null});
   assert.equal((await service.start(result.order.id,customer)).state,'READY');
  }
 }
});

test('an identity collision rolls back the batch and leaves existing products unchanged',async()=>{
 const changed={...parseProduct(data.products[0]),slug:'conflicting-airpods-import'};
 await assert.rejects(importProducts(f.db,{...data,products:[changed]},true),/identity collision/);
 assert.equal((await f.db.query("SELECT id FROM products WHERE slug='conflicting-airpods-import'")).rows.length,0);
});


test('every historical generation has the right chip and actual case options',()=>{
 const products=data.products.map(parseProduct),find=(slug:string)=>{const p=products.find(p=>p.slug===slug);assert.ok(p);return p;};
 const variants:[string,string,number][]=[['airpods-1','W1',1],['airpods-2','H1',2],['airpods-3','H1',2],['airpods-4','H2',2],['airpods-pro-1','H1',2],['airpods-pro-2','H2',2],['airpods-max-1-lightning','H1 (mỗi bên tai)',1],['airpods-max-1-usbc','H1 (mỗi bên tai)',1]];
 for(const [slug,chip,count] of variants){const p=find(slug);assert.equal(p.configurations.length,count);assert.ok(p.configurations.every(c=>c.chip===chip));assert.match(p.warrantyInfo,/Giá và tồn kho là dữ liệu thử nghiệm/);}
 assert.match(find('airpods-1').keySpecs.find(s=>s.label==='Âm thanh')!.value,/Không có chống ồn/);
 assert.match(find('airpods-2').configurations.map(c=>c.storage).join(' '),/Qi/);
 assert.match(find('airpods-3').configurations.map(c=>c.storage).join(' '),/MagSafe/);
 const pro2=find('airpods-pro-2');assert.match(pro2.configurations[0]!.storage,/Lightning.*IPX4/);assert.match(pro2.configurations[1]!.storage,/USB-C.*IP54/);
 const four=find('airpods-4');assert.match(four.configurations[0]!.storage,/Không ANC/);assert.match(four.configurations[1]!.storage,/Có ANC/);
 assert.deepEqual(new Set(find('airpods-max-1-lightning').colors.map(c=>c.name)),new Set(['Bạc','Xám Không Gian','Xanh Da Trời','Hồng','Xanh Lá']));
 assert.deepEqual(new Set(find('airpods-max-1-usbc').colors.map(c=>c.name)),new Set(['Xanh Dương','Tím','Đêm Xanh Thẳm','Ánh Sao','Cam']));
});
