import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const secret=JSON.parse(await readFile(new URL('./secrets/demo-accounts.json',import.meta.url),'utf8'));
const output=new URL('../docs/qa/member-checkout/',import.meta.url);await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
const checks=[];
try {
 for(const origin of ['http://127.0.0.1:4000','http://localhost:4001']) {
  const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
  const headers={origin,'x-aura-request':'1','content-type':'application/json'};
  assert.equal((await context.request.post(origin+'/api/v1/orders',{headers,data:{}})).status(),401);
  await page.goto(origin+'/checkout?shipping=express');await page.waitForURL('**/login?next=*');
  await page.getByRole('link',{name:'Chưa có tài khoản? Đăng ký',exact:true}).click();
  assert.equal(new URL(page.url()).searchParams.get('next'),'/checkout?shipping=express');
  for(const field of ['fullName','phone','email','province','ward','address']) assert.equal(await page.locator(`input[name=${field}]`).getAttribute('required'),'');
  assert.equal((await context.request.post(origin+'/api/v1/auth/register',{headers,data:{email:'incomplete@example.test'}})).status(),422);
  if(origin.endsWith('4000')) await page.screenshot({path:fileURLToPath(new URL('registration.png',output)),fullPage:true});
  checks.push(origin+': anonymous order 401; checkout redirects; required registration fields; return URL preserved');
  if(origin.endsWith('4001')) {
   assert.equal((await context.request.post(origin+'/api/v1/admin/auth/login',{headers,data:{email:secret.ownerEmail,password:secret.ownerPassword}})).status(),200);
   assert.equal((await context.request.post(origin+'/api/v1/orders',{headers,data:{}})).status(),401);
   await context.request.post(origin+'/api/v1/admin/auth/logout',{headers,data:{}});
   await page.goto(origin+'/product/demo-iphone-1',{waitUntil:'networkidle'});
   await page.getByRole('button',{name:'Mua ngay',exact:true}).click();await page.waitForURL('**/login?next=*');
   await page.locator('input[name=email]').fill(secret.customerEmail);await page.locator('input[name=password]').fill(secret.customerPassword);
   await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.waitForURL('**/checkout*');
   await page.getByRole('heading',{name:'Hoàn tất lựa chọn của bạn.',exact:true}).waitFor();
   assert.equal(await page.locator('input[name=email]').inputValue(),secret.customerEmail);
   assert.equal(await page.locator('input[name=email]').getAttribute('readonly'),'');
   for(const [field,value] of [['province','TP HCM'],['ward','Phường mẫu'],['address','123 Địa chỉ kiểm thử']]) await page.locator(`input[name=${field}]`).fill(value);
   const submit=page.getByRole('button',{name:'Xác nhận đặt hàng COD',exact:true});await submit.waitFor();
   await page.screenshot({path:fileURLToPath(new URL('authenticated-checkout.png',output)),fullPage:true});
   await context.request.post(origin+'/api/v1/auth/logout',{headers,data:{}});
   await submit.click();await page.waitForURL('**/login?next=*');
   checks.push('Admin session cannot buy; customer login resumes cart/checkout; account email is readonly; expired session returns to login without creating order');
  }
  await context.close();
 }
 await writeFile(new URL('results.json',output),JSON.stringify({at:new Date().toISOString(),result:'pass',checks},null,2));console.log(JSON.stringify({result:'pass',checks}));
}finally{await browser.close();}
