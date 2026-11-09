import { Button } from './Button';
export function AsyncState({ error, onRetry }: { error?: Error | null; onRetry?: () => void }) {
  return (
    <div className="px-4 py-16 text-center space-y-4" role={error ? 'alert' : 'status'}>
      <p className="text-secondary">{error ? 'Không thể tải dữ liệu. Vui lòng thử lại.' : 'Đang tải…'}</p>
      {error && onRetry && <Button onClick={onRetry}>Thử lại</Button>}
    </div>
  );
}
