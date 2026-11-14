import fs from 'node:fs/promises';
const dir=new URL('../logs/catalog-research/',import.meta.url);await fs.mkdir(dir,{recursive:true});
const pages=process.argv.slice(2);
for(const url of pages){
 const key=new URL(url).pathname.split('/').filter(Boolean).join('_')||'home';
 try{const r=await fetch(url,{signal:AbortSignal.timeout(30000)});const html=await r.text();await fs.writeFile(new URL(key+'.html',dir),html);
 const schemas=[];for(const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)){try{const j=JSON.parse(m[1]);if(['Product','ProductGroup'].includes(j['@type']))schemas.push(j);}catch{}}
 const title=html.match(/<title>(.*?)<\/title>/s)?.[1];const links=[...new Set([...html.matchAll(/href="([^"?#]+)"/g)].map(m=>m[1]).filter(s=>/iphone-17|iphone-air|iphone-16e|ipad-air.*m3|ipad.*a16|macbook-air.*m4|watch.*(11|se-3)/.test(s)))];
 const info={url,finalUrl:r.url,status:r.status,title,schemas,links};await fs.writeFile(new URL(key+'.json',dir),JSON.stringify(info,null,2));console.log(JSON.stringify({key,title,finalUrl:r.url,schemas:schemas.map(j=>({name:j.name,image:j.image,offers:j.offers})),links:links.slice(0,30)}));
 }catch(e){console.log(JSON.stringify({url,error:e.message}));}
}
