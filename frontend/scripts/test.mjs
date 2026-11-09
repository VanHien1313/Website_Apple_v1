import { build } from 'esbuild';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const entries = (await readdir(join(root, 'tests'))).filter((name) => name.endsWith('.test.ts'));
const output = await mkdtemp(join(tmpdir(), 'aura-tests-'));
try {
  await build({ entryPoints: entries.map((name) => join(root, 'tests', name)), outdir: output,
    bundle: true, platform: 'node', format: 'esm', outExtension: { '.js': '.mjs' } });
  const result = spawnSync(process.execPath, ['--test', ...entries.map((name) => join(output, name.replace(/\.ts$/, '.mjs')))], { stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  await rm(output, { recursive: true, force: true });
}
