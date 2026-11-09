> Lịch sử ngày23/10. Từ24/10 database chính thức là SQL Server; xem [SQL_SERVER_MIGRATION.md](SQL_SERVER_MIGRATION.md). Kết quả PGlite dưới đây không là nghiệm thu SQL Server.

# B1 — nền tảng backend/database

Ngày thực hiện: 23/10/2026. Stack: Node24, TypeScript, Express5, pg8, PostgreSQL17. Dependency được khóa phiên bản trong `backend/package-lock.json`.

## Đã triển khai

- Project `backend/` độc lập; không đổi frontend từ mock sang HTTP trước khi có các endpoint nghiệp vụ.
- Môi trường `.env.example`, kiểm tra cấu hình, server HTTP có liveness/readiness, JSON404 và requestId. Access log không ghi URL/query/body/header hoặc lỗi driver chứa credential.
- Pool pg với timeout, transaction giữ cùng connection, graceful shutdown.
- Migration SQL versioned/checksum, advisory lock và rollback nguyên tử; không tự sửa/reset database khi lỗi. Kiểm tra lịch sử, chuẩn hóa newline Windows/Linux.
- 14 bảng nghiệp vụ + schema_migrations. SKU ghép variant/color phải thuộc cùng sản phẩm; giá nguyên VND và safe-integer; quantity/tồn kho/reserved có CHECK; email/SKU/danh mục unique; session có đúng một principal; snapshot đơn độc lập; events không update/delete; idempotency khóa scope/requestId.
- Index cho catalog, đơn theo khách/trạng thái/ngày, báo cáo, phiên và reservation.
- Seed một thiết bị giả với SKU, không tài khoản/mật khẩu. Opt-in, chặn production, không ghi đè dữ liệu đã sửa khi chạy lại.
- Compose PostgreSQL local giữ volume và bind loopback. Hướng dẫn chạy, migrate, seed, build ở [backend/README.md](../backend/README.md).

## Kiểm chứng

Kết quả ngày 23/10/2026: **10/10 test đạt, typecheck và build đạt**. Dependency install báo 0 vulnerability tại thời điểm cài (không là chứng nhận bảo mật).

Tests dùng engine PostgreSQL nhúng PGlite in-memory và Express HTTP thật tại localhost. Đây không phải mock trả sẵn kết quả SQL.

1. Validation cấu hình.
2. Liveness, readiness503 trước migration, JSON404/requestId và log không chứa secret.
3. Migrate lần đầu/lặp lại, schema readiness, từ chối checksum đã thay đổi, rollback DDL lỗi.
4. Seed opt-in/production guard, chạy lại giữ dữ liệu đã sửa.
5. FK/unique, giá và stock không hợp lệ bị từ chối, composite FK chặn màu sản phẩm khác.
6. Rollback transaction khôi phục stock và bỏ ghi dở.
7. Email unique/chuẩn hóa, principal và thời hạn session.
8. SKU unique không phân biệt hoa thường/khoảng trắng.
9. Tổng đơn/hoàn tất, snapshot giữ nguyên, event append-only, idempotency key unique.
10. Readiness200 khi schema sẵn sàng, header cache an toàn.

Chạy `npm run backend:typecheck`, `npm run backend:test`, `npm run backend:build` từ thư mục gốc. Tests không dùng DATABASE_URL, không chạm dữ liệu người dùng. Không cần chạy lại browser frontend vì B1 không thay source UI.

## Giới hạn nghiệm thu

Máy hiện không có Docker/psql trong PATH. Chưa chạy Compose, kết nối pg tới PostgreSQL server độc lập hoặc kiểm tra nhiều connection tranh chấp dữ liệu. PGlite có một connection độc quyền; test hiện tại không chứng minh race condition/idempotency API đã xử lý. Trước tích hợp cần chạy lại migration/healthcheck bằng PostgreSQL17 và bổ sung concurrency test B3.

Chưa có hashing/login/cookie/CSRF, API catalog/upload, quote/create order, authorization, last-owner policy hoặc stock reservation service. Các cột/ràng buộc hiện có chỉ là nền tảng; frontend vẫn browser-local. Chưa deploy, chưa có Docker backend/frontend, backup/restore hoặc production secret management.

`order_items.product_id/variant_id` giữ ID snapshot, không có FK tới catalog để giữ lịch sử; sku_id có FK RESTRICT. Tiền từ pg là bigint string, adapter B2/B3 phải chuyển có kiểm tra. Discount là khoản tiết kiệm tham chiếu giá gốc, không trừ lần nữa khỏi subtotal giá bán.

Ảnh seed là đường dẫn placeholder, chưa có asset server. Không coi seed mới là bản sao catalog frontend hoặc dataset thương mại đã duyệt. Schema có created_at sản phẩm để B2 thực hiện sort mới nhất theo thời gian thật.

## Tiếp theo: B2

1. API catalog có query/filter/sort/page tại server; ánh xạ SKU tổ hợp vào DTO frontend và quản lý asset.
2. Auth server cho admin/khách, cookie session và quyền; bootstrap owner có kiểm soát, không mật khẩu mặc định trong repo.
3. Thay current()/getAdminSession đồng bộ bằng provider tải phiên có loading/401/error; giữ demo adapter tách biệt.
4. Contract/integration tests và kiểm thử trình duyệt với API thật trước đổi chế độ mặc định.

Tham chiếu: [API_CONTRACT.md](API_CONTRACT.md), [BACKEND_HANDOFF.md](BACKEND_HANDOFF.md).
