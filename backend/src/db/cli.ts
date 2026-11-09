import { readConfig } from '../config.ts';
import { createDatabase } from './database.ts';
import { migrate } from './migrate.ts';
import { seedDemo } from './seed.ts';
try {
  const config = readConfig();
  const db = createDatabase(config.database);
  try {
    if (process.argv[2] === 'migrate') console.log(JSON.stringify({ event: 'migrations_applied', names: await migrate(db) }));
    else if (process.argv[2] === 'seed') { await seedDemo(db); console.log(JSON.stringify({ event: 'demo_seed_complete' })); }
    else throw new Error('Unknown command');
  } finally { await db.close(); }
} catch { console.error(JSON.stringify({ event: 'database_command_failed', message: 'Check configuration, database availability and migration history. No automatic reset is performed.' })); process.exitCode = 1; }
