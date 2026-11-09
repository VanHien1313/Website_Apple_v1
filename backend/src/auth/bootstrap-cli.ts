import { readConfig } from '../config.ts';
import { createDatabase } from '../db/database.ts';
import { bootstrapOwner } from './bootstrap.ts';
// Password comes from stdin, never a CLI argument, log entry or committed file.
try {
  let input = '';
  for await (const chunk of process.stdin) { input += chunk.toString(); if (input.length > 4096) throw new Error('Input too large'); }
  const body = JSON.parse(input);
  const db = createDatabase(readConfig().database);
  try { await bootstrapOwner(db, body.email, body.name, body.password); console.log('Owner created.'); }
  finally { await db.close(); }
} catch { console.error('Owner bootstrap failed. Check input, database and existing admin accounts.'); process.exitCode = 1; }
