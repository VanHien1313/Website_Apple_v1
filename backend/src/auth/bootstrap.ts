import { lockTransaction } from '../db/database.ts';
import { randomUUID } from 'node:crypto';
import type { Database } from '../db/database.ts';
import { hashPassword, validPassword } from './password.ts';

export async function bootstrapOwner(db: Database, email: string, name: string, password: string) {
  email = email.trim().toLowerCase(); name = name.trim();
  if (!validPassword(password) || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || name.length > 120) throw new Error('Invalid owner input');
  const hash = await hashPassword(password);
  await db.transaction(async (tx) => {
    await lockTransaction(tx, 'aura:bootstrap');
    if ((await tx.query('SELECT TOP (1) id FROM admin_users')).rows.length) throw new Error('Bootstrap is only allowed for an empty admin table');
    await tx.query("INSERT INTO admin_users(id,email,name,password_hash,role) VALUES (@arg1,@arg2,@arg3,@arg4,'owner')", [randomUUID(),email,name,hash]);
  });
}
