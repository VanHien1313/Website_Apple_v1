import { readFileSync } from 'node:fs';
import { readConfig } from '../backend/dist/config.js';
import { createDatabase } from '../backend/dist/db/database.js';
import { migrate, assertSchemaReady } from '../backend/dist/db/migrate.js';

// Local Docker setup only. Never reset/drop a database or rotate existing logins implicitly.
try {
  const config = readConfig();
  if (config.mode !== 'development' || config.database.database !== 'AuraStoreDocker' || config.database.authentication !== 'sql') throw new Error('Local configuration required');
  const password = readFileSync(process.env.AURA_APP_PASSWORD_FILE, 'utf8').replace(/\r?\n$/, '');
  if (password.length < 16 || password.length > 128) throw new Error('Invalid application password');
  let master;
  for (let attempt = 0; attempt < 45; attempt++) {
    const candidate = createDatabase({ ...config.database, database: 'master' });
    try { await candidate.query('SELECT 1 AS ready'); master = candidate; break; }
    catch { await candidate.close().catch(() => {}); if (attempt === 44) throw new Error('Database unavailable'); await new Promise(resolve => setTimeout(resolve, 2000)); }
  }
  try {
    await master.exec("IF DB_ID(N'AuraStoreDocker') IS NULL CREATE DATABASE [AuraStoreDocker]");
    // Password enters as a parameter, then SQL escapes it inside the CREATE LOGIN literal.
    await master.query(`IF SUSER_ID(N'aura_docker_app') IS NULL BEGIN
      DECLARE @statement nvarchar(max) = N'CREATE LOGIN [aura_docker_app] WITH PASSWORD=N''' + REPLACE(@arg1,'''','''''') + N''', CHECK_POLICY=ON';
      EXEC sys.sp_executesql @statement;
    END`, [password]);
  } finally { await master.close(); }
  const db = createDatabase(config.database);
  try {
    await migrate(db);
    await db.exec(`IF USER_ID(N'aura_docker_app') IS NULL CREATE USER [aura_docker_app] FOR LOGIN [aura_docker_app];
      GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO [aura_docker_app];
      DENY INSERT, UPDATE, DELETE ON OBJECT::dbo.schema_migrations TO [aura_docker_app];`);
  } finally { await db.close(); }
  const app = createDatabase({ ...config.database, user: 'aura_docker_app', password });
  try { await assertSchemaReady(app); } finally { await app.close(); }
  console.log(JSON.stringify({ event: 'local_database_initialized' }));
} catch {
  console.error(JSON.stringify({ event: 'local_database_init_failed', message: 'Check SQL availability, secret files and migration history. Existing passwords and data are not reset.' }));
  process.exitCode = 1;
}
