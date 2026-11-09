> Cập nhật24/10: đã chuyển nền backend sang **SQL Server** theo quyết định của người dùng. [Trạng thái và hướng dẫn hiện hành](docs/SQL_SERVER_MIGRATION.md). Các mô tả PostgreSQL trong lịch sử B1 đã được thay thế.

# Aura — website thương mại điện tử

React 19 · TypeScript · Vite · Tailwind CSS · Express · SQL Server 2022 · Docker. Dự án học tập theo Đề tài số 3, gồm cửa hàng và quản trị trong một ứng dụng.

## Trạng thái

**Hiện hành 09/11/2026:** đã chạy frontend/API/SQL Server bằng Docker local, có owner thật và dữ liệu cửa hàng riêng. 74/74 test backend đạt trên Linux/SQL Server Docker; 21 nhóm E2E Docker và diễn tập restart/backup/restore đạt. Staging có cấu hình riêng và công cụ preflight. GitHub Actions đã đạt toàn bộ build/test/E2E/recovery trên Ubuntu tại commit `6c35852`; xem [lần CI đạt](https://github.com/VanHien1313/Website_Apple_v1/actions/runs/42620970687). Chưa triển khai hosting công khai.

- [Bàn giao và việc còn lại](docs/BACKEND_HANDOFF.md)
- [Chạy Docker local](docs/BACKEND_B5_DOCKER.md)
- [Backup/restore](docs/BACKEND_B5_RECOVERY.md)
- [Chuẩn bị staging](docs/BACKEND_B5_STAGING.md)
- [Kiểm thử CI](docs/BACKEND_B5_CI.md)
- [Image GHCR đã phát hành và digest staging](docs/BACKEND_B5_REGISTRY.md)
- [Triển khai trên Linux host](docs/STAGING_HOST_RUNBOOK.md)

Các cập nhật bên dưới là lịch sử; ưu tiên trạng thái hiện hành và tài liệu bàn giao khi triển khai.

Cập nhật 02/11 — [B5.3 cấu hình Docker](docs/BACKEND_B5_DOCKER.md): có Dockerfile nhiều stage, Compose db/init/app, secret file và hướng dẫn bootstrap. **Chưa build/chạy container vì máy chưa có Docker**; không coi Docker/hosting đã nghiệm thu. Xem tài liệu trước khi chạy để tách database Docker khỏi SQL Server Windows.

Cập nhật 02/11 — [B5.2 sắp xếp/lọc danh sách](docs/BACKEND_B5_LISTS.md): năm danh sách chính có lựa chọn sắp xếp, bộ lọc nghiệp vụ và URL lưu lựa chọn; truy vấn/đếm/phân trang tại SQL Server bằng allowlist. Tiếp theo Docker toàn ứng dụng; giới hạn các bảng phụ được ghi trong tài liệu.

Cập nhật 02/11 — [B5.1 rà soát và bản đóng gói](docs/BACKEND_B5_RELEASE.md): Express có thể phục vụ frontend API đã build cùng địa chỉ bằng `SERVE_FRONTEND=true`. Có lệnh `npm run build:release` và `npm run start:release`; xem hướng dẫn APP_ORIGIN trước khi chạy. Chưa triển khai hosting; còn thiếu sorting/filter một số danh sách và Docker toàn ứng dụng.

Cập nhật 30/10 — [B4.4.2 tra cứu khách hàng](docs/BACKEND_B4_CUSTOMERS.md): danh sách tìm kiếm/phân trang, hồ sơ và đơn gắn đúng tài khoản đã nối SQL Server tại `/admin/customers`. 66 test backend,41 test frontend và20 nhóm browser đạt. Tiếp theo rà soát yêu cầu và chuẩn bị vận hành/triển khai.

Cập nhật 30/10 — [B4.4.1 tài khoản quản trị](docs/BACKEND_B4_ADMIN_USERS.md): owner tạo tài khoản, sửa tên/quyền, khóa/mở khóa; thu hồi phiên và bảo vệ tài khoản hiện tại. Đã nối UI `/admin/users`, migration007 và kiểm thử SQL/Chrome. Bước tiếp theo là quản trị khách hàng; các mốc phía dưới giữ lịch sử triển khai.

Cập nhật 29/10 — [B4.3.2 quản trị sản phẩm](docs/BACKEND_B4_PRODUCTS_UI.md): danh sách tìm/lọc/phân trang và form tạo/sửa sản phẩm, ảnh, thông số, cấu hình/màu/SKU đã nối SQL Server. Có kiểm tra bản máy chủ khi xung đột hoặc mất phản hồi. Nền API tại [B4.3.1](docs/BACKEND_B4_PRODUCTS_API.md). Tiếp theo là quản trị tài khoản/người dùng.

Cập nhật29/10 — [B4.2 quản lý danh mục](docs/BACKEND_B4_CATEGORIES.md): tạo, đổi tên, xóa danh mục rỗng; kiểm tra trùng tên/mã, rowversion chống ghi đè và bảo vệ danh mục có sản phẩm. Bước tiếp theo là CRUD sản phẩm/SKU, sau đó tài khoản quản trị.

Cập nhật29/10 — [B4.1 báo cáo doanh thu](docs/BACKEND_B4_REPORTS.md): `/admin/reports` lấy số tổng hợp từ SQL Server, lọc ngày Việt Nam, nhóm ngày/tuần/tháng và chỉ tính đơn hoàn thành đã thu tiền. Phần B4 còn lại là CRUD quản trị.

Cập nhật29/10: [B3.4 vận hành đơn](docs/BACKEND_B3_MANAGEMENT.md) đã nối SQL Server: lịch sử đơn tài khoản, khách hủy đơn chờ, quản trị xử lý COD, lịch sử thao tác và kiểm tra revision. Giao hàng tiêu thụ tồn giữ; hủy/expiry giải phóng đúng một lần. Bước tiếp theo là B4 báo cáo và CRUD quản trị.

Đã nối [checkout COD B3.3](docs/BACKEND_B3_CHECKOUT.md) với SQL Server: Mua ngay/giỏ hàng → form nhận hàng → tạo đơn → xác nhận. Có chống trùng khi retry, giữ tồn, phục hồi yêu cầu trong phiên tab và bảo vệ quyền đọc đơn guest/tài khoản.

Cập nhật28/10: chế độ API đã mở thêm/xóa/sửa giỏ hàng và báo giá theo giá/tồn SQL Server. Xem [B3.1](docs/BACKEND_B3_QUOTE.md) và [API tạo đơn B3.2](docs/BACKEND_B3_ORDERS.md).

Đã triển khai luồng frontend bằng dữ liệu demo trên trình duyệt: danh mục/tìm kiếm, chi tiết sản phẩm, giỏ hàng, đặt nhanh COD, quản trị sản phẩm/danh mục/tài khoản, vận hành đơn và báo cáo, tài khoản khách và lịch sử đơn. Xem [nghiệm thu giai đoạn 6](docs/FRONTEND_ACCEPTANCE.md).

Backend hiện có Express, schema/migration SQL Server, seed, healthcheck, API catalog và xác thực bằng phiên server. Frontend có chế độ API cho catalog và xác thực khách/admin bằng cookie server: chạy `npm run dev:api`. Đã có upload ảnh admin lưu SQL Server và checkout COD; thanh toán online và email chưa triển khai. Xem [B2 media](docs/BACKEND_B2_MEDIA.md). Chế độ mặc định `npm run dev` vẫn dùng tài khoản/dữ liệu demo. Xem [mốc B2 frontend](docs/BACKEND_B2_FRONTEND.md). Không nhập thông tin thật. Đây không phải website đại lý Apple được xác nhận.

Backend: xem [hướng dẫn chạy](backend/README.md) và [bàn giao SQL Server](docs/SQL_SERVER_MIGRATION.md). Từ gốc có `npm run backend:typecheck`, `npm run backend:test`, `npm run backend:build`, `npm run backend:dev`, `npm run db:migrate`. Lệnh frontend hiện có giữ nguyên.

## Chạy project

Cài Node.js và npm, sau đó tại thư mục gốc:

```powershell
npm --prefix frontend ci
npm run dev
```

```powershell
npm test
npm run typecheck
npm run build
npm run preview
```

Vite hiển thị địa chỉ/port thực tế. Backend hosting sau này cần fallback SPA về `index.html` cho các route frontend và tách riêng `/api`.

## Các màn hình

- Cửa hàng: `/`, `/search`, `/iphone`, `/ipad`, `/mac`, `/watch`, `/product/:slug`, `/cart`, `/checkout`, `/order-confirmation/:id`.
- Khách hàng: `/register`, `/login`, `/account/orders`, `/account/orders/:id`, `/account/security`.
- Quản trị: `/admin/login`, `/admin`, `/admin/products`, `/admin/categories`, `/admin/admin-users`, `/admin/orders`, `/admin/reports`, `/admin/customers`.
- Component mẫu: `/admin/design-system`, sau khi đăng nhập demo.

Dữ liệu demo lưu tại trình duyệt/origin đang chạy. Port 3000 và 4173 có dữ liệu riêng. Reset catalog trên dashboard chỉ khôi phục sản phẩm, danh mục và hồ sơ admin; không xóa giỏ hàng, khách hàng hay đơn đã lưu. Không dùng dữ liệu mẫu làm migration production.

## Cấu trúc và bàn giao

- `frontend/src/pages`, `components`: màn hình, layout và thành phần UI.
- `frontend/src/domain`: quy tắc giỏ hàng, tìm kiếm, checkout, đơn và doanh thu.
- `frontend/src/services/contracts.ts`: interface hiện tại; `services/mock` chứa repository demo.
- `frontend/tests`: test nghiệp vụ; `frontend/scripts/*-smoke.mjs`: kiểm thử trình duyệt cô lập.
- [API contract](docs/API_CONTRACT.md): ánh xạ adapter hiện tại với HTTP dự kiến.
- [Bàn giao backend/database](docs/BACKEND_HANDOFF.md): mô hình quan hệ, thứ tự triển khai và tiêu chí tích hợp.
- [Kế hoạch frontend](docs/FRONTEND_COMPLETION_PLAN.md), [nghiệm thu](docs/FRONTEND_ACCEPTANCE.md), [design system](docs/DESIGN_SYSTEM.md).

Ảnh và thông số đang là fixture; cần duyệt nguồn/quyền sử dụng và độ chính xác trước khi công khai. Các tài liệu khảo sát ngày 15/10 được giữ làm lịch sử, không thay thế bàn giao hiện tại.
