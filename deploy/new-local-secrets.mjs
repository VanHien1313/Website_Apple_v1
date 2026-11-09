// Cross-platform equivalent of New-LocalSecrets.ps1, including CI on Linux.
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
const directory = new URL('./secrets/', import.meta.url);
await mkdir(directory, { recursive: true, mode: 0o700 });
for (const name of ['sql-sa-password.txt', 'sql-app-password.txt']) {
  try {
    await writeFile(new URL(name, directory), randomBytes(32).toString('base64') + 'Aa1!', { flag: 'wx', mode: 0o600 });
    console.log(`${name}: created (value not printed)`);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    console.log(`${name}: exists, preserved`);
  }
}
