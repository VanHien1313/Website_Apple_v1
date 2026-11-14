import { command } from '../backend/scripts/docker-fixture.mjs';
const script = `
import {readConfig} from '/app/backend/dist/config.js';
import {createDatabase} from '/app/backend/dist/db/database.js';
import {migrate,assertSchemaReady} from '/app/backend/dist/db/migrate.js';
import {randomUUID} from 'node:crypto';
const config=readConfig();
if(config.mode!=='development'||config.database.database!=='AuraStoreDocker'||config.database.user!=='sa')throw Error('Local Docker only');
for(const database of ['AuraStoreDocker','AuraDemoDocker']) {
 const db=createDatabase({...config.database,database});
 try {
  const snapshot=async()=> (await db.query('SELECT (SELECT COUNT(*) FROM products) AS products,(SELECT COUNT(*) FROM customers) AS customers,(SELECT COUNT(*) FROM orders) AS orders')).rows[0];
  const before=await snapshot();
  const backup='/var/opt/mssql/data/'+database+'_before_receipts_'+randomUUID()+'.bak';
  await db.query('BACKUP DATABASE ['+database+'] TO DISK=@arg1 WITH COPY_ONLY,CHECKSUM,COMPRESSION',[backup]);
  await db.query('RESTORE VERIFYONLY FROM DISK=@arg1 WITH CHECKSUM',[backup]);
  const applied=await migrate(db); await assertSchemaReady(db);
  const after=await snapshot();
  if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Unexpected row count change');
  console.log(JSON.stringify({database,applied,backup,before,after}));
 } finally {await db.close();}
}
`;
console.log(await command(['compose','run','--rm','--no-deps','-T','init','node','--input-type=module'],script));

