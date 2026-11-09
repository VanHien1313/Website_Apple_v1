import { useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input, Select, Checkbox, Radio } from '../../components/common/FormControls';
import { Badge } from '../../components/common/Badge';
import { Alert } from '../../components/common/Alert';
import { Dialog, Drawer } from '../../components/common/Overlay';
import { Tabs } from '../../components/common/Tabs';
import { Pagination } from '../../components/common/Pagination';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { useToast } from '../../components/common/Toast';
const colors = [
  { name: 'Nền', token: '--color-background' }, { name: 'Bề mặt', token: '--color-surface-subtle' },
  { name: 'Nội dung', token: '--color-primary' }, { name: 'Hành động', token: '--color-accent' },
  { name: 'Thành công', token: '--color-success' }, { name: 'Cảnh báo', token: '--color-warning' },
];
export default function DesignSystemPage() {
  const [overlay, setOverlay] = useState<'dialog' | 'drawer' | null>(null);
  const [tab, setTab] = useState('form');
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [page, setPage] = useState(1);
  const notify = useToast();
  return <div className="space-y-8">
    <div><p className="mb-3 text-sm text-secondary">Nền tảng giao diện · 01</p><h1 className="ui-page-title">Nhất quán trong từng chi tiết.</h1><p className="mt-4 max-w-2xl text-sm leading-relaxed text-secondary">Thư viện nội bộ để thử thành phần ở giao diện sáng, tối và trên thiết bị nhỏ. Dữ liệu trên trang này chỉ dùng để kiểm tra.</p></div>
    <section className="ui-panel p-5 sm:p-7" aria-labelledby="palette-title"><div className="mb-6 flex flex-wrap items-end justify-between gap-3"><h2 id="palette-title" className="text-xl font-bold">Màu sắc & chữ</h2><span className="text-xs text-secondary">Plus Jakarta Sans · Tiếng Việt</span></div><div className="grid grid-cols-3 gap-3 sm:grid-cols-6">{colors.map((color) => <div key={color.token}><div style={{ background: `var(${color.token})` }} className="mb-3 h-20 rounded-lg border border-border-subtle" /><p className="text-xs font-semibold">{color.name}</p></div>)}</div><div className="mt-7 border-t border-border-subtle pt-6"><p className="text-2xl font-bold tracking-tight">Công nghệ. Gần hơn với bạn.</p><p className="mt-3 text-sm leading-relaxed text-secondary">Tiếng Việt rõ ràng, dấu đầy đủ. Giá trị dễ đọc: <span className="tabular-nums">24.990.000 ₫</span>.</p></div></section>
    <section className="ui-panel p-5 sm:p-7" aria-labelledby="actions-title"><h2 id="actions-title" className="mb-5 text-xl font-bold">Hành động & phản hồi</h2><div className="flex flex-wrap gap-3"><Button icon={<Check size={16} />} onClick={() => notify('Đã lưu thay đổi mẫu.')}>Lưu thay đổi</Button><Button variant="secondary" onClick={() => setOverlay('drawer')}>Mở ngăn bên</Button><Button variant="outline" onClick={() => setOverlay('dialog')}>Mở hộp thoại</Button><Button variant="ghost" onClick={() => notify('Bạn đang xem ví dụ thông báo.')}>Xem thông báo</Button><Button variant="danger" onClick={() => setOverlay('dialog')}>Xóa bản mẫu</Button><Button disabled>Không khả dụng</Button><Button loading>Đang lưu…</Button></div><div className="mt-5 flex flex-wrap gap-2"><Badge label="Mới" variant="new" /><Badge label="Cần kiểm tra" variant="sale" /><Badge label="Đã hủy" variant="hot" /><Badge label="Bản nháp" /></div></section>
    <section className="ui-panel p-5 sm:p-7" aria-labelledby="form-title"><h2 id="form-title" className="mb-5 text-xl font-bold">Dữ liệu & trạng thái</h2><Tabs label="Ví dụ thành phần" value={tab} onChange={setTab} items={[
      { value: 'form', label: 'Biểu mẫu', content: <form className="max-w-2xl space-y-5" noValidate onSubmit={(event) => { event.preventDefault(); setSubmitted(true); if (name.trim()) notify(`Đã lưu bản mẫu: ${name.trim()}.`); else document.getElementById('sample-name')?.focus(); }}>
        <div className="grid gap-5 sm:grid-cols-2"><Input id="sample-name" name="productName" label="Tên sản phẩm" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: MacBook Air" hint="Tên hiển thị trong danh mục." error={submitted && !name.trim() ? 'Nhập tên sản phẩm trước khi lưu.' : undefined} /><Select label="Danh mục" name="category" defaultValue="mac"><option value="mac">Mac</option><option value="iphone">iPhone</option><option value="ipad">iPad</option></Select></div>
        <Input label="Mã sản phẩm" value="AURA-DEMO-001" disabled hint="Ví dụ trường không thể chỉnh sửa." />
        <fieldset><legend className="mb-2 text-sm font-semibold">Trạng thái hiển thị</legend><div className="flex flex-wrap gap-6"><Radio name="visibility" value="draft" label="Bản nháp" defaultChecked /><Radio name="visibility" value="published" label="Hiển thị" /></div></fieldset>
        <Checkbox name="featured" label="Đưa vào nhóm sản phẩm nổi bật" /><Button type="submit" icon={<ArrowRight size={16} />}>Lưu bản mẫu</Button>
      </form> },
      { value: 'loading', label: 'Đang tải', content: <div role="status"><span className="sr-only">Đang tải sản phẩm</span><div className="grid gap-5 sm:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="space-y-3"><Skeleton className="h-36" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>)}</div></div> },
      { value: 'empty', label: 'Trống', content: <EmptyState title="Chưa có sản phẩm" description="Thêm sản phẩm đầu tiên để bắt đầu xây dựng danh mục." actionLabel="Thử tạo sản phẩm" onAction={() => setTab('form')} /> },
      { value: 'error', label: 'Lỗi', content: <Alert tone="danger" title="Không thể lưu thay đổi">Kết nối bị gián đoạn. Nội dung bạn nhập vẫn được giữ lại.<div className="mt-3"><Button variant="outline" onClick={() => { setTab('form'); notify('Đã quay lại biểu mẫu.'); }}>Quay lại biểu mẫu</Button></div></Alert> },
    ]} /></section>
    <section className="ui-panel p-5 sm:p-7" aria-labelledby="pagination-title"><h2 id="pagination-title" className="mb-5 text-xl font-bold">Phân trang</h2><p className="mb-5 text-sm text-secondary">Đang xem bản ghi {(page - 1) * 10 + 1}–{Math.min(page * 10, 42)} trong 42 bản ghi mẫu.</p><Pagination page={page} pageSize={10} total={42} onChange={setPage} /></section>
    <Dialog open={overlay === 'dialog'} onClose={() => setOverlay(null)} title="Xóa bản mẫu?" description="Đây là ví dụ xác nhận. Không có dữ liệu sản phẩm nào bị xóa." footer={<><Button variant="outline" onClick={() => setOverlay(null)}>Giữ lại</Button><Button variant="danger" onClick={() => { setOverlay(null); notify('Đã xác nhận thao tác mẫu.'); }}>Xác nhận xóa mẫu</Button></>}><p className="text-sm leading-relaxed text-secondary">Bạn có thể đóng bằng Escape, nút đóng hoặc nút Giữ lại. Focus sẽ trở về nút vừa mở hộp thoại.</p></Dialog>
    <Drawer open={overlay === 'drawer'} onClose={() => setOverlay(null)} title="Tùy chọn hiển thị" description="Ví dụ ngăn bên dùng cho bộ lọc và thao tác nhanh." footer={<Button onClick={() => { setOverlay(null); notify('Đã áp dụng tùy chọn mẫu.'); }}>Áp dụng</Button>}><Checkbox label="Hiển thị sản phẩm còn hàng" defaultChecked /><Checkbox label="Hiển thị sản phẩm khuyến mãi" /><div className="mt-5"><Select label="Sắp xếp" defaultValue="new"><option value="new">Mới nhất</option><option value="price">Giá tăng dần</option></Select></div></Drawer>
  </div>;
}
