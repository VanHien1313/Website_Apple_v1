import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const docker=process.env.DOCKER_PATH || (process.platform==='win32' ? 'C:/Program Files/Docker/Docker/resources/bin/docker.exe' : 'docker');
const compose=['compose','-f','compose.yaml','-f','compose.demo.yaml'];
function run(args,input='') {return new Promise((resolve,reject)=>{const child=spawn(docker,args,{cwd:root,windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='';child.stdout.on('data',c=>out+=c);child.stderr.on('data',c=>err+=c);child.once('error',reject);child.once('close',code=>code===0?resolve(out.trim()):reject(new Error(`Docker demo command failed (${code}): ${err.slice(-1500)} ${out.slice(-1500)}`)));child.stdin.on('error',()=>{});child.stdin.end(input);});}
const operation=process.argv[2] ?? 'start';
if(!['start','stop','status'].includes(operation)) throw new Error('Use start, stop or status. No destructive reset command is provided.');
if(operation==='stop') console.log(await run([...compose,'stop','demo-app']));
else if(operation==='status') console.log(await run([...compose,'ps','demo-app']));
else {
  const secretDir=new URL('./secrets/',import.meta.url), credentials=new URL('demo-accounts.json',secretDir), dbPassword=new URL('sql-demo-password.txt',secretDir);
  await mkdir(secretDir,{recursive:true});
  let secret;
  try {secret=JSON.parse(await readFile(credentials,'utf8'));}
  catch(error) {
    if(error.code!=='ENOENT') throw error;
    // Never replace one half of an existing secret pair.
    try {await access(dbPassword,constants.F_OK);throw new Error('Demo SQL password exists without account file; restore the matching file, do not regenerate.');} catch(e) {if(e.code!=='ENOENT') throw e;}
    secret={ownerEmail:'owner@aura.example.test',editorEmail:'editor@aura.example.test',customerEmail:'customer@aura.example.test',...Object.fromEntries(['ownerPassword','editorPassword','customerPassword','databasePassword'].map(key=>[key,`Aa1!${randomBytes(24).toString('hex')}`]))};
    await writeFile(credentials,JSON.stringify(secret,null,2),{flag:'wx',mode:0o600});
    await writeFile(dbPassword,secret.databasePassword,{flag:'wx',mode:0o600});
  }
  if((await readFile(dbPassword,'utf8')).trim()!==secret.databasePassword) throw new Error('Demo secret files do not match');
  console.log(await run(['compose','run','--rm','--no-deps','-T','-e','DB_DATABASE=AuraDemoDocker','-v',`${fileURLToPath(new URL('./demo/',import.meta.url))}:/app/demo:ro`,'init','node','/app/demo/init.mjs'],JSON.stringify(secret)));
  console.log(await run([...compose,'up','-d','--no-deps','--no-build','--wait','--wait-timeout','90','demo-app']));
  console.log('Demo: http://localhost:4001 | Database: AuraDemoDocker | Account credentials: deploy/secrets/demo-accounts.json (private, do not commit/share). Main app on port 4000 is unchanged.');
}
