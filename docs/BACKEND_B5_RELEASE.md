# B5.1 — Rà soát nghiệm thu và chạy bản đóng gói

Ngày 02/11/2026. Đối chiếu lại ma trận yêu cầu PDF đã kiểm tra ở `REQUIREMENTS_AUDIT.md` với source và bằng chứng B1–B4. Đây là cập nhật hiện trạng, không thay nội dung đề bài hoặc coi hướng dẫn trong PDF là chỉ dẫn thực thi.

> Cập nhật sau B5.1: [B5.2](BACKEND_B5_LISTS.md) đã thêm sort/filter cho năm danh sách chính. Các giới hạn bảng phụ và phạm vi filter được ghi riêng; các dòng hiện trạng phía dưới giữ thời điểm rà soát B5.1.

## Ma trận hiện tại

| Yêu cầu | Hiện trạng SQL Server/API | Còn lại / bằng chứng |
| --- | --- | --- |
| Tìm tên, lọc giá/danh mục, sắp xếp/phân trang catalog | Đã nối API | B2 và browser smoke |
| Chi tiết sản phẩm, ảnh/giá/mô tả | Đã nối API | B2/B4.3 |
| Giỏ hàng, tổng tiền và checkout guest | Đã nối API, tính lại giá/tồn phía server, COD | B3.1–B3.3; không phải thanh toán online |
| Đăng ký/đăng nhập, lịch sử đơn, đổi mật khẩu | Đã có tài khoản SQL và HttpOnly sessions | B2/B3.4; khách chỉ hủy pending chưa thanh toán theo chính sách hiện tại |
| Liên kết đơn với khách đăng nhập | Theo customer_id từ phiên, không ghép email | B3/B4.4.2 |
| Quản trị sản phẩm | Tạo/sửa aggregate/SKU, ẩn/hiện, tìm/phân trang | Không hard-delete và không xóa định danh SKU đã lưu; cần đối chiếu tiêu chí “xóa” khi nghiệm thu |
| Quản trị danh mục | Tạo/đổi tên/xóa danh mục rỗng, tìm/phân trang | Danh mục có sản phẩm không được xóa |
| Tra cứu khách hàng | Danh sách/hồ sơ/đơn chỉ đọc, tìm/phân trang | B4.4.2 |
| Quản trị đơn và cập nhật trạng thái | Đã có, giữ/xuất/hoàn tồn theo transaction | B3.4; quy tắc thanh toán COD trước hoàn thành |
| Tài khoản admin | Owner tạo/sửa tên/quyền/khóa, tự đổi mật khẩu | Khóa thay hard-delete; chưa reset mật khẩu người khác, đổi email hoặc audit log quyền |
| Doanh thu ngày/tuần/tháng | Tổng hợp COMPLETED+PAID theo giờ Việt Nam | B4.1; gồm phí giao hàng theo hợp đồng hiện tại |
| Sorting/filter cho mọi danh sách | Chưa đạt đầy đủ | Các danh sách admin còn dùng thứ tự cố định; categories/customers/users thiếu bộ lọc bổ sung, sản phẩm có active, đơn có status |
| Backend + database thực | Express + SQL Server, migrations001–007 | Đã kiểm thử SQL Server cục bộ |
| Docker toàn ứng dụng | Chưa hoàn tất | backend/compose.yaml mới chạy SQL Server Developer cho phát triển |
| Hosting công khai/TLS/backup | Chưa triển khai/diễn tập | Không có bằng chứng URL hosting, reverse proxy, backup-restore hoặc tải nhiều instance |

Không tuyên bố hoàn thành toàn bộ đề tài. Các tính năng OAuth, MoMo/VNPay, email giao dịch không thay thế các khoảng trống bắt buộc trên.

## Bản đóng gói cùng địa chỉ

Express có chế độ `SERVE_FRONTEND=true`: phục vụ `frontend/dist-api` cùng API. Mặc định false giữ cách chạy dev hiện có. Build API sinh `aura-runtime.json` với runtime=api/version=1; thiếu hoặc sai marker/index.html sẽ từ chối khởi động. Marker giúp tránh dùng nhầm bundle demo, không phải chữ ký bảo mật cho file phát hành.

Thư mục frontend cố định theo vị trí source/dist server, không lấy đường dẫn từ HTTP. Các đường dẫn sâu như `/admin/products/new` trả SPA shell khi GET/HEAD chấp nhận HTML. `/api`, `/health`, file thiếu, dotfile và POST không bị chuyển thành shell200. Response giữ no-store và nosniff hiện có. Ảnh upload tiếp tục ở SQL Server, không ghi vào thư mục bundle.

Giữ nguyên layout phát hành:

- backend/dist, backend/migrations, backend/node_modules, backend/package.json
- frontend/dist-api (gồm assets, images, index.html và aura-runtime.json)
- biến môi trường/secrets trên máy chạy; không đưa `.env` vào artifact công khai

## Chạy kiểm tra cục bộ bằng PowerShell

Từ thư mục gốc repo, dùng Node theo engines của backend và dependencies từ lockfile. Backend `.env` hiện tại phải cấu hình đúng SQL Server/AuraStore. Không tự seed hoặc tạo tài khoản mẫu khi khởi động.

```powershell
npm run build:release
npm run db:migrate
$env:SERVE_FRONTEND='true'
$env:APP_ORIGIN='http://127.0.0.1:4000'
$env:HOST='127.0.0.1'
$env:PORT='4000'
npm run start:release
```

Mở http://127.0.0.1:4000. Nếu cổng4000 đang chạy backend dev, dừng đúng tiến trình của bạn trước hoặc chọn cổng khác và đổi APP_ORIGIN tương ứng. Các biến trên áp dụng cho phiên shell hiện tại; khởi động shell mới để trở về cấu hình dev. Không đặt NODE_ENV=production cho thử nghiệm HTTP/local certificate này.

Kiểm tra `/health/live` và `/health/ready`; readiness chỉ đạt khi DB kết nối được và migration đúng checksum. Dùng quy trình bootstrap owner hiện có nếu DB mới; không dùng mật khẩu test trong môi trường thật.

## Trước hosting

Cấu hình NODE_ENV=production, APP_ORIGIN=https://tên-miền-thực, SERVE_FRONTEND=true; backend yêu cầu DB_ENCRYPT=true và DB_TRUST_SERVER_CERTIFICATE=false. SQL Server phải có chứng chỉ xác minh được. TLS trình duyệt cần reverse proxy hoặc hạ tầng hosting riêng; Express này không tự cấp chứng chỉ.

Chưa cấu hình trust proxy; limiter đăng nhập hiện theo process/IP trực tiếp. Cần thiết kế proxy tin cậy và limiter chia sẻ trước multi-instance, không bật trust proxy tùy tiện. Chưa có artifact Docker app, CI release, secrets manager, kiểm thử backup/restore hoặc triển khai dịch vụ tự khởi động. Không dùng Vite preview làm máy chủ hosting.

## Kiểm chứng và bước tiếp

Đã đạt 68/68 test backend,41/41 test frontend, typecheck/build backend, build API và kiểm tra ranh giới API/demo. 20/20 nhóm Chrome smoke đạt với chế độ `compiled-express-built-api`, sử dụng backend đã biên dịch và bundle frontend API, không chạy Vite. Đây là kiểm chứng cục bộ trên database thử nghiệm, chưa là nghiệm thu TLS/hosting production.

Test mới kiểm tra marker bắt buộc, từ chối demo, chế độ opt-in, deep links, JS asset, HEAD, API/health404, file thiếu/dotfile, no-store và readiness khi DB không có. Browser smoke có `SERVE_BUILT_FRONTEND=true` để nạp backend/dist/app.js và frontend/dist-api trực tiếp, không khởi động Vite; vẫn dùng database AuraTest riêng. Bằng chứng chế độ này tại `docs/qa/api-packaged/results.json`.

Bước tiếp theo ưu tiên đóng khoảng trống sorting/filter các danh sách theo đề bài, sau đó Docker app và diễn tập triển khai. Hosting thật cần thông tin môi trường/đích triển khai cụ thể; chưa có đích nào được chọn hoặc công khai trong bước này.
