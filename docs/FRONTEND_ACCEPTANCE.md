# Nghiệm thu frontend — giai đoạn 6

Ngày: 17/10/2026. Phạm vi: frontend demo trong `D:/Apple_Web`, phục vụ bàn giao backend. Đây không phải nghiệm thu hệ thống production theo toàn bộ PDF.

## Đối chiếu chức năng

| Yêu cầu | Route/luồng hiện có | Kiểm thử / giới hạn |
| --- | --- | --- |
| C01 Tìm theo tên, giá, danh mục | `/search`, các route danh mục; URL q/category/priceRange/sort/page | storefront: phối hợp bộ lọc, Back, rỗng, pagination |
| C02 Danh sách ảnh/tên/giá | ProductCard → chi tiết | storefront: ảnh lỗi/fallback; giá canonical từ catalog |
| C03 Chi tiết/mô tả/cấu hình | `/product/:slug`, gallery/spec dialog | storefront: đổi cấu hình/giá, thêm giỏ, không khả dụng |
| C04 Giỏ/số lượng/tổng | `/cart` | domain + storefront: quantity, đổi giá, cấu hình bị xóa |
| C05 Đặt nhanh | `/checkout` → `/order-confirmation/:id` | checkout + storefront: email tùy chọn, lỗi lưu giữ form/giỏ, retry, reload; COD demo |
| A01 Đăng nhập admin | `/admin/login`, guard | admin: role/expiry/403; chỉ chọn hồ sơ mẫu, chưa auth thật |
| A02 CRUD sản phẩm | `/admin/products`, `/new`, `/:id/edit` | admin: tạo/sửa/xóa, SKU/giá/slug, shared storefront, lỗi lưu |
| A03 CRUD danh mục | `/admin/categories` | admin: duplicate, chặn xóa còn sản phẩm |
| A04 Xem đơn/chi tiết | `/admin/orders`, `/:id` | orders: snapshot, tìm kiếm/trạng thái/ngày/sort/page |
| A05 Vận hành đơn | Chi tiết đơn, dialog ghi chú/lịch sử | orders: chuẩn bị/giao/hoàn tất/hủy, revision conflict, payment riêng |
| A06 CRUD/đổi mật khẩu admin | `/admin/admin-users` | admin: owner-only, self-protection; đổi mật khẩu chỉ diễn tập, phải triển khai server |
| A07 Doanh thu ngày/tuần/tháng | `/admin/reports` | orders + unit: completed/paid, timezone, refund; công thức đề xuất cần chốt |
| O01 Tài khoản khách | `/register`, `/login`, `/account/security` | customer: trùng email, sai mật khẩu, đổi mật khẩu/expiry; sample credential |
| O02 Lịch sử/trạng thái/hủy | `/account/orders`, `/:id` | customer: ownership, hủy trước SHIPPED, reload |
| O03 Liên kết khách–đơn | Checkout khi đã đăng nhập | customer: ID phiên, không nhận đơn guest theo email |
| O04 Admin chỉ xem khách | `/admin/customers`, `/:id` | customer: read-only, tìm kiếm/sort/page |
| L01 Danh sách | Catalog/order đầy đủ query; admin generic tìm kiếm/tên/page, sản phẩm thêm category, admin users thêm role | Category/customer không có filter thuộc tính riêng ngoài tìm kiếm; report lọc ngày/kỳ, sort thời gian cố định. Không tuyên bố mọi list đã đủ tất cả loại filter theo cách hiểu rộng của PDF |
| Backend, DB, Docker, hosting | Chưa triển khai | Xem BACKEND_HANDOFF.md |

Các mã tham chiếu nhóm yêu cầu theo kế hoạch frontend, không phải số điều khoản nguyên văn trong PDF. Báo cáo khảo sát cũ được giữ trong REQUIREMENTS_AUDIT.md.

## Kiểm chứng

Chạy `npm test`, `npm run typecheck`, `npm run build` từ frontend: **35 test đạt**, typecheck/build đạt. Build Vite tạo các chunk lazy route; entry khoảng353KB (107KB gzip), CSS33KB (7KB gzip). Đây là kích thước build, không là đo Core Web Vitals.

Bản build được phục vụ bằng `npm run preview -- --host 127.0.0.1 --port 4173 --strictPort`; Chrome headless dùng profile cô lập và dữ liệu mẫu. Các script nhận đường dẫn module Playwright và Chrome đã có sẵn, không tự tải browser:

```powershell
$env:APP_URL = 'http://127.0.0.1:4173'
node scripts/ui-smoke.mjs <playwright-module-path> <chrome-executable-path>
node scripts/storefront-smoke.mjs <playwright-module-path> <chrome-executable-path>
node scripts/admin-smoke.mjs <playwright-module-path> <chrome-executable-path>
node scripts/orders-smoke.mjs <playwright-module-path> <chrome-executable-path>
node scripts/customer-smoke.mjs <playwright-module-path> <chrome-executable-path>
node scripts/acceptance-smoke.mjs <playwright-module-path> <chrome-executable-path>
```

**309 kiểm tra trình duyệt đạt**: UI22, storefront45, admin39, orders25, customer45, acceptance133. [Tổng hợp lần chạy production](qa/phase-6/run-summary.json). Kết quả từng suite lưu trong `qa/phase-1` đến `qa/phase-6`. Giai đoạn6 bổ sung 130 tổ hợp (13 route ×5 width ×2 theme), kiểm tra tràn ngang, accessible name control, alt ảnh, main landmark; thêm chữ200%, skip link và reduced motion/theme. Chữ200% kiểm tra catalog/register/product editor ở1440px; **chưa kiểm tra zoom UI trình duyệt200%**.

Ảnh xem trực tiếp: [admin mobile dark](qa/phase-6/admin-mobile-dark.png), [register mobile dark](qa/phase-6/register-mobile-dark.png), [editor chữ200%](qa/phase-6/editor-text-200.png). Các suite trước bao phủ giỏ/checkout/xác nhận có dữ liệu, lịch sử/chi tiết đơn và dialog; ma trận mới dùng các trạng thái list rỗng có chủ đích.

## Sửa ở lần nghiệm thu

- `frontend/src/services/customerService.ts`: không báo thất bại sau khi commit mật khẩu chỉ vì xóa phiên cũ lỗi; credentialVersion vẫn vô hiệu phiên cũ. Chuẩn hóa lỗi đọc session bị chặn. Có2 test hồi quy.
- `frontend/src/styles/index.css`: scroll margin cho control dưới sticky header, overscroll dialog, touch action và cân dòng tiêu đề.
- `frontend/src/components/common/ThemeToggle.tsx`, `ColorSwatches.tsx`: giới hạn thuộc tính transition.
- `frontend/src/store/ThemeContext.tsx`, `frontend/index.html`: theme-color theo giao diện.
- README/API_CONTRACT thay bản mô tả cũ; bổ sung bảng quan hệ, quyền quyết định server, endpoint và tiêu chí backend.

Rà theo [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). Chỉ áp dụng quy tắc phù hợp sản phẩm tiếng Việt; hướng dẫn là tài liệu tham khảo, không thay yêu cầu người dùng.

## Giới hạn và việc còn lại

- Browser suite xác nhận các hành trình đã nêu, không phải quét mọi link/console/network hoặc mọi tổ hợp dữ liệu. Không có uncaught pageerror trong các suite đạt. Không đo tất cả console warning/request ảnh ngoài.
- Chưa thử Safari/Firefox, screen reader, browser zoom thật, audit tương phản toàn trang, hiệu năng thiết bị thấp. Không chứng nhận WCAG2.2AA từ các check cấu trúc.
- Nguồn/quyền ảnh và tính chính xác thông số chưa duyệt. Một số ảnh fixture cắt sẵn hoặc khác mẫu cần thay trước công khai.
- Product sort “Gắn nhãn mới” theo badge; chưa có createdAt sản phẩm. Admin lists còn xử lý tại client; chưa phù hợp database lớn.
- Admin credential, session/authorization, upload, inventory, concurrency đa tab, thanh toán và email chưa phải tính năng server.
- Quy tắc ship/doanh thu là hiện trạng demo; xác nhận với chủ sản phẩm trước triển khai thật.

Kết luận phạm vi: bàn giao được frontend demo và kế hoạch tích hợp. Các kiểm tra thủ công/cross-browser và phần hệ thống còn lại phải thực hiện trước production; không đánh dấu toàn bộ đề tài PDF đã hoàn thành.
