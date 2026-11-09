// COPY_ONLY backup of the local Docker database, exported outside the SQL volume.
// No passwords are accepted as arguments or printed. Backups contain private data.
import { randomBytes, createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { command } from '../backend/scripts/docker-fixture.mjs';

const filename = `AuraStoreDocker_${new Date().toISOString().replace(/[^0-9]/g, '')}_${randomBytes(8).toString('hex')}.bak`;
const remote = `/var/opt/mssql/data/${filename}`;
const directory = new URL('./backups/', import.meta.url);
await mkdir(directory, { recursive: true });
const destination = new URL(filename, directory);
const script = `
import {readConfig} from '/app/backend/dist/config.js';
import {createRequire} from 'node:module';
const sql=createRequire('/app/backend/package.json')('mssql');
const config=readConfig();
if(config.mode!=='development'||config.database.database!=='AuraStoreDocker'||config.database.user!=='sa')throw new Error('Local Docker configuration required');
const pool=new sql.ConnectionPool({server:config.database.server,database:'master',user:config.database.user,password:config.database.password,connectionTimeout:10000,requestTimeout:120000,options:{encrypt:true,trustServerCertificate:true}});
try {
  await pool.connect();
  await pool.request().input('path',sql.NVarChar(1024),${JSON.stringify(remote)}).query('BACKUP DATABASE [AuraStoreDocker] TO DISK=@path WITH COPY_ONLY,CHECKSUM,COMPRESSION');
  await pool.request().input('path',sql.NVarChar(1024),${JSON.stringify(remote)}).query('RESTORE VERIFYONLY FROM DISK=@path WITH CHECKSUM');
  console.log('Backup and SQL checksum verification passed.');
} finally {await pool.close();}
`;
await command(['compose', 'run', '--rm', '--no-deps', '-T', 'init', 'node', '--input-type=module'], script);
const remoteHash = (await command(['compose', 'exec', '-T', 'db', 'sha256sum', remote])).split(/\s+/)[0];
await command(['compose', 'cp', `db:${remote}`, fileURLToPath(destination)]);
const hash = createHash('sha256');
for await (const chunk of createReadStream(destination)) hash.update(chunk);
const metadata = { database: 'AuraStoreDocker', at: new Date().toISOString(), filename, bytes: (await stat(destination)).size, sha256: hash.digest('hex'), type: 'COPY_ONLY', sqlChecksumVerified: true };
if (metadata.bytes === 0) throw new Error('Exported backup is empty; SQL copy retained');
if (metadata.sha256 !== remoteHash) throw new Error('Export checksum mismatch; SQL copy retained');
await writeFile(new URL(`${filename}.json`, directory), JSON.stringify(metadata, null, 2), { flag: 'wx' });
// Keep SQL copy on any export/manifest failure. Remove only this generated file after success.
await command(['compose', 'exec', '-T', 'db', 'rm', '--', remote]);
console.log(JSON.stringify({ backup: fileURLToPath(destination), ...metadata }, null, 2));
