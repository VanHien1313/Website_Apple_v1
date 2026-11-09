import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateStaging, validateStagingFiles } from './staging-preflight-core.mjs';

const args = process.argv.slice(2);
if (args.length !== 1 || args[0].startsWith('-')) {
  console.error('Usage: node deploy/staging-preflight.mjs <staging.env>');
  process.exitCode = 1;
} else {
  const fallback = 'C:/Program Files/Docker/Docker/resources/bin/docker.exe';
  const docker = process.env.DOCKER_PATH || (process.platform === 'win32' && existsSync(fallback) ? fallback : 'docker');
  try {
    const text = execFileSync(docker, ['compose', '--env-file', resolve(args[0]), '-f', 'compose.staging.yaml', '--profile', 'tools', 'config', '--format', 'json'], {
      cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000, maxBuffer: 1048576,
    });
    const config = JSON.parse(text);
    const errors = validateStaging(config);
    // Do not read credential files while the config still contains unsafe placeholders.
    if (!errors.length) errors.push(...await validateStagingFiles(config));
    console.log(JSON.stringify({ status: errors.length ? 'blocked' : 'configuration_passed', errors, scope: 'Static configuration and local files only; does not verify DNS, registry image availability, proxy peer IP, certificate hostname chain to SQL, firewall or live HTTPS/SQL connectivity.' }, null, 2));
    if (errors.length) process.exitCode = 1;
  } catch {
    console.error('Preflight could not render Compose. Check Docker CLI, env file and required variables. No deployment was attempted.');
    process.exitCode = 1;
  }
}
