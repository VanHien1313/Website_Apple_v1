# B2 — Upload ảnh, 26/10/2026

## Đã triển khai

- Trong chế độ API, đăng nhập admin tại `/admin/login`, mở `/admin` và dùng biểu mẫu **Tải ảnh sản phẩm**. Owner và editor đang hoạt động được upload; khách và phiên hết hạn/thu hồi không được phép.
- `POST /api/v1/admin/media`: body là byte ảnh trực tiếp, Content-Type là image/png, image/jpeg hoặc image/webp; cần cookie admin, Origin đúng APP_ORIGIN và X-Aura-Request:1. Không dùng multipart hoặc JSON/base64.
- Tối đa5MB đầu vào,16 triệu pixel, ảnh tĩnh. Kiểm tra chữ ký và MIME, giải mã bằng Sharp, tự xoay, thu nhỏ tối đa2400×2400 và mã hóa lại WebP. Không giữ tên file, metadata hoặc byte gốc. SVG và file giả bị từ chối trước giải mã.
- `201` trả `{id,url,width,height,bytes}`. `GET /api/v1/media/:id` trả ảnh công khai với Content-Type cố định image/webp, nosniff và CSP sandbox; ID không hợp lệ/không tồn tại trả404. Đây là ảnh catalog công khai, không dùng cho tài liệu riêng tư.
- Giới hạn10 lần thử/phút/admin; tối đa2 tác vụ xử lý ảnh cùng lúc mỗi server. Lỗi quyền, MIME, kích thước, nội dung và rate limit lần lượt dùng401/403,415,413,422,429. Frontend hiển thị lỗi và chỉ báo thành công khi server lưu xong.
- Migration002 thêm `media_images` trong SQL Server: UUID, admin tạo ảnh, nội dung varbinary(max), kích thước và thời gian UTC. Kiểm tra phiên/quyền trong transaction trước INSERT, có khóa để tránh ghi sau khi phiên bị thu hồi đồng thời. Binary binding được bổ sung cho cả driver SQL/Windows; phiên này kiểm thử Windows Authentication.

Sharp được dùng theo [tài liệu giới hạn đầu vào](https://sharp.pixelplumbing.com/api-constructor/) và [mã hóa đầu ra](https://sharp.pixelplumbing.com/api-output/). Dependency được khóa trong package-lock; npm install báo0 vulnerability tại thời điểm cài, không thay thế audit bảo mật.

## Kiểm chứng

- 19/19 test backend trên SQL Server: owner/editor, khách, admin khóa, session revoked, origin, MIME giả/SVG, ảnh hỏng, trên5MB, trên16MP, byte WebP lưu/đọc lại và các test auth/catalog/schema cũ.
- 8/8 nhóm smoke trên bản frontend đã build: upload120×80 qua form, đọc ảnh từ SQL, đăng xuất một tab và kiểm tra tab khác khi focus, cùng các luồng catalog/auth trước đó. Xem [kết quả](qa/api-frontend/results.json) và [ảnh giao diện](qa/api-frontend/admin-session.png).
- Typecheck/build backend và build API frontend đạt. Migration002 đã áp dụng vào AuraStore; migration001 không thay đổi. Database kiểm thử riêng được dọn sau mỗi suite.

## Chạy và phần còn lại

Sau khi lấy source: `npm ci --prefix backend`, `npm run db:migrate`, rồi khởi động lại backend và chạy `npm run dev:api`. Không tự tạo admin thật; bootstrap owner theo README backend.

Ảnh đã upload chưa tự gắn vào sản phẩm vì API sửa catalog thuộc B4. Hiện chưa có thư viện ảnh phân trang/xóa ảnh mồ côi hoặc quota dung lượng; lưu binary trong SQL thuận tiện cho mốc local hiện tại nhưng cần chuyển qua object storage, bổ sung quota/cleanup và limiter dùng chung trước khi vận hành nhiều instance hoặc catalog lớn. Ảnh công khai được cache24 giờ. Không thay đổi chính sách checkout: B3 quote/đặt hàng/giữ tồn vẫn chưa triển khai.
