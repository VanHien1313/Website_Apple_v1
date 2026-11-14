import { readFileSync } from 'node:fs';
export type Wallet = 'momo' | 'zalopay';
export interface PaymentConfig {
 mode: 'off' | 'sandbox'; publicOrigin?: string;
 momo?: { partnerCode:string; accessKey:string; secretKey:string };
 zalopay?: { appId:number; key1:string; key2:string };
}
export const disabledPayments: PaymentConfig = {mode:'off'};
export function readPaymentConfig(env:NodeJS.ProcessEnv=process.env):PaymentConfig {
 const mode=env.PAYMENT_MODE??'off';
 if(mode==='off')return disabledPayments;
 if(mode!=='sandbox')throw Error('Only off/sandbox payments supported until merchant acceptance');
 const publicOrigin=env.PAYMENT_PUBLIC_ORIGIN;
 if(!publicOrigin||new URL(publicOrigin).origin!==publicOrigin||!publicOrigin.startsWith('https://'))throw Error('Payment callbacks require public HTTPS origin');
 const secret=(key:string)=>{if(env[key]&&env[key+'_FILE'])throw Error('Conflicting payment secret');const value=env[key+'_FILE']?readFileSync(env[key+'_FILE']!,'utf8').trim():env[key];if(!value||value.length>4096)throw Error('Missing payment credentials');return value;};
 const config:PaymentConfig={mode,publicOrigin};
 if(env.MOMO_PARTNER_CODE)config.momo={partnerCode:env.MOMO_PARTNER_CODE,accessKey:secret('MOMO_ACCESS_KEY'),secretKey:secret('MOMO_SECRET_KEY')};
 if(env.ZALOPAY_APP_ID){const appId=Number(env.ZALOPAY_APP_ID);if(!Number.isSafeInteger(appId)||appId<=0)throw Error('Invalid Zalopay app ID');config.zalopay={appId,key1:secret('ZALOPAY_KEY1'),key2:secret('ZALOPAY_KEY2')};}
 if(!config.momo&&!config.zalopay)throw Error('No sandbox merchant configured');return config;
}
export function walletEnabled(config:PaymentConfig,method:string):method is Wallet{return config.mode==='sandbox'&&((method==='momo'&&!!config.momo)||(method==='zalopay'&&!!config.zalopay));}
