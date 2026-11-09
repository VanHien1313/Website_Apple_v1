import { mkdir, writeFile } from 'node:fs/promises';
import { dockerFixture } from '../backend/scripts/docker-fixture.mjs';
const fixture = await dockerFixture();
let results;
try {
  results = await fixture.rehearseRecovery();
} finally {
  await fixture.cleanup();
}
const directory = new URL('../docs/qa/docker-recovery/', import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL('results.json', directory), JSON.stringify({ at: new Date().toISOString(), ...results, cleanup: 'passed' }, null, 2));
console.log(JSON.stringify(results));
