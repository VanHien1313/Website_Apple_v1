// Container entry point. Preview by default; explicit --apply is additive only.
import fs from 'node:fs/promises';
import {readConfig} from '/app/backend/dist/config.js';
import {createDatabase} from '/app/backend/dist/db/database.js';
import {assertSchemaReady} from '/app/backend/dist/db/migrate.js';
import {importProducts} from '/app/backend/dist/db/import-products.js';
const config=readConfig();
if(config.mode!=='development'||config.database.server!=='db'||!['AuraStoreTeam','AuraStoreDocker'].includes(config.database.database))throw Error('Explicit local catalog targets only');
if(process.argv.slice(2).some(arg=>arg!=='--apply'))throw Error('Use --apply, or no option for preview');
const directory=new URL('./catalog/',import.meta.url);
const data=JSON.parse(await fs.readFile(new URL('airpods.json',directory),'utf8'));
const media=await Promise.all(data.media.map(async asset=>{
 if(!/^images\/[a-f0-9-]{36}\.webp$/.test(asset.file))throw Error('Invalid asset path');
 return {...asset,content:await fs.readFile(new URL(asset.file,directory))};
}));
const db=createDatabase(config.database);
try{await assertSchemaReady(db);console.log(JSON.stringify({database:config.database.database,...await importProducts(db,{...data,media},process.argv.includes('--apply'))}));}
finally{await db.close();}
