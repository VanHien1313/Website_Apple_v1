import { readReceipt, saveReceipt } from './orderService';

/** Khôi phục quyền xem đơn khách vãng lai mà không cần email: token biên nhận 256-bit nằm trong phần #fragment. */
const TOKEN = /^[a-f0-9]{64}$/;
const FRAGMENT = /(?:^|[#&?])receipt=([a-f0-9]{64})(?![a-f0-9])/i;

/** Nhận mã thô (64 ký tự hex) hoặc cả liên kết khôi phục người dùng dán vào. */
export function parseRecoveryInput(value: string): string | undefined {
  const text = value.trim();
  if (TOKEN.test(text.toLowerCase())) return text.toLowerCase();
  return FRAGMENT.exec(text)?.[1].toLowerCase();
}

/** Fragment không được gửi tới server và không nằm trong header Referer. */
export function recoveryLink(origin: string, id: string, token: string): string {
  return `${origin}/order-confirmation/${encodeURIComponent(id)}#receipt=${token}`;
}

/** Lưu token từ `location.hash` vào phiên tab. Trả true khi có token hợp lệ; lỗi storage không ném ra ngoài. */
export function adoptReceiptFromHash(id: string, hash: string, storage?: Pick<Storage, 'setItem'>): boolean {
  const token = parseRecoveryInput(hash);
  if (!token) return false;
  try { saveReceipt(id, token, storage); return true; } catch { return false; }
}

/** Token hiện có của đơn trong tab này, hoặc undefined nếu chưa có / storage không dùng được. */
export function currentReceipt(id: string, storage?: Pick<Storage, 'getItem'>): string | undefined {
  try { return readReceipt(id, storage); } catch { return undefined; }
}
