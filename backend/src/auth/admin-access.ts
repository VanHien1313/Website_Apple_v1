import { createHash } from 'node:crypto';
import type { SqlClient } from '../db/database.ts';
import { ApiError } from './service.ts';

/** Call inside the caller's transaction so revocation and the operation share its consistency boundary. */
export async function requireAdmin(tx: SqlClient, token?: string) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new ApiError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập quản trị.');
  const row = (await tx.query<{ id: string; name: string }>(`SELECT a.id,a.name FROM admin_users a JOIN sessions s ON s.admin_id=a.id
    WHERE s.token_hash=@arg1 AND a.active=1 AND a.role IN ('owner','editor') AND s.revoked_at IS NULL
    AND s.expires_at>SYSUTCDATETIME() AND s.credential_version=a.credential_version`, [createHash('sha256').update(token).digest('hex')])).rows[0];
  if (!row) throw new ApiError(401, 'UNAUTHENTICATED', 'Phiên quản trị không hợp lệ hoặc đã hết hạn.');
  return row;
}
