import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const args=process.argv.slice(2),database=args.find(a=>a.startsWith('--database='))?.slice('--database='.length)??'AuraStoreTeam';
if(!['AuraStoreTeam','AuraStoreDocker'].includes(database)||args.some(a=>a!=='--apply'&&a!==`--database=${database}`))throw Error('Use --database=AuraStoreTeam|AuraStoreDocker and optional --apply');
const mounts=['import-airpods.mjs','catalog'].flatMap(p=>['-v',`${fileURLToPath(new URL(p,import.meta.url))}:/app/catalog-tools/${p}:ro`]);
const result=spawnSync(process.env.DOCKER_PATH??'docker',['compose','run','--rm','--no-deps','-T','-e',`DB_DATABASE=${database}`,...mounts,'init','node','/app/catalog-tools/import-airpods.mjs',...(args.includes('--apply')?['--apply']:[])],{cwd:fileURLToPath(new URL('../',import.meta.url)),stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
