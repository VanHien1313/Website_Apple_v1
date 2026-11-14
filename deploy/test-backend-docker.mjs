import { fileURLToPath } from 'node:url';
import { command } from '../backend/scripts/docker-fixture.mjs';
// Use production Linux dependencies already verified in the image; mount only test/source files.
// SQL SA secret remains in the one-off init service, never published to the host.
try {
  const output = await command(['compose', 'run', '--rm', '--no-deps', '-T',
    '-e', 'TEST_DB_SERVER=db', '-e', 'TEST_DB_AUTH=sql', '-e', 'TEST_DB_USER=sa',
    '-e', 'TEST_DB_PASSWORD_FILE=/run/secrets/sql_sa_password',
    '-v', `${fileURLToPath(new URL('../backend/tests/', import.meta.url))}:/app/backend/tests:ro`,
    '-v', `${fileURLToPath(new URL('../backend/src/', import.meta.url))}:/app/backend/src:ro`,
    '-v', `${fileURLToPath(new URL('../backend/migrations/', import.meta.url))}:/app/backend/migrations:ro`,
    'init', 'node', '--experimental-strip-types', '--test', '--test-concurrency=2', 'backend/tests/*.test.ts']);
  console.log(output);
} catch (error) { console.error(error.message); process.exitCode = 1; }
