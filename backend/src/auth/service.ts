import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Database } from '../db/database.ts';
import { hashPassword, validPassword, validPasswordInput, verifyPassword } from './password.ts';

export class ApiError extends Error {
  status: number; code: string;
  constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code; }
}
export type Principal = 'customer' | 'admin';
const table = (kind: Principal) => kind === 'admin' ? 'admin_users' : 'customers';
const column = (kind: Principal) => kind === 'admin' ? 'admin_id' : 'customer_id';
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
type Account = Record<string, unknown> & { id: string; email: string; password_hash: string; credential_version: number; full_name?: string; name?: string; phone?: string; role?: string; active?: boolean; created_at: Date };
const profile = (account: Account, kind: Principal) => kind === 'customer'
  ? { id: account.id, email: account.email, fullName: account.full_name, phone: account.phone, createdAt: account.created_at, shippingAddress: account.shipping_address ? JSON.parse(String(account.shipping_address)) : null }
  : { id: account.id, email: account.email, name: account.name, role: account.role, active: account.active };
const unauthorized = () => new ApiError(401, 'UNAUTHENTICATED', 'Phiên không hợp lệ hoặc đã hết hạn.');
export function createAuthService(db: Database) {
  async function current(kind: Principal, token?: string) {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) throw unauthorized();
    const account = (await db.query<Account>(`SELECT a.* FROM sessions s JOIN ${table(kind)} a ON a.id=s.${column(kind)}
      WHERE s.token_hash=@arg1 AND s.revoked_at IS NULL AND s.expires_at>SYSUTCDATETIME() AND s.credential_version=a.credential_version ${kind === 'admin' ? 'AND a.active=1' : ''}`, [digest(token)])).rows[0];
    if (!account) throw unauthorized();
    return account;
  }
  return {
    async me(kind: Principal, token?: string) { return profile(await current(kind, token), kind); },
    async register(input: Record<string, unknown>) {
      const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
      const fullName = typeof input.fullName === 'string' ? input.fullName.trim() : '';
      const phone = typeof input.phone === 'string' ? input.phone.replace(/\s/g, '') : '';
      const addressInput = input.shippingAddress as Record<string, unknown> | undefined;
      const shippingAddress: Record<string, string> = {};
      for (const [key, max] of [['address', 300], ['province', 100], ['ward', 100]] as const) {
        const value = addressInput?.[key];
        if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new ApiError(422, 'INVALID_INPUT', 'Vui lòng điền đầy đủ địa chỉ, tỉnh/thành phố và phường/xã.');
        shippingAddress[key] = value.trim();
      }
      if (!validPassword(input.password) || !fullName || fullName.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^(0|\+84)\d{9}$/.test(phone)) throw new ApiError(422, 'INVALID_INPUT', 'Kiểm tra họ tên, email, số điện thoại và mật khẩu 8–128 ký tự, có ít nhất 1 chữ in hoa và 1 ký tự đặc biệt.');
      const hash = await hashPassword(input.password);
      try {
        const account = (await db.query<Account>('INSERT INTO customers(id,email,full_name,phone,password_hash,shipping_address) OUTPUT INSERTED.* VALUES (@arg1,@arg2,@arg3,@arg4,@arg5,@arg6)', [randomUUID(),email,fullName,phone,hash,JSON.stringify(shippingAddress)])).rows[0]!;
        return profile(account, 'customer');
      } catch (error) { if ([2601,2627].includes((error as { number?: number }).number ?? 0)) throw new ApiError(409, 'EMAIL_EXISTS', 'Email đã được sử dụng.'); throw error; }
    },
    async login(kind: Principal, emailInput: unknown, password: unknown, previousToken?: string) {
      if (typeof emailInput !== 'string' || emailInput.length > 254 || !validPasswordInput(password)) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng.');
      const account = (await db.query<Account>(`SELECT * FROM ${table(kind)} WHERE email=@arg1`, [emailInput.trim().toLowerCase()])).rows[0];
      const valid = await verifyPassword(password, account?.password_hash ?? '');
      if (!account || !valid || (kind === 'admin' && !account.active)) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng.');
      const token = randomBytes(32).toString('hex');
      return db.transaction(async (tx) => {
        const latest = (await tx.query<Account>(`SELECT * FROM ${table(kind)} WITH (UPDLOCK,HOLDLOCK) WHERE id=@arg1`, [account.id])).rows[0];
        if (!latest || latest.password_hash !== account.password_hash || (kind === 'admin' && !latest.active)) throw unauthorized();
        if (previousToken && /^[a-f0-9]{64}$/.test(previousToken)) await tx.query(`UPDATE sessions SET revoked_at=SYSUTCDATETIME() WHERE token_hash=@arg1 AND ${column(kind)} IS NOT NULL`, [digest(previousToken)]);
        await tx.query(`INSERT INTO sessions(token_hash,${column(kind)},credential_version,expires_at) VALUES (@arg1,@arg2,@arg3,DATEADD(hour,1,SYSUTCDATETIME()))`, [digest(token),account.id,latest.credential_version]);
        return { token, profile: profile(latest, kind) };
      });
    },
    async logout(kind: Principal, token?: string) {
      if (token && /^[a-f0-9]{64}$/.test(token)) await db.query(`UPDATE sessions SET revoked_at=SYSUTCDATETIME() WHERE token_hash=@arg1 AND ${column(kind)} IS NOT NULL`, [digest(token)]);
    },
    async changePassword(kind: Principal, token: string | undefined, oldPassword: unknown, newPassword: unknown) {
      const account = await current(kind, token);
      if (!validPasswordInput(oldPassword) || !validPassword(newPassword) || oldPassword === newPassword) throw new ApiError(422, 'INVALID_PASSWORD', 'Mật khẩu mới cần khác mật khẩu cũ và dài 8–128 ký tự, có ít nhất 1 chữ in hoa và 1 ký tự đặc biệt.');
      if (!await verifyPassword(oldPassword, account.password_hash)) throw new ApiError(422, 'INVALID_PASSWORD', 'Mật khẩu hiện tại không đúng.');
      const hash = await hashPassword(newPassword);
      await db.transaction(async (tx) => {
        const latest = (await tx.query<Account>(`SELECT * FROM ${table(kind)} WITH (UPDLOCK,HOLDLOCK) WHERE id=@arg1`, [account.id])).rows[0];
        const session = (await tx.query('SELECT token_hash FROM sessions WITH (UPDLOCK,HOLDLOCK) WHERE token_hash=@arg1 AND revoked_at IS NULL AND expires_at>SYSUTCDATETIME()', [digest(token!)])).rows[0];
        if (!latest || !session || latest.password_hash !== account.password_hash || (kind === 'admin' && !latest.active)) throw unauthorized();
        await tx.query(`UPDATE ${table(kind)} SET password_hash=@arg1,credential_version=credential_version+1 WHERE id=@arg2`, [hash,account.id]);
        await tx.query(`UPDATE sessions SET revoked_at=SYSUTCDATETIME() WHERE ${column(kind)}=@arg1 AND revoked_at IS NULL`, [account.id]);
      });
    },
  };
}
