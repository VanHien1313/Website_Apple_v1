# Bản trình diễn SQL Server riêng

Chuẩn bị ngày 10/11/2026 để nhóm demo trước hạn 13/11. Đây là ứng dụng API/SQL thật với **dữ liệu giả**, không phải frontend dùng localStorage mock.

| Môi trường | URL phải dùng | Database | Tài khoản |
| --- | --- | --- | --- |
| Bản local bro tự test | http://127.0.0.1:4000 | AuraStoreDocker | Owner đã tạo trước đó |
| Bản trình diễn có dữ liệu | **http://localhost:4001** | AuraDemoDocker | Ba tài khoản demo riêng |

Dùng đúng hostname: cookie không tách theo port, nên demo dùng `localhost` và bản chính dùng `127.0.0.1`. Không đổi demo sang `127.0.0.1:4001`; origin đó không đúng cấu hình. Nếu quay video hai vai trò cùng lúc, dùng profile trình duyệt riêng. Cả hai app chỉ bind loopback, không mở public.

## Khởi động và tài khoản

Docker Desktop phải chạy và stack local đã được khởi tạo theo BACKEND_B5_DOCKER.md, có image `aura-local-app`, SQL engine và secrets local. Trong PowerShell:

```powershell
Set-Location D:\Apple_Web
npm run demo:start
.\deploy\Show-DemoAccounts.ps1
```

Script cuối hiển thị **chỉ tài khoản demo** trên máy, không in mật khẩu SQL. Không gửi output vào chat, commit hoặc quay màn hình đoạn này. Mật khẩu sinh ngẫu nhiên được lưu trong `deploy/secrets/demo-accounts.json` (đã gitignore). Không dùng mật khẩu owner thật cho bản demo.

- Owner: `owner@aura.example.test` → chọn Quản trị viên.
- Editor: `editor@aura.example.test` → chọn Quản trị viên.
- Customer: `customer@aura.example.test` → chọn Khách hàng.

Email `.test`, số điện thoại, địa chỉ và giá là dữ liệu thử; không có gửi email/giao hàng thật.

```powershell
npm run demo:status
npm run demo:stop
```

`demo:stop` chỉ dừng demo-app, không xóa database. `demo:start` chạy lại giữ nguyên dữ liệu, không đổi mật khẩu, không nhân đôi đơn, không phục hồi catalog về bản gốc. Nếu bro đổi password qua UI, file mật khẩu ban đầu không được cập nhật tự động.

## Dữ liệu ban đầu

- 4 danh mục: iPhone, iPad, Mac, Apple Watch.
- 8 sản phẩm có chữ **Demo**, 24 SKU; mỗi sản phẩm có 2 cấu hình, 2 màu, 3 tổ hợp SKU. Màu trắng hết hàng, tổ hợp nâng cao/trắng không có SKU.
- Giá từ 6–35 triệu ở cấu hình tiêu chuẩn, có sản phẩm đúng 10 triệu để minh họa phí giao 50.000 đồng.
- 8 ảnh minh họa hình học tự tạo, chuyển WebP và lưu SQL; không cần ảnh từ CDN bên ngoài.
- 2 admin (owner/editor), 1 customer, 6 đơn gắn với customer demo.

| Đơn theo sản phẩm | Trạng thái ban đầu | on_hand / reserved của SKU đặt |
| --- | --- | --- |
| iPhone 16 | PENDING | 20 / 1 |
| iPhone 16 Pro | PROCESSING | 20 / 1 |
| iPad Air | SHIPPED | 19 / 0 |
| iPad Pro | DELIVERED, chưa thu tiền | 19 / 0 |
| MacBook Air | COMPLETED + PAID | 19 / 0 |
| MacBook Pro | CANCELLED | 20 / 0 |

Doanh thu ban đầu **25.000.000 đồng**, thuộc ngày khởi tạo theo giờ Việt Nam. Chọn kỳ chứa ngày đó khi mở báo cáo. Các đơn được tạo/chuyển trạng thái bằng service nghiệp vụ; không gán trạng thái bằng SQL thủ công.

PENDING vẫn hết hạn giữ hàng sau 24 giờ như ứng dụng thật. Đến ngày demo 13/11, hãy đặt một đơn mới nếu muốn trình bày PENDING; không sửa đồng hồ hoặc reset tồn để giả lập. Mọi thao tác thử tiếp sẽ thay đổi số liệu ban đầu.

## An toàn và khả năng tái tạo

Initializer chỉ chấp nhận DB cố định `AuraDemoDocker`, server `db`, chế độ development; không có tham số tùy ý chỉ sang database chính. Nếu database đã có mà thiếu marker hoàn tất, script dừng và không ghi đè. Không có lệnh reset/drop tự động.

Runtime dùng login riêng `aura_demo_app`; không có quyền sysadmin, tạo bảng, sửa migration/marker và không truy cập AuraStoreDocker. Hai database chia sẻ SQL engine/volume nên không phải cô lập máy chủ; restart SQL ảnh hưởng cả hai app.

Tái tạo trên máy mới: chuẩn bị stack local, chạy `demo:start` để tạo database mới và mật khẩu mới. Không sao chép secrets lên GitHub. Nếu setup bị ngắt sau khi đã tạo database, kiểm tra trạng thái demo trước khi khôi phục; script cố ý không tự xóa dữ liệu để chạy lại.

## Kiểm chứng

`npm run test:demo`: kiểm tra dataset qua validator sản phẩm thật, ID/SKU không trùng, ảnh không có script/nguồn ngoài.

`npm run demo:verify`: Playwright/Chrome, chỉ dùng cho snapshot ban đầu (8 sản phẩm/6 đơn). Cần cấu hình `PLAYWRIGHT_MODULE` và `CHROME_PATH` như hướng dẫn E2E của repo. Sau khi tự thay đổi dữ liệu, các kỳ vọng số lượng/trạng thái ban đầu có thể không còn đúng; không gọi đó là lỗi ứng dụng.

`deploy/demo/verify-sql.mjs` chạy bên trong demo-app để kiểm tra counts, tồn, doanh thu và quyền SQL; từ chối target khác demo. Kết quả trình duyệt và ảnh tại `docs/qa/demo/`. Không xem bộ demo này là dữ liệu thật hoặc bằng chứng mọi yêu cầu đồ án đã hoàn tất.
