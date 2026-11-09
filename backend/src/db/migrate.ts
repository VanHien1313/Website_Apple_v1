import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import type { Database } from './database.ts';
import { lockTransaction } from './database.ts';

export const migrationDirectory = new URL('../../migrations/', import.meta.url);
export async function loadMigrations(directory = migrationDirectory) {
  const names = (await readdir(directory)).filter((name) => /^\d{3}_[a-z0-9_]+\.sql$/.test(name)).sort();
  return Promise.all(names.map(async (name) => { const sql = (await readFile(new URL(name, directory), 'utf8')).replace(/\r\n/g, '\n'); return { name, sql, checksum: createHash('sha256').update(sql).digest('hex') }; }));
}
export async function migrate(db: Database, supplied?: Awaited<ReturnType<typeof loadMigrations>>) {
  const migrations = supplied ?? await loadMigrations();
  return db.transaction(async (tx) => {
    // Serializes concurrent migration processes, including initial schema creation.
    await lockTransaction(tx, 'aura:migrations');
    await tx.exec("IF OBJECT_ID('dbo.schema_migrations','U') IS NULL CREATE TABLE dbo.schema_migrations (name nvarchar(200) PRIMARY KEY, checksum varchar(64) NOT NULL, applied_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME())");
    const applied = (await tx.query<{ name: string; checksum: string }>('SELECT name, checksum FROM schema_migrations ORDER BY name')).rows;
    for (let i = 0; i < applied.length; i++) {
      if (applied[i]?.name !== migrations[i]?.name || applied[i]?.checksum !== migrations[i]?.checksum) throw new Error('Migration history mismatch; restore applied files and add a new migration.');
    }
    const names: string[] = [];
    for (const migration of migrations.slice(applied.length)) {
      await tx.exec(migration.sql);
      await tx.query('INSERT INTO schema_migrations(name, checksum) VALUES (@arg1,@arg2)', [migration.name, migration.checksum]);
      names.push(migration.name);
    }
    return names;
  });
}
export async function assertSchemaReady(db: Database) {
  const expected = await loadMigrations();
  const actual = (await db.query<{ name: string; checksum: string }>('SELECT name, checksum FROM schema_migrations ORDER BY name')).rows;
  if (expected.length !== actual.length || expected.some((m, i) => m.name !== actual[i]?.name || m.checksum !== actual[i]?.checksum)) throw new Error('Schema is not ready');
}
