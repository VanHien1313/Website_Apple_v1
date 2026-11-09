# Chuyển sang SQL Server — 24/10/2026

Theo quyết định của người dùng: **Microsoft SQL Server là database chính thức**. Nội dung PostgreSQL/PGlite trong báo cáo B1 cũ là lịch sử, không còn hướng dẫn chạy hiện hành.

## Thay đổi

- Giữ Node.js/TypeScript/Express; bỏ pg, @types/pg và PGlite. Dùng mssql; Windows Authentication qua msnodesqlv8 + ODBC17, SQL Authentication qua Tedious.
- Thay DATABASE_URL bằng DB_SERVER/DB_DATABASE/DB_AUTH và cấu hình TLS. Không lưu password SQL khi dùng danh tính Windows.
- Chuyển toàn bộ schema14 bảng sang T-SQL: PK/FK/check, Unicode/JSON, giá nguyên VND, index, snapshot, session và event append-only.
- Migration checksum + sp_getapplock trong transaction. Seed/bootstrap có khóa, không dùng ON CONFLICT hoặc advisory lock PostgreSQL.
- Catalog chuyển sang FOR JSON PATH, OFFSET/FETCH, TOP, CHARINDEX; truy vấn count/page/facet cùng transaction.
- Auth chuyển sang OUTPUT INSERTED, DATEADD/SYSUTCDATETIME, UPDLOCK/HOLDLOCK và mã duplicate2601/2627.
- Bộ tests không còn PostgreSQL nhúng: dùng database SQL Server ngẫu nhiên được tạo riêng và dọn sau mỗi suite.

## Phạm vi dữ liệu

Phát hiện và kết nối thành công instance SQL Server2022 Express `.\SQLEXPRESS`. Tạo database local AuraStore nếu chưa tồn tại. Không sửa cấu hình instance, không đổi mode xác thực và không động vào database nghiệp vụ khác. Không migrate dữ liệu từ PostgreSQL; schema001 mới chỉ dành cho SQL Server chưa có schema app.

## B2 hiện tại

API catalog có danh mục, tìm kiếm/lọc giá, cấu hình, sort/page và detail; API auth có register/login/me/logout/password cho khách và login/me/logout/password cho admin. Session server dùng token hash, cookie HttpOnly và thu hồi khi đổi mật khẩu/khóa admin. Bootstrap owner qua stdin có guard bảng rỗng. Không tạo owner/mật khẩu thật tự động.

**Cập nhật25/10:** frontend đã có chế độ API cho catalog/auth và chọn SKU theo màu; xem [mốc tích hợp B2](BACKEND_B2_FRONTEND.md) cùng bằng chứng kiểm thử tại đó. B2 chưa nghiệm thu toàn bộ: upload chưa triển khai. B3 checkout/order transaction chưa có endpoint thật.

## Kiểm chứng và giới hạn

**16/16 test đạt trên SQL Server thật; typecheck/build đạt.** Bản build đã chạy ở localhost:4000, readiness trả ready và catalog đọc đúng sản phẩm mẫu từ AuraStore. Xem [test log](qa/sql-server/tests.txt) và [runtime check](qa/sql-server/runtime.json). Database AuraTest được dọn sau tests, không còn database test khi kiểm tra cuối.

Các test bao phủ FK/unique/check, rollback DDL, seed lặp, token/session, đổi mật khẩu, origin/rate limit, admin khóa, catalog và tranh lượng tồn cuối cùng bằng transaction SQL. Test tranh tồn chỉ kiểm chứng primitive database, không chứng minh endpoint checkout B3 hoàn thành.

Dependency install cuối báo0 vulnerability. Khóa Tedious19.2.2 trong dải mssql hỗ trợ, Azure Identity4.13.0 và uuid11.1.1 bên trong MSAL để tránh các advisory phát hiện khi cài mới. MSAL ở phiên bản này dùng uuid.v4; API đó vẫn có ở bản khóa. Azure/Entra login không thuộc chế độ auth đang triển khai; cần rà lại overrides khi nâng dependency và kiểm thử riêng nếu bổ sung Entra. Không dùng npm audit như chứng nhận bảo mật.

Windows Authentication được chạy thực tế. SQL Authentication/Tedious và Docker đã có cấu hình nhưng chưa có kết quả kết nối trực tiếp trong phiên này. Chưa chứng nhận triển khai production hoặc audit bảo mật đầy đủ.

Hướng dẫn sử dụng: [backend/README.md](../backend/README.md).
