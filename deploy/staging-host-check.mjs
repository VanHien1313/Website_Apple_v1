import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { checkStagingHost } from './staging-host-core.mjs';

const args = process.argv.slice(2);
try {
  if (args.length !== 1 || args[0].startsWith('-')) throw new Error('Usage');
  const manifest = JSON.parse(await readFile(args[0], 'utf8'));
  const errors = checkStagingHost({ manifest, platform: process.platform, nodeVersion: process.versions.node, dockerEnvironment: process.env,
    docker: (args) => execFileSync(process.env.DOCKER_PATH || 'docker', args, {
      encoding: 'utf8', timeout: 30000, maxBuffer: 1048576, stdio: ['ignore', 'pipe', 'pipe'],
    }),
  });
  console.log(JSON.stringify({ status: errors.length ? 'blocked' : 'host_image_passed', errors,
    scope: 'Local Docker engine and already-pulled release image only. Does not verify SQL, TLS, nginx, DNS, firewall, capacity, secret mount permissions or backup readiness. No containers started or changed.' }, null, 2));
  if (errors.length) process.exitCode = 1;
} catch {
  console.error('Usage: node deploy/staging-host-check.mjs <release.json>. Supply a readable, valid release manifest.');
  process.exitCode = 1;
}
