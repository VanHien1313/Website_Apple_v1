export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

/** Same-origin only: the server owns the HttpOnly cookie; no tokens in browser storage. */
export async function request<T>(path: string, options: { method?: 'POST' | 'PUT'; body?: unknown; signal?: AbortSignal; receiptToken?: string } = {}): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    method: options.method ?? 'GET', signal: options.signal, credentials: 'same-origin',
    headers: { ...(options.method ? { 'Content-Type': 'application/json', 'X-Aura-Request': '1' } : { Accept: 'application/json' }), ...(options.receiptToken ? { 'X-Aura-Receipt': options.receiptToken } : {}) },
    body: options.method ? JSON.stringify(options.body ?? {}) : undefined,
  });
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new HttpError(response.status, body?.error?.code ?? 'HTTP_ERROR', body?.error?.message ?? 'Không kết nối được dịch vụ. Hãy thử lại.');
  if (body === null) throw new Error('Dịch vụ trả về dữ liệu không hợp lệ.');
  return body as T;
}
