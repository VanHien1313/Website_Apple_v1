import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createDatabase, type DatabaseConfig } from '../src/db/database.ts';

// Only a newly-created random database is ever dropped. Never use the application DB.
export async function isolatedDatabase() {
  if (process.env.TEST_DB_PASSWORD_FILE && process.env.TEST_DB_PASSWORD) throw new Error('Choose one test password source');
  const password = process.env.TEST_DB_PASSWORD_FILE ? readFileSync(process.env.TEST_DB_PASSWORD_FILE, 'utf8').replace(/\r?\n$/, '') : process.env.TEST_DB_PASSWORD;
  const name = `AuraTest_${randomBytes(12).toString('hex')}`;
  const config: DatabaseConfig = {
    server: process.env.TEST_DB_SERVER ?? '.\\SQLEXPRESS', database: 'master',
    authentication: process.env.TEST_DB_AUTH === 'sql' ? 'sql' : 'windows',
    user: process.env.TEST_DB_USER, password,
    encrypt: true, trustServerCertificate: process.env.TEST_DB_TRUST_CERT !== 'false',
  };
  const master = createDatabase(config);
  try { await master.exec(`CREATE DATABASE [${name}]`); }
  catch (error) { await master.close(); throw error; }
  const db = createDatabase({ ...config, database: name });
  return {
    db,
    async cleanup() {
      await db.close();
      try {
        if (!/^AuraTest_[a-f0-9]{24}$/.test(name)) throw new Error('Invalid test database name');
        await master.exec(`ALTER DATABASE [${name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${name}];`);
      } finally { await master.close(); }
    },
  };
}
