# Nền tảng giao diện Aura

Cập nhật: 16/10/2026 — giai đoạn 1. Trang thử: `/admin/design-system`; khung quản trị: `/admin`.

## Định hướng

Aura dùng bố cục thoáng, chữ rõ, nền trung tính và xanh cobalt cho hành động. Storefront ưu tiên khám phá sản phẩm; admin ưu tiên đọc thông tin và thao tác. Giữ Plus Jakarta Sans và kiểm tra dấu tiếng Việt trong trang thử. Không bổ sung thư viện UI hoặc dependency cho giai đoạn này.

## Tokens

Nguồn màu ở `frontend/src/styles/index.css`; ánh xạ utility ở `frontend/tailwind.config.js`.

| Vai trò | Sáng | Tối | Utility |
| --- | --- | --- | --- |
| Nền | #FFFFFF | #000000 | bg-background |
| Bề mặt phụ | #F5F5F7 | #161618 | bg-surface-subtle |
| Bề mặt nổi | #FFFFFF | #1C1C1E | bg-surface-elevated |
| Chữ chính | #111827 | #F5F5F7 | text-primary |
| Chữ phụ | #6B7280 | #A1A1A6 | text-secondary |
| Chữ mờ/placeholder | #64748B | #A1A1AA | text-muted |
| Hành động | #0062D2 | #2997FF | bg-accent / text-accent |
| Chữ trên hành động | #FFFFFF | #071626 | text-on-accent |
| Thành công | #167044 | #7DE2AA | text-success / bg-success-soft |
| Cảnh báo | #865B0A | #F5CF76 | text-warning / bg-warning-soft |
| Nguy hiểm | #B42336 | #FF9CA7 | text-danger / bg-danger-soft |

- Type scale: nhãn 12px, nội dung/form desktop 14px, input mobile 16px, section 20–24px, tiêu đề trang 30–36px. Giá/số lượng dùng tabular figures.
- Khoảng cách theo thang Tailwind 4px; khoảng cách trường 20px, panel 20–28px, section 32px. Không dùng cỡ chữ nhỏ để ép bảng vừa mobile.
- Container tối đa 1280px; padding 16/24/32px. Admin sidebar 256px từ breakpoint 1024px. Form chuyển hai cột từ 640px.
- Radius: control 10px, panel 24px; icon cùng bộ Lucide. Màu semantic thay cho hex trong component mới.
- Ảnh sản phẩm dùng ProductImage, `object-contain`, khai báo width/height, nền ảnh riêng và fallback khi lỗi. Asset hiện tại vẫn cần duyệt quyền sử dụng trước production.
- Focus có outline 2px; control phổ biến cao tối thiểu 44px. Reduced motion tắt animation/transition không cần thiết. Hero tĩnh giúp người dùng chủ động đọc và điều hướng.

## Component và hợp đồng sử dụng

Import trực tiếp từ file tương ứng trong `frontend/src/components/common`, không thêm barrel toàn bộ thư viện.

| Thành phần | Quy tắc |
| --- | --- |
| Button | Mặc định `type="button"`; form submit phải khai báo `type="submit"`. `loading` vô hiệu thao tác lặp và đặt aria-busy. Không dùng button lồng trong link ở code mới. |
| Input / Select | Bắt buộc label. ID tự sinh; hint/error liên kết bằng aria-describedby; error đặt aria-invalid. Form xử lý validation và focus lỗi đầu tiên. |
| Checkbox / Radio | Dùng input native và label bao quanh. Radio cần name chung, nhóm dùng fieldset/legend. |
| FieldError | Dùng ID liên kết với field; thông báo lỗi cụ thể và hướng sửa. |
| Badge / Alert | Màu semantic sáng/tối; thông tin trạng thái phải có chữ. Alert lỗi dùng role=alert. |
| ToastProvider / useToast | Phản hồi thao tác không chặn, tối đa ba thông báo; người dùng chủ động đóng, không tự biến mất khi chưa đọc. Lỗi trường nhập dùng inline error. |
| Skeleton / EmptyState | Skeleton aria-hidden, vùng chứa đặt status và nhãn tải. EmptyState có lý do và hành động phù hợp. |
| Dialog / Drawer | Controlled open/onClose; title bắt buộc; children và footer là composition slots. Dùng showModal, khóa cuộn theo số overlay, vòng Tab/Shift+Tab, Escape, khôi phục focus. Nội dung nền inert do dialog native. |
| Tabs | Controlled value/onChange, item value duy nhất. ArrowLeft/Right, Home/End; panel nối aria-controls/labelledby. |
| Pagination | Nhận page/pageSize/total/onChange. Service/URL chịu trách nhiệm trang dữ liệu thực; component chặn nút ở hai đầu và thông báo số trang. |

Không truyền `<form method="dialog">` tự đóng vào Overlay controlled. Dùng onClose để giữ state và DOM đồng bộ. Chỉ mở một modal cho một bước thao tác; form có dữ liệu chưa lưu cần xác nhận đóng khi triển khai nghiệp vụ.

## Layout và ranh giới module

- Storefront: `Layout`, Header gọn, `StoreSearch`, `MobileMenu`, Footer; skip link tới main.
- Admin: route `/admin` lazy-load riêng, sidebar/nav mobile, breadcrumb, theme toggle, Outlet có Suspense/ErrorBoundary. Giai đoạn 3 thêm phiên/vai trò demo, CRUD catalog và hồ sơ admin; chưa có xác thực/phân quyền server. Xem `ADMIN_PHASE_3.md`.
- 404 giữ URL sai và hướng dẫn quay lại; 403 là màn hình trình bày, không phải cơ chế kiểm tra quyền.
- `CheckoutSummary` nhận dữ liệu/tổng tiền từ page; `OrderTotals` trình bày tổng chung; `ProductDialogs` hiển thị ảnh/thông số từ fixture bằng overlay chung. Không tính lại giá ở component trình bày.
- Search gợi ý sử dụng cùng component ở mobile/desktop, debounce, AbortController, trạng thái loading/empty/error. Search trả kết quả bằng service contract đã có.
- Giai đoạn 2 đã chuẩn hóa card, form checkout, gallery và nội dung demo; xem `STOREFRONT_PHASE_2.md`.

## Kiểm chứng

Script `frontend/scripts/ui-smoke.mjs` dùng Playwright đã có sẵn, không tự cài hoặc tải browser. Chạy Vite trước; chạy `node scripts/ui-smoke.mjs <đường-dẫn-module-playwright> <đường-dẫn-chrome>` trong frontend. Có thể đặt APP_URL để đổi địa chỉ local.

Kết quả máy và ảnh nằm tại `docs/qa/phase-1/`. Kiểm tra: bàn phím modal/drawer, tabs, validation, toast, pagination, responsive 360/390/768/1024/1440 ở hai theme, menu admin/storefront, search, hồi quy hộp thoại sản phẩm/checkout/carousel, 404/403. Không có lỗi JavaScript runtime trong luồng kiểm tra. Đây là smoke test Chrome và kiểm tra ảnh, chưa phải chứng nhận WCAG hoặc E2E toàn bộ thương mại điện tử.

Nguồn API modal native: [MDN dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog). showModal làm phần còn lại của trang inert; vòng focus và khôi phục focus được kiểm tra riêng trong dự án.
