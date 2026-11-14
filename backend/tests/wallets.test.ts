import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {isolatedDatabase} from './database.ts';
import {migrate} from '../src/db/migrate.ts';
import {seedDemo} from '../src/db/seed.ts';
import {createAuthService} from '../src/auth/service.ts';
import {bootstrapOwner} from '../src/auth/bootstrap.ts';
import {createOrderService} from '../src/checkout/orders.ts';
import {orderManagement} from '../src/checkout/management.ts';
import {revenueReport} from '../src/checkout/reports.ts';
import {walletService} from '../src/payments/service.ts';
import {readPaymentConfig,type PaymentConfig} from '../src/payments/config.ts';
import {gatewayClient,hmac,parseGatewayJSON,safePayUrl,verifyNotification,type GatewayClient} from '../src/payments/gateway.ts';
import {createApp} from '../src/app.ts';
import {once} from 'node:events';
const config:PaymentConfig={mode:'sandbox',publicOrigin:'https://merchant.example.test',momo:{partnerCode:'QA',accessKey:'access',secretKey:'secret'},zalopay:{appId:123,key1:'key1',key2:'key2'}};
let f:Awaited<ReturnType<typeof isolatedDatabase>>,customer:string,other:string,admin:string;
let creates=0;
const client:GatewayClient={create:async(provider)=>{creates++;return {payUrl:provider==='momo'?'https://test-payment.momo.vn/pay':'https://qcgateway.zalopay.vn/pay',qrPayload:'QR payload supplied by test provider'};},query:async()=>null};
const input=(method='momo')=>({requestId:randomUUID(),receiptToken:randomBytes(32).toString('hex'),items:[{skuId:'00000000-0000-4000-8000-000000000004',quantity:1}],shippingMethod:'standard',paymentMethod:method,expectedTotal:10050000,expectedPrices:[{skuId:'00000000-0000-4000-8000-000000000004',price:10000000}],customer:{fullName:'Wallet QA',email:'wallet@example.test',phone:'0901234567'},shippingAddress:{address:'123 QA',ward:'QA',province:'HCM'}});
const create=async(method='momo')=>(await createOrderService(f.db,config).create(input(method),customer)).order;
const attempt=async(id:string)=>(await f.db.query<{provider_order_id:string;amount:number}>('SELECT provider_order_id,amount FROM wallet_attempts WHERE order_id=@arg1',[id])).rows[0]!;
before(async()=>{f=await isolatedDatabase();await migrate(f.db);await seedDemo(f.db,{ALLOW_DEMO_SEED:'true'});await f.db.query('UPDATE inventory_skus SET on_hand=1000');await bootstrapOwner(f.db,'owner@example.test','Owner','Owner!123');const auth=createAuthService(f.db);admin=(await auth.login('admin','owner@example.test','Owner!123')).token;for(const email of ['wallet@example.test','other@example.test'])await auth.register({fullName:'Wallet QA',email,phone:'0901234567',password:'Wallet!123',shippingAddress:{address:'123 QA',ward:'QA',province:'HCM'}});customer=(await auth.login('customer','wallet@example.test','Wallet!123')).token;other=(await auth.login('customer','other@example.test','Wallet!123')).token;});
after(async()=>await f?.cleanup());
test('wallet configuration fails closed and checkout disallows unavailable or out-of-range MoMo',async()=>{
 assert.equal(readPaymentConfig({}).mode,'off');assert.throws(()=>readPaymentConfig({PAYMENT_MODE:'production'}));assert.throws(()=>readPaymentConfig({PAYMENT_MODE:'sandbox',PAYMENT_PUBLIC_ORIGIN:'http://localhost'}));
 await assert.rejects(createOrderService(f.db).create(input(),customer),/chưa được cấu hình/);await assert.rejects(createOrderService(f.db,config).create({...input(),expectedTotal:50000001},customer),/50.000.000/);
});
test('sessions are owned, concurrent creation uses one provider transaction, QR and safe URLs',async()=>{
 const order=await create(),s=walletService(f.db,config,client),before=creates;
 await assert.rejects(s.start(order.id,other),/Không tìm/);await assert.rejects(s.start(order.id),/đăng nhập/);
 await Promise.all([s.start(order.id,customer),s.start(order.id,customer)]);assert.equal(creates-before,1);assert.match((await s.view(order.id,customer)).qrImage!,/^data:image\/png;base64,/);
 for(const url of ['javascript:alert(1)','https://test-payment.momo.vn.evil.test/','https://user@test-payment.momo.vn/'])assert.throws(()=>safePayUrl('momo',url));
});
test('verified success is idempotent, rejects amount mismatch and staff cannot mark wallet paid',async()=>{
 const order=await create(),s=walletService(f.db,config,client);await s.start(order.id,customer);const a=await attempt(order.id),result={providerOrderId:a.provider_order_id,transactionId:'10001',amount:Number(a.amount)};
 await assert.rejects(orderManagement(f.db).update(true,admin,order.id,{revision:0,kind:'status',target:'PROCESSING',note:'QA'}),/Không thể/);
 await assert.rejects(orderManagement(f.db).update(true,admin,order.id,{revision:0,kind:'payment',target:'PAID',note:'QA'}),/Không thể/);
 await assert.rejects(s.settle('momo',{...result,amount:1}),/không khớp/);await Promise.all([s.settle('momo',result),s.settle('momo',result)]);
 let current=await orderManagement(f.db).get(true,admin,order.id);assert.equal(current.paymentStatus,'PAID');assert.equal(current.revision,1);
 for(const target of ['PROCESSING','SHIPPED','DELIVERED'])current=await orderManagement(f.db).update(true,admin,order.id,{revision:current.revision,kind:'status',target,note:'QA'});
 const day=new Date(Date.now()+7*3600000).toISOString().slice(0,10),before=await revenueReport(f.db,admin,{from:day,to:day});
 current=await orderManagement(f.db).update(false,customer,order.id,{revision:current.revision,kind:'receipt',target:'CONFIRMED',note:'QA'});assert.equal(current.status,'COMPLETED');assert.equal((await revenueReport(f.db,admin,{from:day,to:day})).total,before.total);
});
test('payment arriving after cancellation stays cancelled, flagged for reconciliation, no inventory restored',async()=>{
 const order=await create('zalopay'),s=walletService(f.db,config,client);await s.start(order.id,customer);const a=await attempt(order.id);assert.match(a.provider_order_id,/^\d{6}_[a-f0-9]{32}$/);
 await orderManagement(f.db).update(false,customer,order.id,{revision:0,kind:'status',target:'CANCELLED',note:'QA'});
 await s.settle('zalopay',{providerOrderId:a.provider_order_id,transactionId:'20002',amount:Number(a.amount)});const view=await s.view(order.id,customer);assert.equal(view.orderStatus,'CANCELLED');assert.equal(view.state,'REVIEW');assert.equal(view.paymentStatus,'PAID');assert.equal(view.payUrl,null);
});
test('query recovers missing callback and throttles repeated checks',async()=>{
 const order=await create(),s=walletService(f.db,config,client);await s.start(order.id,customer);const a=await attempt(order.id);let queries=0;
 const recovery=walletService(f.db,config,{...client,query:async()=>{queries++;return {providerOrderId:a.provider_order_id,transactionId:'30003',amount:Number(a.amount)};}});
 await recovery.refresh(order.id,customer);await recovery.refresh(order.id,customer);assert.equal(queries,1);assert.equal((await s.view(order.id,customer)).paymentStatus,'PAID');
});
test('callback signatures bind merchant, identifiers, exact amount and preserve 64-bit transaction IDs',()=>{
 const data={app_id:123,app_trans_id:'261113_test',zp_trans_id:'9007199254740993123',amount:12345};const raw=JSON.stringify(data);assert.equal(verifyNotification('zalopay',config,{type:1,data:raw,mac:hmac('key2',raw)})?.transactionId,data.zp_trans_id);
 assert.throws(()=>verifyNotification('zalopay',config,{type:1,data:raw.replace('12345','12346'),mac:hmac('key2',raw)}));assert.throws(()=>verifyNotification('zalopay',config,{type:2,data:raw,mac:hmac('key2',raw)}));
 assert.equal(parseGatewayJSON('{"transId":9007199254740993123}').transId,'9007199254740993123');
 const body={amount:1000,extraData:'',message:'OK',orderId:'id',orderInfo:'Aura',orderType:'momo_wallet',partnerCode:'QA',payType:'qr',requestId:'id',responseTime:1,resultCode:0,transId:'123'};
 const rawMomo='accessKey=access&'+Object.entries(body).map(([k,v])=>`${k}=${v}`).join('&');const signed={...body,signature:hmac('secret',rawMomo)};
 assert.equal(verifyNotification('momo',config,signed)?.amount,1000);assert.throws(()=>verifyNotification('momo',config,{...signed,amount:2000}));assert.throws(()=>verifyNotification('momo',config,{...signed,partnerCode:'OTHER'}));
});
test('HTTP callback rejects forgery and accepts signed duplicate while browser redirects do not settle',async()=>{
 const order=await create('zalopay'),service=walletService(f.db,config,client);await service.start(order.id,customer);const a=await attempt(order.id);
 const server=createApp(f.db,()=>{}, {origin:'http://127.0.0.1:3000',secure:false},undefined,[],config).listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert.ok(address&&typeof address!=='string');const base=`http://127.0.0.1:${address.port}`;
 try{const data=JSON.stringify({app_id:123,app_trans_id:a.provider_order_id,zp_trans_id:'40004',amount:Number(a.amount)});const send=(mac:string)=>fetch(base+'/api/v1/payments/zalopay/callback',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:1,data,mac})});assert.equal((await send('0'.repeat(64))).status,400);assert.equal((await service.view(order.id,customer)).paymentStatus,'PENDING');for(let i=0;i<2;i++){const response=await send(hmac('key2',data));assert.equal(response.status,200);assert.equal((await response.json()).return_code,1);}assert.equal((await service.view(order.id,customer)).paymentStatus,'PAID');}finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});

test('gateway adapters sign sandbox create/query requests and use only provider QR payloads',async()=>{
 const original=globalThis.fetch;const sent:{url:string;body:Record<string,unknown>}[]=[];
 globalThis.fetch=async(url,init)=>{const body=JSON.parse(String(init?.body));sent.push({url:String(url),body});
  if(String(url).includes('momo.vn'))return new Response(JSON.stringify({resultCode:0,partnerCode:'QA',orderId:body.orderId,amount:1000,transId:'101',payUrl:'https://test-payment.momo.vn/pay',qrCodeUrl:'native-momo-qr'}));
  return new Response(JSON.stringify({return_code:1,amount:1000,zp_trans_id:'102',order_url:'https://qcgateway.zalopay.vn/pay',qr_code:'native-zalo-qr'}));
 };
 try{
  const g=gatewayClient(config);assert.equal((await g.create('momo','id','order',1000)).qrPayload,'native-momo-qr');
  const m=sent[0]!.body;assert.equal(m.signature,hmac('secret',`accessKey=access&amount=1000&extraData=&ipnUrl=${m.ipnUrl}&orderId=id&orderInfo=${m.orderInfo}&partnerCode=QA&redirectUrl=${m.redirectUrl}&requestId=id&requestType=captureWallet`));
  assert.equal((await g.query('momo','id'))?.transactionId,'101');assert.equal(sent[1]!.body.signature,hmac('secret','accessKey=access&orderId=id&partnerCode=QA'));
  assert.equal((await g.create('zalopay','261113_id','order',1000)).qrPayload,'native-zalo-qr');const z=sent[2]!.body;assert.equal(z.mac,hmac('key1',`123|261113_id|Aura|1000|${z.app_time}|${z.embed_data}|[]`));
  assert.equal((await g.query('zalopay','261113_id'))?.transactionId,'102');assert.equal(sent[3]!.body.mac,hmac('key1','123|261113_id|key1'));
 }finally{globalThis.fetch=original;}
});
