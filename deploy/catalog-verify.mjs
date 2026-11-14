import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const dir=new URL('../docs/qa/catalog-expanded/',import.meta.url);await fs.mkdir(dir,{recursive:true});
const bundle=JSON.parse(await fs.readFile(new URL('./catalog/catalog.json',import.meta.url),'utf8'));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
const checks=[];
try{
 for(const [label,origin,total] of [['main','http://127.0.0.1:4000',bundle.products.length],['demo','http://localhost:4001',8]]){
  const response=await fetch(origin+'/api/v1/products?pageSize=100');assert.equal(response.status,200);
  const catalog=await response.json();assert.equal(catalog.total,total);
  let quoted=0;
  for(const product of catalog.items){
   const detail=await fetch(origin+'/api/v1/products/by-slug/'+product.slug);assert.equal(detail.status,200);
   const p=await detail.json();assert.equal(p.variants.length,product.variants.length);
   if(label==='main')assert.ok(p.detailedSpecs.length>=3,p.slug+' missing detailed specs');
   const sku=p.variants.find(v=>v.inStock)??p.variants[0];assert.ok(sku);
   const r=await fetch(origin+'/api/v1/cart/quote',{method:'POST',headers:{'content-type':'application/json',origin,'x-aura-request':'1'},body:JSON.stringify({items:[{skuId:sku.id,quantity:1}],shippingMethod:'standard'})});
   assert.equal(r.status,200);const quote=await r.json();assert.equal(quote.canCheckout,sku.inStock);if(sku.inStock)assert.equal(quote.grandTotal,sku.price+(sku.price>10000000?0:50000));quoted++;
  }
  const urls=new Set(catalog.items.flatMap(p=>[p.thumbnail,...p.gallery,...p.colors.map(c=>c.image)]));
  for(const url of urls){assert.match(url,/^\/api\/v1\/media\//);const r=await fetch(origin+url);assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/image\/webp/);assert.ok((await r.arrayBuffer()).byteLength>1000);}
  const context=await browser.newContext({viewport:{width:1365,height:950}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const [name,route] of [['home','/'],['product',label==='main'?'/product/iphone-17-pro':'/product/demo-iphone-1'],['search','/search']]){
   await page.goto(origin+route,{waitUntil:'networkidle'});await page.locator('img').first().waitFor();
   await page.locator('img').evaluateAll(imgs=>imgs.forEach(i=>i.loading='eager'));
   await page.waitForFunction(()=>document.querySelectorAll('img').length>0&&[...document.images].every(i=>i.complete&&i.naturalWidth>0));
   await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
   await page.screenshot({path:new URL(label+'-'+name+'.png',dir).pathname.replace(/^\/([A-Za-z]:)/,'$1'),fullPage:true,animations:'disabled'});
   if(label==='main'&&name==='product'){
    await page.getByRole('button',{name:'Xem cấu hình chi tiết',exact:true}).click();
    await page.getByRole('dialog').waitFor();assert.ok((await page.getByRole('dialog').innerText()).includes('Phiên bản và nguồn tham khảo'));
    await page.screenshot({path:new URL('main-specifications.png',dir).pathname.replace(/^\/([A-Za-z]:)/,'$1')});await page.keyboard.press('Escape');
   }
  }
  await page.setViewportSize({width:390,height:844});await page.goto(origin);await page.locator('article img').first().waitFor();await page.locator('img').evaluateAll(imgs=>imgs.forEach(i=>i.loading='eager'));await page.waitForFunction(()=>[...document.images].length>1&&[...document.images].every(i=>i.complete&&i.naturalWidth>0));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:new URL(label+'-mobile.png',dir).pathname.replace(/^\/([A-Za-z]:)/,'$1'),fullPage:true});
  assert.deepEqual(errors,[]);await context.close();checks.push({label,total,images:urls.size,quoted,result:'pass'});
 }
 await fs.writeFile(new URL('results.json',dir),JSON.stringify({at:new Date().toISOString(),checks},null,2));console.log(JSON.stringify(checks));
}finally{await browser.close();}
