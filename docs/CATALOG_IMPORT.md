# Catalog SQL và ảnh sản phẩm

Cập nhật 10/11/2026 sau phản hồi cửa hàng trống và ảnh demo hình học.

## Kết quả

- Main `http://127.0.0.1:4000`: nhập 24 sản phẩm, 92 SKU thuộc 4 danh mục từ `frontend/src/data/mockProducts.ts`. Giữ nguyên owner; không tạo khách hoặc đơn.
- Demo `http://localhost:4001`: thay ảnh của 8 sản phẩm bằng ảnh catalog cũ, giữ 24 SKU, giá thử, tồn kho và 6 đơn hiện hữu. Đơn cũ vẫn giữ ảnh snapshot khi đặt; không viết lại lịch sử.
- 40 ảnh tải từ các URL có sẵn trong frontend, giải mã và chuẩn hóa WebP, lưu SQL `media_images`. Trình duyệt dùng `/api/v1/media/...`, không cần gọi CDN khi demo.
- Backup COPY_ONLY của main đã kiểm tra SQL checksum trước import, nằm trong `deploy/backups`, không commit.
- Chạy importer lần hai bỏ qua 24 sản phẩm main và 8 ảnh demo đã cập nhật, không reset tồn hoặc nhân đôi dữ liệu.

## Dữ liệu và giới hạn

Đây là catalog phục vụ đồ án, không phải kho thương mại thật. Frontend cũ chỉ có cờ còn hàng theo cấu hình; importer tạo các cặp cấu hình/màu và gán tồn khởi tạo 10 cho cấu hình còn hàng, 0 cho cấu hình hết hàng. Giá, mô tả và thông số giữ theo dữ liệu frontend cũ, không được xác minh là giá/thông số hiện hành.

Nguồn ảnh và SHA-256 nằm trong `deploy/catalog/asset-results.json`. Một số URL trong catalog cũ dùng chung ảnh giữa mẫu máy/màu hoặc mang tên thế hệ khác; phiên này khôi phục hình ảnh frontend, chưa chứng nhận từng ảnh chính xác theo mọi SKU hay quyền dùng ảnh thương mại. Không gọi ảnh CDN là ảnh do nhóm tự tạo. Cần rà lại tên/màu/thông số trước công bố cửa hàng thật.

## Vận hành

```powershell
cd D:\Apple_Web
npm run test:catalog
npm run catalog:import                 # chỉ xem trước main
npm run catalog:import -- --apply     # thêm sản phẩm thiếu, giữ bản đã có
npm run catalog:import -- --demo --apply
```

Importer chỉ nhận hai database local cố định ở chế độ development, chạy transaction, kiểm tra schema, ID/slug, hash ảnh và validator sản phẩm hiện hành. Không đổi tài khoản, không tạo session admin, không sửa đơn. Va chạm ID/slug dừng và rollback. Với demo, ảnh người dùng tự đổi được giữ nguyên. Đây là công cụ vận hành Docker, không phải endpoint công khai.

`npm run demo:start` hiện gọi cập nhật ảnh sau khởi tạo để bản demo mới cũng có ảnh sản phẩm. Bản main nhập một lần bằng lệnh tường minh; app không tự seed khi khởi động. `npm run catalog:prepare` chỉ dành cho người bảo trì tái tạo bundle từ source và tải ảnh, cần mạng.

## Kiểm tra

Hai tests xác nhận schema, ID/SKU không trùng, ảnh nội bộ và checksum. `deploy/catalog-verify.mjs` kiểm tra API catalog/ảnh, chi tiết và báo giá theo giá SQL, rồi Chrome chụp trang chủ/chi tiết/tìm kiếm/mobile ở hai origin. Minh chứng ở `docs/qa/catalog-import`. Lượt browser đầu timeout vì ảnh lazy-load chưa vào viewport; đã sửa harness tải ảnh trước khi kiểm tra, không thay code UI.

Báo cáo Word/slide tạo trước bước này giữ snapshot cũ; số liệu hiện hành lấy từ tài liệu này. Chưa rebuild/push image ứng dụng vì thay đổi catalog nằm ở SQL và công cụ vận hành.
