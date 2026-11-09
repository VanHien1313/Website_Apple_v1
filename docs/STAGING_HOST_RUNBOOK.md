# B5.8 — Bàn giao triển khai trên Linux host

Ngày 09/11/2026. Chưa có VPS/tên miền, nên tài liệu này là quy trình chuẩn bị, chưa phải biên bản nghiệm thu hosting. Image GHCR đã phát hành: [manifest](releases/2026-11-09-ghcr.json).

## Thông tin cần có khi cấp hạ tầng

- Linux amd64, SSH cho người vận hành, Docker Engine/Compose, Node.js 24 để chạy các công cụ kiểm tra, nginx trên host. Chọn dung lượng theo đo đạc workload; chưa có benchmark để cam kết số người dùng hoặc cấu hình tối thiểu.
- Tên miền staging trỏ đúng host, chứng chỉ HTTPS và cơ chế gia hạn.
- SQL Server riêng: hostname/port, database staging, CA chứng thực SQL, hai login app/migrator và quyền tương ứng trong [B5.5](BACKEND_B5_STAGING.md). Không dùng SQL Developer local để suy ra giấy phép hosting phù hợp.
- Quyền đọc package GHCR cho host. Token/mật khẩu được nhập riêng trên máy, không gửi trong chat hoặc commit.
- Nơi giữ backup ngoài máy, người chịu trách nhiệm phục hồi và thời gian bảo trì. Chưa migrate dữ liệu thật khi chưa có backup đã kiểm chứng.

## 1. Chuẩn bị image và kiểm tra host

Lấy repository vào host, mở thư mục gốc project. Cài Docker theo [hướng dẫn hệ điều hành chính thức](https://docs.docker.com/engine/install/); không chạy script cài từ nguồn không xác định. Đăng nhập GHCR bằng `docker login ghcr.io -u <tai-khoan>` và nhập token ở prompt nếu package yêu cầu xác thực. Không đưa token vào tham số lệnh.

```sh
docker pull ghcr.io/vanhien1313/website_apple_v1@sha256:788e0b4bd58b9fbd833bced9facccde04921c2637018b14bac6d72182015345b
npm run staging:host-check -- docs/releases/2026-11-09-ghcr.json
```

Lệnh kiểm tra chỉ chạy `docker info`, `context inspect`, `compose version`, `image inspect`. Không pull/build/start/migrate tự động. `host_image_passed` xác nhận host Linux, Docker Linux amd64 qua Unix socket, digest có trong engine, image ID khớp manifest và user image là Node không phải root. Remote Docker qua TCP/SSH bị từ chối vì kiểm tra file secret ở máy client không chứng minh chúng tồn tại trên daemon host. Biến DOCKER_CONTEXT được ưu tiên so với DOCKER_HOST theo cách chọn context của Docker.

Chưa kiểm chứng dung lượng, hiệu năng, SQL, mount permissions, DNS, firewall, nginx hoặc HTTPS. Kết quả này không thay thế bước 2–4.

## 2. Cấu hình staging

Tạo file `/srv/aura/staging.env` từ `deploy/staging.env.example`, điền image theo manifest và thông tin hạ tầng thật. Lưu runtime password, migration password, SQL CA vào đường dẫn đã chọn. Cấp quyền host/container phù hợp để user node đọc được file mount; không áp dụng chmod 0444 của runner CI lên máy chủ thật một cách máy móc. Chạy công cụ trên chính host với cùng user/context sẽ triển khai:

```sh
npm run staging:check -- /srv/aura/staging.env
docker compose --env-file /srv/aura/staging.env -f compose.staging.yaml --profile tools config --quiet
```

Chỉ tiếp tục khi exit 0. Placeholder trong example cố ý bị từ chối. `configuration_passed` chỉ kiểm tra cấu hình/file; không chứng minh SQL login có quyền hoặc CA khớp chứng chỉ server.

Chuẩn bị nginx từ `deploy/nginx.staging.conf.example`, điền hostname/certificate và default vhost từ chối hostname lạ. Kiểm tra `nginx -t` trước khi reload. Xác minh IP peer app nhận từ nginx để đặt TRUST_PROXY_IPS; không đoán từ IP khách hoặc mặc định localhost. Chỉ mở public 80/443, bảo vệ SSH theo chính sách host, không mở 4100 hay SQL ra Internet.

## 3. Migration và khởi động

Theo đúng thứ tự trong [B5.5](BACKEND_B5_STAGING.md): pull image, backup database đích, dừng app nếu nâng cấp, chạy migrate một lần, chỉ start app khi migrate thành công. Dừng lại khi có lỗi; không thêm `--force`, không bỏ kiểm tra SQL TLS, không chạy seed demo vào staging thật.

Sau khi app sẵn sàng, kiểm tra:

```sh
docker compose --env-file /srv/aura/staging.env -f compose.staging.yaml ps
curl --fail --silent --show-error http://127.0.0.1:4100/health/ready
```

Database mới cần bootstrap owner riêng theo quy trình backend. Không sao chép owner/password/database Docker local lên host. Chưa cung cấp lệnh tự động tạo owner staging vì bước này cần thông tin/quyền trên SQL host thật.

## 4. Nghiệm thu trước mở truy cập

- HTTPS từ máy bên ngoài: chain/hostname hợp lệ, HTTP chuyển HTTPS, deep link frontend hoạt động, API 404 không trả SPA HTML.
- Đăng nhập owner trên HTTPS, kiểm tra cookie Secure/HttpOnly và session; xác minh IP qua proxy, không chỉ kiểm tra trang chủ trả 200.
- SQL TLS có xác minh certificate, app login không phải sysadmin và không sửa schema/history migrations; migrator không được mount vào app.
- Tạo đơn thử có chủ đích trên dữ liệu staging được phép; kiểm tra tồn kho, vận hành COD và báo cáo. Ghi rõ dữ liệu thử để xử lý theo quy trình, không tự xóa dữ liệu thật.
- Restart app, theo dõi health/log/disk, xác minh backup ngoài máy và thử restore sang instance riêng. Backup/restore trên CI cùng instance không thay thế nghiệm thu này.

Ghi lại image digest, commit, thời gian, host, kết quả và người thực hiện. Không ghi token, mật khẩu hay nội dung secret vào biên bản. Khi rollback, chỉ dùng image cũ nếu schema tương thích; không tự rollback database đang có đơn mới.

## Kiểm thử công cụ

`npm run test:deployment`: 11 test; đặt `TEST_STAGING_COMPOSE=true` để bật test Compose CLI thật. Đã đạt 11/11 trên máy phát triển. Năm test host mới dùng Docker output mô phỏng để kiểm chứng từ chối image/host/context sai; không coi đó là nghiệm thu Linux VPS. CLI thật trên Windows trả blocked trước khi gọi Docker, đúng thiết kế.

Nguồn: [docker info](https://docs.docker.com/reference/cli/docker/system/info/), [image inspect](https://docs.docker.com/reference/cli/docker/image/inspect/).
