# 🍎 Aura Apple Store — Frontend

Thư mục chứa toàn bộ mã nguồn giao diện (Frontend) của dự án Aura Apple Store E-Commerce.

Được xây dựng với **React 19**, **TypeScript**, **Vite 6** và **Tailwind CSS 3.4**.

## 🚀 Các lệnh thường dùng

```bash
# Cài đặt thư viện
npm install

# Khởi chạy server phát triển
npm run dev

# Kiểm tra kiểu và đóng gói sản xuất
npm run build

# Kiểm tra TypeScript và kiểm thử nghiệp vụ
npm run typecheck
npm test

# Xem thử bản build sản xuất
npm run preview
```

Chi tiết kiến trúc và hướng dẫn toàn diện, vui lòng xem tại [README.md](../README.md) ở thư mục gốc.

Kiến trúc, quy tắc phụ thuộc và cách thêm adapter: [ARCHITECTURE.md](../docs/ARCHITECTURE.md).

Storefront demo giai đoạn 2: [phạm vi và giới hạn](../docs/STOREFRONT_PHASE_2.md). Đơn lưu ở trình duyệt, chỉ nhập dữ liệu mẫu; chưa kết nối backend/thanh toán.

Kiểm thử trình duyệt (khởi chạy Vite trước):

```sh
node scripts/ui-smoke.mjs <playwright-module-path> <chrome-executable-path>
node scripts/storefront-smoke.mjs <playwright-module-path> <chrome-executable-path>
node scripts/admin-smoke.mjs <playwright-module-path> <chrome-executable-path>
node scripts/orders-smoke.mjs <playwright-module-path> <chrome-executable-path>
node scripts/customer-smoke.mjs <playwright-module-path> <chrome-executable-path>
```

Script dùng Playwright/Chrome có sẵn, không tự tải dependency hoặc browser. Nếu Playwright resolve được từ môi trường Node thì có thể bỏ đối số. `APP_URL` mặc định `http://127.0.0.1:3000`; kết quả và ảnh lưu ở `docs/qa/phase-1` và `docs/qa/phase-2`.

Giai đoạn 3: mở `/admin/login` chọn hồ sơ demo; xem [ADMIN_PHASE_3.md](../docs/ADMIN_PHASE_3.md). Kết quả admin smoke tại `docs/qa/phase-3`. Session/đổi mật khẩu là mô phỏng, không thay thế backend.

Giai đoạn 4: `/admin/orders`, `/admin/reports`; dùng đơn tạo tại checkout cùng trình duyệt. Xem [ORDERS_PHASE_4.md](../docs/ORDERS_PHASE_4.md); ảnh/kết quả tại `docs/qa/phase-4`. Mọi cập nhật thanh toán và doanh thu chỉ là demo.

Giai đoạn 5: `/register`, `/login`, `/account/orders`, `/account/security`, `/admin/customers`. Chỉ dùng thông tin/mật khẩu mẫu; xem [CUSTOMER_PHASE_5.md](../docs/CUSTOMER_PHASE_5.md). Kết quả tại `docs/qa/phase-5`.

## Nghiệm thu và tích hợp

Tài liệu hiện hành: [nghiệm thu frontend](../docs/FRONTEND_ACCEPTANCE.md), [API contract](../docs/API_CONTRACT.md), [bàn giao backend/database](../docs/BACKEND_HANDOFF.md). Các mô tả giai đoạn trước phía trên là lịch sử; chưa có backend hoặc xác thực thật.

## Chế độ API SQL Server

Bản API được xuất riêng vào `dist-api/`; bản demo ở `dist/`. Xem bản API bằng `npm run preview:api`. Kiểm tra ranh giới module bằng `npm run test:boundary`; build API tự từ chối import repository/fixture/service demo.

Chạy `npm run dev:api` hoặc đóng gói bằng `npm run build:api`. Backend chạy riêng ở port4000. Xem [hướng dẫn B2](../docs/BACKEND_B2_FRONTEND.md). Chế độ mặc định vẫn là demo.
