import {randomUUID} from 'node:crypto';
import {Router, text as textBody} from 'express';
import QRCode from 'qrcode';
import {ApiError} from '../auth/service.ts';
import {lockTransaction,type Database} from '../db/database.ts';
import {customerId} from '../checkout/orders.ts';
import {completeReceivedOrder} from '../checkout/receipt.ts';
import type {AuthOptions} from '../auth/router.ts';
import {gatewayClient,parseGatewayJSON,safePayUrl,verifyNotification,type GatewayClient,type PaymentSuccess} from './gateway.ts';
import {walletEnabled,type PaymentConfig,type Wallet} from './config.ts';
type Attempt=Record<string,unknown>&{order_id:string;provider:Wallet;provider_order_id:string;amount:number;state:string;pay_url:string|null;qr_payload:string|null;expires_at:Date;environment:string};
const notFound=()=>new ApiError(404,'NOT_FOUND','Không tìm thấy giao dịch.');
const idCheck=(id:string)=>{if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id))throw notFound();};
export function walletService(db:Database,config:PaymentConfig,client:GatewayClient=gatewayClient(config)){
 async function owned(id:string,token?:string){idCheck(id);return db.transaction(async tx=>{const customer=await customerId(tx,token);if(!customer)throw new ApiError(401,'UNAUTHENTICATED','Vui lòng đăng nhập để thanh toán.');const order=(await tx.query<{id:string;payment_method:string;payment_status:string;status:string;total:number}>('SELECT id,payment_method,payment_status,status,total FROM orders WHERE id=@arg1 AND customer_id=@arg2',[id,customer])).rows[0];if(!order)throw notFound();return order;});}
 async function settle(provider:Wallet,result:PaymentSuccess){
  const row=(await db.query<Attempt>('SELECT * FROM wallet_attempts WHERE provider=@arg1 AND provider_order_id=@arg2',[provider,result.providerOrderId])).rows[0];if(!row||row.environment!==config.mode)throw notFound();
  await db.transaction(async tx=>{
   await lockTransaction(tx,`order:${row.order_id.toLowerCase()}`);
   const order=(await tx.query<{status:string;payment_status:string;total:number;payment_method:string}>('SELECT status,payment_status,total,payment_method FROM orders WHERE id=@arg1',[row.order_id])).rows[0]!;
   if(Number(row.amount)!==result.amount||Number(order.total)!==result.amount||order.payment_method!==provider)throw new ApiError(409,'PAYMENT_MISMATCH','Số tiền hoặc phương thức giao dịch không khớp.');
   const payment=(await tx.query<{status:string;provider_ref:string|null}>('SELECT status,provider_ref FROM payments WHERE order_id=@arg1 AND method=@arg2',[row.order_id,provider])).rows[0];
   const ref=provider+':'+result.transactionId;
   if(payment?.status==='PAID'){if(payment.provider_ref!==ref)throw new ApiError(409,'PAYMENT_MISMATCH','Giao dịch khác đã được ghi nhận.');return;}
   if(!payment||payment.status!=='PENDING')throw new ApiError(409,'PAYMENT_MISMATCH','Giao dịch cần kiểm tra.');
   await tx.query("UPDATE payments SET status='PAID',provider_ref=@arg1,paid_at=SYSUTCDATETIME() WHERE order_id=@arg2 AND method=@arg3",[ref,row.order_id,provider]);
   await tx.query("UPDATE orders SET payment_status='PAID',revision=revision+1 WHERE id=@arg1",[row.order_id]);
   await tx.query("UPDATE wallet_attempts SET state=@arg1,checked_at=SYSUTCDATETIME() WHERE order_id=@arg2",[order.status==='CANCELLED'?'REVIEW':'PAID',row.order_id]);
   await tx.query(`INSERT INTO order_events(id,order_id,actor_type,actor_name,kind,from_state,to_state,note) VALUES (@arg1,@arg2,'system',N'Cổng thanh toán','payment','PENDING','PAID',@arg3)`,[randomUUID(),row.order_id,`Sandbox ${provider}: đã xác minh giao dịch ${result.transactionId}.`+(order.status==='CANCELLED'?' Tiền đến sau khi đơn đã hủy: cần đối soát/hoàn tiền, không giao hàng.':'')]);
   await completeReceivedOrder(tx,row.order_id);
  });
 }
 async function view(id:string,token?:string){const order=await owned(id,token);const row=(await db.query<Attempt>('SELECT * FROM wallet_attempts WHERE order_id=@arg1',[id])).rows[0];
  const active=row?.state==='READY'&&new Date(row.expires_at).getTime()>Date.now()&&order.status!=='CANCELLED'&&order.payment_status==='PENDING';
  return {paymentStatus:order.payment_status,orderStatus:order.status,provider:order.payment_method,mode:row?.environment??config.mode,state:row?.state??'NOT_STARTED',expiresAt:row?.expires_at??null,payUrl:active&&row.pay_url?safePayUrl(row.provider,row.pay_url):null,qrImage:active&&row.qr_payload?await QRCode.toDataURL(row.qr_payload,{width:280,margin:4,errorCorrectionLevel:'M'}):null};
 }
 async function check(id:string){
  const row=await db.transaction(async tx=>{await lockTransaction(tx,`order:${id.toLowerCase()}`);return (await tx.query<Attempt>(`UPDATE wallet_attempts SET checked_at=SYSUTCDATETIME() OUTPUT INSERTED.* WHERE order_id=@arg1 AND state IN ('CREATING','READY') AND (checked_at IS NULL OR checked_at<DATEADD(second,-30,SYSUTCDATETIME()))`,[id])).rows[0];});
  if(row&&walletEnabled(config,row.provider)&&row.environment===config.mode){const result=await client.query(row.provider,row.provider_order_id);if(result)await settle(row.provider,result);}
 }
 return {settle,view,
  async start(id:string,token?:string){const order=await owned(id,token);if(!walletEnabled(config,order.payment_method))throw new ApiError(503,'PAYMENT_UNAVAILABLE','Phương thức này chưa được cấu hình.');
   const provider=order.payment_method;
   const created=await db.transaction(async tx=>{
    await lockTransaction(tx,`order:${id.toLowerCase()}`);
    const current=(await tx.query<{status:string;payment_status:string}>('SELECT status,payment_status FROM orders WHERE id=@arg1',[id])).rows[0]!;
    if(current.status!=='PENDING'||current.payment_status!=='PENDING')throw new ApiError(409,'PAYMENT_CLOSED','Đơn không còn chờ thanh toán.');
    if((await tx.query('SELECT order_id FROM wallet_attempts WHERE order_id=@arg1',[id])).rows.length)return null;
    const providerOrderId=provider==='momo'?randomUUID():new Date(Date.now()+7*3600000).toISOString().slice(2,10).replaceAll('-','')+'_'+randomUUID().replaceAll('-','');
    await tx.query('INSERT INTO wallet_attempts(order_id,provider,provider_order_id,amount,environment) VALUES (@arg1,@arg2,@arg3,@arg4,@arg5)',[id,provider,providerOrderId,Number(order.total),config.mode]);return providerOrderId;
   });
   if(created){const result=await client.create(provider,created,id,Number(order.total));await db.query("UPDATE wallet_attempts SET pay_url=@arg1,qr_payload=@arg2,state=CASE WHEN state='CREATING' THEN 'READY' ELSE state END WHERE order_id=@arg3",[result.payUrl,result.qrPayload,id]);}
   return view(id,token);
  },
  async refresh(id:string,token?:string){await owned(id,token);await check(id);return view(id,token);},
  async reconcile(){const rows=(await db.query<{order_id:string}>("SELECT TOP (10) order_id FROM wallet_attempts WHERE state IN ('CREATING','READY') AND created_at>DATEADD(day,-7,SYSUTCDATETIME()) AND (checked_at IS NULL OR checked_at<DATEADD(minute,-1,SYSUTCDATETIME())) ORDER BY checked_at,created_at")).rows;for(const row of rows){try{await check(row.order_id);}catch{console.error(JSON.stringify({event:'wallet_reconciliation_failed',orderId:row.order_id}));}}}
 };
}
export function walletCallbackRouter(db:Database,config:PaymentConfig){
 const router=Router(),service=walletService(db,config);
 router.post('/payments/:provider/callback',textBody({type:'application/json',limit:'16kb'}),async(req,res)=>{
  const provider=req.params.provider;if(provider!=='momo'&&provider!=='zalopay')throw notFound();
  if(typeof req.body!=='string')throw new ApiError(400,'INVALID_BODY','Invalid callback');
  let body;try{body=parseGatewayJSON(req.body);}catch{throw new ApiError(400,'INVALID_BODY','Invalid callback');}
  const result=verifyNotification(provider,config,body);if(result)await service.settle(provider,result);
  if(provider==='momo')res.status(204).end();else res.json({return_code:1,return_message:'success'});
 });return router;
}
export function walletRouter(db:Database,config:PaymentConfig,auth:AuthOptions){const router=Router(),service=walletService(db,config),name=`${auth.secure?'__Host-':''}aura_customer`;
 const token=(raw?:string)=>raw?.split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1);
 router.get('/payments/methods',(_req,res)=>res.json({mode:config.mode,methods:['cod',...(['momo','zalopay'] as const).filter(p=>walletEnabled(config,p))]}));
 router.get('/orders/:id/payment',async(req,res)=>{res.json(await service.view(req.params.id,token(req.headers.cookie)));});
 for(const action of ['start','refresh'] as const)router.post(`/orders/:id/payment/${action}`,async(req,res)=>{if(req.get('origin')!==auth.origin||req.get('x-aura-request')!=='1'||!req.is('application/json'))throw new ApiError(403,'REQUEST_REJECTED','Nguồn yêu cầu không hợp lệ.');res.json(await service[action](req.params.id,token(req.headers.cookie)));});
 return router;
}
export function startWalletWorker(db:Database,config:PaymentConfig){let running:Promise<void>|undefined;const service=walletService(db,config);const tick=()=>{if(!running&&config.mode!=='off')running=service.reconcile().catch(()=>console.error(JSON.stringify({event:'wallet_worker_failed'}))).finally(()=>{running=undefined;});};const timer=setInterval(tick,60000);timer.unref();tick();return async()=>{clearInterval(timer);await running;};}
