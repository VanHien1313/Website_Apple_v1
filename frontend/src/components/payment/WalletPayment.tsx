import { useEffect, useRef, useState } from 'react';
import { request } from '../../services/api/http';
import { Button } from '../common/Button';

export const paymentNames: Record<string, string> = {
  cod: 'Thanh toán khi nhận hàng (COD)',
  momo: 'Ví MoMo / QR',
  zalopay: 'Ví ZaloPay / QR',
};

interface PaymentView {
  paymentStatus: string;
  orderStatus: string;
  mode: string;
  state: string;
  expiresAt: string | null;
  payUrl: string | null;
  qrImage: string | null;
}

export function WalletPayment({ orderId, method, onPaid }: { orderId: string; method: string; onPaid?: () => void }) {
  if (method !== 'momo' && method !== 'zalopay') return null;
  return <WalletSession key={orderId + ':' + method} orderId={orderId} method={method} onPaid={onPaid} />;
}

function WalletSession({ orderId, method, onPaid }: { orderId: string; method: 'momo' | 'zalopay'; onPaid?: () => void }) {
  const [data, setData] = useState<PaymentView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const paid = useRef(false);
  const action = useRef<AbortController | null>(null);
  const poll = useRef<AbortController | null>(null);
  const onPaidRef = useRef(onPaid);
  useEffect(() => { onPaidRef.current = onPaid; }, [onPaid]);
  useEffect(() => () => action.current?.abort(), []);

  useEffect(() => {
    if (busy || paid.current) return;
    const controller = new AbortController();
    poll.current = controller;
    let timer: ReturnType<typeof setTimeout>;
    async function load(initial: boolean) {
      try {
        const next = await request<PaymentView>(`/orders/${orderId}/payment`, {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
        });
        if (controller.signal.aborted) return;
        setData(next);
        setError('');
        if (next.paymentStatus === 'PAID') {
          paid.current = true;
          if (!initial) onPaidRef.current?.();
          return;
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError((cause as Error).message);
      }
      if (!controller.signal.aborted) timer = setTimeout(() => void load(false), 10000);
    }
    void load(true);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [orderId, busy]);

  async function act(operation: 'start' | 'refresh') {
    if (action.current) return;
    const controller = new AbortController();
    action.current = controller;
    poll.current?.abort();
    setBusy(true);
    setError('');
    try {
      const next = await request<PaymentView>(`/orders/${orderId}/payment/${operation}`, {
        method: 'POST', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(45000)]),
      });
      if (controller.signal.aborted) return;
      setData(next);
      if (next.paymentStatus === 'PAID') {
        paid.current = true;
        onPaid?.();
      }
    } catch (cause) {
      if (!controller.signal.aborted) setError((cause as Error).message);
    } finally {
      action.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  const unavailable = data?.mode === 'off';
  const expired = data?.state === 'READY' && !data.payUrl && !data.qrImage;
  return <section className="wallet-payment ui-panel p-5 space-y-4">
    <h2 className="text-lg font-semibold">{paymentNames[method]}</h2>
    {data?.mode === 'sandbox' && <p className="rounded-lg bg-accent-light p-3 text-sm text-accent">Giao dịch thử nghiệm. Không tính vào doanh thu thực.</p>}
    {data?.state === 'REVIEW' ? <p role="alert" className="text-sm text-danger">Tiền đến sau khi đơn đã hủy. Vui lòng liên hệ cửa hàng để đối soát hoặc hoàn tiền.</p>
      : data?.paymentStatus === 'PAID' ? <p role="status" className="font-semibold text-accent">Đã xác minh thanh toán từ cổng.</p>
      : data?.orderStatus === 'CANCELLED' ? <p>Đơn đã hủy.</p>
      : unavailable ? <p>Phương thức này đang tạm ngừng. Vui lòng liên hệ cửa hàng nếu bạn đã thanh toán.</p>
      : !data ? <p role="status">Đang tải trạng thái thanh toán…</p>
      : <>
        {data.qrImage && <img src={data.qrImage} alt={`Mã QR ${paymentNames[method]} cho đơn hàng này`} width={280} height={280} className="mx-auto max-w-full rounded-xl bg-white" />}
        {data.payUrl && <a className="ui-button inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-accent px-4 py-3 font-semibold text-white" href={data.payUrl} rel="noreferrer">Mở cổng thanh toán {method === 'momo' ? 'MoMo' : 'ZaloPay'}</a>}
        {data.expiresAt && !expired && (data.qrImage || data.payUrl) && <p className="text-xs text-secondary">Hiển thị đến {new Date(data.expiresAt).toLocaleString('vi-VN')}.</p>}
        {expired && <p role="status">Mã QR đã hết hạn hiển thị. Nếu bạn đã trả tiền, hãy kiểm tra giao dịch trước khi đặt đơn khác.</p>}
        {data.state === 'CREATING' && <p role="status">Đang kiểm tra phiên thanh toán. Nếu kết nối bị gián đoạn, hãy kiểm tra giao dịch trước khi đặt đơn khác.</p>}
        <div className="flex flex-wrap gap-3">
          {data.state === 'NOT_STARTED' && <Button onClick={() => void act('start')} loading={busy}>Tạo mã QR / mở ví</Button>}
          {data.state !== 'NOT_STARTED' && <Button variant="outline" onClick={() => void act('refresh')} loading={busy}>Kiểm tra thanh toán</Button>}
        </div>
      </>}
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
  </section>;
}
