# Aura backend — Microsoft SQL Server

Cập nhật 24/10/2026: database chính thức là **SQL Server 2022+**, theo lựa chọn của người dùng. Node24 + TypeScript + Express được giữ nguyên. Đã bỏ pg/PGlite và chuyển schema, migration, seed, catalog/auth queries sang T-SQL.

## Chạy trên máy Windows hiện tại

Máy có instance `.\SQLEXPRESS` và ODBC Driver17. Dùng Windows Authentication, không cần ghi mật khẩu SQL vào repo. Database phát triển là `AuraStore`.

```powershell
# Tại backend/
npm ci
# Chỉ sao chép nếu chưa có .env:
Copy-Item .env.example .env
npm run db:migrate
npm run dev
```

Không ghi đè .env đã có. Các lệnh đọc cấu hình từ backend/.env. Nếu cài mới, tạo database qua SSMS hoặc `sqlcmd -S '.\SQLEXPRESS' -E -C -Q "CREATE DATABASE AuraStore"` trước migrate. Không chạy lệnh tạo khi database đã tồn tại.

API mặc định `http://127.0.0.1:4000`:

- GET `/health/live`: process HTTP.
- GET `/health/ready`: kết nối SQL Server + lịch sử/checksum migration đúng.
- GET `/api/v1/categories`.
- GET `/api/v1/products?q=&category=&subCategory=&storage=&minPrice=&maxPrice=&sort=&page=&pageSize=`.
- GET `/api/v1/products/by-slug/:slug`.
- POST `/api/v1/auth/register`, `/login`, `/logout`; GET `/me`; PUT `/password`.
- Admin dùng `/api/v1/admin/auth/login`, `/me`, `/logout`, `/password`; không có public register admin.

Sort hỗ trợ featured/newest/price_asc/price_desc. Hai giá trị đầu dùng created_at thật. pageSize1–100, mặc định12; page vượt cuối trả items rỗng và total đúng. API trả dữ liệu cấu hình/SKU, facets và danh sách đã phân trang tại SQL Server. Variant.id là SKU có thể mua, có colorId/configurationId để không ghép nhầm màu. Chưa nối adapter vào frontend hiện tại.

Seed mẫu: đặt `ALLOW_DEMO_SEED=true` tạm thời rồi `npm run db:seed`. Seed opt-in, không chạy production, không ghi đè bản ghi đã sửa, không tạo tài khoản/mật khẩu. Seed ảnh placeholder; không là dữ liệu bán hàng thật.

## Cấu hình

- `DB_SERVER`: `.\SQLEXPRESS` trên Windows, hoặc host TCP.
- `DB_DATABASE`: tên database; migration không tự tạo database.
- `DB_AUTH=windows`: driver mssql/msnodesqlv8 + ODBC Driver17, danh tính Windows của process.
- `DB_AUTH=sql`: driver mssql/Tedious, thêm DB_USER, DB_PASSWORD, tùy chọn DB_PORT.
- `DB_ENCRYPT=true`; `DB_TRUST_SERVER_CERTIFICATE=true` chỉ cho certificate tự ký local. Production buộc TLS có xác thực certificate.
- `APP_ORIGIN`: origin chính xác của frontend (local mặc định http://127.0.0.1:3000); production bắt buộc HTTPS.

compose.yaml cung cấp SQL Server2022 Developer cho phát triển, bind127.0.0.1:1433; cần MSSQL_SA_PASSWORD, EULA và tạo database sau khi container khởi động. Chưa chạy Docker ở máy này. Không dùng sa/quyền tạo database cho tài khoản runtime production; tách tài khoản migration và runtime. Không có hướng dẫn thay đổi authentication mode hoặc cấu hình instance hiện có tự động.

## Session và bootstrap

Mật khẩu server dùng scrypt với salt riêng. Cookie HttpOnly, SameSite=Lax, một giờ; Secure và tiền tố __Host- khi APP_ORIGIN dùng HTTPS. Database chỉ lưu SHA256 của token ngẫu nhiên. Đổi mật khẩu tăng credential_version và thu hồi mọi phiên. Admin bị khóa mất quyền ngay khi đọc phiên.

Mutation auth yêu cầu Origin khớp APP_ORIGIN, `Content-Type: application/json` và `X-Aura-Request: 1`. Không mở CORS tùy ý. Khi nối frontend, dùng reverse proxy cùng origin. Limiter hiện20 mutation/phút/IP/nhóm auth trong một process; cần shared limiter nếu triển khai nhiều instance. Chưa có email verification/reset password/MFA.

Bootstrap owner bằng `npm run admin:bootstrap`: nhận JSON `{email,name,password}` qua stdin, không qua command-line args. Dùng công cụ nhập kín hoặc secret manager để cấp stdin; không paste mật khẩu thật vào chat/shell history. Chỉ chạy được khi bảng admin_users rỗng; không tạo mật khẩu mặc định. Chưa tạo owner thật ở phiên chuyển database này.

## Kiểm thử

```powershell
npm run typecheck
npm test
npm run build
```

Tests kết nối SQL Server thật, mặc định `.\SQLEXPRESS` bằng Windows Authentication. Tạo database ngẫu nhiên `AuraTest_<24hex>` và chỉ xóa database vừa tạo sau test. Không dùng DB_DATABASE của app, không xóa/truncate AuraStore. Tài khoản test cần CREATE/DROP DATABASE; nếu không có quyền, test phải chạy trên instance chuyên kiểm thử.

Tùy chỉnh: TEST_DB_SERVER, TEST_DB_AUTH=sql, TEST_DB_USER, TEST_DB_PASSWORD, TEST_DB_TRUST_CERT=false nếu có certificate hợp lệ. Không có fallback sang SQLite/PGlite. Test không chạy được sẽ fail, không báo pass giả.

## Migration và giao dịch

Schema tại migrations/001_initial.sql dành cho **database SQL Server mới**; không dùng để nâng cấp hay chuyển dữ liệu PostgreSQL đã tồn tại. Không có dữ liệu PostgreSQL production được chuyển trong phiên này. Khi đã áp dụng SQL Server migration, chỉ thêm file mới, không sửa checksum lịch sử.

Migration dùng sp_getapplock thuộc transaction, kiểm tra mã lỗi khi không lấy được khóa; DDL và lịch sử cùng transaction. Seed/bootstrap cũng có khóa ứng dụng. Pool transaction SERIALIZABLE giữ một connection; row lock auth dùng UPDLOCK/HOLDLOCK. Parameters dùng @argN (không ghép dữ liệu người dùng vào SQL).

Schema dùng uniqueidentifier, nvarchar cho tiếng Việt, datetime2 UTC, bigint VND với giới hạn JS safe integer; JSON là nvarchar(max)+ISJSON. Unique index chuẩn hóa qua computed column, filtered unique index cho provider_ref nullable; events append-only bằng trigger. Không coi ràng buộc SQL là thay thế authorization/logic checkout.

Build giữ dist/ và migrations/ cạnh nhau. Có thể chạy `npm start` sau build; server không tự migrate/seed. Nguồn tham khảo: [node-mssql](https://github.com/tediousjs/node-mssql), [sp_getapplock](https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-getapplock-transact-sql).

Xem [bàn giao SQL Server](../docs/SQL_SERVER_MIGRATION.md) để biết kiểm chứng và phần B2 còn lại.
# Cập nhật upload ảnh — 26/10/2026

Migration002 thêm bảng ảnh SQL Server. Admin owner/editor upload tại POST `/api/v1/admin/media`; ảnh công khai qua GET `/api/v1/media/:id`. Body ảnh raw PNG/JPEG/WebP tối đa5MB, yêu cầu cookie admin + Origin + X-Aura-Request. Xem [hướng dẫn, kiểm thử và giới hạn](../docs/BACKEND_B2_MEDIA.md). Sau khi cập nhật source cần chạy db:migrate và khởi động lại server.

