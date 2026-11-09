// Isolated browser QA against the built Linux app image and Compose SQL Server.
// Credentials remain in container secrets; only a random test DB may be dropped.
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const docker = process.env.DOCKER_PATH || 'docker';
export function command(args, input = '') {
  return new Promise((resolve, reject) => {
    const child = spawn(docker, args, { cwd: root, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '';
    child.stdout.on('data', chunk => { out += chunk; });
    child.stderr.on('data', chunk => { err += chunk; });
    child.once('error', reject);
    child.once('close', code => code === 0 ? resolve(out.trim()) : reject(new Error(`Docker QA command failed (${code}): ${err.slice(-2000)} ${out.slice(-2000)}`)));
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}

const worker = `
import {readConfig} from '/app/backend/dist/config.js';
import {createDatabase} from '/app/backend/dist/db/database.js';
import {migrate,assertSchemaReady} from '/app/backend/dist/db/migrate.js';
import assert from 'node:assert/strict';
import {seedDemo} from '/app/backend/dist/db/seed.js';
import {bootstrapOwner} from '/app/backend/dist/auth/bootstrap.js';
let input='';for await(const chunk of process.stdin)input+=chunk;
const task=JSON.parse(input);
if(!/^AuraTest_[a-f0-9]{24}$/.test(task.name))throw new Error('Invalid QA database');
const config=readConfig().database;
const db=createDatabase({...config,database:task.name});
const master=createDatabase({...config,database:'master'});
try {
  let result=null;
  if(task.op==='create'){
    await master.exec('CREATE DATABASE ['+task.name+']');
  } else if(task.op==='setup'){
    await migrate(db);
    await seedDemo(db,{ALLOW_DEMO_SEED:'true'});
    await bootstrapOwner(db,'owner@example.test','Owner QA','Only-for-test-12345');
    await db.exec("CREATE USER [aura_docker_app] FOR LOGIN [aura_docker_app]; GRANT SELECT,INSERT,UPDATE,DELETE ON SCHEMA::dbo TO [aura_docker_app]; DENY INSERT,UPDATE,DELETE ON OBJECT::dbo.schema_migrations TO [aura_docker_app];");
  } else if(task.op==='recovery'){
    const restoredName=task.name.replace('AuraTest_','AuraRestore_');
    const backup='/var/opt/mssql/data/'+task.name+'.bak';
    const restored=createDatabase({...config,database:restoredName});
    let restoredCreated=false;
    const snapshot=async client=>({
      categories:(await client.query('SELECT id,name FROM categories ORDER BY id')).rows,
      products:(await client.query('SELECT id,name,slug FROM products ORDER BY id')).rows,
      stock:(await client.query('SELECT sku,price,on_hand,reserved FROM inventory_skus ORDER BY sku')).rows,
      migrations:(await client.query('SELECT name,checksum FROM schema_migrations ORDER BY name')).rows
    });
    try {
      assert.equal((await master.query('SELECT DB_ID(@arg1) AS id',[restoredName])).rows[0].id,null);
      const before=await snapshot(db);
      await master.exec("BACKUP DATABASE ["+task.name+"] TO DISK=N'"+backup+"' WITH COPY_ONLY,CHECKSUM,COMPRESSION");
      await master.exec("RESTORE VERIFYONLY FROM DISK=N'"+backup+"' WITH CHECKSUM");
      const files=(await master.query("RESTORE FILELISTONLY FROM DISK=N'"+backup+"'")).rows;
      assert.equal(files.length,2);
      const literal=value=>"N'"+value.replace(/'/g,"''")+"'";
      const moves=files.map((file,index)=>{
        assert.ok(['D','L'].includes(file.Type));
        return 'MOVE '+literal(file.LogicalName)+' TO '+literal('/var/opt/mssql/data/'+restoredName+'_'+index+(file.Type==='L'?'.ldf':'.mdf'));
      });
      await db.query("UPDATE categories SET name=@arg1 WHERE id='demo-hardware'",['Changed after backup']);
      await master.exec('RESTORE DATABASE ['+restoredName+"] FROM DISK=N'"+backup+"' WITH CHECKSUM,RECOVERY,"+moves.join(','));
      restoredCreated=true;
      await assertSchemaReady(restored);
      assert.deepEqual(await snapshot(restored),before);
      assert.notDeepEqual(await snapshot(db),before);
      const integrity=await master.query('DBCC CHECKDB (['+restoredName+']) WITH NO_INFOMSGS, ALL_ERRORMSGS');
      assert.equal(integrity.rows.length,0);
      result={backupChecksum:'passed',restore:'passed',schema:'passed',dataComparison:'passed',checkdb:'passed'};
    } finally {
      await restored.close();
      if(restoredCreated)await master.exec('ALTER DATABASE ['+restoredName+'] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE ['+restoredName+'];');
    }
  } else if(task.op==='drop'){
    await db.close();
    await master.exec("IF DB_ID(N'"+task.name+"') IS NOT NULL BEGIN ALTER DATABASE ["+task.name+"] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE ["+task.name+"]; END");
  } else if(task.op==='query')result=await db.query(task.statement,task.values);
  else if(task.op==='exec')await db.exec(task.statement);
  else throw new Error('Unknown QA operation');
  console.log(JSON.stringify({result}));
} finally {await db.close();await master.close();}
`;

export async function dockerFixture() {
  const token = randomBytes(12).toString('hex');
  const name = `AuraTest_${token}`;
  const runner = `aura-qa-init-${token}`;
  const app = `aura-qa-app-${token}`;
  let runnerCreated = false, appCreated = false, databaseCreated = false;
  async function remote(op, statement, values) {
    const out = await command(['exec', '-i', runner, 'node', '--input-type=module', '-e', worker], JSON.stringify({ name, op, statement, values }));
    return JSON.parse(out.split('\n').at(-1)).result;
  }
  async function cleanup() {
    // Keep cleanup errors visible; never claim cleanup succeeded after a failure.
    if (appCreated) await command(['rm', '-f', app]);
    if (runnerCreated) {
      try { if (databaseCreated) await remote('drop'); }
      finally { await command(['rm', '-f', runner]); }
    }
  }
  try {
    await command(['compose', 'run', '--no-deps', '-d', '--name', runner, 'init', 'node', '-e', 'setInterval(()=>{},1000)']);
    runnerCreated = true;
    await remote('create');
    databaseCreated = true;
    await remote('setup');
    return {
      db: { query: (sql, values = []) => remote('query', sql, values), exec: sql => remote('exec', sql) },
      async rehearseRecovery() {
        const sql = 'SELECT sku,price,on_hand,reserved FROM inventory_skus ORDER BY sku';
        const before = await remote('query', sql, []);
        await command(['compose', 'restart', 'db']);
        let after;
        for (let attempt = 0; attempt < 90; attempt++) {
          try { after = await remote('query', sql, []); break; } catch { await new Promise(resolve => setTimeout(resolve, 1000)); }
        }
        if (JSON.stringify(after) !== JSON.stringify(before)) throw new Error('SQL restart did not preserve test inventory');
        const result = await remote('recovery');
        // Exact newly-generated QA backup path only; application backups are never removed here.
        await command(['compose', 'exec', '-T', 'db', 'rm', '--', `/var/opt/mssql/data/${name}.bak`]);
        return { restartPersistence: 'passed', ...result };
      },
      async start() {
        await command(['compose', 'run', '--no-deps', '-d', '--name', app, '-p', '127.0.0.1:3015:4000', '-e', `DB_DATABASE=${name}`, '-e', 'APP_ORIGIN=http://127.0.0.1:3015', 'app']);
        appCreated = true;
        for (let i = 0; i < 90; i++) {
          try { if ((await fetch('http://127.0.0.1:3015/health/ready', { signal: AbortSignal.timeout(2000) })).ok) return; } catch {}
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        throw new Error('Docker QA app readiness timed out');
      },
      cleanup,
    };
  } catch (error) { await cleanup(); throw error; }
}
