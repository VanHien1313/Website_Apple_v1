import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {ApiError} from '../auth/service.ts';
import type {PaymentConfig,Wallet} from './config.ts';
type Data=Record<string,unknown>;
export const hmac=(key:string,text:string)=>createHmac('sha256',key).update(text).digest('hex');
const signed=(key:string,text:string,value:unknown)=>typeof value==='string'&&/^[a-f0-9]{64}$/i.test(value)&&timingSafeEqual(Buffer.from(hmac(key,text),'hex'),Buffer.from(value,'hex'));
// Preserve gateway transaction identifiers that can exceed JavaScript's safe integer range.
export const parseGatewayJSON=(raw:string):Data=>JSON.parse(raw.replace(/(?<!\\)"(transId|zp_trans_id)"\s*:\s*(\d+)/g,'"$1":"$2"'));
const invalid=()=>new ApiError(400,'INVALID_PAYMENT_NOTIFICATION','Thông báo thanh toán không hợp lệ.');
const fields=(data:Data,names:string[])=>names.map(name=>{const value=data[name];if(typeof value!=='string'&&typeof value!=='number')throw invalid();return `${name}=${value}`;}).join('&');
export interface PaymentSuccess {providerOrderId:string;transactionId:string;amount:number}
export function verifyNotification(provider:Wallet,config:PaymentConfig,body:Data):PaymentSuccess|null {
 if(config.mode!=='sandbox')throw invalid();
 if(provider==='momo'){
  const c=config.momo;if(!c||body.partnerCode!==c.partnerCode)throw invalid();
  const raw=fields({...body,accessKey:c.accessKey},['accessKey','amount','extraData','message','orderId','orderInfo','orderType','partnerCode','payType','requestId','responseTime','resultCode','transId']);
  if(!signed(c.secretKey,raw,body.signature)||body.requestId!==body.orderId)throw invalid();
  if(body.resultCode!==0)return null;
  return success(body.orderId,body.transId,body.amount);
 }
 const c=config.zalopay;if(!c||typeof body.data!=='string'||!signed(c.key2,body.data,body.mac)||body.type!==1)throw invalid();
 const data=parseGatewayJSON(body.data);if(data.app_id!==c.appId)throw invalid();return success(data.app_trans_id,data.zp_trans_id,data.amount);
}
function success(id:unknown,transaction:unknown,amount:unknown):PaymentSuccess {
 if(typeof id!=='string'||id.length>64||!/^\d+$/.test(String(transaction))||String(transaction)==='0'||String(transaction).length>64||!Number.isSafeInteger(amount)||Number(amount)<=0)throw invalid();
 return {providerOrderId:id,transactionId:String(transaction),amount:Number(amount)};
}
async function post(url:string,body:Data){
 const response=await fetch(url,{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(35000)});
 if(!response.ok)throw new ApiError(502,'GATEWAY_UNAVAILABLE','Cổng thanh toán chưa phản hồi. Hãy kiểm tra trạng thái giao dịch trước khi thử lại.');
 const raw=await response.text();if(raw.length>100000)throw invalid();return parseGatewayJSON(raw);
}
export function safePayUrl(provider:Wallet,value:unknown):string {
 if(typeof value!=='string'||value.length>2048)throw invalid();const url=new URL(value);
 const allowed=provider==='momo'?['test-payment.momo.vn']:['qcgateway.zalopay.vn','sbgateway.zalopay.vn'];
 if(url.protocol!=='https:'||url.username||url.password||url.port||!allowed.includes(url.hostname))throw invalid();return url.href;
}
export function gatewayClient(config:PaymentConfig){return {
 async create(provider:Wallet,id:string,orderId:string,amount:number){
  const redirectUrl=config.publicOrigin+'/account/orders/'+orderId;
  let data:Data;
  if(provider==='momo'){
   const c=config.momo!;const body={partnerCode:c.partnerCode,requestId:id,orderId:id,amount,orderInfo:'Thanh toan Aura '+orderId,redirectUrl,ipnUrl:config.publicOrigin+'/api/v1/payments/momo/callback',extraData:'',requestType:'captureWallet',autoCapture:true,lang:'vi'};
   const signature=hmac(c.secretKey,fields({...body,accessKey:c.accessKey},['accessKey','amount','extraData','ipnUrl','orderId','orderInfo','partnerCode','redirectUrl','requestId','requestType']));
   data=await post('https://test-payment.momo.vn/v2/gateway/api/create',{...body,signature});
   if(data.resultCode!==0||data.orderId!==id||Number(data.amount)!==amount)throw new ApiError(502,'GATEWAY_CREATE_FAILED','Chưa lấy được phiên thanh toán MoMo. Kiểm tra trạng thái đơn trước khi đặt lại.');
  }else{
   const c=config.zalopay!,embed_data=JSON.stringify({redirecturl:redirectUrl,preferred_payment_method:['zalopay_wallet','vietqr']}),item='[]';
   const body={app_id:c.appId,app_trans_id:id,app_user:'Aura',app_time:Date.now(),amount,description:'Aura '+orderId,embed_data,item,bank_code:'',expire_duration_seconds:900,callback_url:config.publicOrigin+'/api/v1/payments/zalopay/callback'};
   data=await post('https://sb-openapi.zalopay.vn/v2/create',{...body,mac:hmac(c.key1,[body.app_id,id,body.app_user,amount,body.app_time,embed_data,item].join('|'))});
   if(data.return_code!==1)throw new ApiError(502,'GATEWAY_CREATE_FAILED','Chưa lấy được phiên thanh toán ZaloPay. Kiểm tra trạng thái đơn trước khi đặt lại.');
  }
  const payUrl=safePayUrl(provider,provider==='momo'?data.payUrl:data.order_url),raw=provider==='momo'?data.qrCodeUrl:data.qr_code;
  return {payUrl,qrPayload:typeof raw==='string'&&raw.length>0&&raw.length<=3000?raw:null};
 },
 async query(provider:Wallet,id:string):Promise<PaymentSuccess|null>{
  if(provider==='momo'){
   const c=config.momo!,data=await post('https://test-payment.momo.vn/v2/gateway/api/query',{partnerCode:c.partnerCode,requestId:randomUUID(),orderId:id,lang:'vi',signature:hmac(c.secretKey,`accessKey=${c.accessKey}&orderId=${id}&partnerCode=${c.partnerCode}`)});
   if(data.resultCode!==0)return null;if(data.orderId!==id||data.partnerCode!==c.partnerCode)throw invalid();return success(id,data.transId,data.amount);
  }
  const c=config.zalopay!,data=await post('https://sb-openapi.zalopay.vn/v2/query',{app_id:c.appId,app_trans_id:id,mac:hmac(c.key1,`${c.appId}|${id}|${c.key1}`)});
  return data.return_code===1?success(id,data.zp_trans_id,data.amount):null;
 }
};}
export type GatewayClient=ReturnType<typeof gatewayClient>;
