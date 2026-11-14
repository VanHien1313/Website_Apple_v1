import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

// OWASP scrypt alternative: N=2^15, r=8, p=3. Async to avoid blocking HTTP.
const derive = (password: string, salt: string): Promise<Buffer> => new Promise((resolve, reject) => {
  scrypt(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key));
});
export const validPasswordInput = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 128;
export const validPassword = (value: unknown): value is string => validPasswordInput(value) && value.length >= 8 && /\p{Lu}/u.test(value) && /[^\p{L}\p{N}\s]/u.test(value);
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt-v1$${salt}$${(await derive(password, salt)).toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string) {
  const match = /^scrypt-v1\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(stored);
  const derived = await derive(password, match?.[1] ?? '0'.repeat(32));
  return !!match && timingSafeEqual(derived, Buffer.from(match[2]!, 'hex'));
}
